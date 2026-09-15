import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma';
import { digest, randomToken, transitions } from '../src/security';

const users:number[]=[], tickets:number[]=[], sessions:{cookie:string;csrf:string}[]=[];
let categoryId:number, relatedSystemId:number;
beforeAll(async()=>{
  categoryId=(await prisma.category.findFirstOrThrow()).id;
  relatedSystemId=(await prisma.relatedSystem.findFirstOrThrow()).id;
  for(const role of ['IT_STAFF','IT_STAFF','REQUESTER','REQUESTER','ADMINISTRATOR'] as const){
    const u=await prisma.user.create({data:{name:'Workflow test',email:`${randomToken()}@example.test`,role,mustChangePassword:false}});users.push(u.id);
    const token=randomToken(),csrf=randomToken();sessions.push({cookie:`toktickit_session=${token}`,csrf});
    await prisma.session.create({data:{tokenHash:digest(token),csrfToken:csrf,userId:u.id,expiresAt:new Date(Date.now()+3600000)}});
  }
});
afterAll(async()=>{
  await prisma.ticketEntry.deleteMany({where:{ticketId:{in:tickets}}});
  await prisma.ticket.deleteMany({where:{id:{in:tickets}}});
  await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();
});
const call=(actor:number,method:'get'|'post'|'patch'|'delete',url:string,body?:any)=>request(app)[method](url).set('Cookie',sessions[actor].cookie).set('X-CSRF-Token',sessions[actor].csrf).send(body);
async function ticket(status:any='NEW'){
  const t=await prisma.ticket.create({data:{ticketNumber:`WF-${randomToken()}`,summary:'Workflow test',description:'Workflow test description',requesterId:users[2],categoryId,relatedSystemId,requestedPriority:'LOW',itPriority:'LOW',currentStatus:status}});tickets.push(t.id);return t;
}
test('concurrent claims have one winner and stale updates cannot overwrite it',async()=>{
  const t=await ticket();const results=await Promise.all([0,1].map(a=>call(a,'post',`/api/staff/tickets/${t.id}/claim`,{version:0})));
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await call(0,'patch',`/api/staff/tickets/${t.id}`,{version:0,itPriority:'HIGH'})).status).toBe(409);
  const saved=await prisma.ticket.findUniqueOrThrow({where:{id:t.id}});expect(saved.version).toBe(1);expect(saved.itPriority).toBe('LOW');
});
test('concurrent updates with the same version have exactly one winner',async()=>{
  const t=await ticket('OPEN');
  const results=await Promise.all([
    call(0,'patch',`/api/staff/tickets/${t.id}`,{version:0,itPriority:'HIGH'}),
    call(1,'patch',`/api/staff/tickets/${t.id}`,{version:0,currentStatus:'IN_PROGRESS'}),
  ]);
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await prisma.ticket.findUniqueOrThrow({where:{id:t.id}})).version).toBe(1);
});
test('supports eligible assignment/unassignment and independent IT priority',async()=>{
  const t=await ticket();const url=`/api/staff/tickets/${t.id}`;
  expect((await call(0,'patch',url,{version:0,ownerId:users[4],itPriority:'HIGH'})).status).toBe(200);
  expect((await call(0,'patch',url,{version:1,ownerId:null})).status).toBe(200);
  expect((await call(0,'patch',url,{version:2,ownerId:users[2]})).status).toBe(409);
  await prisma.user.update({where:{id:users[1]},data:{isActive:false}});
  expect((await call(0,'patch',url,{version:2,ownerId:users[1]})).status).toBe(409);
  await prisma.user.update({where:{id:users[1]},data:{isActive:true}});
  expect((await prisma.ticket.findUniqueOrThrow({where:{id:t.id}})).requestedPriority).toBe('LOW');
});
test.each(Object.entries(transitions).flatMap(([from,to])=>to.map(dest=>[from,dest])))('allows approved transition %s -> %s',async(from,to)=>{
  const t=await ticket(from);const r=await call(0,'patch',`/api/staff/tickets/${t.id}`,{version:0,currentStatus:to,confirmed:true});expect(r.status).toBe(200);expect(r.body.currentStatus).toBe(to);
});
test.each(Object.keys(transitions).flatMap(from=>Object.keys(transitions).filter(to=>!transitions[from].includes(to)).map(to=>[from,to])))('rejects forbidden transition %s -> %s',async(from,to)=>{
  const t=await ticket(from);expect((await call(0,'patch',`/api/staff/tickets/${t.id}`,{version:0,currentStatus:to,confirmed:true})).status).toBe(409);
});
test.each([['OPEN','RESOLVED'],['RESOLVED','CLOSED'],['NEW','CANCELLED']])('requires explicit confirmation %s -> %s',async(from,to)=>{
  const t=await ticket(from);expect((await call(0,'patch',`/api/staff/tickets/${t.id}`,{version:0,currentStatus:to})).status).toBe(409);
});
test.each([{version:-1,itPriority:'HIGH'},{version:0,requestedPriority:'HIGH'},{version:0,ownerId:'1'},{version:0,itPriority:'URGENT'},{version:0,currentStatus:'FAKE'},{version:0,confirmed:'true'},{version:0},null])('rejects malformed and unapproved fields %j',async body=>{
  const t=await ticket();expect((await call(0,'patch',`/api/staff/tickets/${t.id}`,body)).status).toBe(400);
});
test('enforces roles, ownership, append-only notes and safe entry metadata',async()=>{
  const t=await ticket('CLOSED');const base=`/api/tickets/${t.id}`;
  for(const actor of [2,4])expect((await call(actor,'post',`/api/staff/tickets/${t.id}/claim`,{version:0})).status).toBe(403);
  expect((await call(3,'get',base+'/comments')).status).toBe(404);
  expect((await call(3,'post',base+'/comments',{body:'foreign'})).status).toBe(404);
  expect((await call(4,'post',base+'/comments',{body:'admin write'})).status).toBe(403);
  for(const actor of [2,3])expect((await call(actor,'get',base+'/notes')).status).toBe(403);
  for(const actor of [2,4])expect((await call(actor,'post',base+'/notes',{body:'private'})).status).toBe(403);
  const note=await call(0,'post',base+'/notes',{body:'  private test note  '});expect(note.status).toBe(201);expect(note.body.author.id).toBe(users[0]);expect(note.body.body).toBe('private test note');expect(new Date(note.body.createdAt).getTime()).toBeGreaterThan(0);
  expect((await call(4,'get',base+'/notes')).body).toHaveLength(1);
  expect((await call(2,'post',base+'/comments',{body:'<script>alert(1)</script>'})).status).toBe(201);
  expect((await call(4,'get',base+'/comments')).body).toHaveLength(1);
  expect(JSON.stringify((await call(2,'get',base)).body)).not.toContain('private test note');
  expect((await call(2,'get',base+'/comments')).body).toHaveLength(1);
  expect((await call(0,'patch',base+`/notes/${note.body.id}`,{body:'edited'})).status).toBe(404);
  expect((await call(0,'delete',base+`/notes/${note.body.id}`)).status).toBe(404);
});
test.each(['comments','notes'])('validates %s boundaries and rejects spoofed author/time',async kind=>{
  const t=await ticket(),url=`/api/tickets/${t.id}/${kind}`;
  for(const body of ['', '   ', 'x'.repeat(4001),123])expect((await call(0,'post',url,{body})).status).toBe(400);
  for(const body of ['x','x'.repeat(4000)])expect((await call(0,'post',url,{body})).status).toBe(201);
  expect((await call(0,'post',url,{body:'x',authorId:users[2],createdAt:'2000-01-01'})).status).toBe(400);
});
test('apparent resolution is own-only, idempotent, independent and cleared on reopening',async()=>{
  const t=await ticket('OPEN'),url=`/api/tickets/${t.id}/appears-resolved`;
  expect((await call(3,'post',url)).status).toBe(404);
  for(const actor of [0,4])expect((await call(actor,'post',url)).status).toBe(403);
  const first=await call(2,'post',url),second=await call(2,'post',url);expect(first.status).toBe(200);expect(first.body).toEqual(second.body);
  const saved=await prisma.ticket.findUniqueOrThrow({where:{id:t.id}});expect(saved.currentStatus).toBe('OPEN');expect(saved.version).toBe(1);
  await call(0,'patch',`/api/staff/tickets/${t.id}`,{version:1,currentStatus:'RESOLVED',confirmed:true});
  const reopened=await call(0,'patch',`/api/staff/tickets/${t.id}`,{version:2,currentStatus:'REOPENED'});expect(reopened.body.requesterResolvedAt).toBeNull();
  for(const status of ['CLOSED','CANCELLED']){const closed=await ticket(status);expect((await call(2,'post',`/api/tickets/${closed.id}/appears-resolved`)).status).toBe(409)}
});
test('write routes require CSRF and validate IDs',async()=>{
  const t=await ticket();expect((await request(app).post(`/api/tickets/${t.id}/comments`).set('Cookie',sessions[0].cookie).send({body:'test'})).status).toBe(403);
  expect((await call(0,'post','/api/staff/tickets/0/claim',{version:0})).status).toBe(400);
});
