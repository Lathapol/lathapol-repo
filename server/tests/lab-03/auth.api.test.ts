import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/prisma';
import { digest, hashPassword } from '../../src/security';

const password='Initial password 123!';
const nextPassword='Changed password 456!';
let id:number;
const email=`auth-${Date.now()}@example.com`;
const login=(secret=password) => request(app).post('/api/auth/login').send({email,password:secret});
const cookie=(response:any):string => response.headers['set-cookie'][0].split(';')[0];

beforeAll(async()=>{
  if (!process.env.DATABASE_URL?.includes('toktickit_lab4_test')) throw new Error('Use the isolated toktickit_lab4_test database.');
  id=(await prisma.user.create({data:{name:'Auth test',email,passwordHash:await hashPassword(password)}})).id;
});
afterAll(async()=>{if(id) await prisma.user.delete({where:{id}}); await prisma.$disconnect();});

it('rejects missing sessions and invalid login without leaking account details',async()=>{
  expect((await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{')).status).toBe(400);
  expect((await request(app).get('/api/tickets')).status).toBe(401);
  const wrong=await login('wrong');
  const unknown=await request(app).post('/api/auth/login').send({email:'unknown@example.com',password:'wrong'});
  expect(wrong.status).toBe(401);
  expect(unknown.body).toEqual(wrong.body);
});

it('issues a restricted secure cookie session, rotates it on password change, and revokes other sessions',async()=>{
  const first=await login(),second=await login();
  expect(first.status).toBe(200);
  expect(first.body.user.passwordHash).toBeUndefined();
  expect(first.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(first.headers['set-cookie'][0]).toContain('SameSite=Lax');
  expect(first.headers['cache-control']).toBe('no-store');
  const token=cookie(first).split('=')[1];
  expect(await prisma.session.findUnique({where:{tokenHash:token}})).toBeNull();
  expect(await prisma.session.findUnique({where:{tokenHash:digest(token)}})).not.toBeNull();
  expect((await request(app).get('/api/auth/me').set('Cookie',cookie(first))).status).toBe(200);
  const blocked=await request(app).get('/api/tickets').set('Cookie',cookie(first));
  expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  const change=(body:any,csrf=first.body.csrfToken)=>request(app).post('/api/auth/change-password').set('Cookie',cookie(first)).set('X-CSRF-Token',csrf).send(body);
  expect((await change({currentPassword:password,newPassword:nextPassword,confirmPassword:nextPassword},'wrong')).status).toBe(403);
  expect((await change({currentPassword:password,newPassword:'short',confirmPassword:'short'})).status).toBe(400);
  expect((await change({currentPassword:password,newPassword:password,confirmPassword:password})).status).toBe(400);
  const changed=await change({currentPassword:password,newPassword:nextPassword,confirmPassword:nextPassword});
  expect(changed.status).toBe(200);
  expect(changed.body.user.mustChangePassword).toBe(false);
  expect(cookie(changed)).not.toBe(cookie(first));
  for(const old of [first,second]) expect((await request(app).get('/api/auth/me').set('Cookie',cookie(old))).status).toBe(401);
  expect((await request(app).get('/api/tickets').set('Cookie',cookie(changed))).status).toBe(200);
  expect((await login()).status).toBe(401);
  expect((await login(nextPassword)).status).toBe(200);
});

it('enforces origin and CSRF, then invalidates logout',async()=>{
  const signed=await login(nextPassword);
  expect((await request(app).post('/api/auth/logout').set('Cookie',cookie(signed))).status).toBe(403);
  expect((await request(app).post('/api/auth/logout').set('Cookie',cookie(signed)).set('X-CSRF-Token',signed.body.csrfToken).set('Origin','https://evil.example')).status).toBe(403);
  expect((await request(app).post('/api/auth/logout').set('Cookie',cookie(signed)).set('X-CSRF-Token',signed.body.csrfToken)).status).toBe(204);
  expect((await request(app).get('/api/auth/me').set('Cookie',cookie(signed))).status).toBe(401);
});

it('checks expiration, current active status and role on every request',async()=>{
  const signed=await login(nextPassword);
  await prisma.user.update({where:{id},data:{role:'ADMINISTRATOR'}});
  expect((await request(app).post('/api/tickets').set('Cookie',cookie(signed)).set('X-CSRF-Token',signed.body.csrfToken).send({})).status).toBe(403);
  await prisma.user.update({where:{id},data:{isActive:false}});
  expect((await request(app).get('/api/auth/me').set('Cookie',cookie(signed))).status).toBe(401);
  expect((await login(nextPassword)).status).toBe(401);
  await prisma.user.update({where:{id},data:{isActive:true}});
  await prisma.session.updateMany({where:{userId:id},data:{expiresAt:new Date(0)}});
  expect((await request(app).get('/api/auth/me').set('Cookie',cookie(signed))).status).toBe(401);
});

it('limits repeated failed login attempts',async()=>{
  const limitedEmail=`limit-${Date.now()}@example.com`;
  for(let i=0;i<10;i++) expect((await request(app).post('/api/auth/login').send({email:limitedEmail,password:'wrong'})).status).toBe(401);
  const limited=await request(app).post('/api/auth/login').send({email:limitedEmail,password:'wrong'});
  expect(limited.status).toBe(429);
  expect(limited.headers['retry-after']).toBe('900');
});

it('allows only one simultaneous password change to commit',async()=>{
  const current=await login(nextPassword);
  const change=()=>request(app).post('/api/auth/change-password').set('Cookie',cookie(current)).set('X-CSRF-Token',current.body.csrfToken).send({currentPassword:nextPassword,newPassword:password,confirmPassword:password});
  const results=await Promise.all([change(),change()]);
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  // Restore the shared credential for subsequent tests.
  await prisma.user.update({where:{id},data:{passwordHash:await hashPassword(nextPassword)}});
});


