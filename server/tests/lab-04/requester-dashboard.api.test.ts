import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/prisma';
import { digest, randomToken } from '../../src/security';

const prefix = `rdash-${Date.now()}`;
const users: number[] = [], tickets: number[] = [], cookies: string[] = [];
let categoryId: number, relatedSystemId: number;
// actors: 0 requester A (has tickets), 1 requester B (no tickets), 2 staff; a 4th, untested requester owns the "other" fixture
beforeAll(async () => {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
  relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  for (const role of ['REQUESTER', 'REQUESTER', 'IT_STAFF', 'REQUESTER'] as const) {
    const u = await prisma.user.create({ data: { name: `${prefix}-${role}-${users.length}`, email: `${prefix}-${users.length}@example.test`, role, mustChangePassword: false } });
    users.push(u.id);
    const token = randomToken();
    await prisma.session.create({ data: { tokenHash: digest(token), csrfToken: randomToken(), userId: u.id, expiresAt: new Date(Date.now() + 3600000) } });
    cookies.push(`toktickit_session=${token}`);
  }
  const recent = new Date(), old = new Date(Date.now() - 30 * 24 * 3600000);
  const specs: [string, Date][] = [['NEW', recent], ['WAITING_FOR_REQUESTER', recent], ['RESOLVED', recent], ['CLOSED', old], ['CANCELLED', recent]];
  for (const [status, updatedAt] of specs) {
    const t = await prisma.ticket.create({ data: { ticketNumber: `${prefix}-${tickets.length}`, summary: `${prefix} ${status}`, description: 'Requester dashboard fixture', requesterId: users[0], categoryId, relatedSystemId, requestedPriority: 'LOW', itPriority: 'LOW', currentStatus: status as any, updatedAt } });
    await prisma.ticket.update({ where: { id: t.id }, data: { updatedAt } });
    tickets.push(t.id);
  }
  // one ticket owned by a different requester entirely, must never appear in A's (or B's) dashboard
  const other = await prisma.ticket.create({ data: { ticketNumber: `${prefix}-other`, summary: `${prefix} other requester`, description: 'Not requester A or B', requesterId: users[3], categoryId, relatedSystemId, requestedPriority: 'LOW', itPriority: 'LOW', currentStatus: 'RESOLVED' } });
  tickets.push(other.id);
});
afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { id: { in: tickets } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
const call = (actor: number, url: string) => request(app).get(url).set('Cookie', cookies[actor]);

test('AC-10 the dashboard returns only the caller\'s own metrics and lists', async () => {
  const res = await call(0, '/api/dashboard/requester');
  expect(res.status).toBe(200);
  expect(res.body.openCount).toBe(2); // NEW, WAITING_FOR_REQUESTER
  expect(res.body.waitingCount).toBe(1);
  expect(res.body.recentlyResolvedCount).toBe(1); // RESOLVED recent; CLOSED is old
  for (const row of [...res.body.recentlyUpdated, ...res.body.recentlyResolved]) expect(row.ticketNumber).toMatch(new RegExp(`^${prefix}-\\d`));
  expect(res.body.recentlyUpdated.some((r: any) => r.ticketNumber === `${prefix}-other`)).toBe(false);
});

test('AC-13 a requester with no tickets sees zeros and empty lists, not an error', async () => {
  const res = await call(1, '/api/dashboard/requester');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ openCount: 0, waitingCount: 0, recentlyResolvedCount: 0, recentlyUpdated: [], recentlyResolved: [] });
});

test('AC-11 staff/admin and unauthenticated cannot read the requester dashboard', async () => {
  expect((await call(2, '/api/dashboard/requester')).status).toBe(403);
  expect((await request(app).get('/api/dashboard/requester')).status).toBe(401);
});

test('AC-12 the open count equals the drill-down list totalCount', async () => {
  const dashboard = await call(0, '/api/dashboard/requester');
  const list = await call(0, `/api/tickets?search=${prefix}&group=open`);
  expect(list.status).toBe(200);
  expect(list.body.meta.totalCount).toBe(dashboard.body.openCount);
});

test('AC-12 the recently-resolved count equals its drill-down list totalCount', async () => {
  const dashboard = await call(0, '/api/dashboard/requester');
  const list = await call(0, `/api/tickets?search=${prefix}&group=resolved&recent=7d`);
  expect(list.status).toBe(200);
  expect(list.body.meta.totalCount).toBe(dashboard.body.recentlyResolvedCount);
});

test('rejects unknown group and recent values', async () => {
  expect((await call(0, '/api/tickets?group=all')).status).toBe(400);
  expect((await call(0, '/api/tickets?recent=30d')).status).toBe(400);
});
