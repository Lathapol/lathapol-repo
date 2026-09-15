import { workflowRouter } from './workflow';
import { staffRouter } from './staff';
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { generateTicketNumber } from "./ticketNumber";
import { authRouter, authenticate, completedPassword, csrf, originGuard, permit } from './auth';
import { upload, uploadDirectory } from "./upload";

const app = express();
app.use(cors({origin: process.env.APP_ORIGIN || 'http://localhost:5173', credentials: true}));
app.use('/api', (_req,res,next) => {res.set('Cache-Control','no-store'); next();});
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

app.use('/api', originGuard);
app.use('/api/auth', authRouter);
app.use('/api', authenticate, completedPassword, csrf);
app.use('/api/staff', staffRouter);
app.use('/api', workflowRouter);
app.param('id',(req,res,next,value)=>{if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value)))return res.status(400).json({error:{code:'INVALID_ID',message:'Invalid resource ID.'}});next();});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/related-systems", async (req, res) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(relatedSystems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

app.post("/api/tickets", permit("REQUESTER"), async (req, res) => {
  try {
    const requesterId = res.locals.user.id;
    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (trimmedSummary.length < 5 || trimmedSummary.length > 150) {
      return res.status(400).json({ error: { code: "INVALID_SUMMARY", message: "Summary must be between 5 and 150 characters." } });
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      return res.status(400).json({ error: { code: "INVALID_DESCRIPTION", message: "Description must be between 10 and 2000 characters." } });
    }
    if (!["LOW", "MEDIUM", "HIGH"].includes(requestedPriority)) {
      return res.status(400).json({ error: { code: "INVALID_PRIORITY", message: "Requested priority is invalid." } });
    }

    const requester = await prisma.user.findFirst({ where: { id: requesterId, isActive: true } });
    if (!requester) {
      return res.status(404).json({ error: { code: "REQUESTER_NOT_FOUND", message: "Requester not found or inactive." } });
    }

    if (!Number.isSafeInteger(categoryId) || categoryId < 1 || !Number.isSafeInteger(relatedSystemId) || relatedSystemId < 1) return res.status(400).json({error:{code:'INVALID_REFERENCE',message:'Choose a category and related system.'}});
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ error: { code: "INVALID_CATEGORY", message: "Category is invalid." } });
    }

    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true } });
    if (!relatedSystem) {
      return res.status(400).json({ error: { code: "INVALID_RELATED_SYSTEM", message: "Related system is invalid." } });
    }

    let ticket;
    for(let attempt=0;attempt<5;attempt++) {
      const ticketNumber = await generateTicketNumber();
      try { ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId,
        relatedSystemId,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
        itPriority: requestedPriority,
      },
    });

      break;
      } catch(error:any) {if(error.code !== 'P2002' || attempt===4)throw error;}
    }
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to create ticket." } });
  }
});

app.get("/api/tickets", permit("REQUESTER"), async (req, res) => {
  try {
    const requesterId = res.locals.user.id;
    if (!requesterId) {
      return res.status(400).json({ error: { code: "MISSING_REQUESTER", message: "requesterId is required." } });
    }

    const q=req.query;
    if(Object.keys(q).some(k=>!['requesterId','search','category','priority','status','sort','order','page','pageSize'].includes(k)))return res.status(400).json({error:{code:'INVALID_QUERY',message:'Unknown ticket filter.'}});
    const positive=(v:unknown)=>typeof v==='string' && /^[1-9]\d*$/.test(v) && Number.isSafeInteger(Number(v));
    if ((q.search!==undefined && (typeof q.search!=='string'||q.search.length>200)) ||
      ['category','page','pageSize'].some(k=>q[k]!==undefined&&!positive(q[k])) ||
      (q.pageSize!==undefined&&Number(q.pageSize)>50) ||
      (q.priority!==undefined&&!['LOW','MEDIUM','HIGH'].includes(q.priority as string)) ||
      (q.status!==undefined&&!['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CLOSED','REOPENED','CANCELLED'].includes(q.status as string)) ||
      (q.sort!==undefined&&!['createdAt','updatedAt','ticketNumber'].includes(q.sort as string)) ||
      (q.order!==undefined&&!['asc','desc'].includes(q.order as string))) return res.status(400).json({error:{code:'INVALID_QUERY',message:'Invalid ticket filter or pagination.'}});
    const search = (req.query.search as string) || "";
    const categoryId = req.query.category ? Number(req.query.category) : undefined;
    const requestedPriority = req.query.priority as string | undefined;
    const currentStatus = req.query.status as string | undefined;

    const sortField = (req.query.sort as string) || "createdAt";
    const sortOrder = (req.query.order as string) === "asc" ? "asc" : "desc";
    const allowedSortFields = ["createdAt", "updatedAt", "ticketNumber"];
    const sortBy = allowedSortFields.includes(sortField) ? sortField : "createdAt";

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));

    const where: any = { requesterId };

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
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
      orderBy: [{ [sortBy]: sortOrder },{id:sortOrder}],
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
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch tickets." } });
  }
});

app.get("/api/tickets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const requesterId = res.locals.user.id;
    if (!requesterId) {
      return res.status(400).json({ error: { code: "MISSING_REQUESTER", message: "requesterId is required." } });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id, ...(res.locals.user.role==='REQUESTER'?{requesterId}:{}) },
      include: {
        category: { select: { name: true } },
        relatedSystem: { select: { name: true } },
        requester: { select: { name: true } },
        owner: { select: { id: true, name: true, role: true, isActive: true } },
        attachments: {
          orderBy: { uploadedAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } });
    }

    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      requester: ticket.requester,
      owner: ticket.owner,
      ownerId: ticket.ownerId,
      itPriority: ticket.itPriority,
      version: ticket.version,
      requesterResolvedAt: ticket.requesterResolvedAt,
      category: ticket.category.name,
      relatedSystem: ticket.relatedSystem.name,
      requestedPriority: ticket.requestedPriority,
      currentStatus: ticket.currentStatus,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      attachments: ticket.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
        isRemoved: a.isRemoved,
        removedAt: a.removedAt,
        removedReason: a.removedReason,
        uploadedAt: a.uploadedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch ticket." } });
  }
});

app.post("/api/tickets/:id/attachments", permit("REQUESTER"), async (req,res,next)=>{
  const ticket=await prisma.ticket.findFirst({where:{id:Number(req.params.id),requesterId:res.locals.user.id}});
  if(!ticket)return res.status(404).json({error:{code:'TICKET_NOT_FOUND',message:'Ticket not found.'}});
  next();
}, upload.single("file"), async (req,res)=>{
  if(!req.file)return res.status(400).json({error:{code:'NO_FILE',message:'Choose a file to upload.'}});
  const file=req.file;
  try {
    const attachment=await prisma.$transaction(async tx=>{
      const ticketId=Number(req.params.id);
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
      const ticket=await tx.ticket.findFirst({where:{id:ticketId,requesterId:res.locals.user.id}});
      if(!ticket)throw Object.assign(new Error(),{code:'TICKET_NOT_FOUND'});
      if(await tx.attachment.count({where:{ticketId,isRemoved:false}})>=5)throw Object.assign(new Error(),{code:'MAX_ATTACHMENTS'});
      return tx.attachment.create({data:{ticketId,fileName:file.originalname,storedName:file.filename,fileType:file.mimetype,fileSize:file.size}});
    });
    res.status(201).json({id:attachment.id,fileName:attachment.fileName,fileType:attachment.fileType,fileSize:attachment.fileSize,isRemoved:attachment.isRemoved,uploadedAt:attachment.uploadedAt});
  }catch(error:any){
    await fs.promises.unlink(file.path).catch(()=>{});
    if(error.code==='MAX_ATTACHMENTS')return res.status(400).json({error:{code:'MAX_ATTACHMENTS',message:'Maximum of 5 active attachments per ticket reached.'}});
    if(error.code==='TICKET_NOT_FOUND')return res.status(404).json({error:{code:'TICKET_NOT_FOUND',message:'Ticket not found.'}});
    res.status(500).json({error:{code:'SERVER_ERROR',message:'Failed to upload attachment.'}});
  }
});

app.get("/api/attachments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const requesterId = res.locals.user.id;
    if (!requesterId) {
      return res.status(400).json({ error: { code: "MISSING_REQUESTER", message: "requesterId is required." } });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id, ...(res.locals.user.role==='REQUESTER'?{ticket:{requesterId}}:{}) },
    });

    if (!attachment) {
      return res.status(404).json({ error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found." } });
    }

    res.status(200).json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      isRemoved: attachment.isRemoved,
      removedAt: attachment.removedAt,
      removedReason: attachment.removedReason,
      uploadedAt: attachment.uploadedAt,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to fetch attachment." } });
  }
});

app.get("/api/attachments/:id/download", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const requesterId = res.locals.user.id;
    if (!requesterId) {
      return res.status(400).json({ error: { code: "MISSING_REQUESTER", message: "requesterId is required." } });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id, ...(res.locals.user.role==='REQUESTER'?{ticket:{requesterId}}:{}) },
    });

    if (!attachment) {
      return res.status(404).json({ error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found." } });
    }

    if (attachment.isRemoved) {
      return res.status(410).json({ error: { code: "ATTACHMENT_REMOVED", message: "This attachment has been removed." } });
    }

    const filePath = path.join(uploadDirectory, attachment.storedName);
    res.download(filePath, attachment.fileName);
  } catch (err) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to download attachment." } });
  }
});

app.patch("/api/attachments/:id/remove", permit("REQUESTER"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const requesterId = res.locals.user.id;
    const { reason } = req.body || {};
    if(reason!==undefined && (typeof reason!=='string'||reason.length>500))return res.status(400).json({error:{code:'INVALID_REASON',message:'Removal reason must be at most 500 characters.'}});

    if (!requesterId) {
      return res.status(400).json({ error: { code: "MISSING_REQUESTER", message: "requesterId is required." } });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id, ticket: { requesterId } },
    });

    if (!attachment) {
      return res.status(404).json({ error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found." } });
    }

    if (attachment.isRemoved) {
      return res.status(409).json({ error: { code: "ALREADY_REMOVED", message: "Attachment is already removed." } });
    }

    const updated = await prisma.attachment.update({
      where: { id },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedReason: reason ?? null,
      },
    });

    res.status(200).json({
      id: updated.id,
      isRemoved: updated.isRemoved,
      removedAt: updated.removedAt,
      removedReason: updated.removedReason,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to remove attachment." } });
  }
});


app.use('/api', (_req,res) => {res.status(404).json({error:{code:'NOT_FOUND',message:'API route not found.'}});});

app.use((err: any, req: any, res: any, next: any) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({error:{code:'INVALID_JSON',message:'Invalid JSON.'}});
  if (err.code === 'ACCOUNT_CHANGED') return res.status(409).json({error:{code:'ACCOUNT_CHANGED',message:'Account changed. Please sign in again.'}});
  if (err.message === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).json({ error: { code: "UNSUPPORTED_FILE_TYPE", message: "Unsupported file type. Allowed: JPG, PNG, WEBP, PDF." } });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: { code: "FILE_TOO_LARGE", message: "File exceeds the 5 MB size limit." } });
  }
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unexpected server error." } });
});

export default app;

