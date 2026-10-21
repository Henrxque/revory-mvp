-- CreateEnum
CREATE TYPE "AiIntegritySourceKind" AS ENUM ('STRIPE_REVENUE', 'INTERNAL_LEDGER', 'PROVIDER_REPORT');

-- CreateEnum
CREATE TYPE "AiIntegrityCostBasis" AS ENUM ('REPORTED', 'ESTIMATED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AiIntegrityMappingKind" AS ENUM ('STRIPE_CUSTOMER', 'PROVIDER_PROJECT', 'PROVIDER_KEY');

-- CreateEnum
CREATE TYPE "AiIntegrityMappingStatus" AS ENUM ('CONFIRMED', 'CONFLICTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AiIntegrityValueBasis" AS ENUM ('OBSERVED', 'CALCULATED', 'ESTIMATED', 'OPERATIONAL', 'DATA_QUALITY');

-- CreateTable
CREATE TABLE "ai_integrity_import_batches" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceKind" "AiIntegritySourceKind" NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "mappingSha256" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "sourceTimezone" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "dataQualityJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_revenue_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "recordHash" TEXT NOT NULL,
    "eventKind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stripeCustomerExternalId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripePaymentId" TEXT,
    "parentExternalId" TEXT,
    "amountMinor" DECIMAL(30,0),
    "currency" TEXT,
    "currencyExponent" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "sourceRowNumber" INTEGER NOT NULL,
    "sourcePayloadJson" JSONB NOT NULL,
    "provenanceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_revenue_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_usage_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "recordHash" TEXT NOT NULL,
    "internalCustomerExternalId" TEXT,
    "provider" TEXT,
    "providerRequestId" TEXT,
    "providerProjectId" TEXT,
    "model" TEXT,
    "quantity" DECIMAL(30,9) NOT NULL,
    "unit" TEXT NOT NULL,
    "creditsDelta" DECIMAL(30,9),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "sourcePayloadJson" JSONB NOT NULL,
    "provenanceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_provider_buckets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "recordHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT,
    "model" TEXT,
    "usageQuantity" DECIMAL(30,9),
    "usageUnit" TEXT,
    "costAmount" DECIMAL(30,12),
    "costCurrency" TEXT,
    "costBasis" "AiIntegrityCostBasis" NOT NULL,
    "pricingVersion" TEXT,
    "adjustmentKind" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3),
    "sourceRowNumber" INTEGER NOT NULL,
    "sourcePayloadJson" JSONB NOT NULL,
    "provenanceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_provider_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_mappings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "AiIntegrityMappingKind" NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalCustomerExternalId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "status" "AiIntegrityMappingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "confirmationMethod" TEXT NOT NULL,
    "confirmedByUserId" TEXT,
    "provenanceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_snapshots" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "inputManifestJson" JSONB NOT NULL,
    "dataQualityJson" JSONB NOT NULL,
    "coverageJson" JSONB NOT NULL,
    "suppressionsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_findings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "valueBasis" "AiIntegrityValueBasis" NOT NULL,
    "valueAmount" DECIMAL(30,12),
    "valueCurrency" TEXT,
    "formula" TEXT,
    "confidenceClass" TEXT NOT NULL,
    "attributionClass" TEXT,
    "evidenceJson" JSONB NOT NULL,
    "limitationsJson" JSONB NOT NULL,
    "recommendedReview" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_integrity_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_integrity_snapshot_inputs" (
    "workspaceId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,

    CONSTRAINT "ai_integrity_snapshot_inputs_pkey" PRIMARY KEY ("workspaceId","snapshotId","importBatchId")
);

-- CreateIndex
CREATE INDEX "ai_integrity_import_batches_workspaceId_sourceKind_windowSt_idx" ON "ai_integrity_import_batches"("workspaceId", "sourceKind", "windowStart", "windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_import_batches_workspaceId_id_key" ON "ai_integrity_import_batches"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_import_batches_workspaceId_idempotencyKey_key" ON "ai_integrity_import_batches"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ai_integrity_revenue_records_workspaceId_sourceSystem_exter_idx" ON "ai_integrity_revenue_records"("workspaceId", "sourceSystem", "externalId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_integrity_revenue_records_workspaceId_stripeCustomerExte_idx" ON "ai_integrity_revenue_records"("workspaceId", "stripeCustomerExternalId", "occurredAt");

-- CreateIndex
CREATE INDEX "ai_integrity_revenue_records_workspaceId_importBatchId_idx" ON "ai_integrity_revenue_records"("workspaceId", "importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_revenue_records_workspaceId_sourceSystem_exter_key" ON "ai_integrity_revenue_records"("workspaceId", "sourceSystem", "externalId", "recordHash");

-- CreateIndex
CREATE INDEX "ai_integrity_usage_records_workspaceId_sourceSystem_externa_idx" ON "ai_integrity_usage_records"("workspaceId", "sourceSystem", "externalId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_integrity_usage_records_workspaceId_internalCustomerExte_idx" ON "ai_integrity_usage_records"("workspaceId", "internalCustomerExternalId", "occurredAt");

-- CreateIndex
CREATE INDEX "ai_integrity_usage_records_workspaceId_providerRequestId_idx" ON "ai_integrity_usage_records"("workspaceId", "providerRequestId");

-- CreateIndex
CREATE INDEX "ai_integrity_usage_records_workspaceId_importBatchId_idx" ON "ai_integrity_usage_records"("workspaceId", "importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_usage_records_workspaceId_sourceSystem_externa_key" ON "ai_integrity_usage_records"("workspaceId", "sourceSystem", "externalId", "recordHash");

-- CreateIndex
CREATE INDEX "ai_integrity_provider_buckets_workspaceId_sourceSystem_exte_idx" ON "ai_integrity_provider_buckets"("workspaceId", "sourceSystem", "externalId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_integrity_provider_buckets_workspaceId_provider_windowSt_idx" ON "ai_integrity_provider_buckets"("workspaceId", "provider", "windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "ai_integrity_provider_buckets_workspaceId_importBatchId_idx" ON "ai_integrity_provider_buckets"("workspaceId", "importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_provider_buckets_workspaceId_sourceSystem_exte_key" ON "ai_integrity_provider_buckets"("workspaceId", "sourceSystem", "externalId", "recordHash");

-- CreateIndex
CREATE INDEX "ai_integrity_mappings_workspaceId_kind_externalId_validFrom_idx" ON "ai_integrity_mappings"("workspaceId", "kind", "externalId", "validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "ai_integrity_mappings_workspaceId_internalCustomerExternalI_idx" ON "ai_integrity_mappings"("workspaceId", "internalCustomerExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_mappings_workspaceId_kind_externalId_internalC_key" ON "ai_integrity_mappings"("workspaceId", "kind", "externalId", "internalCustomerExternalId", "validFrom");

-- CreateIndex
CREATE INDEX "ai_integrity_snapshots_workspaceId_windowStart_windowEnd_cr_idx" ON "ai_integrity_snapshots"("workspaceId", "windowStart", "windowEnd", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_snapshots_workspaceId_id_key" ON "ai_integrity_snapshots"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_snapshots_workspaceId_idempotencyKey_key" ON "ai_integrity_snapshots"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ai_integrity_findings_workspaceId_snapshotId_idx" ON "ai_integrity_findings"("workspaceId", "snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrity_findings_workspaceId_snapshotId_fingerprint_key" ON "ai_integrity_findings"("workspaceId", "snapshotId", "fingerprint");

-- CreateIndex
CREATE INDEX "ai_integrity_snapshot_inputs_workspaceId_importBatchId_idx" ON "ai_integrity_snapshot_inputs"("workspaceId", "importBatchId");

-- AddForeignKey
ALTER TABLE "ai_integrity_import_batches" ADD CONSTRAINT "ai_integrity_import_batches_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_revenue_records" ADD CONSTRAINT "ai_integrity_revenue_records_workspaceId_importBatchId_fkey" FOREIGN KEY ("workspaceId", "importBatchId") REFERENCES "ai_integrity_import_batches"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_usage_records" ADD CONSTRAINT "ai_integrity_usage_records_workspaceId_importBatchId_fkey" FOREIGN KEY ("workspaceId", "importBatchId") REFERENCES "ai_integrity_import_batches"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_provider_buckets" ADD CONSTRAINT "ai_integrity_provider_buckets_workspaceId_importBatchId_fkey" FOREIGN KEY ("workspaceId", "importBatchId") REFERENCES "ai_integrity_import_batches"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_mappings" ADD CONSTRAINT "ai_integrity_mappings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_snapshots" ADD CONSTRAINT "ai_integrity_snapshots_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_findings" ADD CONSTRAINT "ai_integrity_findings_workspaceId_snapshotId_fkey" FOREIGN KEY ("workspaceId", "snapshotId") REFERENCES "ai_integrity_snapshots"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_snapshot_inputs" ADD CONSTRAINT "ai_integrity_snapshot_inputs_workspaceId_snapshotId_fkey" FOREIGN KEY ("workspaceId", "snapshotId") REFERENCES "ai_integrity_snapshots"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_integrity_snapshot_inputs" ADD CONSTRAINT "ai_integrity_snapshot_inputs_workspaceId_importBatchId_fkey" FOREIGN KEY ("workspaceId", "importBatchId") REFERENCES "ai_integrity_import_batches"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
