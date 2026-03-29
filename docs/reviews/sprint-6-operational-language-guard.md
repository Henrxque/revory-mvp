# REVORY - Sprint 6 Operational Language Guard

## Objective
Review and tighten the operational layer language so REVORY communicates readiness and controlled execution without implying live delivery, campaign operations, inbox behavior, or CRM depth.

## Alignment Verdict
Aligned after refinement.

The operational layer stays useful, but it now reads with tighter boundaries. The product feels more premium and more honest because the UI now emphasizes visibility, actionability, and preparation instead of sounding like a mature outreach engine.

## What Was Adjusted
- [C:\Users\hriqu\Documents\revory-mvp\services\operations\build-operational-surface.ts](C:\Users\hriqu\Documents\revory-mvp\services\operations\build-operational-surface.ts)
- [C:\Users\hriqu\Documents\revory-mvp\services\operations\operational-templates.ts](C:\Users\hriqu\Documents\revory-mvp\services\operations\operational-templates.ts)
- [C:\Users\hriqu\Documents\revory-mvp\components\dashboard\OperationalSurface.tsx](C:\Users\hriqu\Documents\revory-mvp\components\dashboard\OperationalSurface.tsx)
- [C:\Users\hriqu\Documents\revory-mvp\components\dashboard\OperationalTemplatePreviewGrid.tsx](C:\Users\hriqu\Documents\revory-mvp\components\dashboard\OperationalTemplatePreviewGrid.tsx)
- [C:\Users\hriqu\Documents\revory-mvp\docs\testing\sprint-5-etapa-5-execution-foundation-smoke.ts](C:\Users\hriqu\Documents\revory-mvp\docs\testing\sprint-5-etapa-5-execution-foundation-smoke.ts)

## Language Decisions Adopted
### Surface-wide direction
- keep the layer short, guided, and readable
- prefer "actionable", "visible", "prepared", and "suggested next step"
- avoid wording that sounds like live sending or active campaigns
- avoid CRM/inbox vocabulary

### Key replacements
- `Signals live` -> `Signals visible`
- `Ready now` -> `Actionable now`
- `Partially ready` -> `Partially actionable`
- `Ready queue` -> `Action queue`
- `Operational focus list` -> `Short focus list`
- `items surfaced` -> `focus items`
- `Live preview` -> `Current example`
- `Controlled sample` -> `Sample preview`
- `Ready for outreach` -> `Prepared to use`
- `Ready, with blockers` -> `Prepared to use, with blockers`

### At-risk language
- `Ready now` was too close to execution language for a signal layer
- the card and short-list wording now use:
  - `Attention now`
  - `Needs review now`
  - `Watchlist`
- this keeps at-risk positioned as operational signal, not predictive execution

### Template foundation language
- template previews now read as controlled message bases, not live campaigns
- `Prepared to use` communicates that the message base is usable in the current MVP context, without implying a full delivery engine
- `Current example` communicates real-data preview without implying active send

## Consistency Rules Now In Effect
- dashboard summary uses `actionable` language
- category cards use `status` instead of more technical readiness framing in the visible UI
- blocked items stay visible, but do not dominate the whole reading
- template preview language no longer suggests that REVORY is already sending at scale
- review-request wording stays eligibility-first and non-operationally inflated

## What Was Intentionally Left Narrow
- internal type names such as `outreachState` were not renamed to avoid unnecessary churn
- no new feature or new state was added
- no sending UI, campaign flow, inbox, or delivery control was introduced
- no dashboard redesign was opened

## Validation
- `npm run typecheck`
- `npx eslint "components/dashboard/OperationalSurface.tsx" "components/dashboard/OperationalTemplatePreviewGrid.tsx" "services/operations/build-operational-surface.ts" "services/operations/operational-templates.ts" "docs/testing/sprint-5-etapa-5-execution-foundation-smoke.ts" --max-warnings=0`
- `npx tsx docs/testing/sprint-5-etapa-5-execution-foundation-smoke.ts`
- `npx tsx docs/testing/sprint-4-etapa-8-operational-surface-smoke.ts`
- `npm run build`

## Clear Verdict
Approved.

The operational layer now communicates controlled execution and action readiness more honestly. It stays premium, short, and useful without implying that REVORY already runs a mature execution engine.
