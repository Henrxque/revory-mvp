ALTER TABLE "ai_integrity_source_connections"
  DROP CONSTRAINT "ai_source_rehearsal_check",
  ADD CONSTRAINT "ai_source_mode_check" CHECK (
    "generation" > 0 AND (
      ("mode" = 'SYNTHETIC_REHEARSAL' AND "provider" IN ('STRIPE', 'OPENAI')) OR
      ("mode" = 'CONTROLLED_OPENAI_READ' AND "provider" = 'OPENAI' AND
       "organizationId" IS NOT NULL AND "projectScope" = 'ALL_PROJECTS' AND
       "consentPurpose" IS NOT NULL AND "consentStart" IS NOT NULL AND
       "consentEnd" IS NOT NULL AND "consentStart" < "consentEnd")
    )
  );

ALTER TABLE "ai_integrity_source_syncs"
  DROP CONSTRAINT "ai_source_sync_shape_check",
  ADD CONSTRAINT "ai_source_sync_shape_check" CHECK (
    "generation" > 0 AND "windowStart" < "windowEnd" AND (
      ("status" = 'COMPLETED' AND "effectiveStart" IS NOT NULL AND
       "effectiveStart" >= "windowStart" AND "effectiveStart" < "windowEnd" AND
       "artifactJson" IS NOT NULL AND "artifactHash" IS NOT NULL) OR
      ("status" = 'SKIPPED' AND "effectiveStart" IS NULL AND
       "artifactJson" IS NULL AND "artifactHash" IS NULL) OR
      ("status" IN ('IN_PROGRESS', 'FAILED') AND "effectiveStart" IS NOT NULL AND
       "effectiveStart" >= "windowStart" AND "effectiveStart" < "windowEnd" AND
       "artifactJson" IS NULL AND "artifactHash" IS NULL)
    )
  );
