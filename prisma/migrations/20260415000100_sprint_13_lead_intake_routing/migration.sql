-- CreateEnum
CREATE TYPE "LeadBookingOpportunityStatus" AS ENUM ('OPEN', 'READY', 'BLOCKED', 'BOOKED', 'CLOSED');

-- CreateTable
CREATE TABLE "lead_booking_opportunities" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "intakeDataSourceId" TEXT,
    "status" "LeadBookingOpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "intakeChannel" "CommunicationChannel",
    "bookingPath" "CommunicationChannel",
    "mainOfferKey" TEXT,
    "intakeSourceType" "DataSourceType",
    "intakeSourceName" TEXT,
    "nextAction" TEXT,
    "blockingReason" TEXT,
    "handoffPreparedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_booking_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_booking_opportunities_clientId_key" ON "lead_booking_opportunities"("clientId");

-- CreateIndex
CREATE INDEX "lead_booking_opportunities_workspaceId_status_updatedAt_idx" ON "lead_booking_opportunities"("workspaceId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "lead_booking_opportunities_workspaceId_intakeDataSourceId_idx" ON "lead_booking_opportunities"("workspaceId", "intakeDataSourceId");

-- AddForeignKey
ALTER TABLE "lead_booking_opportunities" ADD CONSTRAINT "lead_booking_opportunities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_booking_opportunities" ADD CONSTRAINT "lead_booking_opportunities_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_booking_opportunities" ADD CONSTRAINT "lead_booking_opportunities_intakeDataSourceId_fkey" FOREIGN KEY ("intakeDataSourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
