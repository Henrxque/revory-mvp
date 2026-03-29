# QA Bug Hunter and Product Review Guard

Date: 2026-03-29
Stage: Sprint 03 closeout QA
Product: REVORY Seller

## Technical validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

Build evidence:

- Next.js `16.2.0`
- Production build completed successfully
- Main app routes generated successfully:
  - `/app/dashboard`
  - `/app/imports`
  - `/app/setup`
  - `/app/setup/[step]`
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`

## Surfaces reviewed

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/layout.tsx`
- `components/app/AppSidebar.tsx`
- `components/imports/CsvUploadCard.tsx`
- `components/dashboard/OperationalSurface.tsx`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

## Findings

### 1. Activation sidebar shows a success state even when activation is not complete

Severity: medium

Evidence:

- `components/app/AppSidebar.tsx:58-65`
- `components/app/AppSidebar.tsx:136-138`
- `src/app/(app)/app/layout.tsx:81-88`

What happens:

- The sidebar navigation hardcodes the `Activation Path` status as `Active`.
- The status-tone mapping turns `Active` into a success dot.
- The app shell correctly passes `activationLabel={activationSetup.isCompleted ? "Active" : "Activating"}`, but the navigation item ignores that real state.

Why this matters:

- This overstates readiness during activation and weakens product honesty during demo.
- A partially configured workspace can look visually complete before the activation path is actually locked.

Safer MVP interpretation:

- Activation should only look complete when activation is actually complete.
- While in progress, the nav should read and signal something like `Activating` or another non-success state.

### 2. OperationalSurface still carries legacy operational framing and old-language residue

Severity: medium

Evidence:

- `components/dashboard/OperationalSurface.tsx:79-84`
- `components/dashboard/OperationalSurface.tsx:162-164`
- `components/dashboard/OperationalSurface.tsx:271-272`
- `components/dashboard/OperationalSurface.tsx:291-294`
- `components/dashboard/OperationalSurface.tsx:344-351`
- `components/dashboard/OperationalSurface.tsx:360-362`

What happens:

- The component still uses language such as `Signals visible`, `Open Booking Inputs`, `at-risk, reminder, confirmation, follow-up`, `Imported appointment`, and `Booking pulse turns on after the first appointments upload`.
- The component remains structurally closer to an operational guidance surface than to the narrower revenue-first Seller framing consolidated elsewhere in Sprint 03.

Why this matters:

- Even though this component does not appear to be wired into the current routed demo path, it is a real product-alignment risk sitting close to production code.
- If reused later, it can reintroduce CRM/inbox/ops-heavy perception and undo the narrative cleanup already achieved on the routed surfaces.

Safer MVP interpretation:

- Keep this surface either fully aligned to booked-outcome and revenue-proof framing or keep it out of the demo path until it is narrowed.

### 3. One result label in CsvUploadCard misdescribes the metric it shows

Severity: low

Evidence:

- `components/imports/CsvUploadCard.tsx:942-945`
- `services/imports/build-assisted-import-payload.ts:446-448`

What happens:

- The UI label says `Suggestions reviewed`.
- The value shown is `suggestedPendingConfirmationCount`, which counts items still classified as `suggested_pending_confirmation`.

Why this matters:

- The wording implies completed review, but the underlying metric describes suggestions that required confirmation.
- This is a small copy mismatch, but it chips away at trust in a product area that is supposed to feel controlled and precise.

Safer MVP interpretation:

- The label should describe pending confirmation or suggestions that needed review, not imply the review already happened.

## Scope and identity check

Current routed demo surfaces remain broadly aligned with the Sprint 03 thesis:

- Revenue stays dominant on the dashboard.
- Booking-first framing is preserved across dashboard, imports, setup, sign-in, and sign-up.
- The product does not read like a CRM, inbox, open chatbot, or heavy operations suite on the main routed path.
- No evidence of scope creep through new modules, complex filters, or BI-style expansion was found in this QA pass.

Residual risk remains in non-routed or secondary code that still carries older operational language and readiness signals.

## Final verdict

Approved with caveats.

Why:

- Technical integrity is strong: lint, typecheck, and build all passed.
- Main demo surfaces are commercially stronger and still narrow.
- However, there are still a few confidence leaks that should not be ignored:
  - one misleading activation-ready visual signal
  - one residual operational surface with old framing
  - one metric-label mismatch in the import flow

Sprint 03 is close enough to close as a sellable MVP pass, but not clean enough to call perfect. The routed experience is approved; the residual confidence leaks should be treated as follow-up polish, not as invented scope.
