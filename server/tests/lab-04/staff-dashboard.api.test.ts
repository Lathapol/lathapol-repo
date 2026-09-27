import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../src/app';
import { prisma } from '../../src/prisma';
import { digest, randomToken } from '../../src/security';

const prefix = `sdash-${Date.now()}`;
const users: number[] = [], tickets: number[] = [], cookies: string[] = [];
let categoryId: number, relatedSystemId: number;
// actors: 0 staff A, 1 staff B, 2 requester, 3 admin
beforeAll(async () => {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
  relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  for (const role of ['IT_STAFF', 'IT_STAFF', 'REQUESTER', 'ADMINISTRATOR'] as const) {
    const u = await prisma.user.create({ data: { name: `${prefix}-${role}-${users.length}`, email: `${prefix}-${users.length}@example.test`, role, mustChangePassword: false } });
    users.push(u.id);
    const token = randomToken();
    await prisma.session.create({ data: { tokenHash: digest(token), csrfToken: randomToken(), userId: u.id, expiresAt: new Date(Date.now() + 3600000) } });
    cookies.push(`toktickit_session=${token}`);
  }
  const mk = async (opts: { status: string; owner?: number | null; priority?: string }) => {
    const t = await prisma.ticket.create({ data: { ticketNumber: `${prefix}-${tickets.length}`, summary: `${prefix} ${opts.status}`, description: 'Staff dashboard fixture', requesterId: users[2], ownerId: opts.owner ?? null, categoryId, relatedSystemId, requestedPriority: 'LOW', itPriority: (opts.priority ?? 'LOW') as any, currentStatus: opts.status as any } });
    tickets.push(t.id);
    return t;
  };
  await mk({ status: 'NEW' });                                  // unassigned, open
  await mk({ status: 'OPEN', owner: users[0] });                 // mine (actor 0), open
  await mk({ status: 'IN_PROGRESS', owner: users[1], priority: 'HIGH' }); // other staff, urgent
  await mk({ status: 'RESOLVED' });
  await mk({ status: 'CANCELLED' });
  const acted = await mk({ status: 'OPEN', owner: users[0] });
  await prisma.actionTaken.create({ data: { ticketId: acted.id, performedById: users[0], description: `${prefix} recent action`, result: 'Done', requestKey: randomUUID() } });
});
afterAll(async () => {
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets } } });
  await prisma.ticket.deleteMany({ where: { id: { in: tickets } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
const call = (actor: number, url: string) => request(app).get(url).set('Cookie', cookies[actor]);

test('AC-11 staff dashboard metrics match direct database counts', async () => {
  const res = await call(0, '/api/dashboard/staff');
  expect(res.status).toBe(200);
  const unassigned = await prisma.ticket.count({ where: { id: { in: tickets }, ownerId: null, currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } } });
  const mine = await prisma.ticket.count({ where: { id: { in: tickets }, ownerId: users[0], currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } } });
  // Filter our fixtures out of the whole-table response since other tests' data coexists.
  const ours = (await prisma.ticket.findMany({ where: { id: { in: tickets } }, select: { currentStatus: true } }));
  const byStatus: Record<string, number> = {}; for (const t of ours) byStatus[t.currentStatus] = (byStatus[t.currentStatus] || 0) + 1;
  expect(res.body.unassignedCount).toBeGreaterThanOrEqual(unassigned);
  expect(res.body.mineCount).toBeGreaterThanOrEqual(mine);
  for (const status of Object.keys(byStatus)) expect(res.body.byStatus[status]).toBeGreaterThanOrEqual(byStatus[status]);
  expect(res.body.myActions.recentCount).toBeGreaterThanOrEqual(1);
  expect(res.body.myActions.recent.some((a: any) => a.summary.startsWith(prefix))).toBe(true);
  expect(res.body.users).toBeUndefined();
  // Urgent is oldest-updated-first among HIGH/open tickets, so a brand-new fixture can be outranked by
  // older ones from other fixtures; confirm the definition through the queue's own group+priority filter instead.
  const urgent = await call(0, `/api/staff/tickets?search=${prefix}&priority=HIGH&group=open`);
  expect(urgent.body.data.map((t: any) => t.ticketNumber)).toContain(`${prefix}-2`);
  for (const row of res.body.urgent) expect(['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']).toContain(row.currentStatus);
});

test('AC-11 administrator additionally gets user counts; requester and unauthenticated are denied', async () => {
  const admin = await call(3, '/api/dashboard/staff');
  expect(admin.status).toBe(200);
  expect(admin.body.users).toMatchObject({ REQUESTER: expect.any(Number), IT_STAFF: expect.any(Number), ADMINISTRATOR: expect.any(Number), inactive: expect.any(Number) });
  expect(admin.body.users.IT_STAFF).toBeGreaterThanOrEqual(2);
  expect((await call(2, '/api/dashboard/staff')).status).toBe(403);
  expect((await request(app).get('/api/dashboard/staff')).status).toBe(401);
});

test('AC-12 unassigned and mine counts equal their drill-down queue totals', async () => {
  const dashboard = await call(0, '/api/dashboard/staff');
  const unassigned = await call(0, '/api/staff/tickets?owner=unassigned&group=open&pageSize=1');
  const mine = await call(0, '/api/staff/tickets?owner=mine&group=open&pageSize=1');
  expect(unassigned.body.meta.totalCount).toBe(dashboard.body.unassignedCount);
  expect(mine.body.meta.totalCount).toBe(dashboard.body.mineCount);
});

test('PERF-01 responds quickly on seeded data', async () => {
  const start = Date.now();
  expect((await call(0, '/api/dashboard/staff')).status).toBe(200);
  expect(Date.now() - start).toBeLessThan(1000);
});
