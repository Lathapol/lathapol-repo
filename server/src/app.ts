import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import { generateTicketNumber } from './ticketNumber';
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  });
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/requesters', async (req, res) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(requesters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requesters' });
  }
});

app.get('/api/related-systems', async (req, res) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(relatedSystems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch related systems' });
  }
});
app.post('/api/tickets', async (req, res) => {
  try {
    const { requesterId, categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

    const trimmedSummary = (summary ?? '').trim();
    const trimmedDescription = (description ?? '').trim();

    if (trimmedSummary.length < 5 || trimmedSummary.length > 150) {
      return res.status(400).json({ error: { code: 'INVALID_SUMMARY', message: 'Summary must be between 5 and 150 characters.' } });
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      return res.status(400).json({ error: { code: 'INVALID_DESCRIPTION', message: 'Description must be between 10 and 2000 characters.' } });
    }
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(requestedPriority)) {
      return res.status(400).json({ error: { code: 'INVALID_PRIORITY', message: 'Requested priority is invalid.' } });
    }

    const requester = await prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true } });
    if (!requester) {
      return res.status(404).json({ error: { code: 'REQUESTER_NOT_FOUND', message: 'Requester not found or inactive.' } });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ error: { code: 'INVALID_CATEGORY', message: 'Category is invalid.' } });
    }

    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true } });
    if (!relatedSystem) {
      return res.status(400).json({ error: { code: 'INVALID_RELATED_SYSTEM', message: 'Related system is invalid.' } });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId,
        relatedSystemId,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
      },
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create ticket.' } });
  }
});

app.get('/api/tickets', async (req, res) => {
  try {
    const requesterId = Number(req.query.requesterId);
    if (!requesterId) {
      return res.status(400).json({ error: { code: 'MISSING_REQUESTER', message: 'requesterId is required.' } });
    }

    const search = (req.query.search as string) || '';
    const categoryId = req.query.category ? Number(req.query.category) : undefined;
    const requestedPriority = req.query.priority as string | undefined;
    const currentStatus = req.query.status as string | undefined;

    const sortField = (req.query.sort as string) || 'createdAt';
    const sortOrder = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
    const allowedSortFields = ['createdAt', 'updatedAt', 'ticketNumber'];
    const sortBy = allowedSortFields.includes(sortField) ? sortField : 'createdAt';

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));

    const where: any = { requesterId };

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (requestedPriority) where.requestedPriority = requestedPriority;
    if (currentStatus) where.currentStatus = currentStatus;

    const totalCount = await prisma.ticket.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true } },
      },
    });

    res.status(200).json({
      data: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        category: t.category.name,
        requestedPriority: t.requestedPriority,
        currentStatus: t.currentStatus,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      meta: {
        page: safePage,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch tickets.' } });
  }
});

export default app;