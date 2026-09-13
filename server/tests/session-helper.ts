import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma';
import { digest, randomToken } from '../src/security';

// Integration fixture: exercise the real session middleware for legacy API tests.
const sessions = new Map<number,{cookie:string,csrf:string}>();
export async function prepareSessions() {
  for (const id of [1,2]) {
    await prisma.user.update({where:{id},data:{mustChangePassword:false}});
    const token=randomToken(), csrf=randomToken();
    await prisma.session.create({data:{tokenHash:digest(token),csrfToken:csrf,userId:id,expiresAt:new Date(Date.now()+3600000)}});
    sessions.set(id,{cookie:`toktickit_session=${token}`,csrf});
  }
}
export function client(id=1) {
  const session=sessions.get(id)!;
  const call=(method:'get'|'post'|'patch',url:string) => request(app)[method](url).set('Cookie',session.cookie).set('X-CSRF-Token',session.csrf);
  return {get:(url:string)=>call('get',url),post:(url:string)=>call('post',url),patch:(url:string)=>call('patch',url)};
}
export async function closeSessions() {
  await prisma.session.deleteMany({where:{csrfToken:{in:[...sessions.values()].map(s=>s.csrf)}}});
  await prisma.$disconnect();
}
