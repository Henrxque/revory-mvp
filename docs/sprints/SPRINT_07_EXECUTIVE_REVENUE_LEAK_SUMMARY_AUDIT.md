# REVORY - Sprint 07 Executive Revenue Leak Summary Audit

## Summary

Sprint 07 should replace the current proof-era executive share read with an Executive Revenue Leak Summary backed by persisted `RevenueLeak` rows.

The current share/copy/print shell is useful and should be reused. The current data model behind it is the wrong source of truth for V3 because it still depends on `DashboardOverview` and `DailyBookingBriefRead`, both of which come from the older booked-proof/revenue-read substrate.

Recommended approach: add a new `getExecutiveRevenueLeakSummaryRead` service, adapt or duplicate the existing card/sheet component with the smallest safe prop change, keep billing gates unchanged, and leave the old proof service in place until no other flow depends on it.

## Files Inspected

- `services/proof/get-executive-proof-summary-read.ts`
- `components/proof/ExecutiveProofSummaryCard.tsx`
- `components/proof/ExecutiveProofSummarySheet.tsx`
- `src/app/(app)/app/dashboard/page.tsx`
- `services/revenue-leaks/get-revenue-leak-read.ts`
- `services/revenue-leaks/get-revenue-leak-list.ts`
- `services/revenue-leaks/get-daily-leak-brief-read.ts`
- `components/briefs/DailyLeakBrief.tsx`
- `services/billing/workspace-billing.ts`
- `package.json`
- existing QA scripts under `scripts/validate-*.ts`

## 1. Current Executive Summary Data Flow

Current dashboard flow:

1. `src/app/(app)/app/dashboard/page.tsx` gets the authenticated app context.
2. Dashboard loads:
   - `getDashboardOverview(workspace.id, configuredValuePerBooking)`
   - `getDailyBookingBriefRead(workspace.id, activationSetup)`
   - `getRevenueLeakReadForWorkspace(workspace.id)`
   - `getDailyLeakBriefRead(workspace.id)`
3. Dashboard builds `executiveProofSummaryRead` with:
   - `dailyBriefRead`
   - `overview`
   - `workspaceName`
4. Dashboard gates sharing with:
   - `canUseBillingPlanFeature(workspace.planKey, "EXECUTIVE_PROOF_SHARE")`
5. If allowed, dashboard renders:
   - `<ExecutiveProofSummarySheet read={executiveProofSummaryRead} />`
6. If not allowed, dashboard renders:
   - `<GrowthProofShareLimitCard />`

Current share surface behavior:

- `Copy summary` writes `read.copyText` to clipboard.
- `Share summary` uses `navigator.share` when available and falls back to copy.
- `Print or save PDF` creates a Blob HTML print view, opens it in a popup, and relies on browser print.
- No public share link exists.
- No export/PDF service exists.

Assessment:

The interaction model is narrow and good. The data source is not leak-first enough.

## 2. Current Dependency On DailyBookingBrief Or Proof-Era Data

The current service `getExecutiveProofSummaryRead` depends directly on:

- `DailyBookingBriefRead`
- `DashboardOverview`

Proof-era fields still driving the summary:

- `overview.bookedAppointments`
- `overview.recentMomentum`
- `overview.commercialSafeguard`
- `overview.executiveRead.tiles`
- `dailyBriefRead.freshness`

Current language is partially repositioned but still proof-era:

- `Executive revenue read`
- `Observed revenue read`
- `Appointment evidence`
- `Recent evidence`
- `Evidence position`
- `observed revenue, appointment evidence, freshness and support context only`

What is acceptable temporarily:

- `Appointment evidence` can stay as supporting evidence language.
- `Freshness` can stay.
- `Executive revenue read` is not wrong, but should become leak-specific in Sprint 07.

What should change in Sprint 07:

- The shareable executive summary should no longer be centered on booked proof or observed revenue.
- It should center on persisted revenue leak evidence:
  - estimated revenue at risk;
  - active financial leak count;
  - operational risks;
  - data-quality/staleness risks;
  - top leak;
  - confidence/severity;
  - recommended next fix;
  - honesty note.

Risk if unchanged:

The dashboard hero and Daily Leak Brief are already leak-first, but the shareable executive summary still describes the old product center. That creates category drift exactly where commercial trust matters most.

## 3. Best Place To Add getExecutiveRevenueLeakSummaryRead

Recommended new service:

`services/revenue-leaks/get-executive-revenue-leak-summary-read.ts`

Why this location:

- The summary should be backed by `RevenueLeak` rows, not by proof-era dashboard overview.
- It can reuse existing revenue leak read/list services.
- It keeps the new V3 product surface grouped with leak-domain services.

Recommended read dependencies:

- `getRevenueLeakReadForWorkspace(workspaceId)`
- `getRevenueLeakListForWorkspace({ workspaceId, filter: "ALL_ACTIVE", limit: 5 })`
- optionally `getDailyLeakBriefRead(workspaceId)` only for freshness/headline reuse, not as the primary source of truth

Recommended read shape:

```ts
export type ExecutiveRevenueLeakSummaryRead = {
  copyText: string;
  headline: string;
  honestyNote: string;
  periodLabel: string;
  primaryMetric: {
    label: string;
    note: string;
    value: string;
  };
  recommendedAction: string;
  riskPosture: {
    label: string;
    note: string;
    tone: "accent" | "future" | "neutral" | "real";
  };
  signals: Array<{
    label: string;
    note: string;
    tone: "accent" | "future" | "neutral" | "real";
    value: string;
  }>;
  summary: string;
  topLeaks: Array<{
    categoryLabel: string;
    confidenceLabel: string;
    estimatedValueLabel: string;
    label: string;
    severityLabel: string;
  }>;
  workspaceName: string;
};
```

Recommended primary metric:

- `Estimated revenue at risk` if financial value exists.
- `Financial value pending` if financial leaks exist but lack value.
- `Operational risks visible` if only operational risks exist.
- `Data freshness risk` if stale data dominates.
- `No active leak signals` when empty.

Financial guardrail:

- Only financial leaks should contribute to the summary's money metric.
- Operational/data-quality risks may appear as risk signals, never as financial totals.

## 4. Whether To Replace Or Coexist With ExecutiveProofSummary

Recommended product behavior:

Replace the visible shareable dashboard summary with Executive Revenue Leak Summary.

Recommended technical behavior:

Coexist temporarily.

Why not delete the old proof services immediately:

- The old `DashboardOverview` executive section still exists on the dashboard.
- Some proof-era types/components may still be useful as implementation substrate.
- Deleting proof-era code now would create avoidable refactor risk in a sprint meant to add a new executive leak summary, not clean the whole dashboard.

Recommended Sprint 07 transition:

1. Add leak-first read model.
2. Add leak-first card/sheet or make the existing components generic enough to accept the new read.
3. Replace dashboard share entry from `executiveProofSummaryRead` to `executiveRevenueLeakSummaryRead`.
4. Keep `getExecutiveProofSummaryRead` for historical compatibility until a later cleanup confirms no runtime use.

Do not render both executive share surfaces.

Reason:

Two executive summaries would create commercial confusion and make REVORY look like a reporting suite.

## 5. Which Copy/Share/Print Behaviors Can Be Reused

Reusable as-is or with minimal changes:

- modal/sheet pattern;
- `Copy summary`;
- `Share summary`;
- `Print or save PDF`;
- Blob-based print view;
- HTML escaping helper;
- native share fallback to copy;
- short premium print layout;
- no public share link;
- no PDF/export service;
- transient success/error badges.

Needs copy/content changes:

- `Executive revenue read` should become `Executive Revenue Leak Summary` or `Executive leak summary`.
- `Observed revenue read` should become `Estimated revenue at risk`.
- `Appointment evidence` should be supporting evidence, not the primary summary.
- `Evidence position` should become `Risk position` or `Evidence quality`.
- print title should become `${workspaceName} executive revenue leak summary`.
- `copyText` should list leak-first signals, not booked-proof proof lines.

Do not add:

- public share links;
- scheduled PDF generation;
- downloadable report engine;
- chart/table export;
- audit trail;
- comments/assignments.

## 6. Whether Billing Gates Should Remain Unchanged

Recommendation: keep billing gates unchanged for Sprint 07.

Current gate:

- Feature key: `EXECUTIVE_PROOF_SHARE`
- Allowed plan: `GROWTH`
- Basic: in-app read only, no copy/share/print
- Growth: copy/share/print allowed

Why keep it:

- The current commercial policy is still correct: Growth gets the premium shareable executive summary.
- Renaming the feature key now would risk touching billing/plans without a functional need.
- The public pricing/catalog already says Growth includes `Executive Revenue Summary with copy, share, and print`.

Recommended later cleanup:

- Rename `EXECUTIVE_PROOF_SHARE` to `EXECUTIVE_REVENUE_SUMMARY_SHARE` only in a dedicated billing nomenclature cleanup.
- Keep behavior identical if renamed.

Sprint 07 should update user-facing labels, not billing semantics.

## 7. Files Recommended For Edit

Create:

- `services/revenue-leaks/get-executive-revenue-leak-summary-read.ts`
- optionally `components/proof/ExecutiveRevenueLeakSummaryCard.tsx`
- optionally `components/proof/ExecutiveRevenueLeakSummarySheet.tsx`
- optionally `scripts/validate-executive-revenue-leak-summary.ts`

Update:

- `src/app/(app)/app/dashboard/page.tsx`
- `package.json` if a new QA command is added
- `docs/sprints/SPRINT_07_EXECUTIVE_REVENUE_LEAK_SUMMARY_REPORT.md`

Probably leave unchanged in Sprint 07:

- `services/proof/get-executive-proof-summary-read.ts`
- `components/proof/ExecutiveProofSummaryCard.tsx`
- `components/proof/ExecutiveProofSummarySheet.tsx`
- `services/billing/workspace-billing.ts`

Possible small update:

- `GrowthProofShareLimitCard` copy in dashboard, if it still says `Executive Revenue Read` instead of `Executive Revenue Leak Summary`.

## 8. Risks

### Product Truth Risk

The summary is shareable, so any overclaim is more dangerous than normal dashboard copy.

Required guardrail:

- Use `estimated revenue at risk`.
- Say it is not confirmed accounting loss.
- Never say recovered/generated revenue.
- Never imply REVORY guarantees recovery.

### BI Drift Risk

Executive summary can easily become a report.

Do not add:

- trends;
- charts;
- provider rankings;
- campaign rankings;
- source attribution tables;
- multi-period analytics;
- drilldowns beyond link to `/app/revenue-leaks`.

### Financial Semantics Risk

Operational/data-quality risks must not be summed as dollars.

Required implementation rule:

- Use `estimatedRevenueAtRiskCents` from `getRevenueLeakReadForWorkspace`.
- Use list items for evidence, not for ad hoc money math unless guarded by `estimatedValueIsCounted`.

### Backward Compatibility Risk

Old proof-era dashboard overview still renders lower on the dashboard.

Recommended handling:

- Replace only the shareable executive summary in Sprint 07.
- Do not remove the old dashboard section in this sprint unless it directly conflicts after implementation.

### Billing Drift Risk

The gate key name still says `PROOF`, while the product surface becomes leak summary.

Recommended handling:

- Keep gate behavior unchanged now.
- Document the naming mismatch as technical debt.

### Print/Popup Risk

The current print flow is already fixed and uses Blob URL.

Recommended handling:

- Reuse the mechanism.
- Do not reintroduce `about:blank` document writing.

## 9. Implementation Plan

1. Create `getExecutiveRevenueLeakSummaryRead`.
2. Build it from persisted leak reads:
   - `getRevenueLeakReadForWorkspace`
   - `getRevenueLeakListForWorkspace`
3. Define conservative states:
   - no active leaks;
   - estimated revenue at risk visible;
   - financial leaks with thin value;
   - operational-only;
   - data stale.
4. Build summary fields:
   - headline;
   - primary metric;
   - short summary;
   - top leak signals;
   - risk posture;
   - recommended action;
   - copy text;
   - honesty note.
5. Reuse the existing share sheet interaction pattern:
   - copy;
   - native share;
   - print/save PDF.
6. Replace dashboard share wiring:
   - from `ExecutiveProofSummarySheet`
   - to leak-first summary sheet.
7. Keep the current Growth-only share gate unchanged.
8. Keep `getExecutiveProofSummaryRead` and old proof components temporarily unless no longer referenced.
9. Add QA coverage:
   - financial value appears only for financial leaks;
   - operational/data-quality risks do not count as money;
   - empty/thin/stale states render;
   - copy/share/print text avoids forbidden claims;
   - no LLM call;
   - no migration;
   - Basic gate still blocks copy/share/print;
   - Growth gate still allows copy/share/print.
10. Run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm run qa:revenue-leaks`
   - `npm run qa:revenue-leak-read`
   - `npm run qa:daily-leak-brief`
   - new `npm run qa:executive-revenue-leak-summary` if added.

## Recommendation

Proceed with Sprint 07.

The current shareability infrastructure is strong enough to reuse, but the read model must move from booked-proof/overview data to persisted `RevenueLeak` rows.

The right implementation is not a new report. It is a short, shareable, executive leak-risk snapshot for Growth users only.
