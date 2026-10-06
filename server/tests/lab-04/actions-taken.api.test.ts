import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../src/app';
import { prisma } from '../../src/prisma';
import { digest, randomToken } from '../../src/security';

// actors: 0 owner staff, 1 other staff, 2 requester, 3 other requester, 4 admin
const users: number[] = [], tickets: number[] = [], sessions: { cookie: string; csrf: string }[] = [];
let categoryId: number, relatedSystemId: number;
beforeAll(async () => {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
  relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  for (const role of ['IT_STAFF', 'IT_STAFF', 'REQUESTER', 'REQUESTER', 'ADMINISTRATOR'] as const) {
    const u = await prisma.user.create({ data: { name: `Actions ${role}`, email: `${randomToken()}@example.test`, role, mustChangePassword: false } });
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
async function ticket(status: any = 'IN_PROGRESS') {
  const t = await prisma.ticket.create({ data: { ticketNumber: `ACT-${randomToken()}`, summary: 'Actions test', description: 'Actions test description', requesterId: users[2], ownerId: users[0], categoryId, relatedSystemId, requestedPriority: 'LOW', itPriority: 'LOW', currentStatus: status } });
  tickets.push(t.id);
  return t;
}
const valid = () => ({ requestKey: randomUUID(), description: 'Reset the mailbox', result: 'Mailbox works again' });

test('API-01 creates an action under the ticket with the authenticated performer and server date', async () => {
  const t = await ticket();
  const before = Date.now();
  const res = await call(0, 'post', `/api/tickets/${t.id}/actions`, { ...valid(), attachmentNotes: 'see screenshot.png', performedById: users[1], createdAt: '2000-01-01' });
  expect(res.status).toBe(400); // client-supplied performer/date are rejected, not trusted
  const ok = await call(0, 'post', `/api/tickets/${t.id}/actions`, { ...valid(), attachmentNotes: ' see screenshot.png ' });
  expect(ok.status).toBe(201);
  expect(ok.body).toMatchObject({ ticketId: t.id, description: 'Reset the mailbox', result: 'Mailbox works again', followUpRequired: false, followUpNote: null, attachmentNotes: 'see screenshot.png', version: 0, performedBy: { id: users[0] } });
  expect(new Date(ok.body.createdAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  const admin = await call(4, 'post', `/api/tickets/${t.id}/actions`, valid());
  expect(admin.status).toBe(201);
  expect(admin.body.performedBy.id).toBe(users[4]);
});

test('API-02 rejects invalid bodies with safe errors', async () => {
  const t = await ticket();
  const url = `/api/tickets/${t.id}/actions`;
  const bad = [
    { ...valid(), description: '   ' }, { ...valid(), result: '' }, { ...valid(), description: 'x'.repeat(2001) },
    { ...valid(), attachmentNotes: 'x'.repeat(501) }, { ...valid(), followUpRequired: true },
    { ...valid(), followUpRequired: true, followUpNote: '  ' }, { ...valid(), followUpRequired: 'yes' },
    { ...valid(), extra: 1 }, { ...valid(), requestKey: 'not-a-uuid' }, { description: 'a', result: 'b' },
  ];
  for (const body of bad) {
    const res = await call(0, 'post', url, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ACTION');
  }
  expect((await call(0, 'post', url, [1, 2])).status).toBe(400);
  expect((await call(0, 'post', '/api/tickets/abc/actions', valid())).status).toBe(400);
  expect((await call(0, 'post', '/api/tickets/99999999/actions', valid())).status).toBe(404);
  expect(await prisma.actionTaken.count({ where: { ticketId: t.id } })).toBe(0);
});

test('follow-up note is required when follow-up is needed and discarded otherwise', async () => {
  const t = await ticket();
  const yes = await call(0, 'post', `/api/tickets/${t.id}/actions`, { ...valid(), followUpRequired: true, followUpNote: 'Check again Friday' });
  expect(yes.status).toBe(201);
  expect(yes.body).toMatchObject({ followUpRequired: true, followUpNote: 'Check again Friday' });
  const no = await call(0, 'post', `/api/tickets/${t.id}/actions`, { ...valid(), followUpRequired: false, followUpNote: 'ignored' });
  expect(no.body.followUpNote).toBeNull();
});

test('API-03 edits keep performer and date, bump the version, and stale versions return 409', async () => {
  const t = await ticket();
  const created = (await call(0, 'post', `/api/tickets/${t.id}/actions`, valid())).body;
  const url = `/api/actions/${created.id}`;
  const edited = await call(1, 'patch', url, { version: 0, result: 'Confirmed with user' });
  expect(edited.status).toBe(200);
  expect(edited.body).toMatchObject({ result: 'Confirmed with user', version: 1, performedBy: { id: users[0] }, createdAt: created.createdAt });
  const stale = await call(0, 'patch', url, { version: 0, description: 'Overwrite' });
  expect(stale.status).toBe(409);
  expect(stale.body.error.code).toBe('ACTION_CONFLICT');
  expect((await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.id } })).description).toBe('Reset the mailbox');
  const flag = await call(0, 'patch', url, { version: 1, followUpRequired: true });
  expect(flag.status).toBe(400);
  const both = await call(0, 'patch', url, { version: 1, followUpRequired: true, followUpNote: 'Call back' });
  expect(both.body).toMatchObject({ followUpRequired: true, followUpNote: 'Call back', version: 2 });
  const off = await call(0, 'patch', url, { version: 2, followUpRequired: false });
  expect(off.body).toMatchObject({ followUpRequired: false, followUpNote: null });
  expect((await call(0, 'patch', url, { version: 3 })).status).toBe(400);
  expect((await call(0, 'patch', url, { version: 3, performedById: users[1] })).status).toBe(400);
  expect((await call(0, 'patch', '/api/actions/99999999', { version: 0, result: 'x' })).status).toBe(404);
});

test('concurrent edits with one version have exactly one winner', async () => {
  const t = await ticket();
  const created = (await call(0, 'post', `/api/tickets/${t.id}/actions`, valid())).body;
  const results = await Promise.all([0, 1].map(a => call(a, 'patch', `/api/actions/${created.id}`, { version: 0, result: `Result ${a}` })));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
});

test('API-04 a staff member who is not the owner can log an action and is the performer', async () => {
  const t = await ticket();
  const res = await call(1, 'post', `/api/tickets/${t.id}/actions`, valid());
  expect(res.status).toBe(201);
  expect(res.body.performedBy.id).toBe(users[1]);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).ownerId).toBe(users[0]);
  const list = await call(0, 'post', `/api/tickets/${t.id}/actions`, valid());
  expect(list.body.performedBy.id).toBe(users[0]);
});

test('API-05 requesters cannot write; they read only their own tickets', async () => {
  const t = await ticket();
  const created = (await call(0, 'post', `/api/tickets/${t.id}/actions`, valid())).body;
  expect((await call(2, 'post', `/api/tickets/${t.id}/actions`, valid())).status).toBe(403);
  expect((await call(2, 'patch', `/api/actions/${created.id}`, { version: 0, result: 'hack' })).status).toBe(403);
  const own = await call(2, 'get', `/api/tickets/${t.id}/actions`);
  expect(own.status).toBe(200);
  expect(own.body).toHaveLength(1);
  expect((await call(3, 'get', `/api/tickets/${t.id}/actions`)).status).toBe(404);
  expect((await request(app).get(`/api/tickets/${t.id}/actions`)).status).toBe(401);
  expect((await request(app).post(`/api/tickets/${t.id}/actions`).send(valid())).status).toBe(401);
  expect(await prisma.actionTaken.count({ where: { ticketId: t.id } })).toBe(1);
  const staffList = await call(1, 'get', `/api/tickets/${t.id}/actions`);
  expect(staffList.status).toBe(200);
  expect((await call(4, 'get', `/api/tickets/${t.id}/actions`)).status).toBe(200);
});

test('lists actions oldest first with stable ordering', async () => {
  const t = await ticket();
  for (const n of [1, 2, 3]) await call(n % 2, 'post', `/api/tickets/${t.id}/actions`, { ...valid(), description: `Step ${n}` });
  const list = await call(2, 'get', `/api/tickets/${t.id}/actions`);
  expect(list.body.map((a: any) => a.description)).toEqual(['Step 1', 'Step 2', 'Step 3']);
  expect(list.body[0]).not.toHaveProperty('requestKey');
});

test('API-06 closed and cancelled tickets reject new and edited actions; other states accept', async () => {
  for (const status of ['NEW', 'OPEN', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'REOPENED']) {
    const t = await ticket(status);
    expect((await call(0, 'post', `/api/tickets/${t.id}/actions`, valid())).status).toBe(201);
  }
  for (const status of ['CLOSED', 'CANCELLED']) {
    const t = await ticket('OPEN');
    const created = (await call(0, 'post', `/api/tickets/${t.id}/actions`, valid())).body;
    await prisma.ticket.update({ where: { id: t.id }, data: { currentStatus: status as any } });
    const add = await call(0, 'post', `/api/tickets/${t.id}/actions`, valid());
    expect(add.status).toBe(409);
    expect(add.body.error.code).toBe('TICKET_TERMINAL');
    expect((await call(0, 'patch', `/api/actions/${created.id}`, { version: 0, result: 'late' })).status).toBe(409);
    expect((await call(2, 'get', `/api/tickets/${t.id}/actions`)).status).toBe(200);
  }
});

test('API-07 repeating a requestKey creates one action, even concurrently', async () => {
  const t = await ticket();
  const body = valid();
  const first = await call(0, 'post', `/api/tickets/${t.id}/actions`, body);
  const again = await call(0, 'post', `/api/tickets/${t.id}/actions`, body);
  expect([first.status, again.status]).toEqual([201, 200]);
  expect(again.body.id).toBe(first.body.id);
  const race = { ...valid() };
  const results = await Promise.all([0, 0, 1, 1].map(a => call(a, 'post', `/api/tickets/${t.id}/actions`, race)));
  expect(results.map(r => r.status).sort()).toEqual([200, 200, 200, 201]);
  expect(await prisma.actionTaken.count({ where: { ticketId: t.id } })).toBe(2);
  // the same key on another ticket is a different action
  const other = await ticket();
  expect((await call(0, 'post', `/api/tickets/${other.id}/actions`, body)).status).toBe(201);
});

test('creating and editing an action refreshes the ticket updatedAt without changing its version', async () => {
  const t = await ticket();
  const before = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
  await new Promise(r => setTimeout(r, 20));
  const created = (await call(0, 'post', `/api/tickets/${t.id}/actions`, valid())).body;
  const mid = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
  expect(mid.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  expect(mid.version).toBe(before.version);
  await new Promise(r => setTimeout(r, 20));
  await call(0, 'patch', `/api/actions/${created.id}`, { version: 0, result: 'again' });
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).updatedAt.getTime()).toBeGreaterThan(mid.updatedAt.getTime());
});
