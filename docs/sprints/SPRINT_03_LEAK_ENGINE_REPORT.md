# REVORY — Sprint 03 Leak Engine Report

## Summary

Implemented the helper layer, deterministic detector candidate layer and idempotent sync layer required for Leak Engine V1.

The helper layer remains pure. The detector layer is database-backed but read-only: it produces `RevenueLeakCreateInput` candidates. The sync layer is responsible for controlled persistence into `revenue_leaks`.

This step did not call LLMs, add UI, create dashboard leak reads, send notifications or create background jobs.

## Files created

- `services/revenue-leaks/leak-estimation.ts`
- `services/revenue-leaks/leak-confidence.ts`
- `services/revenue-leaks/leak-severity.ts`
- `services/revenue-leaks/leak-fingerprint.ts`
- `services/revenue-leaks/leak-evidence.ts`
- `services/revenue-leaks/detect-revenue-leaks.ts`
- `services/revenue-leaks/sync-revenue-leaks.ts`
- `scripts/ts-runtime-loader.mjs`
- `scripts/validate-revenue-leak-engine.ts`
- `package.json`

## Helper behavior

### `leak-estimation.ts`

Created:

- `decimalMoneyToCents`
- `estimateLeakValueCents`
- `RevenueLeakValueBasis`
- `RevenueLeakValueEstimate`
- `RevenueLeakMoneyInput`

Behavior:

- Converts Decimal-like values, strings and numbers into integer cents.
- Returns `null` for null, undefined, non-finite, zero or negative values.
- Never returns `NaN`.
- Assigns value only to financial leak types.
- Operational and data-quality risks return:
  - `estimatedValueCents: null`
  - `basis: "NO_FINANCIAL_VALUE"`
- Financial leaks prefer direct appointment estimated revenue.
- Financial leaks fall back to average deal value.
- If no financial value is available, financial leaks return `NO_FINANCIAL_VALUE`.

### `leak-confidence.ts`

Created:

- `calculateLeakConfidence`

V1 rules:

- Missing required evidence returns `LOW`.
- No-show with direct appointment value returns `HIGH`.
- No-show with average deal value returns `MEDIUM`.
- No-show without value returns `LOW`.
- Canceled-not-recovered with replacement booking evidence returns `LOW`.
- Canceled-not-recovered with direct appointment value returns `HIGH`.
- Canceled-not-recovered with average deal value returns `MEDIUM`.
- Missing contact and booking path blocked return `HIGH` when required evidence is present.
- Stale booked proof returns `HIGH` when live source is stale for 7+ days.
- Stale booked proof returns `LOW` when the source is not live.

### `leak-severity.ts`

Created:

- `calculateLeakSeverity`

V1 rules:

- Operational risks are conservative and return `MEDIUM`.
- Stale data quality risk returns `LOW`.
- Financial leaks without usable value return `MEDIUM`.
- Financial leaks below `$150` return `LOW`.
- Financial leaks from `$150` to below `$500` return `MEDIUM`.
- Financial leaks from `$500` to below `$2,000` return `HIGH`.
- Financial leaks at `$2,000+` return `CRITICAL` only when confidence is `HIGH`.

### `leak-fingerprint.ts`

Created:

- `buildRevenueLeakFingerprint`

Deterministic fingerprint patterns:

- `no_show_revenue:{workspaceId}:{appointmentId}`
- `canceled_not_recovered:{workspaceId}:{appointmentId}`
- `missing_contact:{workspaceId}:{leadBookingOpportunityId}`
- `booking_path_blocked:{workspaceId}:{leadBookingOpportunityId}`
- `stale_booked_proof:{workspaceId}:{dataSourceId}`

Behavior:

- Returns `null` when `workspaceId` is missing.
- Returns `null` when the required scoped ID is missing.
- Does not throw for missing IDs, so future detectors can filter invalid candidates safely.

## Commands run

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run qa:revenue-leaks` | Passed |

## Detectors implemented

Created in `services/revenue-leaks/detect-revenue-leaks.ts`:

- `detectRevenueLeaksForWorkspace`
- `detectNoShowRevenueLeaks`
- `detectCanceledNotRecoveredLeaks`
- `detectMissingContactRisks`
- `detectBookingPathBlockedRisks`
- `detectStaleBookedProofRisks`

Created in `services/revenue-leaks/leak-evidence.ts`:

- `buildRevenueLeakEvidence`
- `formatRevenueLeakValueBasis`

## Detector behavior

### `detectRevenueLeaksForWorkspace`

- Runs all V1 detectors for one workspace.
- Returns a sorted array of `RevenueLeakCreateInput` candidates.
- Does not write to `revenue_leaks`.
- Does not call LLM.

### `detectNoShowRevenueLeaks`

- Reads `Appointment` rows with `status = NO_SHOW`.
- Uses direct `Appointment.estimatedRevenue` when available.
- Falls back to `ActivationSetup.averageDealValue` when direct appointment value is missing.
- Uses estimation, confidence, severity and fingerprint helpers.
- Relates candidates to appointment, client and source data source when available.
- Creates `NO_SHOW_REVENUE` candidates only.

### `detectCanceledNotRecoveredLeaks`

- Reads `Appointment` rows with `status = CANCELED`.
- Looks for later same-client replacement evidence using `SCHEDULED` or `COMPLETED` appointments after `canceledAt ?? scheduledAt`.
- Skips canceled appointments when replacement evidence exists.
- Uses direct appointment value first and average deal value as fallback.
- Creates `CANCELED_NOT_RECOVERED` candidates only.

Important honesty note:

- This is conservative inferred unrecovered evidence, not confirmed lost revenue.

### `detectMissingContactRisks`

- Reads `LeadBookingOpportunity` rows with:
  - `status = BLOCKED`
  - `blockingReason = "missing_contact"`
- Verifies the related client has no `email` and no `phone`.
- Creates `MISSING_CONTACT` operational risk candidates.
- Does not assign estimated financial value.

### `detectBookingPathBlockedRisks`

- Reads `LeadBookingOpportunity` rows with:
  - `status = BLOCKED`
  - `blockingReason = "missing_booking_path"`
- Creates `BOOKING_PATH_BLOCKED` operational risk candidates.
- Does not assign estimated financial value.

### `detectStaleBookedProofRisks`

- Reads appointment CSV `DataSource` rows.
- Requires a live source through `IMPORTED`, `CONNECTED` or successful imported rows.
- Uses freshness date `lastImportCompletedAt ?? lastImportedAt ?? updatedAt`.
- Creates stale candidates when source age is at least 7 days by default.
- Creates `STALE_BOOKED_PROOF` data-quality risk candidates.
- Does not assign estimated financial value.

## Persistence guardrail

The detectors do not call:

- `prisma.revenueLeak.create`
- `prisma.revenueLeak.update`
- `prisma.revenueLeak.upsert`
- `prisma.revenueLeak.delete`

Persistence remains reserved for `sync-revenue-leaks.ts`.

## Sync implemented

Created in `services/revenue-leaks/sync-revenue-leaks.ts`:

- `syncRevenueLeaksForWorkspace`

Return shape:

- `detected`
- `created`
- `updated`
- `unchanged`
- `dismissedOrResolvedPreserved`

Sync behavior:

- Calls `detectRevenueLeaksForWorkspace`.
- Dedupes candidates by fingerprint before writing.
- Uses the unique `workspaceId + fingerprint` key to find existing leaks.
- Creates missing leaks.
- Updates existing `OPEN` leaks when candidate payload changed.
- Updates existing `ACKNOWLEDGED` leaks when candidate payload changed, while preserving `ACKNOWLEDGED` status.
- Does not reopen `RESOLVED` leaks.
- Does not reopen `DISMISSED` leaks.
- Preserves original `detectedAt` on updates by not rewriting it.
- Counts unchanged leaks through normalized payload comparison.
- Uses stable JSON comparison for `evidenceJson`.

Sync guardrails:

- No UI was added.
- No LLM call was added.
- No notification system was added.
- No automatic background job was added.
- No dashboard read model was added.

## Validation coverage

Created QA script:

- `scripts/validate-revenue-leak-engine.ts`

Created npm command:

- `npm run qa:revenue-leaks`

The script creates isolated QA workspaces and fake data, runs the real `syncRevenueLeaksForWorkspace`, validates persisted `RevenueLeak` behavior, and cleans up QA records.

Coverage:

- No-show with direct `estimatedRevenue` creates a financial leak with `HIGH` confidence.
- No-show without direct appointment value uses `ActivationSetup.averageDealValue` and `MEDIUM` confidence.
- No-show without direct value or average deal value creates `LOW` confidence and no estimated value.
- Canceled appointment without later same-client rebooking creates `CANCELED_NOT_RECOVERED`.
- Canceled appointment with later same-client `SCHEDULED` appointment does not create a cancellation leak.
- Missing contact with explicit `blockingReason = "missing_contact"` creates operational risk.
- Booking path blocked with explicit `blockingReason = "missing_booking_path"` creates operational risk.
- Stale appointment data source creates data-quality risk.
- Running sync twice does not duplicate leaks.
- `RESOLVED` leaks are not reopened automatically.
- `DISMISSED` leaks are not reopened automatically.
- Operational risks do not receive `estimatedValueCents`.
- Every created leak has `evidenceJson`.
- Every created leak has `fingerprint`.
- No OpenAI calls are made during validation.

Validation notes:

- The script uses real database writes against isolated QA records, then cleans them up.
- The script uses a tiny TS runtime loader because the project does not currently include `tsx` or `ts-node`.
- Node prints experimental loader/type-transform warnings. These are QA runner warnings, not product runtime warnings.

## Scope intentionally not implemented

- No UI-triggered sync.
- No background sync job.
- No dashboard read model.
- No Revenue Leaks Page.
- No AI Insight.
- No AI CSV Intake.
- No LLM calls.
- No migration.

## Known limitations

- Confidence and severity are V1 conservative heuristics, not clinical/accounting truth.
- Canceled-not-recovered uses inferred replacement booking evidence because there is no explicit rebooking relation.
- Estimation does not decide whether a leak should exist; it only safely converts supported value inputs.
- Fingerprints depend on detector code passing the correct scoped IDs.
- Sync preserves `ACKNOWLEDGED`, `DISMISSED` and `RESOLVED` status, but no UI exists yet to manage those states.
- No source window policy beyond record-level/source-level evidence is enforced yet.
- Sync is callable by code, but not yet wired into imports, dashboard, jobs or app routes.
- The QA script validates behavior through local database fixtures; it is not a long-term replacement for a dedicated test framework.

## Final status

Passed. Sprint 03 now has pure helpers, read-only deterministic detectors and an idempotent sync service that persists leak candidates without widening into UI, AI, notifications or dashboard surfaces.
