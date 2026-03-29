# QA Bug Hunter and Final Product Integrity Guard

Date: 2026-03-29
Stage: Post-Sprint 04 final QA
Product: REVORY Seller

## Technical validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed
- Production build generated the key routed surfaces successfully, including `/app/dashboard`, `/app/imports`, `/app/setup`, `/app/setup/[step]`, `/sign-in/[[...sign-in]]`, and `/sign-up/[[...sign-up]]`

## Surfaces reviewed

- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/layout.tsx`
- `components/dashboard/OperationalSurface.tsx`
- `services/operations/build-operational-surface.ts`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/AssistedImportMappingPreview.tsx`
- `services/imports/build-assisted-import-payload.ts`
- Residual risk scan:
  - `services/operations/operational-templates.ts`
  - `components/dashboard/OperationalTemplatePreviewGrid.tsx`

## Findings

### 1. Low: dormant operational-template copy still carries older framing outside the routed MVP path

Residual wording such as `Follow-up`, `Follow-up template`, and `Booking Playbook` still exists in `services/operations/operational-templates.ts:108`, `services/operations/operational-templates.ts:113`, `services/operations/operational-templates.ts:459`, `services/operations/operational-templates.ts:492`, and `components/dashboard/OperationalTemplatePreviewGrid.tsx:17-18`.

Current impact:

- I did not find `OperationalTemplatePreviewGrid` wired into the current routed product path.
- `OperationalSurface` itself is now contained and Seller-safe on the active dashboard path.
- This is a future-regression risk, not a current demo-path blocker.

## Confirmation by review area

### Activation honesty

Resolved.

Evidence:

- `src/app/(app)/app/layout.tsx:89` derives `activationStatus` from `activationSetup.isCompleted` as `Activated` or `Activating`
- `components/app/AppSidebar.tsx:66` uses that status on `Activation Path`
- `components/app/AppSidebar.tsx:144-152` maps `Activated` to success and `Activating` to warning rather than success

Conclusion:

- The sidebar no longer signals activation success before real completion.

### Shell consistency

Resolved.

Evidence:

- `src/app/(app)/app/layout.tsx:45-52` derives `Booking Inputs` status as `Proof active`, `Proof ready`, or `Proof next`
- `components/app/AppSidebar.tsx:125-129` and `src/app/(app)/app/layout.tsx:26-30` humanize workspace status to `Live`, `Draft`, and `Paused`
- `src/app/(app)/app/layout.tsx:92` keeps the shell subtitle aligned with actual activation state

Conclusion:

- Shell labels, chips, and sidebar indicators now read as one coherent system.

### OperationalSurface alignment risk

Resolved on the current MVP surface.

Evidence:

- `components/dashboard/OperationalSurface.tsx:56-57` frames the area as `Contained Guidance` and `Seller keeps this read narrow.`
- `components/dashboard/OperationalSurface.tsx:88` uses `Booked proof` as the primary supporting signal
- `services/operations/build-operational-surface.ts:650` explicitly keeps this layer secondary until booked proof exists
- `services/operations/build-operational-surface.ts:660` keeps the layer quiet when no narrow guidance is needed

Conclusion:

- The active surface no longer reads like an operational board, queue, CRM, or inbox.
- The remaining risk sits in dormant template code, not in the shipped dashboard path.

### Metric precision

Resolved.

Evidence:

- `components/imports/CsvUploadCard.tsx:741-744` now uses `Suggestions still to confirm` for the pending-confirmation count
- `components/imports/CsvUploadCard.tsx:942-945` now uses `Suggested matches kept` for the execution summary count
- `components/imports/CsvUploadCard.tsx:749-752` and `components/imports/AssistedImportMappingPreview.tsx:317-320` use `Confident matches kept`
- `services/imports/build-assisted-import-payload.ts:446-447` still confirms the underlying metric is `suggestedPendingConfirmationCount`

Conclusion:

- The upload surface now describes the numbers shown with materially better honesty and clarity.

## Product integrity check

On the active routed surfaces reviewed, I did not find new drift toward:

- CRM
- inbox
- open chatbot
- heavy operations console

The current product read remains premium, narrow, booking-first, and revenue-aware.

## Final verdict

**Approved with caveats**

Reason:

- Sprint 04 resolved the main integrity issues called out at the end of Sprint 03.
- Technical validation is clean.
- The remaining caveat is low severity and off the current routed MVP path, but it should stay on the watchlist so dormant operational-template language does not get reintroduced later.
