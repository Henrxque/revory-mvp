# REVORY — Sprint 05 Revenue Leaks Page Audit

## Summary

Sprint 05 can safely add a narrow `/app/revenue-leaks` page as a persisted leak evidence list backed by the existing `RevenueLeak` table and Sprint 04 read model.

The safest implementation is not a BI page, not a CRM queue, and not an inbox. It should be an executive evidence surface where the user can see active revenue leak signals, understand why each signal exists, and take a bounded manual status action if needed.

The dashboard should remain the top-level executive read. The new page should be the supporting evidence list behind that read.

## Files Inspected

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/dashboard/actions.ts`
- `components/dashboard/RunLeakReadAction.tsx`
- `services/revenue-leaks/get-revenue-leak-read.ts`
- `services/revenue-leaks/detect-revenue-leaks.ts`
- `services/revenue-leaks/sync-revenue-leaks.ts`
- `services/revenue-leaks/revenue-leak-labels.ts`
- `services/revenue-leaks/revenue-leak-category.ts`
- `services/revenue-leaks/revenue-leak-guards.ts`
- `services/revenue-leaks/leak-estimation.ts`
- `services/revenue-leaks/leak-confidence.ts`
- `services/revenue-leaks/leak-severity.ts`
- `services/revenue-leaks/leak-fingerprint.ts`
- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/layout.tsx`
- `src/app/(app)/app/imports/lead-booking-actions.ts`
- `src/app/(app)/app/imports/manual-lead-actions.ts`
- `src/app/(app)/app/setup/actions.ts`
- `services/app/get-app-context.ts`
- `services/billing/workspace-billing.ts`
- `scripts/validate-revenue-leak-read.ts`

## 1. Best Route Location

Recommended route:

`src/app/(app)/app/revenue-leaks/page.tsx`

Why:

- It belongs inside the authenticated app shell.
- It should inherit the existing private layout billing gate.
- It should sit beside `/app/dashboard` and `/app/imports`, not under imports or setup.
- It should not create a new product area, admin area, report suite, or workflow center.

Recommended route behavior:

- Use `getAppContext()`.
- Redirect unauthenticated users through the existing auth redirect helper.
- Rely on `src/app/(app)/app/layout.tsx` for active billing protection.
- If activation is incomplete, either redirect to `/app/setup` or render a short setup-required state consistent with dashboard behavior.
- Do not create route params, deep drilldowns, or dynamic leak detail pages in Sprint 05.

Routes not recommended:

- `/app/leaks`: too broad and less explicit.
- `/app/reports/revenue-leaks`: opens BI/reporting framing.
- `/app/clients/:id/leaks`: drifts toward CRM.
- `/app/imports/leaks`: makes leaks feel like an import utility instead of a product read.

## 2. Sidebar / Link Strategy

Recommended sidebar placement:

- Add a link under the existing `REVORY` navigation group.
- Place it after `Leak Read` and before `Clinic Data`.

Recommended label:

`Leak Signals`

Why this label is safer than `Revenue Leaks`:

- It communicates evidence without implying a full leak management suite.
- It fits the current deterministic V1 engine.
- It avoids sounding like BI, audit software, or a loss accounting module.

Recommended sub-positioning:

- Dashboard link remains `Leak Read`.
- New page becomes `Leak Signals`.
- Imports remains `Clinic Data`.

Recommended icon strategy:

- Keep scope minimal by reusing an existing icon style or adding one small inline `risk/signal` icon in `AppSidebar`.
- Do not add sidebar counters in Sprint 05. Counters require extra query surface and can create noisy dashboard behavior.

Routes should remain unchanged except the new route addition.

## 3. Existing Component Patterns To Reuse

Recommended patterns:

- Reuse the dark app shell from `src/app/(app)/app/layout.tsx`.
- Reuse dashboard card rhythm and classes from `src/app/(app)/app/dashboard/page.tsx`.
- Reuse `RevoryStatusBadge` for severity, confidence, status and category tags.
- Reuse `RunLeakReadAction` if the page needs the same manual sync button.
- Reuse `getRevenueLeakTypeLabel()` for type labels.
- Reuse `getRevenueLeakCategory()` for category derivation.
- Reuse `formatMoney()` pattern from `get-revenue-leak-read.ts` or extract a tiny shared formatter only if duplication becomes visible.
- Reuse existing server action return shape patterns from dashboard/imports actions: `{ ok, message }`.

Patterns to avoid:

- Do not reuse table-heavy CRM/list patterns.
- Do not add Kanban, pipeline, owner, assignment, notes, comments, activity log, or inbox-style affordances.
- Do not create chart components.
- Do not create export/share actions in Sprint 05.

## 4. Whether Status Actions Are Safe In Sprint 05

Status actions are safe only if implemented as narrow manual review controls.

Safe in Sprint 05:

- `ACKNOWLEDGE`: user confirms they have reviewed the signal.
- `DISMISS`: user hides a signal as not useful or not relevant.

Risky in Sprint 05:

- `RESOLVED`: can imply REVORY verified revenue recovery or operational completion. It may be implemented later, but it needs careful copy such as `Mark manually resolved` and must not imply recovered revenue.

Recommended Sprint 05 status scope:

- Implement `Acknowledge` and `Dismiss` only if the page feels incomplete without action.
- Defer `Resolve` unless the product needs it immediately.
- Do not implement reopen, bulk actions, notes, comments, assignment, due dates, follow-up, owner, stage, or history.

Required safety rules if status actions are implemented:

- Require authenticated workspace through `getAppContext()`.
- Verify the `RevenueLeak` row belongs to `workspace.id`.
- Update only the selected leak status.
- Do not reopen `RESOLVED` or `DISMISSED` automatically.
- Revalidate `/app/revenue-leaks` and `/app/dashboard`.
- Return simple success/error feedback.
- Do not call LLM.
- Do not create notifications.
- Do not create background jobs.

Recommended action file if implemented:

`src/app/(app)/app/revenue-leaks/actions.ts`

## 5. Recommended List Query Shape

Recommended service:

`services/revenue-leaks/get-revenue-leaks-page-read.ts`

Recommended function:

```ts
export async function getRevenueLeaksPageReadForWorkspace(workspaceId: string): Promise<RevenueLeaksPageRead>
```

Recommended query behavior:

- Query persisted `RevenueLeak` rows for the workspace.
- Default list should focus on active statuses: `OPEN` and `ACKNOWLEDGED`.
- Include a small archived count for `RESOLVED` and `DISMISSED`, but do not render archived history as the main page.
- Limit list size in V1, for example `take: 50`.
- Sort in TypeScript with explicit severity/status/confidence/detectedAt rank instead of relying on enum ordering.

Recommended selected fields:

- `id`
- `leakType`
- `severity`
- `status`
- `confidence`
- `estimatedValueCents`
- `currency`
- `detectedAt`
- `sourceWindowStart`
- `sourceWindowEnd`
- `reason`
- `recommendedAction`
- `evidenceJson`
- `providerName`
- `serviceName`
- `sourceName`
- `fingerprint`
- `relatedClientId`
- `relatedAppointmentId`
- `relatedLeadBookingOpportunityId`
- `sourceDataSourceId`

Recommended optional relation selects:

- `relatedClient`: `id`, `fullName`, `email`, `phone`
- `relatedAppointment`: `id`, `scheduledAt`, `status`, `serviceName`, `estimatedRevenueCents`
- `relatedLeadBookingOpportunity`: `id`, `status`, `blockingReason`, `readiness`
- `sourceDataSource`: `id`, `name`, `type`, `status`, `lastImportedAt`

Recommended derived fields:

- `category`
- `typeLabel`
- `categoryLabel`
- `valueLabel`
- `detectedAtLabel`
- `confidenceLabel`
- `severityLabel`
- `statusLabel`
- `evidenceSummary`
- `contextLabel`

Money rules:

- Only financial leaks should show money as estimated revenue at risk.
- Operational and data quality risks should not show a money total even if bad data contains an `estimatedValueCents` value.
- If a financial leak has no value, show `Value needs stronger data` or equivalent.

## 6. Recommended UI Structure

Recommended page title:

`Leak Signals`

Recommended subtitle:

`Active revenue-risk evidence from your imported clinic data. Estimates are not confirmed accounting loss.`

Recommended top section:

- Compact summary strip using `getRevenueLeakReadForWorkspace()`.
- Estimated revenue at risk.
- Active leak signals count.
- Operational risks count.
- Data freshness state.
- Optional `Run leak read` action using the existing component.

Recommended list structure:

- Section 1: `Financial leak signals`
- Section 2: `Operational risks`
- Section 3: `Data quality`

Recommended card structure:

- Top row: leak label, status badge, severity badge, confidence badge.
- Primary line: reason.
- Value line: estimated value only if financial and supported.
- Evidence line: concise human-readable evidence from `evidenceJson`.
- Context line: client, appointment, source, service, or provider when available.
- Next action line: `recommendedAction`.
- Footer: detected date and source window.
- Optional narrow actions: `Acknowledge`, `Dismiss`.

Recommended states:

- Empty: `Run a leak read after importing clinic data to surface revenue-risk evidence.`
- No financial leaks: `No active financial leak value is currently estimated. Operational and data-quality risks may still need review.`
- Thin data: `Some signals exist, but value confidence is limited by missing appointment value or contact data.`
- Stale data: `Your appointment evidence may be outdated. Upload fresh clinic data or run the leak read after import.`

Visual guardrails:

- Card list, not table.
- No trend charts.
- No filters beyond very small category grouping in V1.
- No drilldown page.
- No export.
- No bulk actions.
- No CRM-style owner/stage/priority workflow.

## 7. Files To Edit

Likely implementation files:

- `src/app/(app)/app/revenue-leaks/page.tsx`
- `services/revenue-leaks/get-revenue-leaks-page-read.ts`
- `components/revenue-leaks/RevenueLeakList.tsx`
- `components/revenue-leaks/RevenueLeakCard.tsx`
- `components/app/AppSidebar.tsx`

Only if status actions are included:

- `src/app/(app)/app/revenue-leaks/actions.ts`
- `components/revenue-leaks/RevenueLeakStatusAction.tsx`

Only if QA script is added:

- `scripts/validate-revenue-leaks-page-read.ts`
- `package.json`

Files that should not need changes:

- `prisma/schema.prisma`
- `services/revenue-leaks/detect-revenue-leaks.ts`
- `services/revenue-leaks/sync-revenue-leaks.ts`
- `services/llm/*`
- `services/billing/*`
- `services/auth/*`

## 8. Risks

### Product Scope Risks

- Calling the page `Revenue Leaks` can sound like a full revenue audit suite. `Leak Signals` is narrower and safer.
- Adding filters, charts, export, trendlines or comparison periods would push the page toward BI.
- Adding owner, comments, notes, tasks or follow-up states would push the page toward CRM/inbox.
- Adding `Resolve` too early may imply REVORY verified operational recovery.

### Data Honesty Risks

- Operational risks must not be rendered as financial loss.
- Data-quality risks must not be rendered as financial loss.
- The page must keep saying estimated revenue at risk, not lost revenue or confirmed loss.
- `evidenceJson` can vary by detector, so the UI must tolerate missing optional evidence fields.

### Technical Risks

- If status actions do not verify workspace ownership, users could mutate records outside their workspace.
- If actions do not revalidate `/app/dashboard`, dashboard numbers may look stale after a status change.
- If the list query fetches too much history, the page can become heavy and feel like a reporting suite.
- If sorting relies on enum order, severity ordering may be wrong or fragile.

### UX Risks

- Too many badges can make the surface noisy.
- Too much evidence detail can make the page feel like a technical log.
- Too little context can make each leak feel untrustworthy.
- A static read-only list may feel less useful, but adding too many actions would create workflow creep.

## 9. Implementation Plan

1. Create `getRevenueLeaksPageReadForWorkspace()`.

   - Query active `RevenueLeak` rows.
   - Derive category and labels.
   - Build grouped financial, operational and data-quality lists.
   - Include a compact summary from the existing dashboard read model.
   - Keep archived/resolved counts secondary.

2. Create `/app/revenue-leaks/page.tsx`.

   - Use `getAppContext()`.
   - Keep auth and billing behavior consistent with the existing private app shell.
   - Render a compact hero and card list.
   - Do not add route params or drilldowns.

3. Add sidebar link.

   - Add `Leak Signals` under `REVORY`.
   - Keep `/app/dashboard` as `Leak Read`.
   - Do not add sidebar counters.

4. Add optional narrow status actions only if needed.

   - Start with `Acknowledge` and `Dismiss`.
   - Verify workspace ownership.
   - Revalidate `/app/revenue-leaks` and `/app/dashboard`.
   - Avoid `Resolve` unless copy is very explicit and manual.

5. Add QA validation if status actions or list read are implemented.

   - Validate grouping.
   - Validate financial totals are not recalculated incorrectly.
   - Validate operational/data quality risks do not show as money.
   - Validate dismissed/resolved rows are not included in the active default list.
   - Validate no LLM calls.

6. Run validation.

   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm run qa:revenue-leaks`
   - `npm run qa:revenue-leak-read`
   - Any new Sprint 05 QA script if added.

## Alignment Verdict

The Sprint 05 page is aligned if it stays as a narrow leak evidence surface: persisted signals, short explanation, estimated value discipline, and minimal manual review actions. It starts drifting if it becomes a report suite, task board, inbox, workflow manager or broad analytics page.

Recommended Sprint 05 scope: build the `/app/revenue-leaks` page as `Leak Signals`, add the sidebar link, create a list read service, render grouped cards, and optionally add only `Acknowledge` / `Dismiss` actions.
