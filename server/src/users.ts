import { Router, Response } from 'express';
import { prisma } from './prisma';
import { fail, permit, safeUser } from './auth';
import { hashPassword, validPassword, verifyPassword, roles } from './security';
import { Prisma } from './generated/prisma/client';

export const usersRouter = Router();
usersRouter.use(permit('ADMINISTRATOR'));
usersRouter.param('id', (_req,res,next,id) => {
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) return fail(res,400,'INVALID_ID','Invalid user ID.');
  next();
});
const object = (v: unknown): v is Record<string,any> => !!v && typeof v === 'object' && !Array.isArray(v);
function fields(body: unknown, create: boolean) {
  if (!object(body) || Object.keys(body).some(k=>!['name','email','role','isActive',...(create?['initialPassword']:[])].includes(k)) || !Object.keys(body).length) return null;
  const b = {...body};
  if (create && ['name','email','role','isActive'].some(k=>b[k]===undefined)) return null;
  if (b.name !== undefined) {if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>100)return null;b.name=b.name.trim();}
  if (b.email !== undefined) {if(typeof b.email!=='string')return null;b.email=b.email.trim().toLowerCase();if(b.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))return null;}
  if (b.role !== undefined && !roles.includes(b.role)) return null;
  if (b.isActive !== undefined && typeof b.isActive !== 'boolean') return null;
  if (create && !validPassword(b.initialPassword)) return null;
  return b;
}
const problem = (code:string,message:string,status=409) => Object.assign(new Error(message),{userProblem:true,code,status});
function handle(error:any,res:Response) {
  if(error.userProblem)return fail(res,error.status,error.code,error.message);
  if(error.code==='P2002')return fail(res,409,'EMAIL_EXISTS','This email address is already in use.');
  throw error;
}
async function adminWrite<T>(res:Response, work:(tx:Prisma.TransactionClient)=>Promise<T>) {
  return prisma.$transaction(async tx=>{
    // Serialize account writes before counting administrators or rechecking the actor.
    await tx.$queryRaw`SELECT 1::integer AS locked FROM pg_advisory_xact_lock(334, 3)`;
    await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${res.locals.user.id} FOR SHARE`;
    const live=await tx.session.findFirst({where:{tokenHash:res.locals.session.tokenHash,expiresAt:{gt:new Date()},user:{isActive:true,role:'ADMINISTRATOR',mustChangePassword:false}}});
    if(!live)throw problem('ACCOUNT_CHANGED','Your account changed. Please sign in again.',401);
    return work(tx);
  });
}

usersRouter.get('/',async(req,res)=>{
  const q=req.query;
  if(Object.keys(q).some(k=>!['search','role'].includes(k))||(q.search!==undefined&&(typeof q.search!=='string'||q.search.length>200))||(q.role!==undefined&&(typeof q.role!=='string'||!roles.includes(q.role))))return fail(res,400,'INVALID_QUERY','Invalid user search or role filter.');
  const where:Prisma.UserWhereInput={};
  if(q.search)where.OR=[{name:{contains:q.search as string,mode:'insensitive'}},{email:{contains:q.search as string,mode:'insensitive'}}];
  if(q.role)where.role=q.role as any;
  res.json(await prisma.user.findMany({where,select:safeUser,orderBy:[{name:'asc'},{id:'asc'}]}));
});
usersRouter.post('/',async(req,res)=>{
  const b=fields(req.body,true);
  if(!b)return fail(res,400,'INVALID_USER','Use a name (1–100 characters), valid email, one role, active status and initial password (12–128 characters).');
  const passwordHash=await hashPassword(b.initialPassword);
  try {
    const user=await adminWrite(res,tx=>tx.user.create({data:{name:b.name,email:b.email,role:b.role,isActive:b.isActive,passwordHash,mustChangePassword:true},select:safeUser}));
    res.status(201).json(user);
  }catch(error){handle(error,res);}
});
usersRouter.patch('/:id',async(req,res)=>{
  const b=fields(req.body,false),id=Number(req.params.id);
  if(!b)return fail(res,400,'INVALID_USER','Enter valid account fields.');
  try {
    const user=await adminWrite(res,async tx=>{
      await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${id} FOR UPDATE`;
      const current=await tx.user.findUnique({where:{id}});
      if(!current)throw problem('USER_NOT_FOUND','User not found.',404);
      if(id===res.locals.user.id && b.isActive===false)throw problem('SELF_DEACTIVATION','You cannot deactivate your own account.');
      if(current.isActive&&current.role==='ADMINISTRATOR'&&(b.isActive===false||(b.role!==undefined&&b.role!=='ADMINISTRATOR'))){
        if(await tx.user.count({where:{role:'ADMINISTRATOR',isActive:true}})<=1)throw problem('LAST_ADMIN','At least one active administrator must remain.');
      }
      const updated=await tx.user.update({where:{id},data:b,select:safeUser});
      if(updated.role!==current.role||!updated.isActive)await tx.session.deleteMany({where:{userId:id}});
      return updated;
    });
    res.json(user);
  }catch(error){handle(error,res);}
});
usersRouter.post('/:id/initial-password',async(req,res)=>{
  const b=req.body,id=Number(req.params.id);
  if(!object(b)||Object.keys(b).some(k=>k!=='initialPassword')||!validPassword(b.initialPassword))return fail(res,400,'INVALID_PASSWORD','Use an initial password of 12–128 characters.');
  const passwordHash=await hashPassword(b.initialPassword);
  try {
    const user=await adminWrite(res,async tx=>{
      await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${id} FOR UPDATE`;
      const current=await tx.user.findUnique({where:{id}});
      if(!current)throw problem('USER_NOT_FOUND','User not found.',404);
      if(await verifyPassword(b.initialPassword,current.passwordHash))throw problem('PASSWORD_REUSED','Choose a different initial password.',400);
      const updated=await tx.user.update({where:{id},data:{passwordHash,mustChangePassword:true},select:safeUser});
      await tx.session.deleteMany({where:{userId:id}});
      return updated;
    });
    res.json(user);
  }catch(error){handle(error,res);}
});
