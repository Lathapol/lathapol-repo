import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../src/app';
import { prisma } from '../../src/prisma';
import { digest, randomToken, transitions } from '../../src/security';

// actors: 0 staff, 1 other staff, 2 requester, 3 other requester, 4 admin
const users: number[] = [], tickets: number[] = [], sessions: { cookie: string; csrf: string }[] = [];
let categoryId: number, relatedSystemId: number;
beforeAll(async () => {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
  relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  for (const role of ['IT_STAFF', 'IT_STAFF', 'REQUESTER', 'REQUESTER', 'ADMINISTRATOR'] as const) {
    const u = await prisma.user.create({ data: { name: `Workflow ${role}`, email: `${randomToken()}@example.test`, role, mustChangePassword: false } });
    users.push(u.id);
    const token = randomToken(), csrf = randomToken();
    sessions.push({ cookie: `toktickit_session=${token}`, csrf });
    await prisma.session.create({ data: { tokenHash: digest(token), csrfToken: csrf, userId: u.id, expiresAt: new Date(Date.now() + 3600000) } });
  }
});
afterAll(async () => {
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets } } });
  await prisma.ticket.deleteMany({ where: { id: { in: tickets } } });
  await prisma.session.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
const call = (actor: number, method: 'get' | 'post' | 'patch', url: string, body?: any) =>
  request(app)[method](url).set('Cookie', sessions[actor].cookie).set('X-CSRF-Token', sessions[actor].csrf).send(body);
async function ticket(status: any = 'OPEN', withAction = true) {
  const t = await prisma.ticket.create({ data: { ticketNumber: `WF4-${randomToken()}`, summary: 'Lab 4 workflow', description: 'Lab 4 workflow description', requesterId: users[2], categoryId, relatedSystemId, requestedPriority: 'LOW', itPriority: 'LOW', currentStatus: status } });
  tickets.push(t.id);
  if (withAction) await prisma.actionTaken.create({ data: { ticketId: t.id, performedById: users[0], description: 'Worked on it', result: 'Progress made', requestKey: randomUUID() } });
  return t;
}
const patch = (actor: number, id: number, body: any) => call(actor, 'patch', `/api/staff/tickets/${id}`, body);
const statuses = Object.keys(transitions);
const pairs = statuses.flatMap(from => statuses.map(to => [from, to]));

test.each(pairs.filter(([f, t]) => transitions[f].includes(t)))('UNIT-02 allows %s -> %s for staff (ticket has an action)', async (from, to) => {
  const t = await ticket(from);
  const res = await patch(0, t.id, { version: 0, currentStatus: to, confirmed: true });
  expect(res.status).toBe(200);
  expect(res.body.currentStatus).toBe(to);
});

test.each(pairs.filter(([f, t]) => !transitions[f].includes(t)))('UNIT-02 rejects %s -> %s even with an action and confirmation', async (from, to) => {
  const t = await ticket(from);
  const res = await patch(0, t.id, { version: 0, currentStatus: to, confirmed: true });
  expect(res.status).toBe(409);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).currentStatus).toBe(from);
});

test('API-08 resolving a ticket with no action is rejected with ACTION_REQUIRED and changes nothing', async () => {
  for (const from of ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER']) {
    const t = await ticket(from, false);
    const res = await patch(0, t.id, { version: 0, currentStatus: 'RESOLVED', confirmed: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTION_REQUIRED');
    const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(saved.currentStatus).toBe(from);
    expect(saved.version).toBe(0);
  }
});

test('API-08 the gate counts actions from any staff member and only actions of that ticket', async () => {
  const other = await ticket('OPEN');
  const t = await ticket('OPEN', false);
  expect((await patch(0, t.id, { version: 0, currentStatus: 'RESOLVED', confirmed: true })).status).toBe(409);
  const logged = await call(1, 'post', `/api/tickets/${t.id}/actions`, { requestKey: randomUUID(), description: 'Fixed by the other staff member', result: 'Works' });
  expect(logged.status).toBe(201);
  expect((await patch(0, t.id, { version: 0, currentStatus: 'RESOLVED', confirmed: true })).status).toBe(200);
  expect(other.id).not.toBe(t.id);
});

test('API-08 the gate applies only to RESOLVED; other moves and edits work without actions', async () => {
  const t = await ticket('NEW', false);
  expect((await patch(0, t.id, { version: 0, currentStatus: 'OPEN', confirmed: true })).status).toBe(200);
  expect((await patch(0, t.id, { version: 1, itPriority: 'HIGH' })).status).toBe(200);
  expect((await patch(0, t.id, { version: 2, currentStatus: 'CANCELLED', confirmed: true })).status).toBe(200);
});

test('API-08 the gate holds under a concurrent resolve and no action', async () => {
  const t = await ticket('OPEN', false);
  const results = await Promise.all([0, 1].map(a => patch(a, t.id, { version: 0, currentStatus: 'RESOLVED', confirmed: true })));
  expect(results.map(r => r.status)).toEqual([409, 409]);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).currentStatus).toBe('OPEN');
});

test('API-09 requesters and administrators cannot change status or claim; unconfirmed and stale updates fail', async () => {
  const t = await ticket('OPEN');
  for (const actor of [2, 3, 4]) expect((await patch(actor, t.id, { version: 0, currentStatus: 'IN_PROGRESS' })).status).toBe(403);
  expect((await patch(0, t.id, { version: 0, currentStatus: 'RESOLVED' })).status).toBe(409);
  const moved = await patch(0, t.id, { version: 0, currentStatus: 'IN_PROGRESS' });
  expect(moved.status).toBe(200);
  const stale = await patch(1, t.id, { version: 0, currentStatus: 'WAITING_FOR_REQUESTER' });
  expect(stale.status).toBe(409);
  expect(stale.body.error.code).toBe('TICKET_CONFLICT');
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).currentStatus).toBe('IN_PROGRESS');
  expect((await request(app).patch(`/api/staff/tickets/${t.id}`).send({ version: 1, currentStatus: 'RESOLVED' })).status).toBe(401);
});

test('API-09 terminal statuses have no exits', async () => {
  for (const status of ['CLOSED', 'CANCELLED']) {
    const t = await ticket(status);
    for (const to of statuses) expect((await patch(0, t.id, { version: 0, currentStatus: to, confirmed: true })).status).toBe(409);
  }
});

test('API-09 the requester signal is advisory: status stays put and staff still need the gate', async () => {
  const t = await ticket('IN_PROGRESS', false);
  const signal = await call(2, 'post', `/api/tickets/${t.id}/appears-resolved`);
  expect(signal.status).toBe(200);
  const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
  expect(saved.currentStatus).toBe('IN_PROGRESS');
  expect(saved.requesterResolvedAt).not.toBeNull();
  const blocked = await patch(0, t.id, { version: saved.version, currentStatus: 'RESOLVED', confirmed: true });
  expect(blocked.status).toBe(409);
  expect(blocked.body.error.code).toBe('ACTION_REQUIRED');
  expect((await call(2, 'patch', `/api/tickets/${t.id}`, { currentStatus: 'RESOLVED' })).status).toBeGreaterThanOrEqual(400);
});

test('API-09 reopening clears the requester signal and ticket detail shows the new status', async () => {
  const t = await ticket('OPEN');
  await call(2, 'post', `/api/tickets/${t.id}/appears-resolved`);
  const v1 = (await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).version;
  expect((await patch(0, t.id, { version: v1, currentStatus: 'RESOLVED', confirmed: true })).status).toBe(200);
  const reopened = await patch(0, t.id, { version: v1 + 1, currentStatus: 'REOPENED' });
  expect(reopened.status).toBe(200);
  expect(reopened.body.requesterResolvedAt).toBeNull();
  const detail = await call(2, 'get', `/api/tickets/${t.id}`);
  expect(detail.body.currentStatus).toBe('REOPENED');
});
