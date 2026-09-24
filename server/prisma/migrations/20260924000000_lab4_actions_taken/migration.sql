-- Additive migration: no existing table or row is changed.
-- Rollback (recovery): DROP TABLE "ActionTaken"; DROP INDEX "Ticket_updatedAt_idx"; DROP INDEX "Ticket_ownerId_currentStatus_idx";
CREATE TABLE "ActionTaken" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "performedById" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" TEXT,
  "attachmentNotes" TEXT,
  "requestKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActionTaken_ticketId_requestKey_key" ON "ActionTaken"("ticketId", "requestKey");
CREATE INDEX "ActionTaken_ticketId_createdAt_id_idx" ON "ActionTaken"("ticketId", "createdAt", "id");
CREATE INDEX "ActionTaken_performedById_createdAt_idx" ON "ActionTaken"("performedById", "createdAt");
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");
CREATE INDEX "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
