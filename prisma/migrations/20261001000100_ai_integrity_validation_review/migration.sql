CREATE TABLE "ai_integrity_review_events" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "snapshotId" TEXT NOT NULL,
  "fingerprint" TEXT, "actorUserId" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL, "revision" INTEGER NOT NULL, "reviewVersion" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'SYNTHETIC_REHEARSAL', "kind" TEXT NOT NULL,
  "disposition" TEXT, "sourceEvidenceChecked" BOOLEAN NOT NULL DEFAULT false,
  "usefulness" TEXT, "assistanceRequired" BOOLEAN, "preparationMinutes" INTEGER,
  "comment" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_integrity_review_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_review_mode_check" CHECK ("mode" = 'SYNTHETIC_REHEARSAL'),
  CONSTRAINT "ai_review_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "ai_review_comment_check" CHECK (char_length("comment") BETWEEN 12 AND 1200),
  CONSTRAINT "ai_review_shape_check" CHECK (
    ("kind" = 'FINDING' AND "fingerprint" IS NOT NULL AND "disposition" IS NOT NULL
      AND "disposition" IN ('CONFIRMED_DIFFERENCE','EXPECTED_DIFFERENCE','FALSE_POSITIVE','INSUFFICIENT_EVIDENCE')
      AND "sourceEvidenceChecked" = true AND "usefulness" IS NULL AND "assistanceRequired" IS NULL AND "preparationMinutes" IS NULL)
    OR ("kind" = 'REPORT' AND "fingerprint" IS NULL AND "disposition" IS NULL
      AND "sourceEvidenceChecked" = false AND "usefulness" IS NOT NULL AND "usefulness" IN ('USEFUL','PARTLY_USEFUL','NOT_USEFUL')
      AND "assistanceRequired" IS NOT NULL AND "preparationMinutes" IS NOT NULL AND "preparationMinutes" BETWEEN 0 AND 10080)
  )
);
CREATE UNIQUE INDEX "ai_review_workspace_request_key" ON "ai_integrity_review_events"("workspaceId","requestKey");
CREATE UNIQUE INDEX "ai_review_report_revision_key" ON "ai_integrity_review_events"("workspaceId","snapshotId","revision");
CREATE INDEX "ai_review_report_finding_revision_idx" ON "ai_integrity_review_events"("workspaceId","snapshotId","fingerprint","revision");
ALTER TABLE "ai_integrity_review_events" ADD CONSTRAINT "ai_review_snapshot_fkey" FOREIGN KEY ("workspaceId","snapshotId") REFERENCES "ai_integrity_snapshots"("workspaceId","id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_integrity_review_events" ADD CONSTRAINT "ai_review_finding_fkey" FOREIGN KEY ("workspaceId","snapshotId","fingerprint") REFERENCES "ai_integrity_findings"("workspaceId","snapshotId","fingerprint") ON DELETE CASCADE ON UPDATE CASCADE;
