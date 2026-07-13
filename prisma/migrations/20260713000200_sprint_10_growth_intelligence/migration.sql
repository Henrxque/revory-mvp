ALTER TYPE "RevoryOfferKey" ADD VALUE IF NOT EXISTS 'GROWTH';

CREATE TABLE "revenue_intelligence_snapshots" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "importSessionId" TEXT,
  "stateFingerprint" TEXT NOT NULL,
  "quoteFindingSnapshotJson" JSONB NOT NULL,
  "realizationFindingSnapshotJson" JSONB NOT NULL,
  "segmentSnapshotJson" JSONB NOT NULL,
  "quoteEstimatedValueCents" INTEGER NOT NULL DEFAULT 0,
  "calculatedBillingGapCents" INTEGER,
  "approvedChangeReviewCents" INTEGER,
  "marginAtRiskCents" INTEGER,
  "operationalCount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "revenue_intelligence_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_intelligence_snapshots_workspaceId_stateFingerprint_key"
  ON "revenue_intelligence_snapshots"("workspaceId", "stateFingerprint");
CREATE INDEX "revenue_intelligence_snapshots_workspaceId_createdAt_idx"
  ON "revenue_intelligence_snapshots"("workspaceId", "createdAt");

ALTER TABLE "revenue_intelligence_snapshots"
  ADD CONSTRAINT "revenue_intelligence_snapshots_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
