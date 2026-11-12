import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/prisma';
import { uploadDirectory } from '../src/upload';

async function main() {
  const rows = await prisma.attachment.findMany({
    where: { content: null },
    select: { id: true, storedName: true, fileSize: true },
  });
  let missing = 0;
  for (const row of rows) {
    const filePath = path.resolve(uploadDirectory, row.storedName);
    if (path.dirname(filePath) !== uploadDirectory) throw new Error(`Invalid path for attachment ${row.id}`);
    try {
      const content = await readFile(filePath);
      if (content.length !== row.fileSize) throw new Error(`Size mismatch for attachment ${row.id}`);
      await prisma.attachment.updateMany({ where: { id: row.id, content: null }, data: { content } });
      console.log(`Imported attachment ${row.id}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      console.error(`Missing file for attachment ${row.id}`);
      missing++;
    }
  }
  if (missing) throw new Error(`${missing} files are missing. Restore them and rerun before deploying.`);
}

main().catch(() => {
  console.error('Attachment import failed. Resolve the reported files and rerun.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
