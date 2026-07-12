CREATE TYPE "RevoryOfferKey" AS ENUM ('QUOTE_RECOVERY_AUDIT','STARTER');
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE','EXPIRED','REVOKED');
CREATE TYPE "AnalysisRunStatus" AS ENUM ('READY','COMPLETED');
CREATE TABLE "workspace_entitlements" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "offerKey" "RevoryOfferKey" NOT NULL,
  "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE', "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT, "stripeSubscriptionId" TEXT, "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "workspace_entitlements_stripeCheckoutSessionId_key" ON "workspace_entitlements"("stripeCheckoutSessionId");
CREATE INDEX "workspace_entitlements_workspaceId_offerKey_status_idx" ON "workspace_entitlements"("workspaceId","offerKey","status");
CREATE INDEX "workspace_entitlements_stripeSubscriptionId_idx" ON "workspace_entitlements"("stripeSubscriptionId");
ALTER TABLE "workspace_entitlements" ADD CONSTRAINT "workspace_entitlements_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "quote_recovery_analysis_runs" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "importSessionId" TEXT, "status" "AnalysisRunStatus" NOT NULL DEFAULT 'READY',
  "findingSnapshotJson" JSONB NOT NULL, "activeCount" INTEGER NOT NULL DEFAULT 0, "estimatedValueCents" INTEGER NOT NULL DEFAULT 0,
  "dataQualityJson" JSONB NOT NULL, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "quote_recovery_analysis_runs_workspaceId_createdAt_idx" ON "quote_recovery_analysis_runs"("workspaceId","createdAt");
ALTER TABLE "quote_recovery_analysis_runs" ADD CONSTRAINT "quote_recovery_analysis_runs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
