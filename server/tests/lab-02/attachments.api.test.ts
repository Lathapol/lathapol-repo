import { client, prepareSessions, closeSessions } from '../session-helper';
beforeAll(prepareSessions);
afterAll(closeSessions);
﻿import request from "supertest";
import path from "path";
import fs from "fs";
import app from "../../src/app";
import { prisma } from '../../src/prisma';
import { uploadDirectory } from '../../src/upload';
import { execFileSync } from 'node:child_process';

const testImagePath = path.join(__dirname, "test-fixtures", "sample.png");
const testTextPath = path.join(__dirname, "test-fixtures", "sample.txt");

beforeAll(() => {
  const fixturesDir = path.join(__dirname, "test-fixtures");
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir);

  // Minimal valid 1x1 PNG
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  fs.writeFileSync(testImagePath, pngBuffer);
  fs.writeFileSync(testTextPath, "not an allowed file type");
});

afterAll(() => {
  fs.rmSync(path.join(__dirname, "test-fixtures"), { recursive: true, force: true });
});

describe("Attachment lifecycle", () => {
  let ticketId: number;

  beforeAll(async () => {
    const res = await client().post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Attachment test ticket",
      description: "A ticket used for testing attachment lifecycle behavior.",
      requestedPriority: "LOW",
    });
    ticketId = res.body.id;
  });

  it("uploads a valid image attachment", async () => {
    const res = await client()
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", testImagePath);

    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe("sample.png");
    expect(res.body.isRemoved).toBe(false);
    const saved = await prisma.attachment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(Buffer.from(saved.content!)).toEqual(fs.readFileSync(testImagePath));
    expect(fs.existsSync(path.join(uploadDirectory, saved.storedName))).toBe(false);
  });

  it("rejects an unsupported file type", async () => {
    const res = await client()
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", testTextPath);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("retrieves ticket detail including the uploaded attachment", async () => {
    const res = await client().get(`/api/tickets/${ticketId}?requesterId=1`);
    expect(res.status).toBe(200);
    expect(res.body.attachments.length).toBeGreaterThanOrEqual(1);
  });

  it("downloads an active attachment", async () => {
    const listRes = await client().get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await client().get(`/api/attachments/${attachmentId}/download?requesterId=1`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fs.readFileSync(testImagePath));
  });

  it('downloads legacy disk files until they are imported', async () => {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    const storedName = `legacy-${ticketId}.png`;
    const legacyPath = path.join(uploadDirectory, storedName);
    fs.copyFileSync(testImagePath, legacyPath);
    const attachment = await prisma.attachment.create({ data: {
      ticketId, storedName, fileName: 'legacy.png', fileType: 'image/png',
      fileSize: fs.statSync(legacyPath).size,
    } });
    try {
      const res = await client().get(`/api/attachments/${attachment.id}/download`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(fs.readFileSync(testImagePath));
      for (let run = 0; run < 2; run++) {
        execFileSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), 'prisma/import-attachments.ts'], {
          cwd: path.resolve(__dirname, '../..'), stdio: 'pipe',
        });
      }
      fs.unlinkSync(legacyPath);
      const imported = await client().get(`/api/attachments/${attachment.id}/download`);
      expect(imported.status).toBe(200);
      expect(imported.body).toEqual(fs.readFileSync(testImagePath));
    } finally {
      await prisma.attachment.delete({ where: { id: attachment.id } });
      if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
    }
  });

  it("soft-removes an attachment with a reason", async () => {
    const listRes = await client().get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await client()
      .patch(`/api/attachments/${attachmentId}/remove`)
      .send({ requesterId: 1, reason: "Wrong file attached" });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Wrong file attached");
  });

  it("blocks downloading a removed attachment", async () => {
    const listRes = await client().get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await client().get(`/api/attachments/${attachmentId}/download?requesterId=1`);
    expect(res.status).toBe(410);
  });

  it("rejects access to an attachment belonging to a different requester", async () => {
    const listRes = await client().get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await client(2).get(`/api/attachments/${attachmentId}?requesterId=1`);
    expect(res.status).toBe(404);
  });
});
