-- A committed canonical import may produce at most one Quote Recovery analysis snapshot.
-- Preserve older duplicate history while removing its active import association.
WITH ranked_analysis_runs AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "importSessionId"
    ORDER BY "createdAt" DESC, "id" DESC
  ) AS row_number
  FROM "quote_recovery_analysis_runs"
  WHERE "importSessionId" IS NOT NULL
)
UPDATE "quote_recovery_analysis_runs" run
SET "importSessionId" = NULL
FROM ranked_analysis_runs ranked
WHERE run."id" = ranked."id" AND ranked.row_number > 1;

CREATE UNIQUE INDEX "quote_recovery_analysis_runs_importSessionId_key"
  ON "quote_recovery_analysis_runs"("importSessionId");
