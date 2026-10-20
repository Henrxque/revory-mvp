CREATE TABLE "ai_integrity_monitor_states" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "dataJson" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_integrity_monitor_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_recurring_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_recurring_valid_payload" CHECK (jsonb_typeof("dataJson") = 'object'),
  CONSTRAINT "ai_recurring_valid_counters" CHECK ("revision" > 0 AND "attempts" >= 0)
);
CREATE UNIQUE INDEX "ai_recurring_identity_key" ON "ai_integrity_monitor_states"("workspaceId", "kind", "key");
CREATE INDEX "ai_recurring_dispatch_idx" ON "ai_integrity_monitor_states"("kind", "status", "availableAt");
CREATE INDEX "ai_recurring_workspace_idx" ON "ai_integrity_monitor_states"("workspaceId", "kind", "createdAt");
ALTER TABLE "ai_integrity_monitor_comparisons" DROP CONSTRAINT "ai_monitor_mode_check";
ALTER TABLE "ai_integrity_monitor_comparisons" ADD CONSTRAINT "ai_monitor_mode_check"
  CHECK ("mode" IN ('SYNTHETIC_REHEARSAL', 'CONNECTED_MONITOR'));
