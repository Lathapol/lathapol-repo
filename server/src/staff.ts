import { Router } from 'express';
import { prisma } from './prisma';
import { permit } from './auth';
import { Prisma, Priority, TicketStatus } from './generated/prisma/client';

export const staffRouter = Router();
staffRouter.use(permit('IT_STAFF', 'ADMINISTRATOR'));

staffRouter.get('/owners', async (_req, res) => {
  const owners = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['IT_STAFF', 'ADMINISTRATOR'] } },
    select: { id: true, name: true, role: true, isActive: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
  res.json(owners);
});

staffRouter.get('/tickets', async (req, res) => {
  const q = req.query;
  const positive = (v: unknown) => typeof v === 'string' && /^[1-9]\d*$/.test(v) && Number.isSafeInteger(Number(v));
  const oneOf = (v: unknown, values: string[]) => v === undefined || (typeof v === 'string' && values.includes(v));
  if (Object.keys(q).some(k => !['search','category','priority','status','owner','sort','order','page','pageSize'].includes(k)) ||
    (q.search !== undefined && (typeof q.search !== 'string' || q.search.length > 200)) ||
    ['category','page','pageSize'].some(k => q[k] !== undefined && !positive(q[k])) ||
    Number(q.pageSize) > 50 || !oneOf(q.priority, Object.values(Priority)) ||
    !oneOf(q.status, Object.values(TicketStatus)) ||
    !oneOf(q.sort, ['createdAt','updatedAt','ticketNumber','itPriority']) ||
    !oneOf(q.order, ['asc','desc']) ||
    (!oneOf(q.owner, ['all','mine','unassigned']) && !positive(q.owner))) {
    return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Invalid queue filter or pagination.' } });
  }
  const where: Prisma.TicketWhereInput = {};
  if (q.search) where.OR = [{ ticketNumber: { contains: q.search as string, mode: 'insensitive' } }, { summary: { contains: q.search as string, mode: 'insensitive' } }];
  if (q.category) where.categoryId = Number(q.category);
  if (q.priority) where.itPriority = q.priority as Priority;
  if (q.status) where.currentStatus = q.status as TicketStatus;
  if (q.owner === 'mine') where.ownerId = res.locals.user.id;
  else if (q.owner === 'unassigned') where.ownerId = null;
  else if (positive(q.owner)) where.ownerId = Number(q.owner);
  const pageSize = Number(q.pageSize || 10);
  const order = (q.order || 'desc') as 'asc' | 'desc';
  const result = await prisma.$transaction(async tx => {
    const totalCount = await tx.ticket.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(Number(q.page || 1), totalPages);
    const tickets = await tx.ticket.findMany({ where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ [q.sort as string || 'createdAt']: order }, { id: order }],
      select: { id: true, ticketNumber: true, summary: true, requestedPriority: true, itPriority: true,
        currentStatus: true, createdAt: true, updatedAt: true, category: { select: { name: true } },
        requester: { select: { id: true, name: true } }, owner: { select: { id: true, name: true } } },
    });
    return { data: tickets.map(t => ({ ...t, category: t.category.name })), meta: { page, pageSize, totalCount, totalPages } };
  }, { isolationLevel: 'RepeatableRead' });
  res.json(result);
});
