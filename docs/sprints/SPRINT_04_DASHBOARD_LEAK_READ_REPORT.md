# REVORY - Sprint 04 Dashboard Leak Read Report

## Summary

Implemented the first dashboard read model backed by persisted `RevenueLeak` rows.

This step creates the read layer only. It does not render a dashboard hero, run sync automatically, add UI, add AI, create a Revenue Leaks Page, add a migration or write to the database.

## File created

- `services/revenue-leaks/get-revenue-leak-read.ts`

## UI file updated

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/dashboard/actions.ts`
- `components/dashboard/RunLeakReadAction.tsx`

## QA files updated

- `scripts/validate-revenue-leak-read.ts`
- `package.json`

## Read model implemented

Created:

- `getRevenueLeakReadForWorkspace`
- `RevenueLeakRead`
- `RevenueLeakReadItem`
- `RevenueLeakReadState`
- `RevenueLeakSummaryBucket`
- `RevenueLeakDataFreshnessSummary`

The read model queries persisted `RevenueLeak` rows for the workspace and only includes active statuses:

- `OPEN`
- `ACKNOWLEDGED`

It excludes inactive states from dashboard totals:

- `RESOLVED`
- `DISMISSED`

## Derived values

The read model derives:

- `activeLeakCount`
- `activeFinancialLeakCount`
- `activeOperationalRiskCount`
- `activeDataQualityRiskCount`
- `estimatedRevenueAtRiskCents`
- `estimatedRevenueAtRiskLabel`
- `topLeak`
- `topFinancialLeak`
- `topOperationalRisk`
- `topDataQualityRisk`
- `topLeaks`
- `confidenceSummary`
- `severitySummary`
- `dataFreshnessSummary`
- `recommendedAction`
- `state`
- `lastDetectedAt`

## Financial honesty

Estimated revenue at risk is summed only when both are true:

- the leak type derives to `FINANCIAL_LEAK`;
- `estimatedValueCents` is present.

Operational and data-quality risks are counted separately and are not included in `estimatedRevenueAtRiskCents`.

This protects against inflating the dashboard with operational risk value that the product does not yet support as a financial estimate.

## Category derivation

Category is not read from the database.

The read model uses:

- `getRevenueLeakCategory`
- `canContributeToEstimatedRevenueAtRisk`
- `getRevenueLeakTypeLabel`

This keeps category logic centralized in the TypeScript domain layer from Sprint 02.

## Read states

Implemented states:

- `EMPTY`: no active persisted leaks.
- `HAS_REVENUE_AT_RISK`: active financial leak value exists.
- `THIN_DATA`: active financial leak evidence exists, but no usable estimated value exists.
- `DATA_STALE`: active stale appointment evidence risk exists and no financial leak value is available.
- `NO_FINANCIAL_LEAKS`: active operational risk exists, but no active financial leak exists.

State priority is intentionally conservative:

- financial value wins only when persisted active financial value exists;
- financial evidence without value becomes `THIN_DATA`;
- stale data becomes `DATA_STALE` only when no active financial value is present;
- operational-only risk does not become financial value.

## Top leak selection

Top leak ranking uses:

1. severity;
2. confidence;
3. estimated value;
4. detection recency.

The read model builds:

- overall `topLeak`;
- category-specific top leak/risk;
- `topLeaks` capped at five items.

This is enough for a dashboard hero or compact panel without turning Sprint 04 into a full Revenue Leaks Page.

## Confidence and severity summaries

The read model returns count buckets and dominant labels for:

- confidence: `LOW`, `MEDIUM`, `HIGH`;
- severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

Dominant summary chooses the most common bucket and uses rank as tie-breaker.

## Data freshness summary

The read model derives freshness from persisted `STALE_BOOKED_PROOF` rows.

It does not create a separate freshness engine.

Returned values:

- `hasStaleDataRisk`
- `staleRiskCount`
- `topStaleRisk`
- `lastDetectedAt`
- `label`
- `note`

## Recommended action

The read model returns one bounded `recommendedAction`:

- empty state: refresh after new appointment data is uploaded;
- financial value present: use the top financial leak action;
- financial leak without value: improve appointment value evidence or average deal value;
- stale data: upload a fresh appointment file;
- operational-only risk: use the highest-priority operational action.

No automated recovery, CRM action, inbox flow or AI action is implied.

## Money formatting

The read model exposes:

- raw cents: `estimatedRevenueAtRiskCents`;
- formatted label: `estimatedRevenueAtRiskLabel`;
- formatted item-level `estimatedValueLabel`.

Formatting uses `Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" })`.

This keeps Sprint 04 practical without refactoring every existing dashboard money formatter.

## Commands run

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run qa:revenue-leaks` | Passed |
| `npm run qa:revenue-leak-read` | Passed |

## Validation coverage

Created npm command:

- `npm run qa:revenue-leak-read`

The script creates isolated QA users/workspaces, inserts deterministic `RevenueLeak` rows directly, calls the persisted dashboard read model, validates results and cleans up QA records after execution.

Coverage:

- Financial leaks sum correctly into `estimatedRevenueAtRiskCents`.
- Operational risks do not sum into estimated revenue at risk, even if a bad persisted value exists.
- Data-quality risks do not sum into estimated revenue at risk, even if a bad persisted value exists.
- `RESOLVED` leaks are excluded from active totals.
- `DISMISSED` leaks are excluded from active totals.
- `topFinancialLeak` is selected by severity/confidence/value ordering.
- `topOperationalRisk` is selected separately from financial leaks.
- `STALE_BOOKED_PROOF` produces the data freshness warning.
- `EMPTY` state works with no active leaks.
- `NO_FINANCIAL_LEAKS` state works with operational-only risk.
- `THIN_DATA` state works with financial leak evidence but no estimated value.
- Confidence summary counts and dominant bucket work.
- Severity summary counts and dominant bucket work.
- No OpenAI call is made during read model QA.

The script intentionally does not create UI, fake dashboard metrics, background jobs or production seed data.

## Dashboard UI changes

The existing dashboard hero now consumes `getRevenueLeakReadForWorkspace(workspace.id)` in the page-level server data load.

Changed the hero from observed-revenue-first to leak-first:

- Primary label: `Estimated Revenue at Risk This Month`.
- Primary value: `revenueLeakRead.estimatedRevenueAtRiskLabel`.
- State badge: derived from `revenueLeakRead.state`.
- Hero headline: derived from `EMPTY`, `NO_FINANCIAL_LEAKS`, `HAS_REVENUE_AT_RISK`, `DATA_STALE` and `THIN_DATA`.
- Honesty note: `Estimate from active persisted leak evidence, not confirmed accounting loss.`

Added compact executive signals inside the existing hero card:

- open leak signals count;
- operational risks count;
- confidence/severity summary;
- top leak card;
- data freshness card;
- recommended action card.

Observed revenue remains available elsewhere in the existing dashboard, but it is no longer the main hero promise.

## Dashboard state handling

Dashboard copy now supports:

- `EMPTY`: asks the user to refresh the leak read after clinic data is uploaded.
- `NO_FINANCIAL_LEAKS`: communicates operational risks without treating them as financial loss.
- `HAS_REVENUE_AT_RISK`: shows estimated revenue at risk from persisted active financial leaks.
- `DATA_STALE`: points to stale appointment evidence as a data-quality risk.
- `THIN_DATA`: communicates that leak evidence exists but financial value is not strong enough yet.

No state claims confirmed lost revenue, recovered revenue or generated revenue.

## Product truth guardrails kept

- The hero reads persisted `RevenueLeak` rows through the read model.
- Operational risks are shown as counts and top risks, not as financial value.
- Data freshness comes from `STALE_BOOKED_PROOF`, not a new fake freshness engine.
- No LLM call was added.
- No background job was added.
- No Revenue Leaks Page was created.
- No dashboard table, filter set, drilldown or BI-style reporting surface was added.

## Manual sync action

Implemented a bounded dashboard action after confirming `SPRINT_04_DASHBOARD_AUDIT.md` marked manual sync as safe with constraints.

Created:

- `src/app/(app)/app/dashboard/actions.ts`
- `components/dashboard/RunLeakReadAction.tsx`

Behavior:

- Button label: `Run leak read`.
- Subcopy: `Refresh leak signals from your latest imported data.`
- Calls `syncRevenueLeaksForWorkspace`.
- Requires authenticated app context.
- Requires active billing access via `getWorkspaceBillingSummary`.
- Requires completed activation setup.
- Revalidates `/app/dashboard`.
- Returns compact success/error feedback.

Guardrails:

- Does not run in a loop.
- Does not create a background job.
- Does not call LLM.
- Does not create notifications.
- Does not create a migration.
- Does not imply real-time monitoring.
- Does not claim recovered, generated or confirmed lost revenue.

Implementation note:

- The first build attempt exposed a Next.js rule: `"use server"` files can only export async functions at runtime. The initial state object was moved out of the server action module and into the dashboard call site. Build passed after that correction.

## Scope intentionally not implemented

- No Revenue Leaks Page.
- No automatic sync.
- No background job.
- No AI call.
- No AI Insight.
- No AI CSV Intake.
- No migration.
- No write to `RevenueLeak`.
- No billing/auth/import behavior change.

## Known limitations

- The read model depends on Sprint 03 sync having already persisted `RevenueLeak` rows.
- `RESOLVED` and `DISMISSED` leaks are intentionally excluded from active dashboard totals.
- Currency is formatted as USD in this V1 read.
- The read model does not expose historical trend, filters or drilldown because that would push Sprint 04 toward BI.
- The dashboard hero is wired to persisted leak reads, but sync still has to be triggered elsewhere until a bounded manual sync action is added.
- QA scripts still use the lightweight Node experimental TS loader. This is a local tooling warning, not a product runtime issue.

## Final status

Passed.

Sprint 04 now has a persisted-leak dashboard read model and a leak-first dashboard hero surface. The surface is honest, narrow and backed by persisted `RevenueLeak` rows.
