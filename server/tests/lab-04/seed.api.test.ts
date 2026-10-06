import { execFileSync } from 'child_process';
import path from 'path';
import { prisma } from '../../src/prisma';

const runSeed = () => execFileSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), 'prisma/seed.ts'], {
  cwd: path.join(__dirname, '..', '..'),
  env: { ...process.env, LAB3_INITIAL_PASSWORD: 'seed-only-password-1' },
  stdio: 'pipe',
});
const snapshot = async () => JSON.stringify(await prisma.actionTaken.findMany({ orderBy: { id: 'asc' } }));
afterAll(() => prisma.$disconnect());

test('MIG-01 seed is repeatable and creates tickets with zero, one and many actions', async () => {
  runSeed();
  const first = await snapshot();
  runSeed();
  expect(await snapshot()).toBe(first);

  const tickets = await prisma.ticket.findMany({ where: { ticketNumber: { startsWith: 'TKT-2000-' } }, include: { actions: true } });
  const counts = tickets.map(t => t.actions.length);
  expect(counts).toContain(0);
  expect(counts).toContain(1);
  expect(Math.max(...counts)).toBeGreaterThanOrEqual(3);
  const many = tickets.find(t => t.actions.length >= 3)!;
  expect(new Set(many.actions.map(a => a.performedById)).size).toBeGreaterThan(1);
  expect(tickets.some(t => t.actions.some(a => a.followUpRequired && a.followUpNote))).toBe(true);
  expect(new Set(tickets.map(t => t.currentStatus)).size).toBe(8);
}, 90000);

test('MIG-01 a requester with no tickets exists for zero-metric dashboards', async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: 'zero.tickets@example.com' } });
  expect(user.role).toBe('REQUESTER');
  expect(await prisma.ticket.count({ where: { requesterId: user.id } })).toBe(0);
});

test('MIG-01 legacy tickets without actions are untouched by the additive migration', async () => {
  const legacy = await prisma.ticket.findMany({ where: { actions: { none: {} } } });
  expect(legacy.length).toBeGreaterThan(0);
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='ActionTaken'`;
  expect(tables).toHaveLength(1);
});
