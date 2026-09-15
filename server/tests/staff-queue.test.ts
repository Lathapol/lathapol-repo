import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma';
import { digest, randomToken } from '../src/security';

const prefix = `queue-${Date.now()}`;
const users: number[] = [], tickets: number[] = [], cookies: string[] = [];
beforeAll(async () => {
  for (const role of ['IT_STAFF','ADMINISTRATOR','REQUESTER'] as const) {
    const user = await prisma.user.create({data:{name:`${prefix}-${role}`,email:`${prefix}-${role}@example.test`,role,mustChangePassword:false}});
    users.push(user.id);
    const token = randomToken();
    await prisma.session.create({data:{tokenHash:digest(token),csrfToken:randomToken(),userId:user.id,expiresAt:new Date(Date.now()+3600000)}});
    cookies.push(`toktickit_session=${token}`);
  }
  const category = await prisma.category.findFirstOrThrow();
  const system = await prisma.relatedSystem.findFirstOrThrow();
  for (let i=0;i<3;i++) {
    const t = await prisma.ticket.create({data:{ticketNumber:`${prefix}-${i}`,summary:`${prefix} Example ${i}`,description:'Queue integration fixture',requesterId:users[2],ownerId:i===0?users[0]:i===1?users[1]:null,categoryId:category.id,relatedSystemId:system.id,requestedPriority:'LOW',itPriority:i===2?'LOW':'HIGH',currentStatus:i===2?'NEW':'OPEN',createdAt:new Date('2026-01-01')}});
    tickets.push(t.id);
  }
});
afterAll(async () => {
  await prisma.ticket.deleteMany({where:{id:{in:tickets}}});
  await prisma.user.deleteMany({where:{id:{in:users}}});
  await prisma.$disconnect();
});
const get = (query='', actor=0) => request(app).get(`/api/staff/tickets?search=${prefix}&${query}`).set('Cookie',cookies[actor]);
test('requires staff/admin session and rejects requesters on both routes',async()=>{
  expect((await request(app).get('/api/staff/tickets')).status).toBe(401);
  expect((await get('',2)).status).toBe(403);
  expect((await request(app).get('/api/staff/owners').set('Cookie',cookies[2])).status).toBe(403);
  expect((await get('',1)).status).toBe(200);
});
test('combines status, IT priority and authenticated owner filters',async()=>{
  const result=await get('status=OPEN&priority=HIGH&owner=mine');
  expect(result.body.data.map((t:any)=>t.id)).toEqual([tickets[0]]);
  expect(result.body.data[0].requestedPriority).toBe('LOW');
  expect((await get(`owner=${users[1]}`)).body.data.map((t:any)=>t.id)).toEqual([tickets[1]]);
  expect((await get('owner=unassigned')).body.data.map((t:any)=>t.id)).toEqual([tickets[2]]);
});
test('uses stable tie sorting and clamps pages with accurate metadata',async()=>{
  const result=await get('sort=createdAt&order=asc&pageSize=2&page=999');
  expect(result.body.meta).toEqual({page:2,pageSize:2,totalCount:3,totalPages:2});
  expect(result.body.data.map((t:any)=>t.id)).toEqual([tickets[2]]);
  expect((await get('sort=itPriority&order=desc')).body.data.map((t:any)=>t.id)).toEqual([tickets[1],tickets[0],tickets[2]]);
});
test('matches ticket numbers case-insensitively and returns safe empty metadata',async()=>{
  const result=await request(app).get(`/api/staff/tickets?search=${prefix.toUpperCase()}-1`).set('Cookie',cookies[0]);
  expect(result.body.data.map((t:any)=>t.id)).toEqual([tickets[1]]);
  const empty=await get('status=CLOSED&page=20');
  expect(empty.body.meta).toEqual({page:1,pageSize:10,totalCount:0,totalPages:1});
});
test.each(['page=0','page=1.5','pageSize=51','sort=owner','order=wrong','owner=0','owner[]=mine','status=bad','priority=bad','category=-1','unknown=1','search[]=bad'])('rejects malformed query %s',async query=>{
  expect((await get(query)).status).toBe(400);
});
test('owner list exposes only active eligible users and safe fields',async()=>{
  const result=await request(app).get('/api/staff/owners').set('Cookie',cookies[0]);
  expect(result.status).toBe(200);
  expect(result.body.map((u:any)=>u.id)).toEqual(expect.arrayContaining(users.slice(0,2)));
  expect(result.body.map((u:any)=>u.id)).not.toContain(users[2]);
  expect(Object.keys(result.body[0]).sort()).toEqual(['id','isActive','name','role']);
});
