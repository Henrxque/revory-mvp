CREATE TYPE "CanonicalEntityType" AS ENUM ('CUSTOMER','LEAD','ESTIMATE','ACTIVITY','JOB','INVOICE','CHANGE_ORDER','COST');
CREATE TYPE "RevoryValueBasis" AS ENUM ('OBSERVED','CALCULATED','ESTIMATED','OPERATIONAL','DATA_QUALITY');
CREATE TYPE "CanonicalImportStatus" AS ENUM ('PENDING_REVIEW','READY','COMMITTED','REJECTED');
CREATE TYPE "QuoteRecoveryFindingType" AS ENUM ('OVERDUE_FOLLOW_UP','HIGH_VALUE_STALE_QUOTE','OPEN_ESTIMATE_NO_ACTIVITY','ESTIMATE_AGING_RISK','MISSING_OWNER_OR_NEXT_STEP','RECOVERABLE_LOST_QUOTE');

CREATE TABLE "canonical_import_sessions" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "status" "CanonicalImportStatus" NOT NULL DEFAULT 'PENDING_REVIEW', "sourceFileNamesJson" JSONB NOT NULL,
  "mappingJson" JSONB NOT NULL, "dataQualityJson" JSONB NOT NULL, "eligibilityJson" JSONB NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0, "acceptedCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0, "committedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "canonical_import_sessions_workspaceId_idempotencyKey_key" ON "canonical_import_sessions"("workspaceId","idempotencyKey");
CREATE INDEX "canonical_import_sessions_workspaceId_status_createdAt_idx" ON "canonical_import_sessions"("workspaceId","status","createdAt");

CREATE TABLE "canonical_records" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "importSessionId" TEXT NOT NULL,
  "entityType" "CanonicalEntityType" NOT NULL, "sourceSystem" TEXT NOT NULL, "externalId" TEXT NOT NULL,
  "relationExternalIdsJson" JSONB NOT NULL, "provenanceJson" JSONB NOT NULL, "payloadJson" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "canonical_records_workspaceId_entityType_sourceSystem_externalId_key" ON "canonical_records"("workspaceId","entityType","sourceSystem","externalId");
CREATE INDEX "canonical_records_workspaceId_entityType_occurredAt_idx" ON "canonical_records"("workspaceId","entityType","occurredAt");
CREATE INDEX "canonical_records_workspaceId_importSessionId_idx" ON "canonical_records"("workspaceId","importSessionId");

CREATE TABLE "saved_canonical_mappings" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "entityType" "CanonicalEntityType" NOT NULL,
  "sourceSignature" TEXT NOT NULL, "mappingJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "saved_canonical_mappings_workspaceId_entityType_sourceSignature_key" ON "saved_canonical_mappings"("workspaceId","entityType","sourceSignature");

CREATE TABLE "quote_recovery_findings" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "findingType" "QuoteRecoveryFindingType" NOT NULL,
  "status" "RevenueLeakStatus" NOT NULL DEFAULT 'OPEN', "severity" "RevenueLeakSeverity" NOT NULL DEFAULT 'MEDIUM',
  "confidence" "RevenueLeakConfidence" NOT NULL DEFAULT 'MEDIUM', "valueBasis" "RevoryValueBasis" NOT NULL,
  "valueCents" INTEGER, "currency" TEXT NOT NULL DEFAULT 'USD', "estimateExternalId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "reason" TEXT NOT NULL, "recommendedAction" TEXT NOT NULL, "evidenceJson" JSONB NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "quote_recovery_findings_workspaceId_fingerprint_key" ON "quote_recovery_findings"("workspaceId","fingerprint");
CREATE INDEX "quote_recovery_findings_workspaceId_status_detectedAt_idx" ON "quote_recovery_findings"("workspaceId","status","detectedAt");
CREATE INDEX "quote_recovery_findings_workspaceId_findingType_status_idx" ON "quote_recovery_findings"("workspaceId","findingType","status");

ALTER TABLE "canonical_import_sessions" ADD CONSTRAINT "canonical_import_sessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canonical_records" ADD CONSTRAINT "canonical_records_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canonical_records" ADD CONSTRAINT "canonical_records_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "canonical_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_canonical_mappings" ADD CONSTRAINT "saved_canonical_mappings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_recovery_findings" ADD CONSTRAINT "quote_recovery_findings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
