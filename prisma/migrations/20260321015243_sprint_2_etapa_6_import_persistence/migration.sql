-- AlterTable
ALTER TABLE "data_sources" ADD COLUMN     "lastImportCompletedAt" TIMESTAMP(3),
ADD COLUMN     "lastImportErrorRowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastImportSuccessRowCount" INTEGER NOT NULL DEFAULT 0;
