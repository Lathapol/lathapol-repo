import { Router } from 'express';
import { prisma } from './prisma';
import { fail, permit } from './auth';
import { followUpError, parseCreate, parseUpdate } from './actionValidation';

export const actionsRouter = Router();
actionsRouter.param('id', (_req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return fail(res, 400, 'INVALID_ID', 'Invalid resource ID.');
  next();
});

const select = {
  id: true, ticketId: true, description: true, result: true, followUpRequired: true, followUpNote: true,
  attachmentNotes: true, version: true, createdAt: true, updatedAt: true,
  performedBy: { select: { id: true, name: true } },
} as const;
const terminal = ['CLOSED', 'CANCELLED'];
const actionError = (status: number, code: string, message: string) => Object.assign(new Error(message), { actionError: { status, code, message } });

actionsRouter.get('/tickets/:id/actions', permit('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'), async (req, res) => {
  const ticketId = Number(req.params.id);
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, ...(res.locals.user.role === 'REQUESTER' ? { requesterId: res.locals.user.id } : {}) }, select: { id: true } });
  if (!ticket) return fail(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found.');
  res.json(await prisma.actionTaken.findMany({ where: { ticketId }, select, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }));
});

actionsRouter.post('/tickets/:id/actions', permit('IT_STAFF', 'ADMINISTRATOR'), async (req, res) => {
  const ticketId = Number(req.params.id);
  const parsed = parseCreate(req.body);
  if ('error' in parsed) return fail(res, 400, 'INVALID_ACTION', parsed.error);
  const input = parsed.data;
  try {
    // The ticket row lock serializes repeats of one requestKey and concurrent status changes.
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { currentStatus: true } });
      if (!ticket) return null;
      const existing = await tx.actionTaken.findUnique({ where: { ticketId_requestKey: { ticketId, requestKey: input.requestKey } }, select });
      if (existing) return { action: existing, created: false };
      if (terminal.includes(ticket.currentStatus)) throw actionError(409, 'TICKET_TERMINAL', 'This ticket is closed or cancelled, so actions can no longer be added.');
      const action = await tx.actionTaken.create({ data: { ...input, ticketId, performedById: res.locals.user.id }, select });
      await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      return { action, created: true };
    });
    if (!result) return fail(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found.');
    res.status(result.created ? 201 : 200).json(result.action);
  } catch (error: any) {
    if (error.actionError) return fail(res, error.actionError.status, error.actionError.code, error.actionError.message);
    throw error;
  }
});

actionsRouter.patch('/actions/:id', permit('IT_STAFF', 'ADMINISTRATOR'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = parseUpdate(req.body);
  if ('error' in parsed) return fail(res, 400, 'INVALID_ACTION', parsed.error);
  const { version, ...changes } = parsed.data;
  try {
    const action = await prisma.$transaction(async tx => {
      const found = await tx.actionTaken.findUnique({ where: { id }, select: { ticketId: true } });
      if (!found) return null;
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${found.ticketId} FOR UPDATE`;
      const current = await tx.actionTaken.findUniqueOrThrow({ where: { id }, include: { ticket: { select: { currentStatus: true } } } });
      if (current.version !== version) throw actionError(409, 'ACTION_CONFLICT', 'This action changed. Reload it before saving again.');
      if (terminal.includes(current.ticket.currentStatus)) throw actionError(409, 'TICKET_TERMINAL', 'This ticket is closed or cancelled, so actions can no longer be changed.');
      const followUpRequired = changes.followUpRequired ?? current.followUpRequired;
      const followUpNote = 'followUpNote' in changes ? changes.followUpNote : current.followUpNote;
      const problem = followUpError(followUpRequired, followUpNote);
      if (problem) throw actionError(400, 'INVALID_ACTION', problem);
      const updated = await tx.actionTaken.update({
        where: { id },
        data: { ...changes, followUpRequired, followUpNote: followUpRequired ? followUpNote : null, version: { increment: 1 } },
        select,
      });
      await tx.ticket.update({ where: { id: found.ticketId }, data: { updatedAt: new Date() } });
      return updated;
    });
    if (!action) return fail(res, 404, 'ACTION_NOT_FOUND', 'Action not found.');
    res.json(action);
  } catch (error: any) {
    if (error.actionError) return fail(res, error.actionError.status, error.actionError.code, error.actionError.message);
    throw error;
  }
});
