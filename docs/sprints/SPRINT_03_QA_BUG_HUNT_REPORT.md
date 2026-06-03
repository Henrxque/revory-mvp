# REVORY - Sprint 03 QA Bug Hunt Report

## Summary

Sprint 03 passed QA.

The deterministic Leak Engine V1 detects the five approved V1 leak types or risk types:

- `NO_SHOW_REVENUE`
- `CANCELED_NOT_RECOVERED`
- `MISSING_CONTACT`
- `BOOKING_PATH_BLOCKED`
- `STALE_BOOKED_PROOF`

The implementation is scoped correctly: detectors produce candidates, sync handles persistence, operational/data-quality risks do not receive financial value by default, every persisted candidate has evidence and fingerprint, and no UI, fake metric, AI layer, AI CSV Intake or extra migration was added in Sprint 03.

The strongest validation point is the dedicated `qa:revenue-leaks` script. It uses isolated database fixtures, runs real sync twice, checks idempotency, validates resolved/dismissed preservation, verifies value behavior, and guards against OpenAI calls.

## Commands run

| Command | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npm run db:validate` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run env:check` | Passed |
| `npm run qa:revenue-leaks` | Passed |
| `npm run qa:clean-rerun` | Passed |

Additional scope search was run across `services/revenue-leaks`, the QA script, `src`, `components` and `prisma/migrations` for persistence calls, LLM references, fake UI/page language and fake metrics.

## Results

- Prisma schema validates.
- Database validation passes.
- Lint passes with `--max-warnings=0`.
- TypeScript typecheck passes.
- Production build passes.
- Environment readiness passes with zero pending migrations.
- Clean rerun passes and saved evidence under `.tmp/manual-audit/rerun`.
- Sprint 03 QA script passes all revenue leak engine scenarios.
- No extra Sprint 03 migration was created.
- No Revenue Leaks Page or UI surface was added.
- No fake dashboard metric was added.
- No LLM call is made by the engine or sync.

## Bugs found

No valid Sprint 03 bugs found.

No detector correctness bug, sync duplication bug, estimation bug, confidence/severity bug, schema issue, migration issue, build issue or scope-creep bug was found during this QA pass.

## Idempotency issues

No idempotency issue found.

Validated behavior:

- Running sync twice does not duplicate leaks.
- The second sync returns no new creates for the same deterministic candidates.
- Sync uses `workspaceId + fingerprint` as the dedupe boundary.
- Existing `OPEN` leaks can be updated when candidate payload changes.
- Existing `ACKNOWLEDGED` leaks can be refreshed without losing acknowledged state.
- Existing `RESOLVED` leaks are not reopened automatically.
- Existing `DISMISSED` leaks are not reopened automatically.
- Candidate dedupe trims and filters empty fingerprints before persistence.

The persistence boundary is also correct: detector functions do not call `prisma.revenueLeak.create`, `update`, `upsert` or `delete`. Only `sync-revenue-leaks.ts` persists candidates, which is expected for this sprint.

## Estimation issues

No estimation issue found.

Validated behavior:

- No-show with direct `Appointment.estimatedRevenue` creates a financial leak with value.
- No-show without direct value uses `ActivationSetup.averageDealValue` as a fallback.
- No-show without direct or average value creates a low-confidence financial leak with no estimated value.
- Canceled-not-recovered uses the same conservative value path.
- Operational risks do not receive `estimatedValueCents`.
- Data-quality risks do not receive `estimatedValueCents`.
- Operational/data risks are not counted as financial value by default.
- Estimation helpers guard against invalid, negative, zero and non-finite values.

No claim of confirmed loss, recovered revenue or REVORY-generated revenue was introduced.

## Confidence/severity issues

No confidence or severity issue found.

Validated behavior:

- Direct appointment value supports `HIGH` confidence for financial leaks.
- Average deal value fallback supports `MEDIUM` confidence.
- Missing financial value falls back to `LOW` confidence for financial leak candidates.
- Operational risks remain conservative and do not pretend to be confirmed financial loss.
- Stale data source risk is classified as data-quality risk, not financial loss.
- Severity remains conservative and value-based for financial leaks.

Remaining caveat: confidence and severity are V1 deterministic heuristics, not accounting truth. That is acceptable for Sprint 03 as long as downstream UI keeps using estimated/revenue-at-risk language.

## Scope creep risks

No active scope creep found.

Confirmed not implemented:

- No Revenue Leaks Page.
- No dashboard leak read model.
- No fake estimated revenue-at-risk metric surfaced in the app.
- No AI Insight Layer.
- No AI CSV Intake/Triage.
- No LLM calls.
- No notifications.
- No background job.
- No new migration.
- No CRM, inbox, BI or scheduling-system expansion.

Minor tooling note:

- `npm run qa:revenue-leaks` uses Node experimental loader/type-transform flags through `scripts/ts-runtime-loader.mjs`. This is acceptable as a local QA utility, but it is not as clean as a dedicated test runner. It is not a product runtime risk.

## Pass/fail recommendation

Pass.

Sprint 03 is approved as a technical foundation for deterministic leak detection. The engine is honest, idempotent and narrow. It is ready for the next sprint to build read models or surfaces on top of persisted `RevenueLeak` rows, provided the next sprint does not present estimates as confirmed accounting losses.
