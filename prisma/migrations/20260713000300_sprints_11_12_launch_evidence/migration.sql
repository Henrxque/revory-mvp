-- Sprint 11/12: Pro trust controls, active snapshot boundaries, paid-evidence instrumentation,
-- and persistent Stripe webhook replay protection.

ALTER TYPE "RevoryOfferKey" ADD VALUE IF NOT EXISTS 'PRO';

CREATE TYPE "RevoryEvidenceMetric" AS ENUM (
  'AUDIT_CONVERSION',
  'FIRST_VALUE_SECONDS',
  'USEFUL_FINDING',
  'CONFIRMED_RECOVERED_VALUE',
  'SECOND_READ',
  'AUDIT_TO_SUBSCRIPTION_CONVERSION',
  'SUPPORT_MINUTES',
  'RETENTION_INTENT_30_DAY',
  'RETENTION_INTENT_60_DAY',
  'FALSE_POSITIVE_DISPUTE',
  'PLAN_UPGRADE_INTEREST',
  'WEEKLY_DECISION_USEFUL'
);

CREATE TYPE "RevoryEvidenceSource" AS ENUM ('SYSTEM', 'CUSTOMER', 'FOUNDER', 'BILLING');
CREATE TYPE "StripeWebhookProcessingStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

ALTER TABLE "canonical_records"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supersededAt" TIMESTAMP(3);

ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "workspace_entitlements"
  ADD COLUMN "maxAnalysisRuns" INTEGER,
  ADD COLUMN "analysisRunsUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stripeEventCreatedAt" TIMESTAMP(3);

-- Preserve duplicate historical entitlements while ensuring a Stripe subscription can
-- authorize at most one current entitlement going forward.
WITH ranked_subscription_entitlements AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "stripeSubscriptionId"
    ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
  ) AS row_number
  FROM "workspace_entitlements"
  WHERE "stripeSubscriptionId" IS NOT NULL
)
UPDATE "workspace_entitlements" entitlement
SET "stripeSubscriptionId" = NULL,
    "status" = 'REVOKED',
    "endsAt" = COALESCE(entitlement."endsAt", CURRENT_TIMESTAMP)
FROM ranked_subscription_entitlements ranked
WHERE entitlement."id" = ranked."id" AND ranked.row_number > 1;

DROP INDEX IF EXISTS "workspace_entitlements_stripeSubscriptionId_idx";
CREATE UNIQUE INDEX "workspace_entitlements_stripeSubscriptionId_key"
  ON "workspace_entitlements"("stripeSubscriptionId");

DROP INDEX IF EXISTS "canonical_records_workspaceId_entityType_occurredAt_idx";
CREATE INDEX "canonical_records_workspaceId_entityType_isActive_occurredAt_idx"
  ON "canonical_records"("workspaceId", "entityType", "isActive", "occurredAt");

CREATE TABLE "revory_evidence_events" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "metric" "RevoryEvidenceMetric" NOT NULL,
  "source" "RevoryEvidenceSource" NOT NULL,
  "offerKey" "RevoryOfferKey",
  "booleanValue" BOOLEAN,
  "integerValue" INTEGER,
  "amountCents" INTEGER,
  "currency" TEXT,
  "relatedEntityId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "notes" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revory_evidence_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "revory_evidence_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "revory_evidence_events_workspaceId_idempotencyKey_key"
  ON "revory_evidence_events"("workspaceId", "idempotencyKey");
CREATE INDEX "revory_evidence_events_workspaceId_metric_observedAt_idx"
  ON "revory_evidence_events"("workspaceId", "metric", "observedAt");

CREATE TABLE "stripe_webhook_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" "StripeWebhookProcessingStatus" NOT NULL DEFAULT 'PROCESSING',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stripe_webhook_events_status_updatedAt_idx"
  ON "stripe_webhook_events"("status", "updatedAt");

CREATE TABLE "auth_rate_limit_buckets" (
  "key" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "auth_rate_limit_buckets_blockedUntil_idx" ON "auth_rate_limit_buckets"("blockedUntil");
