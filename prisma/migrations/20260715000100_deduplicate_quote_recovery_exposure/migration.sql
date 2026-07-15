-- Quote Recovery can create several findings for one estimate. Financial
-- exposure is therefore aggregated once per estimate and suppressed when the
-- immutable snapshot contains conflicting values or incompatible currencies.

ALTER TABLE "quote_recovery_analysis_runs"
  ALTER COLUMN "estimatedValueCents" DROP DEFAULT,
  ALTER COLUMN "estimatedValueCents" DROP NOT NULL;

ALTER TABLE "revenue_intelligence_snapshots"
  ALTER COLUMN "quoteEstimatedValueCents" DROP DEFAULT,
  ALTER COLUMN "quoteEstimatedValueCents" DROP NOT NULL;

WITH per_run AS (
  SELECT
    run."id",
    CASE
      WHEN COALESCE(BOOL_OR(exposure.currency_count > 1 OR exposure.value_count > 1), FALSE)
        OR COUNT(DISTINCT exposure.currency) FILTER (WHERE exposure.currency IS NOT NULL) > 1
      THEN NULL
      ELSE COALESCE(SUM(exposure.value_cents), 0)::INTEGER
    END AS estimated_value_cents
  FROM "quote_recovery_analysis_runs" run
  LEFT JOIN LATERAL (
    SELECT
      candidate.estimate_external_id,
      COUNT(DISTINCT candidate.currency) AS currency_count,
      COUNT(DISTINCT candidate.value_cents) AS value_count,
      MIN(candidate.currency) AS currency,
      MAX(candidate.value_cents) AS value_cents
    FROM (
      SELECT
        COALESCE(NULLIF(TRIM(item ->> 'estimateExternalId'), ''), item ->> 'fingerprint', item ->> 'id') AS estimate_external_id,
        UPPER(COALESCE(NULLIF(TRIM(item ->> 'currency'), ''), 'USD')) AS currency,
        (item ->> 'valueCents')::INTEGER AS value_cents
      FROM JSONB_ARRAY_ELEMENTS(
        CASE WHEN JSONB_TYPEOF(run."findingSnapshotJson") = 'array'
          THEN run."findingSnapshotJson"
          ELSE '[]'::JSONB
        END
      ) item
      WHERE item ->> 'valueBasis' = 'ESTIMATED'
        AND JSONB_TYPEOF(item -> 'valueCents') = 'number'
    ) candidate
    GROUP BY candidate.estimate_external_id
  ) exposure ON TRUE
  GROUP BY run."id"
)
UPDATE "quote_recovery_analysis_runs" run
SET "estimatedValueCents" = per_run.estimated_value_cents
FROM per_run
WHERE run."id" = per_run."id";

WITH per_snapshot AS (
  SELECT
    snapshot."id",
    CASE
      WHEN COALESCE(BOOL_OR(exposure.currency_count > 1 OR exposure.value_count > 1), FALSE)
        OR COUNT(DISTINCT exposure.currency) FILTER (WHERE exposure.currency IS NOT NULL) > 1
      THEN NULL
      ELSE COALESCE(SUM(exposure.value_cents), 0)::INTEGER
    END AS estimated_value_cents
  FROM "revenue_intelligence_snapshots" snapshot
  LEFT JOIN LATERAL (
    SELECT
      candidate.estimate_external_id,
      COUNT(DISTINCT candidate.currency) AS currency_count,
      COUNT(DISTINCT candidate.value_cents) AS value_count,
      MIN(candidate.currency) AS currency,
      MAX(candidate.value_cents) AS value_cents
    FROM (
      SELECT
        COALESCE(NULLIF(TRIM(item ->> 'estimateExternalId'), ''), item ->> 'fingerprint', item ->> 'id') AS estimate_external_id,
        UPPER(COALESCE(NULLIF(TRIM(item ->> 'currency'), ''), 'USD')) AS currency,
        (item ->> 'valueCents')::INTEGER AS value_cents
      FROM JSONB_ARRAY_ELEMENTS(
        CASE WHEN JSONB_TYPEOF(snapshot."quoteFindingSnapshotJson") = 'array'
          THEN snapshot."quoteFindingSnapshotJson"
          ELSE '[]'::JSONB
        END
      ) item
      WHERE item ->> 'valueBasis' = 'ESTIMATED'
        AND JSONB_TYPEOF(item -> 'valueCents') = 'number'
    ) candidate
    GROUP BY candidate.estimate_external_id
  ) exposure ON TRUE
  GROUP BY snapshot."id"
)
UPDATE "revenue_intelligence_snapshots" snapshot
SET "quoteEstimatedValueCents" = per_snapshot.estimated_value_cents
FROM per_snapshot
WHERE snapshot."id" = per_snapshot."id";
