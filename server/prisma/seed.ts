import 'dotenv/config';
import {hashPassword, validPassword} from '../src/security';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = ['Account and Access', 'Hardware', 'Software', 'Network'];

const relatedSystems = [
  'Email',
  'Campus Wi-Fi',
  'VPN',
  'LEB2 App',
  'Grade Submission App',
  'Printer',
  'Corporate Laptop',
];

const requesters = [
  { name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', isActive: true },
  { name: 'Michael Brown', email: 'michael.brown@example.com', isActive: true },
  { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', isActive: true },
  { name: 'David Lee', email: 'david.lee@example.com', isActive: true },
  { name: 'Former Employee', email: 'former.employee@example.com', isActive: false },
];

async function main() {
  const initialPassword = process.env.LAB3_INITIAL_PASSWORD;
  if (initialPassword !== undefined && !validPassword(initialPassword)) throw new Error('LAB3_INITIAL_PASSWORD must have 12-128 characters.');
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  for (const r of requesters) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: r,
    });
  }

  if (initialPassword !== undefined) {
    const staff = [
      {name:'IT Staff',email:'staff@example.com',role:'IT_STAFF',isActive:true},
      {name:'Alex Chen',email:'alex.chen@example.com',role:'IT_STAFF',isActive:true},
      {name:'Morgan Lee',email:'morgan.lee@example.com',role:'IT_STAFF',isActive:true},
      {name:'Former IT Staff',email:'former.staff@example.com',role:'IT_STAFF',isActive:false},
      {name:'Administrator',email:'admin@example.com',role:'ADMINISTRATOR',isActive:true},
    ] as const;
    for (const account of staff) {
      await prisma.user.upsert({where:{email:account.email},update:{},create:account});
    }
    const requesterRows=await prisma.user.findMany({where:{email:{in:requesters.filter(r=>r.isActive).map(r=>r.email)}},orderBy:{id:'asc'}});
    const owner=await prisma.user.findUniqueOrThrow({where:{email:'staff@example.com'}});
    const categoryRows=await prisma.category.findMany({orderBy:{id:'asc'}});
    const systemRows=await prisma.relatedSystem.findMany({orderBy:{id:'asc'}});
    const statuses=['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CLOSED','REOPENED','CANCELLED'] as const;
    const priorities=['LOW','MEDIUM','HIGH'] as const;
    for(let i=0;i<24;i++) {
      // Reserved historical numbers keep fixtures separate from current-year tickets.
      const ticketNumber=`TKT-2000-${String(i+1).padStart(6,'0')}`;
      await prisma.ticket.upsert({where:{ticketNumber},update:{},create:{
        ticketNumber,requesterId:requesterRows[i%requesterRows.length].id,
        categoryId:categoryRows[i%categoryRows.length].id,relatedSystemId:systemRows[i%systemRows.length].id,
        summary:`Lab 3 example ${i+1}: ${systemRows[i%systemRows.length].name} support`,
        description:'Local demonstration ticket for queue filtering and workflow review.',
        requestedPriority:priorities[i%3],itPriority:priorities[i%3],currentStatus:statuses[i%8],
        ownerId:i%3===0?null:owner.id,
        entries:{create:[{authorId:requesterRows[i%requesterRows.length].id,kind:'PUBLIC',body:'Please help investigate this issue.'},{authorId:owner.id,kind:'INTERNAL',body:'Internal triage example; requester must not see this note.'}]},
      }});
    }
    for (const user of await prisma.user.findMany({where:{passwordHash:null}})) {
      await prisma.user.updateMany({where:{id:user.id,passwordHash:null},data:{passwordHash:await hashPassword(initialPassword),mustChangePassword:true}});
    }
  }
  console.log('Seed complete. Existing passwords and account settings preserved.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
