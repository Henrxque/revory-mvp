CREATE UNIQUE INDEX "ai_source_sync_workspace_id_key" ON "ai_integrity_source_syncs"("workspaceId", "id");
CREATE TABLE "ai_integrity_source_promotions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "syncId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_source_promotion_sync_fkey" FOREIGN KEY ("workspaceId", "syncId") REFERENCES "ai_integrity_source_syncs"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_source_promotion_batch_fkey" FOREIGN KEY ("workspaceId", "batchId") REFERENCES "ai_integrity_import_batches"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_source_promotion_hash_check" CHECK ("contentHash" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "ai_integrity_source_promotions_batchId_key" ON "ai_integrity_source_promotions"("batchId");
CREATE UNIQUE INDEX "ai_source_promotion_workspace_batch_key" ON "ai_integrity_source_promotions"("workspaceId", "batchId");
CREATE UNIQUE INDEX "ai_source_promotion_content_key" ON "ai_integrity_source_promotions"("workspaceId", "contentHash");
CREATE INDEX "ai_source_promotion_sync_idx" ON "ai_integrity_source_promotions"("workspaceId", "syncId");
CREATE TABLE "ai_integrity_report_drafts" (
  "workspaceId" TEXT NOT NULL PRIMARY KEY REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "setupJson" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
