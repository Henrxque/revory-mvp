# REVORY - Sprint 06 Daily Leak Brief Report

## Summary

Implemented the visible Daily Leak Brief V1 on the dashboard.

The dashboard now opens with a leak-first daily read backed by a deterministic Daily Leak Brief read model. The old `DailyBookingBrief` code was not deleted and remains available as compatibility substrate for existing executive/proof flows.

## Files Created

- `components/briefs/DailyLeakBrief.tsx`
- `services/revenue-leaks/get-daily-leak-brief-read.ts`
- `scripts/validate-daily-leak-brief.ts`

## Files Updated

- `package.json`
- `src/app/(app)/app/dashboard/page.tsx`

## What Changed

The visible dashboard daily card now renders:

- `Today’s Leak Brief`
- state badge
- leak-state headline
- estimated value only when financial value exists
- active signal fallback when no financial value exists
- confidence / severity
- short summary
- recommended action
- top signal
- freshness
- honesty note
- CTA to `/app/revenue-leaks`

## Data Source

The component receives `dailyLeakBriefRead` from:

- `getDailyLeakBriefRead(workspace.id)`

The read model reuses persisted RevenueLeak reads:

- `getRevenueLeakReadForWorkspace(workspaceId)`
- `getRevenueLeakListForWorkspace({ workspaceId, filter: "ALL_ACTIVE", limit: 5 })`

It does not run the leak engine automatically, write to the database, call LLM, create notifications or create background jobs.

## Read Model Implemented

Created `DailyLeakBriefRead` with:

- `state`
- `stateLabel`
- `tone`
- `headline`
- `summary`
- `primarySignal`
- `primaryLeak`
- `estimatedValueCents`
- `estimatedValueLabel`
- `confidenceSeverityLabel`
- `recommendedAction`
- `freshness`
- `signals`
- `detailHref`
- `honestyNote`

Supported states:

- `EMPTY`
- `HAS_FINANCIAL_LEAK`
- `OPERATIONAL_ONLY`
- `DATA_STALE`
- `THIN_DATA`

Primary leak priority:

1. Financial leak with counted estimated value.
2. Financial leak without value.
3. Stale booked proof/data-quality risk.
4. Operational risk.

Financial guardrail:

- `estimatedValueCents` is included only when the brief state has a financial leak with value.
- Operational and data-quality risks are never surfaced as financial value.

## Coexistence With DailyBookingBrief

Visible dashboard surface:

- replaced with `DailyLeakBrief`

Code-level compatibility:

- `DailyBookingBrief` was not deleted.
- `getDailyBookingBriefRead` remains available.
- `dailyBriefRead` is still loaded because `getExecutiveProofSummaryRead(...)` currently depends on it.

This matches the audit recommendation: replace the visible card, but avoid breaking old dependencies in the same step.

## Product Truth Guardrails

Preserved:

- no AI call;
- no email/slack/notification;
- no background job;
- no new route;
- no migration;
- no BI/report surface;
- no claim of confirmed loss;
- no claim of recovered/generated revenue;
- operational and data-quality risks stay separate from financial value.

## Scope Intentionally Not Implemented

- No status action UI inside the brief.
- No notification/digest behavior.
- No trend/history/comparison surface.
- No executive proof refactor.

## Commands Run

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run qa:daily-leak-brief`

## Results

All commands passed.

Non-blocking note:

- npm printed a minor version update notice. This is not a product/build issue.
- QA scripts emit existing Node experimental loader / transform-types warnings.
- The first QA attempt failed while the local PostgreSQL service was stopped. PostgreSQL was started with `pg_ctl`, `env:check` passed, and `npm run qa:daily-leak-brief` then passed.

## QA Coverage

Added:

`npm run qa:daily-leak-brief`

The script validates:

- `EMPTY` state;
- `HAS_FINANCIAL_LEAK` state;
- `OPERATIONAL_ONLY` state;
- `DATA_STALE` state;
- `THIN_DATA` state;
- operational risks do not become financial value;
- data-quality risks do not become financial value;
- copy avoids confirmed/lost/recovered/generated revenue claims;
- `detailHref` points to `/app/revenue-leaks`;
- no OpenAI/LLM call is made;
- no Sprint 06 migration exists.

## Risks Remaining

- The dashboard still computes `dailyBriefRead` for executive proof compatibility, so there is temporary duplicate conceptual brief logic.
- A later sprint should decide whether `getExecutiveProofSummaryRead` should consume a leak-first brief read.
- If the Daily Leak Brief grows beyond this compact card, it could drift into BI/report territory.

## Final Status

Passed for this step.
