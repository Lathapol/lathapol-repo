import { Router } from 'express';
import { prisma } from './prisma';
import { fail, permit } from './auth';
import { transitions, priorities } from './security';
import { Prisma } from './generated/prisma/client';

export const workflowRouter = Router();
workflowRouter.param('id', (_req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return fail(res,400,'INVALID_ID','Invalid ticket ID.');
  next();
});
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const conflict = (message: string) => Object.assign(new Error(message), { workflowConflict: true });
const operational = { id:true, ownerId:true, itPriority:true, currentStatus:true, version:true, requesterResolvedAt:true } as const;

async function updateTicket(id: number, input: Record<string, any>, actorId: number, claim: boolean) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${id} FOR UPDATE`;
    const ticket = await tx.ticket.findUnique({where:{id}});
    if (!ticket) return null;
    if (ticket.version !== input.version) throw conflict('This ticket changed. Reload it before saving again.');
    if (claim && ticket.ownerId !== null) throw conflict('This ticket already has an owner. Reload it.');
    const ownerId = claim ? actorId : input.ownerId;
    if (ownerId !== undefined && ownerId !== null) {
      await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${ownerId} FOR SHARE`;
      const owner = await tx.user.findFirst({where:{id:ownerId,isActive:true,role:{in:['IT_STAFF','ADMINISTRATOR']}}});
      if (!owner) throw conflict('Choose an active staff member or administrator as owner.');
    }
    if (input.currentStatus !== undefined) {
      if (!transitions[ticket.currentStatus].includes(input.currentStatus)) throw conflict('This status transition is not allowed.');
      if (['RESOLVED','CLOSED','CANCELLED'].includes(input.currentStatus) && input.confirmed !== true) throw conflict('Confirm this status change before saving.');
    }
    const data: Prisma.TicketUncheckedUpdateInput = {version:{increment:1}};
    if (ownerId !== undefined) data.ownerId = ownerId;
    if (input.itPriority !== undefined) data.itPriority = input.itPriority;
    if (input.currentStatus !== undefined) data.currentStatus = input.currentStatus;
    if (input.currentStatus === 'REOPENED') data.requesterResolvedAt = null;
    return tx.ticket.update({where:{id},data,select:operational});
  });
}

for (const claim of [false,true]) {
  workflowRouter[claim ? 'post' : 'patch'](`/staff/tickets/:id${claim ? '/claim' : ''}`, permit('IT_STAFF'), async (req,res) => {
    const b = req.body;
    const allowed = claim ? ['version'] : ['version','ownerId','itPriority','currentStatus','confirmed'];
    if (!object(b) || Object.keys(b).some(k=>!allowed.includes(k)) || !Number.isInteger(b.version) || b.version < 0 || b.version >= 2147483647 ||
      (!claim && !['ownerId','itPriority','currentStatus'].some(k=>k in b)) ||
      (b.ownerId !== undefined && b.ownerId !== null && (!Number.isSafeInteger(b.ownerId) || b.ownerId < 1)) ||
      (b.itPriority !== undefined && !priorities.includes(b.itPriority)) ||
      (b.currentStatus !== undefined && !Object.keys(transitions).includes(b.currentStatus)) ||
      (b.confirmed !== undefined && typeof b.confirmed !== 'boolean')) return fail(res,400,'INVALID_UPDATE','Invalid ticket update.');
    try {
      const ticket = await updateTicket(Number(req.params.id),b,res.locals.user.id,claim);
      if (!ticket) return fail(res,404,'TICKET_NOT_FOUND','Ticket not found.');
      res.json(ticket);
    } catch (error: any) {
      if (error.workflowConflict) return fail(res,409,'TICKET_CONFLICT',error.message);
      throw error;
    }
  });
}

const entrySelect = {id:true,body:true,createdAt:true,author:{select:{id:true,name:true}}} as const;
for (const kind of ['PUBLIC','INTERNAL'] as const) {
  const route = `/tickets/:id/${kind === 'PUBLIC' ? 'comments' : 'notes'}`;
  workflowRouter.get(route, permit(...(kind === 'PUBLIC' ? ['REQUESTER','IT_STAFF','ADMINISTRATOR'] : ['IT_STAFF','ADMINISTRATOR'])), async (req,res) => {
    const ticketId = Number(req.params.id);
    const ticket = await prisma.ticket.findFirst({where:{id:ticketId,...(res.locals.user.role === 'REQUESTER' ? {requesterId:res.locals.user.id} : {})}});
    if (!ticket) return fail(res,404,'TICKET_NOT_FOUND','Ticket not found.');
    res.json(await prisma.ticketEntry.findMany({where:{ticketId,kind},select:entrySelect,orderBy:[{createdAt:'asc'},{id:'asc'}]}));
  });
  workflowRouter.post(route, permit(...(kind === 'PUBLIC' ? ['REQUESTER','IT_STAFF'] : ['IT_STAFF'])), async (req,res) => {
    const ticketId = Number(req.params.id);
    const ticket = await prisma.ticket.findFirst({where:{id:ticketId,...(res.locals.user.role === 'REQUESTER' ? {requesterId:res.locals.user.id} : {})}});
    if (!ticket) return fail(res,404,'TICKET_NOT_FOUND','Ticket not found.');
    if (!object(req.body) || Object.keys(req.body).some(k=>k!=='body') || typeof req.body.body !== 'string' || !req.body.body.trim() || req.body.body.trim().length > 4000) return fail(res,400,'INVALID_ENTRY','Enter between 1 and 4000 characters.');
    res.status(201).json(await prisma.ticketEntry.create({data:{ticketId,kind,body:req.body.body.trim(),authorId:res.locals.user.id},select:entrySelect}));
  });
}

workflowRouter.post('/tickets/:id/appears-resolved', permit('REQUESTER'), async (req,res) => {
  if (req.body !== undefined && (!object(req.body) || Object.keys(req.body).length)) return fail(res,400,'INVALID_SIGNAL','This action does not accept ticket changes.');
  try {
    const result = await prisma.$transaction(async tx => {
      const id = Number(req.params.id);
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${id} FOR UPDATE`;
      const ticket = await tx.ticket.findFirst({where:{id,requesterId:res.locals.user.id}});
      if (!ticket) return null;
      if (['CLOSED','CANCELLED'].includes(ticket.currentStatus)) throw conflict('This ticket is already closed or cancelled.');
      if (ticket.requesterResolvedAt) return {requesterResolvedAt:ticket.requesterResolvedAt};
      return tx.ticket.update({where:{id},data:{requesterResolvedAt:new Date(),version:{increment:1}},select:{requesterResolvedAt:true}});
    });
    if (!result) return fail(res,404,'TICKET_NOT_FOUND','Ticket not found.');
    res.json(result);
  } catch(error:any) {
    if(error.workflowConflict) return fail(res,409,'TICKET_CONFLICT',error.message);
    throw error;
  }
});
