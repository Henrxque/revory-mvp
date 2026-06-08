# REVORY - Sprint 07 Executive Revenue Leak Summary Report

## Summary

Implemented the deterministic Executive Revenue Leak Summary read model and visible dashboard share surface.

The new summary is backed by persisted `RevenueLeak`-derived reads and now powers a leak-first executive copy/share/print surface without using the older proof-era `DashboardOverview` or `DailyBookingBriefRead` as the shareable summary source of truth.

## Files Created

- `services/revenue-leaks/get-executive-revenue-leak-summary-read.ts`
- `components/proof/ExecutiveRevenueLeakSummaryCard.tsx`
- `components/proof/ExecutiveRevenueLeakSummarySheet.tsx`
- `scripts/validate-executive-revenue-leak-summary.ts`

## Files Updated

- `src/app/(app)/app/dashboard/page.tsx`
- `package.json`
- `docs/sprints/SPRINT_07_EXECUTIVE_REVENUE_LEAK_SUMMARY_REPORT.md`

## Read Model Created

Created:

- `ExecutiveRevenueLeakSummaryRead`
- `ExecutiveRevenueLeakSummaryState`
- `ExecutiveRevenueLeakSummaryLeak`
- `ExecutiveRevenueLeakSummaryBucket`
- `ExecutiveRevenueLeakSummaryDataFreshness`
- `ExecutiveRevenueLeakSummaryPrintSection`

Main exported function:

- `getExecutiveRevenueLeakSummaryRead({ workspaceId, now? })`

## Data Sources Used

The service reads from existing deterministic leak-first services:

- `getRevenueLeakReadForWorkspace`
- `getRevenueLeakListForWorkspace`
- `getDailyLeakBriefRead`

It also uses leak-domain helpers for display-safe categorization and evidence framing:

- `getRevenueLeakCategory`
- `getRevenueLeakTypeLabel`
- `buildRevenueLeakEvidenceSummary`
- `buildRevenueLeakConfidenceCopy`

The service performs one small direct read of active leak evidence by ID so the executive summary can rebuild evidence and confidence copy from stored `evidenceJson`.

## State Support

Supported states:

- `EMPTY`
- `HAS_REVENUE_AT_RISK`
- `OPERATIONAL_ONLY`
- `DATA_STALE`
- `THIN_DATA`

State priority is conservative:

1. Empty if no active persisted leaks exist.
2. Has revenue at risk if counted financial value exists.
3. Thin data if financial leak signals exist without counted value.
4. Data stale if stale data-quality risk dominates.
5. Operational only otherwise.

## Financial Guardrails

Financial value comes from `getRevenueLeakReadForWorkspace`, which already sums only active financial leaks.

The executive summary:

- excludes `RESOLVED` and `DISMISSED` rows through active read/list services;
- does not count operational risks as money;
- does not count data-quality risks as money;
- uses `estimatedRevenueAtRiskCents` and `estimatedRevenueAtRiskLabel` only for the executive financial metric;
- labels non-financial top risks as not counted as revenue at risk.

## Executive Output

The read model now returns:

- `workspaceId`
- `generatedAt`
- `title`
- `headline`
- `summary`
- `estimatedRevenueAtRiskLabel`
- `estimatedRevenueAtRiskCents`
- `activeFinancialLeakCount`
- `activeOperationalRiskCount`
- `activeDataQualityRiskCount`
- `topFinancialLeaks`
- `topOperationalRisks`
- `topDataQualityRisks`
- `confidenceSummary`
- `severitySummary`
- `dataFreshnessSummary`
- `recommendedExecutiveAction`
- `honestyNote`
- `copyableSummary`
- `printSections`
- `state`

## Copy / Print Readiness

Created deterministic fields and wired them into the UI:

- `copyableSummary`
- `printSections`

Copy stays short and executive. Print sections are structured but intentionally not a report suite:

- executive snapshot;
- top financial leaks;
- operational and data-quality risks;
- recommended action.

The visible sheet reuses the existing affordance pattern:

- `Copy summary`
- `Share summary`
- `Print or save PDF`
- native `navigator.share` when available
- clipboard fallback
- Blob URL print view

No public share link, advanced PDF engine, export suite or BI reporting surface was added.

## UI Implemented

Created `ExecutiveRevenueLeakSummaryCard` with:

- `Estimated revenue at risk`
- active financial leak count
- operational/data-quality risk counts shown separately
- top 3 executive risks
- data freshness note
- confidence/severity summary
- recommended executive action
- honesty note

Created `ExecutiveRevenueLeakSummarySheet` with:

- modal opening button: `Share leak summary`
- leak-first summary card
- copy/share/print actions
- premium print-friendly HTML view
- honest fallback states for copy/print failure

Updated dashboard wiring:

- replaced `ExecutiveProofSummarySheet` in the share gate with `ExecutiveRevenueLeakSummarySheet`
- loaded `getExecutiveRevenueLeakSummaryRead({ workspaceId })`
- removed the old `getExecutiveProofSummaryRead(...)` dependency from dashboard share wiring
- kept the existing Growth-only billing gate behavior unchanged
- updated the Basic gate copy to say Growth adds copy/share/print for the `Executive Revenue Leak Summary`

## Dashboard Integration

Final dashboard integration is complete.

Confirmed:

- `src/app/(app)/app/dashboard/page.tsx` loads `getExecutiveRevenueLeakSummaryRead({ workspaceId: workspace.id })`.
- The dashboard renders `ExecutiveRevenueLeakSummarySheet` inside the existing share gate.
- The old `ExecutiveProofSummarySheet` is no longer imported or rendered by the dashboard.
- The old `ExecutiveProofSummary` service/components remain in the repo only as compatibility/historical substrate.
- The dashboard does not render two redundant executive summary share surfaces.
- `DailyLeakBrief` remains visible.
- The RevenueLeak dashboard hero remains visible.
- Existing auth, billing and import behavior were not changed.
- No new route was added.
- No LLM path was added.

## Product Truth Guardrails

Preserved:

- no LLM call;
- no detector/sync run;
- no database write;
- no migration;
- no trend/history/comparison;
- no BI chart/report;
- no positive claim of confirmed accounting loss;
- no claim that REVORY recovered, generated or guaranteed revenue.

Honesty note:

`Estimated revenue at risk is based on active imported leak evidence, not confirmed accounting loss.`

Copy notes:

- The only `confirmed accounting loss` / `confirmed financial loss` language appears as explicit negation.
- Operational and data-quality risks are presented separately and not counted as financial value.

## Commands Run

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run qa:revenue-leaks`
- `npm run qa:revenue-leak-read`
- `npm run qa:revenue-leaks-page`
- `npm run qa:daily-leak-brief`
- `npm run qa:executive-revenue-leak-summary`

## Results

All commands passed.

The integration was revalidated after dashboard wiring:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed and kept `/app/dashboard` and `/app/revenue-leaks` available.

The QA scripts emitted the existing Node experimental loader / transform-types warnings. These are non-blocking and consistent with the current project QA script pattern.

## QA Coverage

Added:

`npm run qa:executive-revenue-leak-summary`

The script validates:

- `EMPTY` state;
- `HAS_REVENUE_AT_RISK` state;
- `OPERATIONAL_ONLY` state;
- `DATA_STALE` state;
- `THIN_DATA` state;
- financial value sums only financial leaks;
- operational risks do not count as financial value;
- data-quality risks do not count as financial value;
- `RESOLVED` and `DISMISSED` leaks are excluded from active totals and copyable summary;
- top financial, operational and data-quality executive risks are selected separately;
- `copyableSummary` avoids lost/confirmed/recovered/generated revenue claims;
- honesty note exists;
- no OpenAI/LLM call is made;
- no Sprint 07 migration exists;
- no BI charts/trends/comparison, public share link, detector/sync call or advanced reporting scope was introduced.

## Limitations

- The old `ExecutiveProofSummary` service/components still exist.
- Billing gate naming still uses `EXECUTIVE_PROOF_SHARE`; behavior should remain unchanged until a dedicated nomenclature cleanup.

## Next Step

Next Sprint 07 step should be the final QA Bug Hunter pass across the executive summary, dashboard integration, share/copy/print behavior and billing gate behavior.
