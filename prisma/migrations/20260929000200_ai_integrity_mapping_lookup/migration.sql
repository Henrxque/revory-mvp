CREATE INDEX "ai_usage_project_window_idx"
ON "ai_integrity_usage_records"("workspaceId", "providerProjectId", "occurredAt");
