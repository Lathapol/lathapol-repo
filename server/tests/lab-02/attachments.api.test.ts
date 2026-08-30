import request from "supertest";
import path from "path";
import fs from "fs";
import app from "../../src/app";

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
    const res = await request(app).post("/api/tickets").send({
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
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", testImagePath);

    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe("sample.png");
    expect(res.body.isRemoved).toBe(false);
  });

  it("rejects an unsupported file type", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", "1")
      .attach("file", testTextPath);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("retrieves ticket detail including the uploaded attachment", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}?requesterId=1`);
    expect(res.status).toBe(200);
    expect(res.body.attachments.length).toBeGreaterThanOrEqual(1);
  });

  it("downloads an active attachment", async () => {
    const listRes = await request(app).get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await request(app).get(`/api/attachments/${attachmentId}/download?requesterId=1`);
    expect(res.status).toBe(200);
  });

  it("soft-removes an attachment with a reason", async () => {
    const listRes = await request(app).get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await request(app)
      .patch(`/api/attachments/${attachmentId}/remove`)
      .send({ requesterId: 1, reason: "Wrong file attached" });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Wrong file attached");
  });

  it("blocks downloading a removed attachment", async () => {
    const listRes = await request(app).get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await request(app).get(`/api/attachments/${attachmentId}/download?requesterId=1`);
    expect(res.status).toBe(410);
  });

  it("rejects access to an attachment belonging to a different requester", async () => {
    const listRes = await request(app).get(`/api/tickets/${ticketId}?requesterId=1`);
    const attachmentId = listRes.body.attachments[0].id;

    const res = await request(app).get(`/api/attachments/${attachmentId}?requesterId=2`);
    expect(res.status).toBe(404);
  });
});
