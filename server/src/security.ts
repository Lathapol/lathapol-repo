import { randomBytes, scrypt, timingSafeEqual, createHash } from 'crypto';

export const transitions: Record<string, string[]> = {
  NEW: ['OPEN','CANCELLED'],
  OPEN: ['IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS','RESOLVED','CANCELLED'],
  RESOLVED: ['CLOSED','REOPENED'],
  REOPENED: ['OPEN','IN_PROGRESS','CANCELLED'],
  CLOSED: [], CANCELLED: [],
};
export const roles = ['REQUESTER','IT_STAFF','ADMINISTRATOR'];
export const priorities = ['LOW','MEDIUM','HIGH'];
export const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 12 && value.length <= 128;
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve,reject) => {
  scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key) => error ? reject(error) : resolve(key));
});
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password,salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  if (!stored || typeof password !== 'string' || password.length > 128) return false;
  const [scheme,salt,hash] = stored.split('$');
  if (scheme !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  return timingSafeEqual(await derive(password,salt),Buffer.from(hash,'hex'));
}
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
