import { Router, RequestHandler, Response, Request } from 'express';
import { prisma } from './prisma';
import { digest, hashPassword, randomToken, validPassword, verifyPassword } from './security';

export const safeUser = {id:true,name:true,email:true,role:true,isActive:true,mustChangePassword:true} as const;
export const fail = (res: Response,status: number,code: string,message: string) => res.status(status).json({error:{code,message}});
const cookieName = 'toktickit_session';
const cookieOptions = {httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV === 'production',path:'/'};
export function tokenFrom(req: Request) {
  return (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${cookieName}=`))?.slice(cookieName.length+1) || '';
}
async function createSession(userId: number,tx: any) {
  const token = randomToken();
  const session = await tx.session.create({data:{userId,tokenHash:digest(token),csrfToken:randomToken(),expiresAt:new Date(Date.now()+8*3600000)}});
  return {session,token};
}
export const authenticate: RequestHandler = async (req,res,next) => {
  const token = tokenFrom(req);
  if (!/^[a-f0-9]{64}$/.test(token)) {fail(res,401,'UNAUTHENTICATED','Please sign in.');return;}
  const session = await prisma.session.findUnique({where:{tokenHash:digest(token)},include:{user:{select:safeUser}}});
  if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    res.clearCookie(cookieName,cookieOptions);fail(res,401,'UNAUTHENTICATED','Please sign in again.');return;
  }
  res.locals.session = session;
  res.locals.user = session.user;
  next();
};
export const csrf: RequestHandler = (req,res,next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('X-CSRF-Token') !== res.locals.session.csrfToken) {
    fail(res,403,'CSRF_REQUIRED','Refresh the page and try again.');return;
  }
  next();
};
export const completedPassword: RequestHandler = (_req,res,next) => {
  if (res.locals.user.mustChangePassword) {fail(res,403,'PASSWORD_CHANGE_REQUIRED','Change your initial password to continue.');return;}
  next();
};
export const permit = (...allowed: string[]): RequestHandler => (_req,res,next) => {
  if (!allowed.includes(res.locals.user.role)) {fail(res,403,'FORBIDDEN','You do not have permission for this action.');return;}
  next();
};
export const originGuard: RequestHandler = (req,res,next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('Origin') && req.get('Origin') !== (process.env.APP_ORIGIN || 'http://localhost:5173')) {
    fail(res,403,'ORIGIN_FORBIDDEN','Request origin is not permitted.');return;
  }
  next();
};

const attempts = new Map<string,{count:number,until:number}>();
function consume(key: string,limit: number) {
  const now = Date.now();
  // Clear expired entries and bound memory during the single-process lab run.
  for (const [k,v] of attempts) if (v.until <= now) attempts.delete(k);
  if (attempts.size > 10000 && !attempts.has(key)) return false;
  const item = attempts.get(key) || {count:0,until:now+15*60000};
  item.count++;attempts.set(key,item);return item.count <= limit;
}
const dummyHash = hashPassword(randomToken());
export const authRouter = Router();
authRouter.post('/login', async (req,res) => {
  if (!req.is('application/json')) {fail(res,400,'JSON_REQUIRED','Send a JSON login request.');return;}
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!email || email.length>254 || typeof password !== 'string' || password.length>128) {fail(res,400,'INVALID_CREDENTIALS','Enter an email address and password.');return;}
  const ipOK=consume(`ip:${req.ip}`,100), emailOK=consume(`email:${email}`,10);
  if (!ipOK || !emailOK) {res.set('Retry-After','900');fail(res,429,'LOGIN_LIMIT','Too many login attempts. Try again in 15 minutes.');return;}
  const user = await prisma.user.findUnique({where:{email}});
  const valid = await verifyPassword(password,user?.passwordHash || await dummyHash);
  if (!user || !user.isActive || !valid) {fail(res,401,'INVALID_CREDENTIALS','Email or password is incorrect, or the account is unavailable.');return;}
  attempts.delete(`email:${email}`);
  const ipAttempt = attempts.get(`ip:${req.ip}`);
  if (ipAttempt) ipAttempt.count = Math.max(0, ipAttempt.count - 1);
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({where:{id:user.id}});
    if (!current.isActive || current.passwordHash !== user.passwordHash) throw Object.assign(new Error(),{code:'ACCOUNT_CHANGED'});
    await tx.session.deleteMany({where:{tokenHash:digest(tokenFrom(req))}});
    return {...await createSession(user.id,tx),user:await tx.user.findUnique({where:{id:user.id},select:safeUser})};
  });
  res.cookie(cookieName,result.token,{...cookieOptions,maxAge:8*3600000});
  res.json({user:result.user,csrfToken:result.session.csrfToken});
});
authRouter.use(authenticate,csrf);
authRouter.get('/me',(_req,res) => res.json({user:res.locals.user,csrfToken:res.locals.session.csrfToken}));
authRouter.post('/logout',async (_req,res) => {
  await prisma.session.deleteMany({where:{tokenHash:res.locals.session.tokenHash}});
  res.clearCookie(cookieName,cookieOptions).status(204).end();
});
authRouter.post('/change-password',async (req,res) => {
  const {currentPassword,newPassword,confirmPassword} = req.body || {};
  if (!validPassword(newPassword) || newPassword !== confirmPassword) {fail(res,400,'INVALID_PASSWORD','Use 12-128 characters and matching confirmation.');return;}
  const user = await prisma.user.findUniqueOrThrow({where:{id:res.locals.user.id}});
  if (!await verifyPassword(currentPassword,user.passwordHash)) {fail(res,400,'INCORRECT_PASSWORD','Current password is incorrect.');return;}
  if (currentPassword === newPassword) {fail(res,400,'PASSWORD_REUSED','Choose a different password.');return;}
  const passwordHash = await hashPassword(newPassword);
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${user.id} FOR UPDATE`;
    const live = await tx.session.findUnique({where:{tokenHash:res.locals.session.tokenHash}});
    if (!live || live.expiresAt.getTime() <= Date.now()) throw Object.assign(new Error(),{code:'ACCOUNT_CHANGED'});
    const result = await tx.user.updateMany({where:{id:user.id,passwordHash:user.passwordHash,isActive:true},data:{passwordHash,mustChangePassword:false}});
    if (!result.count) throw Object.assign(new Error('Account changed. Please sign in again.'),{status:409,code:'ACCOUNT_CHANGED'});
    await tx.session.deleteMany({where:{userId:user.id}});
    return {...await createSession(user.id,tx),user:await tx.user.findUnique({where:{id:user.id},select:safeUser})};
  });
  res.cookie(cookieName,result.token,{...cookieOptions,maxAge:8*3600000});
  res.json({user:result.user,csrfToken:result.session.csrfToken});
});
