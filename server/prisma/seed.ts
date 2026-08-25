import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = ['Account and Access', 'Hardware', 'Software', 'Network'];

const relatedSystems = [
  'Email',
  'Campus Wi-Fi',
  'VPN',
  'LEB2 App',
  'Grade Submission App',
  'Printer',
  'Corporate Laptop',
];

const requesters = [
  { name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', isActive: true },
  { name: 'Michael Brown', email: 'michael.brown@example.com', isActive: true },
  { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', isActive: true },
  { name: 'David Lee', email: 'david.lee@example.com', isActive: true },
  { name: 'Former Employee', email: 'former.employee@example.com', isActive: false },
];

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  for (const r of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: {},
      create: r,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });