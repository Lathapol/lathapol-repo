-- Additive migration: RequesterUser table and its IDs/FKs deliberately remain.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT lower(trim(email)) FROM "RequesterUser" GROUP BY lower(trim(email)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Case-insensitive duplicate requester emails must be resolved before Lab 3 migration';
  END IF;
END $$;
UPDATE "RequesterUser" SET email = lower(trim(email));
CREATE TYPE "Role" AS ENUM ('REQUESTER','IT_STAFF','ADMINISTRATOR');
CREATE TYPE "EntryKind" AS ENUM ('PUBLIC','INTERNAL');
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';
ALTER TABLE "RequesterUser"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Ticket"
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "itPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "requesterResolvedAt" TIMESTAMP(3);
UPDATE "Ticket" SET "itPriority" = "requestedPriority";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "RequesterUser"(id) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE TABLE "Session" (
  "tokenHash" TEXT PRIMARY KEY, "userId" INTEGER NOT NULL, "csrfToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RequesterUser"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "TicketEntry" (
  id SERIAL PRIMARY KEY, "ticketId" INTEGER NOT NULL, "authorId" INTEGER NOT NULL,
  kind "EntryKind" NOT NULL, body TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TicketEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "RequesterUser"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "TicketEntry_ticketId_kind_createdAt_idx" ON "TicketEntry"("ticketId",kind,"createdAt");
COMMIT;
