import request from 'supertest';
import app from '../src/app';
import {prisma} from '../src/prisma';
import {randomToken,digest,verifyPassword} from '../src/security';

const ids:number[]=[],sessions:{cookie:string;csrf:string}[]=[];
const prefix=`users-${Date.now()}`;
const initial='Test initial password 123!';
async function session(id:number){const token=randomToken(),csrf=randomToken();await prisma.session.create({data:{tokenHash:digest(token),csrfToken:csrf,userId:id,expiresAt:new Date(Date.now()+3600000)}});return{cookie:`toktickit_session=${token}`,csrf}}
beforeAll(async()=>{
  for(const role of ['ADMINISTRATOR','ADMINISTRATOR','IT_STAFF','REQUESTER'] as const){
    const u=await prisma.user.create({data:{name:prefix,email:`${randomToken()}@example.test`,role,mustChangePassword:false}});ids.push(u.id);sessions.push(await session(u.id));
  }
});
afterAll(async()=>{await prisma.user.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect()});
const call=(actor:number,method:'get'|'post'|'patch',path:string,body?:any)=>request(app)[method](path).set('Cookie',sessions[actor].cookie).set('X-CSRF-Token',sessions[actor].csrf).send(body);
const fields=(email=`${randomToken()}@example.test`)=>({name:prefix,email,role:'REQUESTER',isActive:true,initialPassword:initial});
async function create(){const r=await call(0,'post','/api/users',fields());expect(r.status).toBe(201);ids.push(r.body.id);return r.body}
test('requires administrator access and CSRF',async()=>{
  expect((await request(app).get('/api/users')).status).toBe(401);
  for(const actor of [2,3])for(const [method,path,body] of [['get','/api/users',undefined],['post','/api/users',fields()],['patch',`/api/users/${ids[0]}`,{name:'x'}],['post',`/api/users/${ids[0]}/initial-password`,{initialPassword:initial}]] as const)expect((await call(actor,method,path,body)).status).toBe(403);
  expect((await request(app).post('/api/users').set('Cookie',sessions[0].cookie).send(fields())).status).toBe(403);
});
test('creates normalized safe accounts and rejects mixed-case duplicate email',async()=>{
  const email=`${randomToken()}@example.test`,r=await call(0,'post','/api/users',{...fields(` ${email.toUpperCase()} `),name:` ${prefix} `});expect(r.status).toBe(201);ids.push(r.body.id);
  expect(r.body.email).toBe(email);expect(r.body.name).toBe(prefix);expect(r.body.mustChangePassword).toBe(true);
  expect(Object.keys(r.body).sort()).toEqual(['email','id','isActive','mustChangePassword','name','role']);
  expect(await verifyPassword(initial,(await prisma.user.findUniqueOrThrow({where:{id:r.body.id}})).passwordHash)).toBe(true);
  expect((await call(0,'post','/api/users',fields(email.toUpperCase()))).status).toBe(409);
});
test.each([{name:''},{name:'x'.repeat(101)},{email:'bad'},{role:'ROOT'},{isActive:'true'},{initialPassword:'short'},{initialPassword:'x'.repeat(129)},{passwordHash:'spoof'},{roles:['REQUESTER']}])('rejects invalid create input %j',async changes=>{
  expect((await call(0,'post','/api/users',{...fields(),...changes})).status).toBe(400);
});
test('searches by name/email with combined role filter and validates queries',async()=>{
  const u=await create();
  const byEmail=await call(0,'get',`/api/users?search=${u.email.toUpperCase()}&role=REQUESTER`);expect(byEmail.body.map((x:any)=>x.id)).toEqual([u.id]);
  expect((await call(0,'get',`/api/users?search=${prefix}&role=IT_STAFF`)).body.map((x:any)=>x.id)).toEqual([ids[2]]);
  for(const q of ['unknown=1','role=ROOT','search[]=x',`search=${'x'.repeat(201)}`])expect((await call(0,'get',`/api/users?${q}`)).status).toBe(400);
});
test('edits accounts, rejects duplicate/invalid edits, and revokes sessions on role/activation changes',async()=>{
  const u=await create(),other=await create(),url=`/api/users/${u.id}`;
  await prisma.user.update({where:{id:u.id},data:{mustChangePassword:false}});
  const old=await session(u.id);
  const r=await call(0,'patch',url,{name:'Updated account',role:'IT_STAFF'});expect(r.status).toBe(200);expect(r.body.role).toBe('IT_STAFF');
  expect((await request(app).get('/api/auth/me').set('Cookie',old.cookie)).status).toBe(401);
  expect((await call(0,'patch',url,{email:other.email.toUpperCase()})).status).toBe(409);
  for(const body of [{role:'ROOT'},{isActive:1},{passwordHash:'x'},{},null])expect((await call(0,'patch',url,body)).status).toBe(400);
  expect((await call(0,'patch',url,{isActive:false})).status).toBe(200);
  expect((await call(0,'patch',url,{isActive:true})).status).toBe(200);
  expect((await call(0,'patch','/api/users/0',{name:'x'})).status).toBe(400);
  expect((await call(0,'patch','/api/users/2147483647',{name:'x'})).status).toBe(404);
});
test('reset invalidates sessions and enforces mandatory replacement at next login',async()=>{
  const u=await create();await prisma.user.update({where:{id:u.id},data:{mustChangePassword:false}});const old=await session(u.id);
  expect((await call(0,'post',`/api/users/${u.id}/initial-password`,{initialPassword:initial})).status).toBe(400);
  const password='Replacement initial 456!';const reset=await call(0,'post',`/api/users/${u.id}/initial-password`,{initialPassword:password});expect(reset.status).toBe(200);expect(reset.body.mustChangePassword).toBe(true);expect(reset.body.passwordHash).toBeUndefined();
  expect((await request(app).get('/api/auth/me').set('Cookie',old.cookie)).status).toBe(401);
  expect((await request(app).post('/api/auth/login').send({email:u.email,password:initial})).status).toBe(401);
  const login=await request(app).post('/api/auth/login').send({email:u.email,password});expect(login.status).toBe(200);expect(login.body.user.mustChangePassword).toBe(true);
  expect((await request(app).get('/api/categories').set('Cookie',login.headers['set-cookie'])).status).toBe(403);
});
test('prevents self-deactivation and serializes last-admin demotions',async()=>{
  expect((await call(0,'patch',`/api/users/${ids[0]}`,{isActive:false})).status).toBe(409);
  const baseline=await prisma.user.findMany({where:{role:'ADMINISTRATOR',isActive:true,id:{notIn:ids.slice(0,2)}},select:{id:true}});
  try{
    await prisma.user.updateMany({where:{id:{in:baseline.map(u=>u.id)}},data:{isActive:false}});
    const results=await Promise.all([0,1].map(actor=>call(actor,'patch',`/api/users/${ids[actor]}`,{role:'REQUESTER'})));
    expect(results.map(r=>r.status).sort()).toEqual([200,409]);
    expect(await prisma.user.count({where:{role:'ADMINISTRATOR',isActive:true}})).toBe(1);
  }finally{
    await prisma.user.updateMany({where:{id:{in:baseline.map(u=>u.id)}},data:{isActive:true}});
    await prisma.user.updateMany({where:{id:{in:ids.slice(0,2)}},data:{role:'ADMINISTRATOR',isActive:true}});
    sessions[0]=await session(ids[0]);sessions[1]=await session(ids[1]);
  }
});
