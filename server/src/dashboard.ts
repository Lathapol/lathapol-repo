import { Router } from 'express';
import { prisma } from './prisma';
import { permit } from './auth';
import { ALL_STATUSES, OPEN_GROUP, PRIORITIES, RESOLVED_GROUP, RECENT_WINDOW_MS } from './dashboardGroups';

export const dashboardRouter = Router();

const ticketRow = { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true } as const;
const staffRow = { ...ticketRow, itPriority: true, owner: { select: { id: true, name: true } } } as const;
const recentOrder = [{ updatedAt: 'desc' as const }, { id: 'desc' as const }];

dashboardRouter.get('/requester', permit('REQUESTER'), async (_req, res) => {
  const requesterId = res.locals.user.id;
  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const result = await prisma.$transaction(async tx => {
    const [openCount, waitingCount, recentlyResolvedCount, recentlyUpdated, recentlyResolved] = await Promise.all([
      tx.ticket.count({ where: { requesterId, currentStatus: { in: [...OPEN_GROUP] } } }),
      tx.ticket.count({ where: { requesterId, currentStatus: 'WAITING_FOR_REQUESTER' } }),
      tx.ticket.count({ where: { requesterId, currentStatus: { in: [...RESOLVED_GROUP] }, updatedAt: { gte: since } } }),
      tx.ticket.findMany({ where: { requesterId, updatedAt: { gte: since } }, orderBy: recentOrder, take: 5, select: ticketRow }),
      tx.ticket.findMany({ where: { requesterId, currentStatus: { in: [...RESOLVED_GROUP] }, updatedAt: { gte: since } }, orderBy: recentOrder, take: 5, select: ticketRow }),
    ]);
    return { openCount, waitingCount, recentlyResolvedCount, recentlyUpdated, recentlyResolved };
  }, { isolationLevel: 'RepeatableRead' });
  res.json({ generatedAt: new Date().toISOString(), ...result });
});

dashboardRouter.get('/staff', permit('IT_STAFF', 'ADMINISTRATOR'), async (req, res) => {
  const userId = res.locals.user.id;
  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const result = await prisma.$transaction(async tx => {
    const [unassignedCount, mineCount, byStatusRows, byPriorityRows, urgent, recentlyUpdated, recentCount, recent] = await Promise.all([
      tx.ticket.count({ where: { ownerId: null, currentStatus: { in: [...OPEN_GROUP] } } }),
      tx.ticket.count({ where: { ownerId: userId, currentStatus: { in: [...OPEN_GROUP] } } }),
      tx.ticket.groupBy({ by: ['currentStatus'], _count: { _all: true } }),
      tx.ticket.groupBy({ by: ['itPriority'], _count: { _all: true }, where: { currentStatus: { in: [...OPEN_GROUP] } } }),
      tx.ticket.findMany({ where: { itPriority: 'HIGH', currentStatus: { in: [...OPEN_GROUP] } }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: 5, select: staffRow }),
      tx.ticket.findMany({ where: { updatedAt: { gte: since } }, orderBy: recentOrder, take: 5, select: staffRow }),
      tx.actionTaken.count({ where: { performedById: userId, createdAt: { gte: since } } }),
      tx.actionTaken.findMany({ where: { performedById: userId, createdAt: { gte: since } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5,
        select: { id: true, createdAt: true, ticket: { select: { id: true, ticketNumber: true, summary: true } } } }),
    ]);
    const byStatus = Object.fromEntries(ALL_STATUSES.map(s => [s, 0])) as Record<string, number>;
    for (const row of byStatusRows) byStatus[row.currentStatus] = row._count._all;
    const byItPriority = Object.fromEntries(PRIORITIES.map(p => [p, 0])) as Record<string, number>;
    for (const row of byPriorityRows) byItPriority[row.itPriority] = row._count._all;
    let users: Record<string, number> | undefined;
    if (res.locals.user.role === 'ADMINISTRATOR') {
      const [REQUESTER, IT_STAFF, ADMINISTRATOR, inactive] = await Promise.all([
        tx.user.count({ where: { role: 'REQUESTER', isActive: true } }),
        tx.user.count({ where: { role: 'IT_STAFF', isActive: true } }),
        tx.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } }),
        tx.user.count({ where: { isActive: false } }),
      ]);
      users = { REQUESTER, IT_STAFF, ADMINISTRATOR, inactive };
    }
    return {
      unassignedCount, mineCount, byStatus, byItPriority,
      urgent: urgent.map(t => ({ ...t, owner: t.owner })),
      recentlyUpdated: recentlyUpdated.map(t => ({ ...t, owner: t.owner })),
      myActions: { recentCount, recent: recent.map(a => ({ id: a.id, ticketId: a.ticket.id, ticketNumber: a.ticket.ticketNumber, summary: a.ticket.summary, createdAt: a.createdAt })) },
      users,
    };
  }, { isolationLevel: 'RepeatableRead' });
  res.json({ generatedAt: new Date().toISOString(), ...result });
});
