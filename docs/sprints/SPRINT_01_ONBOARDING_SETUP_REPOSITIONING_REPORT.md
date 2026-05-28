# Sprint 01 Onboarding and Setup Repositioning Report

## Summary

This pass updated onboarding/setup copy so the current six-step flow supports REVORY as a Revenue Leak Detector for premium MedSpas instead of REVORY Seller / booking acceleration software.

The work was copy and framing only. No onboarding steps were added, no schema was changed, and the existing setup flow/data model was preserved.

## Files changed

- `components/onboarding/OnboardingStepLayout.tsx`
- `services/onboarding/wizard-steps.ts`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `services/decision-support/build-activation-step-read.ts`
- `services/decision-support/get-activation-step-read.ts`
- `services/decision-support/apply-intent-classification.ts`

## Copy changed

- `REVORY Seller` was changed to `REVORY` in onboarding/setup surfaces.
- `Seller voice` was changed to `Message tone`.
- `Go live with Seller` was changed to `Activate REVORY read`.
- `Seller setup flow` language was changed to `REVORY setup` / `REVORY workspace setup`.
- `booked proof comes next` language was reframed as `appointment evidence comes next`.
- `booking-first` language was reframed around evidence-first leak-read readiness.
- `Revenue View` language in setup context was reframed as `Leak Read`.
- `Booking Inputs` language in setup context was reframed as `Clinic Data` or `appointment evidence`.
- `Lead entry` language was mostly reframed as `Data entry` where the buyer/user is reading setup guidance.
- Average deal/value copy now says the value is used to estimate revenue at risk when direct appointment value is missing.
- Main offer copy now says the primary offer helps REVORY understand which appointment and booking risks matter most.
- Booking path copy now says the booking path helps REVORY identify blocked booking opportunities and operational leak risks.
- Activation guidance now uses `REVORY guidance`, `appointment evidence`, `data quality`, `estimated value`, and `leak read` language.

## No schema changes confirmed

- No Prisma schema changes were made.
- No database model or field names were changed.
- No onboarding step keys were changed.
- No setup routes were renamed.
- No form action names or persistence logic were changed.
- No provider roster, multi-location, campaign mapping or treatment plan setup was added.

## Onboarding still short and self-service

- The flow remains six steps.
- The current routes remain `/app/setup` and `/app/setup/[step]`.
- The setup still asks for one clinic/main offer, one data entry path, one booking path, one estimated value, one message tone and final activation.
- The copy now explains why those fields support the revenue leak read without turning onboarding into CRM, BI, scheduling setup or a managed service.

## References intentionally kept

- Internal step keys such as `source`, `channel`, `deal_value` and existing data model names were kept to avoid behavioral churn.
- `booking path` stayed because it is part of the approved risk model: blocked booking opportunities can create operational leak risk.
- Some terms such as `primaryChannel`, `averageDealValue`, `selectedTemplate` and `getBookedProofRead` remain as internal implementation names only.
- Older Seller/booked-proof copy still exists outside onboarding/setup in dashboard/import decision-support areas and should be handled in later scoped passes.

## Risks avoided

- Avoided CRM, inbox, AI salesperson and automated recovery language.
- Avoided confirmed lost revenue language.
- Avoided claims that activation alone creates revenue visibility.
- Avoided adding new setup complexity to match the new positioning.
- Avoided changing persistence or data model names before the leak engine exists.

## Validation

- Scoped onboarding/setup and activation-guidance scan found no remaining visible `REVORY Seller`, `Seller voice`, `Go live with Seller`, `Seller setup`, `booked proof`, `booking-first`, `paid leads`, `booked appointments`, `Revenue View`, `Booking Inputs`, `lead entry`, or `value per booking` references in the edited onboarding/setup surfaces.
- `npm run lint` passed.
- `npm run typecheck` passed.
