# REVORY — Sprint 05 QA Bug Hunt Report

## Summary

Sprint 05 passed QA.

The Revenue Leaks Page V1 exists, is protected by authenticated app context, uses persisted `RevenueLeak` rows, supports filters, keeps financial leaks separate from operational/data-quality risks, and preserves product-truth language around estimated revenue at risk.

No critical, medium or trust-dangerous bugs were found in the Sprint 05 scope.

One operational validation could not complete:

- `npm run qa:clean-rerun` failed with `ECONNREFUSED` because no local dev server was listening. This is an environment/runtime availability issue, not a Sprint 05 code regression.

## Commands Run

- `npx prisma validate`
- `npm run db:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run env:check`
- `npm run qa:revenue-leaks`
- `npm run qa:revenue-leak-read`
- `npm run qa:revenue-leaks-page`
- `npm run qa:clean-rerun`

## Results

Passed:

- `npx prisma validate`
- `npm run db:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run env:check`
- `npm run qa:revenue-leaks`
- `npm run qa:revenue-leak-read`
- `npm run qa:revenue-leaks-page`

Not completed:

- `npm run qa:clean-rerun`

Reason:

- The command failed with `ECONNREFUSED`, consistent with no local web server being available for the clean rerun script.

Known non-blocking warnings:

- Revenue leak QA scripts continue to emit Node experimental loader / transform-types warnings.
- These warnings did not fail validation and are not Sprint 05 product bugs.

## Scope Checked

### 1. `/app/revenue-leaks` Exists And Is Protected

Status: pass.

Evidence:

- Build output includes `/app/revenue-leaks` as a dynamic app route.
- Static QA verifies the page imports and uses `getAppContext`.
- Static QA verifies sign-in redirect protection through `buildSignInRedirectPath`.
- Static QA verifies incomplete activation redirect through `getOnboardingStepPath`.

### 2. Page Uses Persisted RevenueLeak Rows

Status: pass.

Evidence:

- `getRevenueLeakListForWorkspace` queries `prisma.revenueLeak.findMany`.
- Page loads `getRevenueLeakListForWorkspace`.
- No fake page metrics were added.

### 3. Filters Work

Status: pass.

Validated filters:

- `ALL_ACTIVE`
- `FINANCIAL`
- `OPERATIONAL`
- `DATA_QUALITY`
- `HIGH_SEVERITY`
- `LOW_CONFIDENCE`
- `RESOLVED`
- `DISMISSED`

Evidence:

- `npm run qa:revenue-leaks-page` creates isolated fixtures and validates expected fingerprints per filter.

### 4. Financial Leaks Are Separate From Operational/Data-Quality Risks

Status: pass.

Evidence:

- `getRevenueLeakCategory` derives category from `leakType`.
- Page renders grouped sections through `RevenueLeakList`.
- `qa:revenue-leaks-page` validates financial, operational and data-quality filters separately.

### 5. Operational Risks Are Not Shown As Confirmed Financial Loss

Status: pass.

Evidence:

- `getRevenueLeakListForWorkspace` nulls display value for non-financial categories.
- Operational risk label: `Operational risk; not counted as revenue at risk`.
- Data-quality risk label: `Data-quality risk; not counted as revenue at risk`.
- `qa:revenue-leaks-page` validates both conditions even when fixture rows contain bad persisted money values.

### 6. Evidence Summaries Render Safely

Status: pass.

Evidence:

- `buildRevenueLeakEvidenceSummary` handles malformed or sparse `evidenceJson`.
- `qa:revenue-leaks-page` validates generated summary from `evidenceJson`.

### 7. Confidence Explanations Render Safely

Status: pass.

Evidence:

- `buildRevenueLeakConfidenceCopy` uses stored confidence reason when available.
- Falls back to conservative copy.
- High confidence copy still says the signal is an estimate, not confirmed accounting loss.
- `qa:revenue-leaks-page` validates generated confidence explanation.

### 8. Status Actions Validate Workspace Ownership

Status: pass.

Implemented actions:

- `acknowledgeRevenueLeakAction`
- `dismissRevenueLeakAction`

Evidence:

- Actions call `getAppContext`.
- Actions query the leak by id.
- Actions validate `leak.workspaceId !== appContext.workspace.id`.
- Actions update only `status`.
- Actions revalidate `/app/revenue-leaks` and `/app/dashboard`.

Deferred:

- `resolveRevenueLeakAction`

Reason:

- `RESOLVED` remains semantically riskier because it can imply verified recovery. Deferral is aligned with the Sprint 05 audit.

### 9. Dashboard Still Works

Status: pass.

Evidence:

- `npm run build` passes.
- `npm run qa:revenue-leak-read` passes.
- `npm run qa:revenue-leaks` passes.
- Dashboard route remains present in build output.

### 10. Manual Run Leak Read Still Works / Compiles

Status: pass for compile and service validation.

Evidence:

- `RunLeakReadAction` is reused by the Revenue Leaks page.
- `syncDashboardRevenueLeaks` still compiles.
- `npm run build` passes.
- `npm run qa:revenue-leaks` validates sync behavior.

Runtime browser validation:

- Not completed through `qa:clean-rerun` because no local server was listening.

### 11. No AI Is Called

Status: pass.

Evidence:

- `qa:revenue-leaks-page` intercepts `fetch` and fails on OpenAI calls.
- No OpenAI calls occurred.

### 12. No Migration Was Added

Status: pass.

Evidence:

- No `sprint_05` or `revenue_leaks_page` migration exists.
- Prisma validation passes.

### 13. No BI-Style Table / Filter / Drilldown Was Added

Status: pass.

Evidence:

- Page uses cards and lightweight link filters.
- No table or chart elements detected by static QA.
- No dynamic detail route was created.
- No export, trends, charts, comparison periods or reporting suite behavior was added.

### 14. No CRM / Inbox / Task Workflow Was Added

Status: pass.

Evidence:

- No owner, assignment, comments, notifications, tasks, threads, inbox or bulk action workflow exists in Sprint 05 page/action scope.
- Status actions are limited to manual acknowledgement/dismissal.

### 15. Copy Avoids Lost Revenue / Confirmed Loss / Recovered Revenue Claims

Status: pass.

Evidence:

- Page uses estimated/product-truth language.
- Page honesty note says operational and data-quality risks may block revenue but are not confirmed financial loss.
- Static search found no problematic claim in the new page/components.

One grep match appeared in `detect-revenue-leaks.ts`:

- `Confirm whether this cancellation was rebooked before treating it as unrecovered revenue at risk.`

Assessment:

- This is not a Sprint 05 page copy bug.
- It says `unrecovered revenue at risk`, not recovered revenue generated by REVORY.
- It remains consistent with estimated risk language.

## Bugs Found

### Critical Bugs

None.

### Medium Bugs

None.

### Small But Trust-Dangerous Bugs

None.

## Issues Not Classified As Sprint 05 Bugs

### `qa:clean-rerun` Could Not Connect

Severity: operational environment issue.

Where:

- `npm run qa:clean-rerun`

Behavior:

- Failed with `ECONNREFUSED`.

Likely cause:

- No local Next server was running for the clean rerun script.

Impact:

- Prevented browser-style clean rerun in this QA pass.
- Does not invalidate the Sprint 05 implementation because build, route generation, service QA and page QA passed.

Recommendation:

- Run `npm run qa:clean-rerun` again with the expected local server running if visual/hands-on rerun is required.

## Scope Creep Risks

Current implementation is aligned.

Risks to keep protecting:

- Do not add charts, exports, trends or drilldowns in this page without a separate BI-safety review.
- Do not add task workflow, owner, assignment, comments or inbox affordances.
- Keep `resolve` deferred unless copy makes it explicitly manual and non-revenue-recovery-verifying.
- Keep operational/data-quality risks outside estimated financial totals.

## Pass / Fail Recommendation

Pass.

Sprint 05 is approved from QA Bug Hunt perspective.

The only remaining validation gap is `qa:clean-rerun`, blocked by no local server listening. That should be rerun in a server-backed environment, but it is not evidence of a Sprint 05 code defect.
