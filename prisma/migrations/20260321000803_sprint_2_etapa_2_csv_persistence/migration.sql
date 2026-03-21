-- AlterEnum
ALTER TYPE "DataSourceStatus" ADD VALUE 'IMPORTED';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "bookedAt" TIMESTAMP(3),
ADD COLUMN     "estimatedRevenue" DECIMAL(10,2),
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "sourceNotes" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "totalVisits" INTEGER;

-- AlterTable
ALTER TABLE "data_sources" ADD COLUMN     "lastImportError" TEXT,
ADD COLUMN     "lastImportFileName" TEXT,
ADD COLUMN     "lastImportRowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastImportedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "appointments_workspaceId_dataSourceId_idx" ON "appointments"("workspaceId", "dataSourceId");

-- CreateIndex
CREATE INDEX "appointments_workspaceId_status_scheduledAt_idx" ON "appointments"("workspaceId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "clients_workspaceId_dataSourceId_idx" ON "clients"("workspaceId", "dataSourceId");

-- CreateIndex
CREATE INDEX "clients_workspaceId_lastVisitAt_idx" ON "clients"("workspaceId", "lastVisitAt");

-- CreateIndex
CREATE INDEX "data_sources_workspaceId_status_idx" ON "data_sources"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "data_sources_workspaceId_lastImportedAt_idx" ON "data_sources"("workspaceId", "lastImportedAt");
