ALTER TABLE "canonical_import_sessions"
ADD COLUMN "quoteRecoverySnapshotJson" JSONB,
ADD COLUMN "quoteRecoveryDataQualitySnapshotJson" JSONB;
