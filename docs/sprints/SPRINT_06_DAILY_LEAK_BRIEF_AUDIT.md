# REVORY - Sprint 06 Daily Leak Brief Audit

## Summary

Sprint 06 should implement a Daily Leak Brief as the short first-minute read above the dashboard hero.

The current daily brief is already partially repositioned toward revenue risk, but its architecture is still booking-era:

- component name: `DailyBookingBrief`
- service name: `getDailyBookingBriefRead`
- data source: booked proof, lead intake routing, CSV sources, latest handoff
- visible promise: daily revenue brief / operational booking risks

The new Daily Leak Brief should be backed primarily by persisted `RevenueLeak` rows and Sprint 04/05 revenue leak read models. It should not become a report, notification system, background job, email digest, AI summary, or BI surface.

Recommended approach: replace the visible dashboard brief with `DailyLeakBrief`, while keeping the old booking brief service temporarily available for compatibility until dependent proof/executive summary code is updated.

## Files Inspected

- `components/briefs/DailyBookingBrief.tsx`
- `services/briefs/get-daily-booking-brief-read.ts`
- `src/app/(app)/app/dashboard/page.tsx`
- `services/revenue-leaks/get-revenue-leak-read.ts`
- `services/revenue-leaks/get-revenue-leak-list.ts`
- `services/revenue-leaks/revenue-leak-evidence-summary.ts`
- `services/revenue-leaks/revenue-leak-confidence-copy.ts`
- `components/revenue-leaks/RevenueLeakCard.tsx`
- `components/revenue-leaks/RevenueLeakList.tsx`
- `components/revenue-leaks/RevenueLeakFilters.tsx`
- `scripts/validate-revenue-leak-engine.ts`
- `scripts/validate-revenue-leak-read.ts`
- `scripts/validate-revenue-leaks-page.ts`
- `docs/source-of-truth.md`

## 1. Current Daily Brief Data Flow

Current dashboard flow:

1. `src/app/(app)/app/dashboard/page.tsx` calls `getAppContext()`.
2. If activation is incomplete, it redirects to the current setup step.
3. Dashboard loads three reads in parallel:
   - `getDashboardOverview(workspace.id, configuredValuePerBooking)`
   - `getDailyBookingBriefRead(workspace.id, activationSetup)`
   - `getRevenueLeakReadForWorkspace(workspace.id)`
4. Dashboard renders `<DailyBookingBrief read={dailyBriefRead} />` before the revenue leak hero.
5. Dashboard also passes `dailyBriefRead` into `getExecutiveProofSummaryRead(...)`.

Current `getDailyBookingBriefRead` data sources:

- `getBookedProofRead(workspaceId)`
- `getLeadIntakeRoutingRead(workspaceId)`
- `getCsvUploadSources(workspaceId)`
- latest `leadBookingOpportunity.handoffOpenedAt`

Current `DailyBookingBriefRead` shape:

- `headline`
- `summary`
- `tone`
- `signals[]`
- `nextMove`
- `recentChange`
- `freshness`

Current behavior:

- If setup is incomplete or booked proof is not visible, it returns a proof-first/import-first brief.
- If booked proof is visible, it returns a booking-live brief based on ready/blocked/handoff signals.
- It includes data freshness from CSV import timestamps.
- It does not use persisted `RevenueLeak` rows.

Assessment:

The current brief is useful but not the right source of truth for V3. It still answers: "What booking/revenue support should I look at?" The Sprint 06 brief should answer: "What leak evidence matters now?"

## 2. Best Place To Add DailyLeakBrief

Recommended component:

`components/briefs/DailyLeakBrief.tsx`

Recommended service:

`services/briefs/get-daily-leak-brief-read.ts`

Recommended dashboard integration:

Replace this visible render:

`<DailyBookingBrief read={dailyBriefRead} />`

with:

`<DailyLeakBrief read={dailyLeakBriefRead} />`

Recommended dashboard data loading:

- Add `getDailyLeakBriefRead(workspace.id)`.
- Keep `getRevenueLeakReadForWorkspace(workspace.id)` for the hero.
- Avoid duplicate database work where possible, but do not over-optimize in V1.

Best placement:

- Top of dashboard, before the larger revenue leak hero.
- It should be the fastest "what matters today" read.
- The hero remains the broader executive metric surface.

Do not create:

- `/app/daily-brief`
- notification preferences
- email digest
- background scheduler
- daily report route

## 3. Replace Or Coexist With DailyBookingBrief

Recommended product behavior:

Replace the visible `DailyBookingBrief` on the dashboard with `DailyLeakBrief`.

Recommended technical behavior:

Coexist temporarily at code level.

Why:

- `DailyBookingBrief` still feeds `getExecutiveProofSummaryRead(...)`.
- Removing it immediately could cause unnecessary refactor risk.
- The old service remains useful as implementation substrate for import freshness and booking-risk fallback logic.

Do not render both daily surfaces on the dashboard.

Reason:

- Two daily briefs would feel redundant.
- It would blur the product promise between booking assistance and revenue leak detection.
- It would increase first-minute cognitive load.

Recommended transition:

1. Sprint 06: add `DailyLeakBrief` and render it as the visible dashboard brief.
2. Keep `getDailyBookingBriefRead` only for existing executive proof compatibility.
3. Later sprint: update executive summary to use leak-first brief read, then retire or rename the old booking brief service.

## 4. Recommended Read Model Shape

Recommended type:

```ts
export type DailyLeakBriefRead = {
  headline: string;
  summary: string;
  tone: "accent" | "future" | "neutral" | "real";
  state: "EMPTY" | "VALUE_VISIBLE" | "THIN_VALUE" | "OPERATIONAL_ONLY" | "DATA_STALE";
  primarySignal: {
    label: string;
    value: string;
    note: string;
    tone: "accent" | "future" | "neutral" | "real";
  };
  signals: Array<{
    label: string;
    value: string;
    note: string;
    tone: "accent" | "future" | "neutral" | "real";
  }>;
  topRisk: {
    href: string;
    label: string;
    note: string;
    categoryLabel: string;
    severityLabel: string;
    confidenceLabel: string;
  } | null;
  nextMove: {
    href: string;
    label: string;
    note: string;
  };
  freshness: {
    label: string;
    note: string;
    tone: "accent" | "future" | "neutral" | "real";
  };
  honestyNote: string;
};
```

Recommended data sources:

- `getRevenueLeakReadForWorkspace(workspaceId)`
- `getRevenueLeakListForWorkspace({ workspaceId, filter: "ALL_ACTIVE", limit: 3 })`

Optional data source if needed:

- `getCsvUploadSources(workspaceId)` for import freshness fallback only if persisted stale leak rows do not exist yet.

Recommended derivation:

- Primary signal should be `Estimated revenue at risk` if financial value exists.
- If no financial value but operational risks exist, primary signal should be `Operational risks`.
- If stale data exists, freshness should be prominent.
- If no active leaks exist, primary signal should be `No active signals`.
- `nextMove.href` should usually be `/app/revenue-leaks`.
- If no clinic data/leaks exist, `nextMove.href` should be `/app/imports`.

Recommended state mapping:

- `HAS_REVENUE_AT_RISK` -> `VALUE_VISIBLE`
- `THIN_DATA` -> `THIN_VALUE`
- `NO_FINANCIAL_LEAKS` -> `OPERATIONAL_ONLY`
- `DATA_STALE` -> `DATA_STALE`
- `EMPTY` -> `EMPTY`

Recommended copy:

- Use `Daily Leak Brief` or `Today's leak brief`.
- Use `estimated revenue at risk`.
- Use `active leak signals`.
- Use `operational risks`.
- Use `data freshness`.
- Say `estimate, not confirmed accounting loss`.

Avoid:

- `lost revenue`
- `confirmed loss`
- `recovered revenue`
- `generated revenue`
- `AI detected`
- `daily alert`
- `report`
- `task`
- `inbox`

## 5. Existing Helpers To Reuse

Revenue leak read helpers:

- `getRevenueLeakReadForWorkspace`
- `getRevenueLeakListForWorkspace`
- `getRevenueLeakCategory`
- `getRevenueLeakTypeLabel`
- `canContributeToEstimatedRevenueAtRisk`
- `buildRevenueLeakEvidenceSummary`
- `buildRevenueLeakConfidenceCopy`

UI helpers/components:

- `RevoryStatusBadge`
- `DocumentNavigationLink`
- existing `rev-card-premium`, `rev-shell-hero`, `rev-kicker`, `rev-label` class patterns
- layout pattern from `DailyBookingBrief`
- card/list tone patterns from `RevenueLeakCard`

QA patterns:

- `scripts/validate-revenue-leak-read.ts`
- `scripts/validate-revenue-leaks-page.ts`
- OpenAI fetch interception pattern
- isolated QA workspace/user creation
- deterministic leak fixtures
- cleanup by email prefix

Helpers to be careful with:

- `getDailyBookingBriefRead` should not be the new data source.
- `getLeadIntakeRoutingRead` should not drive the new brief except as a later compatibility fallback.
- `getBookedProofRead` should not be the primary V3 brief source.

## 6. Files To Edit

Recommended implementation files:

- `services/briefs/get-daily-leak-brief-read.ts`
- `components/briefs/DailyLeakBrief.tsx`
- `src/app/(app)/app/dashboard/page.tsx`
- `docs/sprints/SPRINT_06_DAILY_LEAK_BRIEF_REPORT.md`

Recommended QA files:

- `scripts/validate-daily-leak-brief.ts`
- `package.json` for `qa:daily-leak-brief`

Files likely not needed:

- `prisma/schema.prisma`
- `services/revenue-leaks/detect-revenue-leaks.ts`
- `services/revenue-leaks/sync-revenue-leaks.ts`
- `src/app/(app)/app/revenue-leaks/actions.ts`
- `services/llm/*`
- `services/billing/*`
- `services/auth/*`

Potential compatibility touchpoint:

- `services/proof/get-executive-proof-summary-read.ts`

Recommendation:

- Do not update executive proof in the first Daily Leak Brief step unless type compatibility requires it.
- Keep the old `dailyBriefRead` available for that dependency until a later proof-summary tightening step.

## 7. Risks

### Product Scope Risks

- "Daily" can imply notifications, email digests, scheduled background jobs or proactive monitoring. Do not imply any of those in Sprint 06.
- A daily brief can become a mini dashboard if too many metrics are added.
- Adding charts, trends, history or comparisons would push toward BI.
- Adding assignments, tasks, owners or comments would push toward CRM/inbox.

### Product Truth Risks

- Do not say REVORY found confirmed losses.
- Do not imply operational risks are financial losses.
- Do not imply stale data is a revenue loss.
- Do not imply AI is generating the brief.
- Do not imply the brief ran automatically in the background unless it actually did.

### UX Risks

- The dashboard already has a revenue leak hero below the daily brief. If Daily Leak Brief repeats the same hero metric too heavily, the first screen will feel redundant.
- If the brief shows too many cards, it will stop being a brief.
- If it keeps booking language, the V3 migration will remain muddy.

### Technical Risks

- `getDailyBookingBriefRead` is currently used by executive proof summary. Replacing the service directly could break that flow.
- Calling both leak read and list read can duplicate database reads. Acceptable for V1, but keep the service small.
- Current `getRevenueLeakReadForWorkspace` and list read use independent formatting helpers. Avoid creating conflicting money labels.
- QA should verify no LLM calls and no migration.

## 8. Implementation Plan

### Step 1 - Create Daily Leak Brief read model

Create:

`services/briefs/get-daily-leak-brief-read.ts`

Use:

- `getRevenueLeakReadForWorkspace(workspaceId)`
- `getRevenueLeakListForWorkspace({ workspaceId, filter: "ALL_ACTIVE", limit: 3 })`

Return:

- headline
- summary
- primary signal
- 2-3 secondary signals
- top risk
- freshness
- next move
- honesty note

### Step 2 - Create Daily Leak Brief component

Create:

`components/briefs/DailyLeakBrief.tsx`

Design:

- reuse `DailyBookingBrief` layout density;
- make it slightly shorter and more leak-first;
- one primary signal;
- at most 2-3 supporting signals;
- one next move card;
- one freshness/honesty note;
- CTA to `/app/revenue-leaks` or `/app/imports`.

### Step 3 - Integrate on dashboard

Update:

`src/app/(app)/app/dashboard/page.tsx`

Change:

- load `dailyLeakBriefRead`;
- render `<DailyLeakBrief read={dailyLeakBriefRead} />`;
- keep `dailyBriefRead` only if required for `getExecutiveProofSummaryRead`.

Do not render both visible daily briefs.

### Step 4 - Add validation script

Create:

`scripts/validate-daily-leak-brief.ts`

Add npm command:

`qa:daily-leak-brief`

Validate:

- empty state;
- financial value state;
- operational-only state;
- stale data state;
- thin value state;
- next move target;
- no operational value counted as financial;
- no OpenAI calls;
- no migration.

### Step 5 - Run validation

Run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run qa:revenue-leaks`
- `npm run qa:revenue-leak-read`
- `npm run qa:revenue-leaks-page`
- `npm run qa:daily-leak-brief`

## Alignment Verdict

Daily Leak Brief is aligned if it becomes a short, app-local, evidence-first first-minute read backed by persisted `RevenueLeak` rows. It starts drifting if "daily" becomes a notification promise, a report, a BI module, or a task workflow.

Recommended Sprint 06 scope: replace the visible dashboard daily brief with a new `DailyLeakBrief`, keep the old booking brief code temporarily for compatibility, and validate the read model with deterministic QA fixtures.
