CREATE TABLE "ai_integrity_source_connections" (
  "id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'SYNTHETIC_REHEARSAL', "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "generation" INTEGER NOT NULL DEFAULT 1, "consentVersion" TEXT NOT NULL, "consentedBy" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedAt" TIMESTAMP(3),
  "coverageStart" TIMESTAMP(3), "completeThrough" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_source_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_source_rehearsal_check" CHECK ("mode" = 'SYNTHETIC_REHEARSAL' AND "provider" IN ('STRIPE','OPENAI') AND "generation" > 0),
  CONSTRAINT "ai_source_status_check" CHECK (("status" = 'ACTIVE' AND "revokedAt" IS NULL) OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL)),
  CONSTRAINT "ai_source_coverage_check" CHECK (("coverageStart" IS NULL AND "completeThrough" IS NULL) OR ("coverageStart" IS NOT NULL AND "completeThrough" IS NOT NULL AND "coverageStart" < "completeThrough"))
);
CREATE UNIQUE INDEX "ai_source_provider_mode_key" ON "ai_integrity_source_connections"("workspaceId", "provider", "mode");
CREATE UNIQUE INDEX "ai_source_workspace_id_key" ON "ai_integrity_source_connections"("workspaceId", "id");
CREATE TABLE "ai_integrity_source_syncs" (
  "id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL, "connectionId" TEXT NOT NULL,
  "generation" INTEGER NOT NULL, "requestKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL, "windowStart" TIMESTAMP(3) NOT NULL, "windowEnd" TIMESTAMP(3) NOT NULL,
  "effectiveStart" TIMESTAMP(3), "artifactJson" JSONB, "artifactHash" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_source_sync_connection_fkey" FOREIGN KEY ("workspaceId", "connectionId") REFERENCES "ai_integrity_source_connections"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_source_sync_shape_check" CHECK ("generation" > 0 AND "windowStart" < "windowEnd" AND (("status" = 'COMPLETED' AND "effectiveStart" IS NOT NULL AND "effectiveStart" >= "windowStart" AND "effectiveStart" < "windowEnd" AND "artifactJson" IS NOT NULL AND "artifactHash" IS NOT NULL) OR ("status" = 'SKIPPED' AND "effectiveStart" IS NULL AND "artifactJson" IS NULL AND "artifactHash" IS NULL)))
);
CREATE UNIQUE INDEX "ai_source_sync_request_key" ON "ai_integrity_source_syncs"("workspaceId", "requestKey");
CREATE INDEX "ai_source_sync_retention_idx" ON "ai_integrity_source_syncs"("workspaceId", "createdAt");
