import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

describe('Lab 2 seed data', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds exactly 4 categories', async () => {
    const count = await prisma.category.count();
    expect(count).toBe(4);
  });

  it('seeds at least 6 related systems', async () => {
    const count = await prisma.relatedSystem.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it('seeds at least 4 active requesters and at least 1 inactive requester', async () => {
    const active = await prisma.requesterUser.count({ where: { isActive: true } });
    const inactive = await prisma.requesterUser.count({ where: { isActive: false } });
    expect(active).toBeGreaterThanOrEqual(4);
    expect(inactive).toBeGreaterThanOrEqual(1);
  });
});