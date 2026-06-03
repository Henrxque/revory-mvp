# REVORY — Sprint 05 Revenue Leaks Page Report

## Step Completed

Implemented the list read model foundation for the Revenue Leaks Page V1.

This step did not create UI, status actions, a leak detail route, AI behavior, background jobs, or new database writes. It created a display-safe service layer that can power a narrow `Leak Signals` page from persisted `RevenueLeak` rows.

## Files Created

- `services/revenue-leaks/get-revenue-leak-list.ts`
- `services/revenue-leaks/revenue-leak-evidence-summary.ts`
- `services/revenue-leaks/revenue-leak-confidence-copy.ts`
- `src/app/(app)/app/revenue-leaks/page.tsx`
- `components/revenue-leaks/RevenueLeakFilters.tsx`
- `components/revenue-leaks/RevenueLeakList.tsx`
- `components/revenue-leaks/RevenueLeakCard.tsx`

## Files Updated

- `components/app/AppSidebar.tsx`

## Read Model Implemented

The new service is:

`getRevenueLeakListForWorkspace(input)`

Input:

- `workspaceId`
- `filter`
- `limit`

Output:

- active leak count
- resolved count
- dismissed count
- filtered list count
- display-safe list items

The read model queries only persisted `RevenueLeak` rows. It does not run the leak engine, call LLMs, write to the database, or invent metrics.

## Filters Supported

- `ALL_ACTIVE`
- `FINANCIAL`
- `OPERATIONAL`
- `DATA_QUALITY`
- `HIGH_SEVERITY`
- `LOW_CONFIDENCE`
- `RESOLVED`
- `DISMISSED`

Active filters use only:

- `OPEN`
- `ACKNOWLEDGED`

Archived filters are explicit:

- `RESOLVED`
- `DISMISSED`

## Display-Safe Item Fields

Each list item includes:

- leak type labels from `getRevenueLeakTypeLabel`
- category derived from `getRevenueLeakCategory`
- severity label
- status label
- confidence label
- confidence explanation
- detected date label
- source window label
- context label
- evidence summary
- related client context when available
- related appointment context when available
- related lead booking opportunity context when available
- source data source context when available
- estimated value label with financial guardrails

## Evidence Summary

Created `buildRevenueLeakEvidenceSummary()`.

It safely reads:

- `summary`
- `signals`
- `confidenceReason`
- `sourceRecordIds`
- basic value evidence

If evidence is malformed or sparse, it returns a conservative fallback:

`Evidence is available from imported clinic data, but the stored details are limited.`

This keeps the future UI from crashing on varied detector evidence shapes.

## Confidence Copy

Created `buildRevenueLeakConfidenceCopy()`.

It returns:

- label
- explanation

If the detector stored a confidence reason, that reason is used. Otherwise, it falls back to conservative product-truth language.

Important guardrail: high confidence still says the signal is estimated and not confirmed accounting loss.

## Financial Guardrails

Operational and data-quality risks are not counted as financial value.

The service sets:

- `estimatedValueIsCounted = true` only when `canContributeToEstimatedRevenueAtRisk()` allows it and `estimatedValueCents` exists.
- `estimatedValueCents = null` for operational/data-quality risks in the display item, even if bad persisted data includes a value.

Display labels:

- financial leak with value: `$X estimated at risk`
- financial leak without value: `Value needs stronger data`
- operational risk: `Operational risk; not counted as revenue at risk`
- data-quality risk: `Data-quality risk; not counted as revenue at risk`

## Scope Intentionally Not Implemented

- No BI-style table or chart.
- No status action UI controls yet.
- No `RESOLVED` action.
- No RevenueLeak schema changes.
- No migration.
- No AI Insight.
- No AI CSV Intake.
- No background job.
- No CRM/inbox workflow.
- No BI charts, trends, export, drilldown, or bulk action.

## UI Implemented

Created `/app/revenue-leaks` as the V1 Revenue Leaks page.

The page:

- requires authenticated app context;
- redirects incomplete activation to the current setup step;
- loads `getRevenueLeakListForWorkspace`;
- renders the required `Revenue Leaks` header;
- uses the subcopy `Review the revenue risks REVORY detected from your imported clinic data.`;
- renders lightweight filters;
- renders grouped cards for financial leak signals, operational risks and data-quality risks;
- shows estimated value only for financial leaks;
- shows non-financial risks as not counted as revenue at risk;
- shows severity, confidence and status badges;
- shows evidence summary;
- shows recommended action;
- includes an empty state;
- includes a product-truth honesty note;
- reuses the existing manual `Run leak read` action without creating background jobs.

The sidebar now includes `Revenue Leaks` under the `REVORY` group, between `Leak Read` and `Clinic Data`.

## Navigation Access

Added direct navigation access to the Revenue Leaks page:

- label: `Revenue Leaks`
- href: `/app/revenue-leaks`
- placement: existing `REVORY` sidebar group
- active route styling: supported by the existing `pathname === item.href || pathname.startsWith(...)` logic

No routes were renamed. Dashboard and Clinic Data links were preserved. No auth, billing or route-guard logic was changed.

## UI Guardrails Preserved

- No table-first reporting surface.
- No charting.
- No fake metrics.
- No LLM calls.
- No leak detail route.
- No CRM owner, notes, assignment, thread, inbox, bulk action or follow-up workflow.
- No claim of confirmed loss or recovered/generated revenue.

## Status Actions Implemented

Created `src/app/(app)/app/revenue-leaks/actions.ts`.

Implemented:

- `acknowledgeRevenueLeakAction`
- `dismissRevenueLeakAction`

Deferred:

- `resolveRevenueLeakAction`

Why `resolve` was deferred:

`RESOLVED` can imply REVORY verified operational recovery or revenue recovery. Sprint 05 keeps the action layer narrower and safer by supporting only review acknowledgement and dismissal from the active read.

Action safety behavior:

- requires authenticated app context;
- verifies the leak belongs to the current workspace;
- updates only `status`;
- does not edit `estimatedValueCents`;
- does not edit `evidenceJson`;
- does not call LLM;
- does not create comments, assignments, notifications, tasks or bulk workflows;
- does not reopen `RESOLVED` or `DISMISSED` leaks automatically;
- revalidates `/app/revenue-leaks`;
- revalidates `/app/dashboard`.

## Commands Run

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run qa:revenue-leaks`
- `npm run qa:revenue-leak-read`
- `npm run qa:revenue-leaks-page`

## Results

All commands passed.

QA scripts emitted existing Node experimental loader warnings, but the checks completed successfully.

Note: `npm run typecheck` briefly failed when run in parallel with `npm run build` because `.next/types` was being regenerated. Re-running `npm run typecheck` after build completed passed.

## Revenue Leaks Page QA Coverage

Created `scripts/validate-revenue-leaks-page.ts` and added:

`npm run qa:revenue-leaks-page`

The script validates:

- `/app/revenue-leaks` route file exists and uses authenticated app context;
- sign-in redirect protection is present;
- incomplete activation redirect to setup is present;
- active leaks appear through the list read model;
- `FINANCIAL` filter works;
- `OPERATIONAL` filter works;
- `DATA_QUALITY` filter works;
- `HIGH_SEVERITY` filter works;
- `LOW_CONFIDENCE` filter works;
- `RESOLVED` filter works;
- `DISMISSED` filter works;
- evidence summary is generated from `evidenceJson`;
- confidence explanation is generated from stored confidence reason;
- operational risks do not expose financial value as loss;
- data-quality risks do not expose financial value as loss;
- status actions verify workspace ownership;
- status actions do not edit `estimatedValueCents`;
- status actions do not edit `evidenceJson`;
- no OpenAI call is made;
- no Sprint 05 migration exists;
- no table/chart element is introduced by the page.

## Risks Remaining

- The next UI step must avoid turning filters into a BI surface.
- Status actions should remain limited to `Acknowledge` and `Dismiss` if implemented in Sprint 05.
- `Resolve` remains risky because it can imply verified recovery.
- The page should keep using estimated revenue-at-risk language, not confirmed loss language.

## Recommendation For Next Step

Build `/app/revenue-leaks` as a narrow `Leak Signals` page:

- compact executive header
- grouped card list
- no table-first UI
- no charts
- no drilldown route
- optional `Run leak read`
- optional `Acknowledge` / `Dismiss` only

## Status

Passed for this step.
