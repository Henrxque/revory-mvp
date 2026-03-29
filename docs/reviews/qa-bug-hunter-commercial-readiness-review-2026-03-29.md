# QA Bug Hunter and Commercial Readiness Guard

Date: 2026-03-29
Stage: Post-Sprint 05 final QA
Product: REVORY Seller

## Technical validation

- `npm run lint` -> passed
- `npm run build` -> passed
- `npm run typecheck` -> passed on the final rerun
- Note: the first `typecheck` run failed before `build` with the same transient `.next/types/validator.ts -> ./routes.js` issue already seen in earlier stages. After `build`, the final `typecheck` passed cleanly.

## Surfaces reviewed

- `services/app/get-initial-app-path.ts`
- `src/app/(app)/app/layout.tsx`
- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `components/onboarding/OnboardingStepLayout.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/AssistedImportMappingPreview.tsx`
- `services/imports/build-assisted-import-payload.ts`
- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- watchlist confirmation:
  - `services/operations/operational-templates.ts`
  - `components/dashboard/OperationalTemplatePreviewGrid.tsx`

## Findings

### 1. Low: `Revenue per booking` still blurs a configured assumption with observed revenue language

The same commercial input is still named `Value per booking` across activation and onboarding, but the dashboard support card renames it to `Revenue per booking` in `src/app/(app)/app/dashboard/page.tsx:428`.

Why this matters:

- `Value per booking` is the configured baseline locked during activation, not a newly measured revenue-per-booking metric.
- The dashboard itself already uses the more honest framing nearby in `src/app/(app)/app/dashboard/page.tsx:393`, `src/app/(app)/app/dashboard/page.tsx:452`, and `src/app/(app)/app/dashboard/page.tsx:476`.
- Setup and onboarding stay consistently honest with `Value per booking` in `src/app/(app)/app/setup/page.tsx:186`, `src/app/(app)/app/setup/page.tsx:440`, and `components/onboarding/OnboardingStepLayout.tsx:187`.

Commercial impact:

- Small, but real. In demo, this can read like observed unit economics instead of the locked activation value feeding the current revenue proof.

### 2. Low: one dashboard block still reads more like upload processing than executive proof

The `Booked visibility` block on the dashboard still exposes file-processing labels such as `Coverage`, `Visible rows`, `Needs review`, and `Rows received` in `src/app/(app)/app/dashboard/page.tsx:628`, `src/app/(app)/app/dashboard/page.tsx:636`, `src/app/(app)/app/dashboard/page.tsx:644`, and `src/app/(app)/app/dashboard/page.tsx:652`.

Why this matters:

- The overall dashboard is now strongly revenue-first and commercially narrow.
- These labels are not wrong, but they momentarily pull the read back toward import-manager language inside the revenue surface.
- That weakens the “proof supports revenue” story a bit by making the dashboard feel more operational than the surrounding sections.

Commercial impact:

- Low severity, but noticeable during a live walkthrough if this block gets attention.

## Confirmation by review area

### Demo flow

Improved and coherent.

Evidence:

- `services/app/get-initial-app-path.ts:17-19` sends activated workspaces without booked proof to `/app/imports` before the dashboard.
- `src/app/(app)/app/setup/page.tsx:279-295` points completed activation toward `Open Revenue View`, `Review Booking Inputs`, or `Add booked proof` based on real workspace state.
- `src/app/(app)/app/imports/page.tsx:83` frames Booking Inputs as the bridge from live workspace to believable revenue view.

Conclusion:

- The routed MVP path now reads cleanly as activation -> booked proof -> revenue view.

### Commercial clarity

Improved and mostly aligned.

Evidence:

- `src/app/(app)/app/dashboard/page.tsx:355-363` keeps the hero tightly tied to booked proof and revenue view.
- `src/app/(app)/app/imports/page.tsx:59-83` makes Booking Inputs clearly subordinate to revenue proof rather than source management.
- `src/app/sign-in/[[...sign-in]]/page.tsx:95-127` and `src/app/sign-up/[[...sign-up]]/page.tsx:96-127` keep auth inside the same Seller narrative instead of dropping into generic product utility language.

Conclusion:

- The product reads more presentable and more commercially legible than at the end of Sprint 04.

### Revenue proof

Improved and credible.

Evidence:

- `src/app/(app)/app/dashboard/page.tsx:367-417` keeps one dominant revenue number with booked proof immediately underneath.
- `src/app/(app)/app/dashboard/page.tsx:450-487` explains why the revenue number is believable without turning the page into BI.
- `src/app/(app)/app/imports/page.tsx:93-113` and `components/imports/ImportsFlowGrid.tsx:45-57` keep appointments/booked proof as the primary proof lane before lead-base support.

Conclusion:

- Revenue proof is clearer, faster to read, and still narrow.

### Surface polish

Improved.

Evidence:

- `src/app/(app)/app/layout.tsx:91-94` and `components/app/AppSidebar.tsx:144-152` keep shell status honest and visually consistent.
- `components/onboarding/OnboardingStepLayout.tsx:44-78` keeps activation premium and short without drifting back to admin setup.
- `components/imports/CsvUploadCard.tsx:769`, `components/imports/CsvUploadCard.tsx:777`, `components/imports/CsvUploadCard.tsx:968`, and `components/imports/AssistedImportMappingPreview.tsx:320` keep upload metrics more precise than in Sprint 04.

Conclusion:

- Polish gains are real, especially in the shell, auth, and upload support states.

### Watchlist risk

Reduced correctly without scope drift.

Evidence:

- No remaining `Follow-up` or `Booking Playbook` matches were found in the dormant watchlist files during this review.
- `services/operations/operational-templates.ts:108` now uses `Return to booking`.
- `services/operations/operational-templates.ts:363`, `services/operations/operational-templates.ts:377`, and `services/operations/operational-templates.ts:398` now use contained guidance labels.
- `components/dashboard/OperationalTemplatePreviewGrid.tsx:15-18` now frames the dormant surface as `Guided base` and `Controlled Preview`.

Conclusion:

- The watchlist cleanup reduced future regression risk without reopening dormant product surfaces or creating new operational scope.

## Product integrity check

On the active routed path, I did not find new drift toward:

- CRM
- inbox
- open chatbot
- heavy operations console
- BI-style analytics sprawl

The current product remains premium, narrow, booking-first, MedSpa-first, and commercially legible.

## Final verdict

**Approved with caveats**

Reason:

- Sprint 05 materially improved the demo path, commercial sequencing, revenue proof clarity, and prospect-facing polish.
- Technical validation is clean in the final state.
- Remaining issues are low severity, but they still affect trust at the margin: one label slightly overstates what is configured vs observed, and one dashboard block still reads a bit too much like file processing inside the revenue surface.
