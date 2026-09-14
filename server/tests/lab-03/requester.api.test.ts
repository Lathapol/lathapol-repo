import request from 'supertest';
import app from '../../src/app';
import {prisma} from '../../src/prisma';
import {client,prepareSessions,closeSessions} from '../session-helper';
import fs from 'fs';
import path from 'path';
import {uploadDirectory} from '../../src/upload';
let ticketId:number;
beforeAll(async()=>{
  await prepareSessions();
  const ticket=await client().post('/api/tickets').send({requesterId:2,categoryId:1,relatedSystemId:1,summary:'Requester security test',description:'This fixture verifies requester authorization.',requestedPriority:'HIGH'});
  expect(ticket.status).toBe(201);expect(ticket.body.requesterId).toBe(1);ticketId=ticket.body.id;
});
afterAll(async()=>{
  if(ticketId){for(const attachment of await prisma.attachment.findMany({where:{ticketId}}))await fs.promises.unlink(path.join(uploadDirectory,attachment.storedName)).catch(()=>{});await prisma.attachment.deleteMany({where:{ticketId}});await prisma.ticket.delete({where:{id:ticketId}});}
  await closeSessions();
});
it('blocks direct foreign detail/upload and leaves no unauthorized file',async()=>{
  expect((await client(2).get(`/api/tickets/${ticketId}?requesterId=1`)).status).toBe(404);
  const before=fs.readdirSync(uploadDirectory);
  expect((await client(2).post(`/api/tickets/${ticketId}/attachments`).attach('file',Buffer.from('test'),{filename:'foreign.pdf',contentType:'application/pdf'})).status).toBe(404);
  expect(fs.readdirSync(uploadDirectory)).toEqual(before);
});
it.each(['page=1.5','page=-1','pageSize=51','category=abc','status=FAKE','priority=URGENT','sort=passwordHash','order=sideways','search[x]=foo'])('rejects invalid query %s',async query=>{
  expect((await client().get(`/api/tickets?${query}`)).status).toBe(400);
});
it('serializes simultaneous uploads to enforce five active files',async()=>{
  const responses=await Promise.all(Array.from({length:6},(_,i)=>client().post(`/api/tickets/${ticketId}/attachments`).attach('file',Buffer.from('test'),{filename:`limit-${i}.pdf`,contentType:'application/pdf'})));
  expect(responses.filter(r=>r.status===201)).toHaveLength(5);
  expect(responses.filter(r=>r.status===400&&r.body.error.code==='MAX_ATTACHMENTS')).toHaveLength(1);
  expect(await prisma.attachment.count({where:{ticketId,isRemoved:false}})).toBe(5);
});
it('requires authentication before accepting an upload',async()=>{
  expect((await request(app).post(`/api/tickets/${ticketId}/attachments`).attach('file',Buffer.from('test'),{filename:'test.pdf',contentType:'application/pdf'})).status).toBe(401);
});
