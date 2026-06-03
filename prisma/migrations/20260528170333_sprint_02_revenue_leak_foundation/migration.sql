-- CreateEnum
CREATE TYPE "RevenueLeakType" AS ENUM ('NO_SHOW_REVENUE', 'CANCELED_NOT_RECOVERED', 'STALE_BOOKED_PROOF', 'MISSING_CONTACT', 'BOOKING_PATH_BLOCKED');

-- CreateEnum
CREATE TYPE "RevenueLeakSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RevenueLeakStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RevenueLeakConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "revenue_leaks" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceDataSourceId" TEXT,
    "relatedClientId" TEXT,
    "relatedAppointmentId" TEXT,
    "relatedLeadBookingOpportunityId" TEXT,
    "leakType" "RevenueLeakType" NOT NULL,
    "severity" "RevenueLeakSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "RevenueLeakStatus" NOT NULL DEFAULT 'OPEN',
    "confidence" "RevenueLeakConfidence" NOT NULL DEFAULT 'MEDIUM',
    "estimatedValueCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceWindowStart" TIMESTAMP(3),
    "sourceWindowEnd" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "providerName" TEXT,
    "serviceName" TEXT,
    "sourceName" TEXT,
    "fingerprint" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_leaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revenue_leaks_workspaceId_status_detectedAt_idx" ON "revenue_leaks"("workspaceId", "status", "detectedAt");

-- CreateIndex
CREATE INDEX "revenue_leaks_workspaceId_leakType_status_idx" ON "revenue_leaks"("workspaceId", "leakType", "status");

-- CreateIndex
CREATE INDEX "revenue_leaks_workspaceId_severity_status_idx" ON "revenue_leaks"("workspaceId", "severity", "status");

-- CreateIndex
CREATE INDEX "revenue_leaks_workspaceId_confidence_idx" ON "revenue_leaks"("workspaceId", "confidence");

-- CreateIndex
CREATE INDEX "revenue_leaks_workspaceId_sourceWindowStart_sourceWindowEnd_idx" ON "revenue_leaks"("workspaceId", "sourceWindowStart", "sourceWindowEnd");

-- CreateIndex
CREATE INDEX "revenue_leaks_sourceDataSourceId_idx" ON "revenue_leaks"("sourceDataSourceId");

-- CreateIndex
CREATE INDEX "revenue_leaks_relatedClientId_idx" ON "revenue_leaks"("relatedClientId");

-- CreateIndex
CREATE INDEX "revenue_leaks_relatedAppointmentId_idx" ON "revenue_leaks"("relatedAppointmentId");

-- CreateIndex
CREATE INDEX "revenue_leaks_relatedLeadBookingOpportunityId_idx" ON "revenue_leaks"("relatedLeadBookingOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_leaks_workspaceId_fingerprint_key" ON "revenue_leaks"("workspaceId", "fingerprint");

-- AddForeignKey
ALTER TABLE "revenue_leaks" ADD CONSTRAINT "revenue_leaks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_leaks" ADD CONSTRAINT "revenue_leaks_sourceDataSourceId_fkey" FOREIGN KEY ("sourceDataSourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_leaks" ADD CONSTRAINT "revenue_leaks_relatedClientId_fkey" FOREIGN KEY ("relatedClientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_leaks" ADD CONSTRAINT "revenue_leaks_relatedAppointmentId_fkey" FOREIGN KEY ("relatedAppointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_leaks" ADD CONSTRAINT "revenue_leaks_relatedLeadBookingOpportunityId_fkey" FOREIGN KEY ("relatedLeadBookingOpportunityId") REFERENCES "lead_booking_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
