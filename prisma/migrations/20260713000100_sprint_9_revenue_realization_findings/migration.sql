CREATE TYPE "RevenueRealizationFindingType" AS ENUM (
  'UNDERBILLING_GAP',
  'APPROVED_CHANGE_ORDER_NOT_BILLED',
  'MARGIN_AT_RISK',
  'SUSPECTED_MISSING_CHANGE_ORDER',
  'SCOPE_CREEP_REVIEW_CANDIDATE'
);

CREATE TYPE "RevoryFindingCategory" AS ENUM ('FINANCIAL', 'OPERATIONAL', 'DATA_QUALITY');
CREATE TYPE "RevoryFindingUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "revenue_realization_findings" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "findingType" "RevenueRealizationFindingType" NOT NULL,
  "category" "RevoryFindingCategory" NOT NULL,
  "status" "RevenueLeakStatus" NOT NULL DEFAULT 'OPEN',
  "priority" INTEGER NOT NULL,
  "urgency" "RevoryFindingUrgency" NOT NULL,
  "severity" "RevenueLeakSeverity" NOT NULL DEFAULT 'MEDIUM',
  "confidence" "RevenueLeakConfidence" NOT NULL DEFAULT 'MEDIUM',
  "valueBasis" "RevoryValueBasis" NOT NULL,
  "valueCents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "jobExternalId" TEXT NOT NULL,
  "changeOrderExternalId" TEXT,
  "fingerprint" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "formula" TEXT,
  "calculationInputsJson" JSONB NOT NULL,
  "recommendedAction" TEXT NOT NULL,
  "evidenceJson" JSONB NOT NULL,
  "additiveToExecutiveGap" BOOLEAN NOT NULL DEFAULT false,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "revenue_realization_findings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_realization_findings_workspaceId_fingerprint_key"
  ON "revenue_realization_findings"("workspaceId", "fingerprint");
CREATE INDEX "revenue_realization_findings_workspaceId_status_priority_idx"
  ON "revenue_realization_findings"("workspaceId", "status", "priority");
CREATE INDEX "revenue_realization_findings_workspaceId_findingType_status_idx"
  ON "revenue_realization_findings"("workspaceId", "findingType", "status");
CREATE INDEX "revenue_realization_findings_workspaceId_jobExternalId_idx"
  ON "revenue_realization_findings"("workspaceId", "jobExternalId");

ALTER TABLE "revenue_realization_findings"
  ADD CONSTRAINT "revenue_realization_findings_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
