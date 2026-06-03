# REVORY - Sprint 04 Dashboard Architecture Audit

## 1. Current dashboard data flow

Current dashboard flow is server-rendered and workspace-scoped:

- `src/app/(app)/app/dashboard/page.tsx` calls `getAppContext()`.
- If there is no authenticated app context, it redirects to sign-in.
- If activation is incomplete, it redirects to the current setup step.
- It derives `configuredValuePerBooking` from `activationSetup.averageDealValue`.
- It loads `getDashboardOverview(workspace.id, configuredValuePerBooking)` and `getDailyBookingBriefRead(workspace.id, activationSetup)` in parallel.
- It builds dashboard decision support from the overview.
- It builds the Executive Revenue Read from `overview + dailyBriefRead`.
- It uses `canUseBillingPlanFeature(workspace.planKey, "EXECUTIVE_PROOF_SHARE")` to gate copy/share/print of the executive read.

`getDashboardOverview` is still the main read model for the page. It currently reads:

- booked appointment count;
- observed/imported appointment revenue;
- appointment count;
- client count;
- canceled appointment count;
- CSV import sources;
- attribution support;
- recent momentum;
- upcoming scheduled appointments;
- commercial safeguard copy.

This is useful substrate, but it is not yet a persisted `RevenueLeak` read model. The dashboard is visually leak-positioned, but its main metric is still derived from appointment proof/revenue evidence instead of `revenue_leaks`.

Important current mismatch:

- `services/proof/get-executive-proof-summary-read.ts` looks for an executive tile labeled `"Revenue now"`.
- `services/dashboard/get-dashboard-overview.ts` currently emits `"Observed revenue"`.
- Result: the Executive Revenue Read can show `Pending` even when observed revenue exists. This should be fixed when Sprint 04 touches the read model/surface, but it is not a blocker for adding the leak read architecture.

## 2. Where to add `getRevenueLeakReadForWorkspace`

Recommended file:

- `services/revenue-leaks/get-revenue-leak-read-for-workspace.ts`

Recommended export:

```ts
export async function getRevenueLeakReadForWorkspace(workspaceId: string): Promise<RevenueLeakRead>
```

Recommended behavior:

- Query persisted `RevenueLeak` rows only.
- Do not run detectors inside the read model.
- Include only `OPEN` and `ACKNOWLEDGED` leaks in active counts and estimated revenue at risk.
- Exclude `RESOLVED` and `DISMISSED` from active risk totals.
- Sum `estimatedValueCents` only for financial leak types using `canContributeToEstimatedRevenueAtRisk`.
- Do not sum operational/data-quality risks into financial value.
- Use `getRevenueLeakCategory` and `getRevenueLeakTypeLabel` for category/label consistency.
- Return display-ready enough data for dashboard rendering, but keep heavy copy in the component/page.

Suggested read shape:

```ts
type RevenueLeakRead = {
  activeLeakCount: number;
  activeFinancialLeakCount: number;
  activeOperationalRiskCount: number;
  activeDataQualityRiskCount: number;
  estimatedRevenueAtRiskCents: number | null;
  highestSeverity: RevenueLeakSeverity | null;
  highestConfidence: RevenueLeakConfidence | null;
  primaryLeak: {
    id: string;
    label: string;
    leakType: RevenueLeakType;
    severity: RevenueLeakSeverity;
    confidence: RevenueLeakConfidence;
    estimatedValueCents: number | null;
    reason: string;
    recommendedAction: string;
  } | null;
  topLeaks: Array<...>;
  lastDetectedAt: Date | null;
  status: "empty" | "active" | "thin";
}
```

Keep it narrow. This should be a dashboard read, not a Revenue Leaks Page.

## 3. Where to render hero metric

Best place:

- Inside the existing hero section in `src/app/(app)/app/dashboard/page.tsx` with `id="revenue-view"`.

Current hero already says:

- `Revenue leak read`
- uses `overview.estimatedImportedRevenue` as the primary value;
- shows appointment evidence, setup, commercial safeguard and Executive Summary.

Sprint 04 should replace or subordinate the current hero value with the persisted leak read:

- Primary hero metric: `Estimated revenue at risk`.
- Source: `revenueLeakRead.estimatedRevenueAtRiskCents`.
- Empty state: `Upload appointment data to start detecting revenue at risk.`
- Thin/no value state: `Revenue risk evidence is visible, but financial value is still pending.`
- Honesty note: `Estimated from persisted leak evidence; not a confirmed accounting loss.`

Recommended hero hierarchy:

- Kicker: `Revenue leak read`
- Primary value: estimated revenue at risk from persisted active financial leaks.
- Secondary cards:
  - `Active leaks`
  - `Operational risks`
  - `Data quality risks`
  - `Highest severity` or `Primary risk`
- CTA:
  - `Refresh leak read` only if manual sync is added.
  - Otherwise keep `Refresh clinic data` pointing to imports.

Avoid adding a table or drilldown in Sprint 04. Show at most a short `primaryLeak` or 2-3 compact top signals.

## 4. Whether dashboard currently has server actions pattern

The dashboard route itself does not currently have a local server action file.

Existing patterns are in neighboring app areas:

- `src/app/(app)/app/setup/actions.ts`
- `src/app/(app)/app/imports/actions.ts`
- `src/app/(app)/app/imports/manual-lead-actions.ts`
- `src/app/(app)/app/imports/lead-booking-actions.ts`

Common action pattern:

- top-level `"use server"`;
- call `getAppContext()`;
- reject expired session;
- perform one narrow mutation;
- call `revalidatePath("/app/imports")` and/or `revalidatePath("/app/dashboard")`;
- return small action state or throw a narrow error.

If Sprint 04 adds manual sync, the cleanest location is:

- `src/app/(app)/app/dashboard/actions.ts`

Suggested function:

```ts
export async function syncDashboardRevenueLeaks()
```

Expected behavior:

- get app context;
- require completed activation;
- call `syncRevenueLeaksForWorkspace({ workspaceId })`;
- `revalidatePath("/app/dashboard")`;
- return counts from sync in a compact result.

## 5. Whether manual sync action is safe in Sprint 04

Yes, with constraints.

Manual sync is safe if it remains a narrow explicit action:

- It must call the existing deterministic `syncRevenueLeaksForWorkspace`.
- It must not become a background job.
- It must not imply real-time monitoring.
- It must not create notifications.
- It must not call AI.
- It must not create a Revenue Leaks Page.
- It must not create a workflow around resolving/dismissing leaks yet.
- It should revalidate only the dashboard and any existing import surface if needed.

The safest Sprint 04 version:

- one compact button in the existing revenue hero or support area;
- label: `Refresh leak read`;
- microcopy: `Runs the deterministic read against current clinic data.`;
- result copy: `Leak read refreshed from current imported data.`;
- avoid `Live`, `monitoring`, `automatic`, `recovered`, or `confirmed loss`.

Potential issue:

- If the button is added as an interactive client component, it should be tiny and isolated. Do not convert the whole dashboard to client-side rendering.

## 6. Existing money formatting helpers

Money formatting is currently duplicated:

- `src/app/(app)/app/dashboard/page.tsx`
  - `formatCurrency`
  - `formatLimitedCurrency`
  - `formatCompactCurrency`
  - `formatDealValue`
- `services/dashboard/get-dashboard-overview.ts`
  - `formatExecutiveCurrency`
- `services/proof/get-executive-proof-summary-read.ts`
  - `formatCompactCurrency`
- `services/decision-support/build-dashboard-decision-support.ts`
  - local `formatCurrency`
- setup/activation files also have local currency formatting.

Recommendation for Sprint 04:

- Do not do a large formatting refactor.
- Add a local helper in `get-revenue-leak-read-for-workspace.ts` only if returning display labels.
- Prefer returning cents as data and formatting in `dashboard/page.tsx`.
- If a small utility is worth it, create `services/revenue-leaks/revenue-leak-formatting.ts` with:
  - `formatRevenueLeakCents`
  - `formatRevenueLeakCompactCents`

Do not refactor all existing money formatting in Sprint 04. That would be scope drift.

## 7. Existing empty/thin/stale state patterns

Current patterns already exist and should be reused:

- Daily Brief:
  - data pending;
  - read fresh;
  - read holding;
  - data may be stale.
- Dashboard:
  - appointment evidence pending;
  - support layers degraded;
  - commercial read stable/watch;
  - upcoming read degraded/ready.
- Executive Summary:
  - current revenue read visible;
  - visible but thin;
  - not ready yet.
- Imports:
  - upload appointment data;
  - data source progress;
  - row success/error summaries.

Recommended Sprint 04 states for persisted leaks:

- `empty`: no active `RevenueLeak` rows.
  - Copy: `No active revenue leaks are visible from the current imported data. Refresh the read after new clinic data is uploaded.`
- `thin`: active leaks exist but no financial value is available.
  - Copy: `Leak evidence is visible, but estimated value is still pending. Improve appointment value evidence or average deal value.`
- `active`: active financial leaks exist with estimated value.
  - Copy: `Estimated revenue at risk is visible from persisted leak evidence.`
- `stale`: reuse `STALE_BOOKED_PROOF` as a data-quality risk, not a separate fake freshness engine.

## 8. Files recommended for edit

Recommended Sprint 04 implementation files:

- `services/revenue-leaks/get-revenue-leak-read-for-workspace.ts`
- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/dashboard/actions.ts` only if manual sync is included.
- `components/revenue-leaks/RevenueLeakHeroRead.tsx` only if extracting the hero keeps the dashboard page smaller.
- `services/proof/get-executive-proof-summary-read.ts` to fix the tile-label mismatch or to consume the new leak read honestly.
- `scripts/validate-revenue-leak-dashboard-read.ts` or extend `scripts/validate-revenue-leak-engine.ts` if adding validation coverage.
- `docs/sprints/SPRINT_04_DASHBOARD_LEAK_READ_REPORT.md` after implementation.

Files to avoid editing unless necessary:

- Prisma schema.
- Migrations.
- Billing routes.
- Auth routes.
- Import parser/persistence logic.
- LLM services.

## 9. Risks

### Risk: fake metric

The biggest risk is showing `Estimated revenue at risk` before reading persisted `RevenueLeak` rows. Sprint 04 must not derive a fake hero number directly from booked revenue or canceled count.

Safer interpretation:

- If no persisted active financial leaks exist, show pending/thin state.

### Risk: dashboard becomes BI

Adding too many groups, charts, filters or drilldowns would drift into BI. Sprint 04 should show one hero metric plus a few compact signals.

Safer interpretation:

- No table.
- No filters.
- No trend chart.
- No Revenue Leaks Page.

### Risk: operational risks counted as money

`MISSING_CONTACT`, `BOOKING_PATH_BLOCKED` and `STALE_BOOKED_PROOF` must not inflate estimated revenue at risk.

Safer interpretation:

- Count them separately as operational/data-quality risks.

### Risk: sync implies real-time monitoring

Manual sync could look like live monitoring if copy is sloppy.

Safer interpretation:

- Use `Refresh leak read`, not `Scan live leaks` or `Monitor revenue`.
- Explain it runs against current imported data.

### Risk: caching hides fresh sync results

`getDashboardOverview` uses `unstable_cache` with a 10 second revalidate window. A new leak read can either avoid `unstable_cache` for Sprint 04 or be explicitly invalidated through `revalidatePath("/app/dashboard")` after manual sync.

Safer interpretation:

- Keep `getRevenueLeakReadForWorkspace` uncached initially or wrap with React `cache` only.

### Risk: current Executive Summary mismatch

The current Executive Summary read looks for `"Revenue now"` while overview emits `"Observed revenue"`. If Sprint 04 updates dashboard hero but leaves this mismatch, the summary may still show `Pending` in a moment where value exists.

Safer interpretation:

- Fix by using stable field access instead of tile label matching, or rename the expected tile consistently.

## 10. Implementation plan

1. Create `services/revenue-leaks/get-revenue-leak-read-for-workspace.ts`.
2. Query persisted active leaks for the current workspace.
3. Derive:
   - active leak count;
   - active financial leak count;
   - operational risk count;
   - data-quality risk count;
   - estimated revenue at risk in cents;
   - highest severity;
   - highest confidence;
   - primary leak;
   - top 2-3 leak signals.
4. Use `canContributeToEstimatedRevenueAtRisk`, `getRevenueLeakCategory` and `getRevenueLeakTypeLabel`.
5. Add a compact hero read to the existing `revenue-view` section in `dashboard/page.tsx`.
6. Keep observed revenue as a secondary support metric, not the top leak promise.
7. Optionally add `src/app/(app)/app/dashboard/actions.ts` with a single `syncDashboardRevenueLeaks` action.
8. If manual sync is added, include a small client action component or server action form without converting the full dashboard to a client component.
9. Revalidate `/app/dashboard` after sync.
10. Add a validation script for the dashboard leak read or extend `qa:revenue-leaks`.
11. Run:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run build`
    - `npm run qa:revenue-leaks`

## Alignment verdict

The current dashboard is aligned enough to receive the first persisted leak read, but it is still halfway between old observed-revenue proof and new revenue-leak detection. Sprint 04 should not build a new dashboard or page. It should insert one honest persisted-leak read into the existing hero hierarchy, keep operational risks separate from financial value, and use manual sync only as a bounded refresh action against imported data.
