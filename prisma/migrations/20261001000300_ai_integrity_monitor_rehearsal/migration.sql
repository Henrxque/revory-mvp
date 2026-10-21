CREATE TABLE "ai_integrity_monitor_comparisons" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "baselineSnapshotId" TEXT NOT NULL,
  "currentSnapshotId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL, "mode" TEXT NOT NULL DEFAULT 'SYNTHETIC_REHEARSAL',
  "monitorVersion" TEXT NOT NULL, "artifactJson" JSONB NOT NULL, "artifactHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_monitor_mode_check" CHECK ("mode" = 'SYNTHETIC_REHEARSAL'),
  CONSTRAINT "ai_monitor_pair_check" CHECK ("baselineSnapshotId" <> "currentSnapshotId"),
  CONSTRAINT "ai_monitor_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_monitor_baseline_fkey" FOREIGN KEY ("workspaceId", "baselineSnapshotId") REFERENCES "ai_integrity_snapshots"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_monitor_current_fkey" FOREIGN KEY ("workspaceId", "currentSnapshotId") REFERENCES "ai_integrity_snapshots"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ai_monitor_workspace_id_key" ON "ai_integrity_monitor_comparisons"("workspaceId", "id");
CREATE UNIQUE INDEX "ai_monitor_request_key" ON "ai_integrity_monitor_comparisons"("workspaceId", "requestKey");
CREATE UNIQUE INDEX "ai_monitor_pair_key" ON "ai_integrity_monitor_comparisons"("workspaceId", "baselineSnapshotId", "currentSnapshotId", "monitorVersion");
CREATE INDEX "ai_monitor_retention_idx" ON "ai_integrity_monitor_comparisons"("workspaceId", "createdAt");
CREATE TABLE "ai_integrity_monitor_alerts" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "comparisonId" TEXT NOT NULL,
  "signalKey" TEXT NOT NULL, "kind" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN',
  "acknowledgedBy" TEXT, "acknowledgedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_monitor_alert_kind_check" CHECK ("kind" IN ('NEW_DIFFERENCE', 'DIFFERENCE_INCREASED', 'COMPARISON_LIMITED')),
  CONSTRAINT "ai_monitor_alert_status_check" CHECK (("status" = 'OPEN' AND "acknowledgedBy" IS NULL AND "acknowledgedAt" IS NULL)
    OR ("status" = 'ACKNOWLEDGED' AND "acknowledgedBy" IS NOT NULL AND "acknowledgedAt" IS NOT NULL)),
  CONSTRAINT "ai_monitor_alert_comparison_fkey" FOREIGN KEY ("workspaceId", "comparisonId") REFERENCES "ai_integrity_monitor_comparisons"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ai_monitor_alert_signal_key" ON "ai_integrity_monitor_alerts"("workspaceId", "comparisonId", "signalKey");
CREATE INDEX "ai_monitor_alert_status_idx" ON "ai_integrity_monitor_alerts"("workspaceId", "status", "createdAt");
