# REVORY - Sprint 04 QA Bug Hunt Report

## Summary

Sprint 04 passed QA.

The dashboard now uses the persisted `RevenueLeak` read model for the leak-first hero surface. The read model and dashboard surface are aligned with product truth: estimated revenue at risk is sourced from active persisted financial leaks only, operational/data-quality risks are shown separately, and resolved/dismissed leaks are excluded from active totals.

No Revenue Leaks Page, migration, fake metric, background job, notification, AI call or BI-style surface was introduced.

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
| `npm run qa:revenue-leak-read` | Passed |
| `npm run qa:clean-rerun` | Passed |

Additional scope/copy search was run for:

- `confirmed loss`
- `confirmed accounting loss`
- `lost revenue`
- `recovered revenue`
- `generated revenue`
- `Revenue Leaks Page`
- `revenueLeak.create/update/upsert/delete`
- `openai`
- `requestBounded`
- `background job`
- `cron`

## Results

- Prisma schema is valid.
- Database validation passes.
- Lint passes with zero warnings.
- Typecheck passes.
- Production build passes.
- Environment readiness passes with zero pending migrations.
- Engine QA passes.
- Dashboard read model QA passes.
- Clean rerun passes and writes evidence to `.tmp/manual-audit/rerun`.
- Build route list does not include `/app/revenue-leaks`.
- No Sprint 04 migration was created.

## Bugs found

No blocking Sprint 04 bugs found.

No read model correctness bug, dashboard build bug, manual sync duplication bug, active status filtering bug, financial summing bug, overpromise bug or scope-creep bug was found in this QA pass.

## Read model issues

No read model issue found.

Validated by `npm run qa:revenue-leak-read`:

- Financial leaks sum correctly into `estimatedRevenueAtRiskCents`.
- Operational risks do not contribute to estimated revenue at risk.
- Data-quality risks do not contribute to estimated revenue at risk.
- `RESOLVED` leaks are excluded from active totals.
- `DISMISSED` leaks are excluded from active totals.
- `topFinancialLeak` is selected separately from operational/data-quality risks.
- `topOperationalRisk` is selected separately.
- `STALE_BOOKED_PROOF` creates the data freshness warning.
- `EMPTY` state works.
- `NO_FINANCIAL_LEAKS` state works.
- `THIN_DATA` state works.
- Confidence summary counts and dominant bucket work.
- Severity summary counts and dominant bucket work.
- No OpenAI call is made during read model QA.

## UI issues

No blocking UI issue found.

The dashboard hero now uses:

- `getRevenueLeakReadForWorkspace(workspace.id)`;
- `Estimated Revenue at Risk This Month`;
- formatted estimated revenue at risk from persisted active financial leaks;
- honesty note that the value is an estimate, not confirmed accounting loss;
- top leak card;
- open leak signal count;
- operational risk count;
- data freshness card;
- recommended action;
- confidence/severity summary.

Manual sync review:

- Implemented as an explicit dashboard action, not a loop.
- Requires authenticated app context.
- Requires active billing access.
- Requires completed activation setup.
- Calls `syncRevenueLeaksForWorkspace`.
- Revalidates `/app/dashboard`.
- Shows success/error feedback.
- Does not create background jobs, notifications, migrations or AI calls.
- Underlying sync idempotency is covered by `npm run qa:revenue-leaks`.

Residual UI coverage note:

- `qa:clean-rerun` validates app/dashboard stability, but does not specifically click the `Run leak read` button. The server action compiles, builds and calls the already-tested sync path. A future browser-level QA can click the button explicitly, but this is not a blocker for Sprint 04.

## Copy/overpromise issues

No dashboard overpromise issue found.

Dashboard copy does not claim:

- confirmed loss;
- lost revenue as accounting fact;
- recovered revenue;
- generated revenue;
- automatic recovery;
- live monitoring;
- AI detection;
- BI/reporting suite.

Search did find phrases such as `confirmed accounting loss`, `confirmed lost revenue`, `recovered revenue` and OpenAI references elsewhere, but they are either:

- guardrail/negative phrasing, e.g. "not confirmed accounting loss";
- existing bounded LLM services outside Sprint 04;
- QA scripts that guard against OpenAI calls;
- the expected sync persistence layer.

No Sprint 04 dashboard copy needs correction based on this pass.

## Scope creep risks

No active scope creep found.

Confirmed not added:

- No `/app/revenue-leaks` page.
- No migration.
- No fake dashboard metric.
- No dashboard table/filter/drilldown.
- No background job.
- No notification system.
- No AI Insight.
- No AI CSV Intake.
- No CRM/inbox/BI expansion.

Expected persistence calls:

- `services/revenue-leaks/sync-revenue-leaks.ts` creates/updates `RevenueLeak` rows.
- QA scripts create/update isolated fixtures.

Those are expected and not scope creep.

Known tooling caveat:

- `qa:revenue-leaks` and `qa:revenue-leak-read` use the lightweight Node experimental TS loader and print warnings. This is local QA tooling noise, not product runtime risk.

## Pass/fail recommendation

Pass.

Sprint 04 is approved. The dashboard leak read is backed by persisted `RevenueLeak` rows, the hero surface is leak-first and honest, the manual sync action is bounded, and the sprint did not drift into BI, AI, background automation or a new Revenue Leaks Page.
