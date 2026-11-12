-- Additive change. Existing disk-backed rows remain readable during migration.
ALTER TABLE "Attachment" ADD COLUMN "content" BYTEA;
