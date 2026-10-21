ALTER TABLE "ai_integrity_source_connections"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "projectScope" TEXT,
  ADD COLUMN "consentPurpose" TEXT,
  ADD COLUMN "consentStart" TIMESTAMP(3),
  ADD COLUMN "consentEnd" TIMESTAMP(3);
