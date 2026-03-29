# Activation Integrity And Onboarding Coherence Review

Date: 2026-03-29
Stage: Sprint 03
Reviewer lens: Activation Integrity and Onboarding Coherence Reviewer

## Alignment verdict

The onboarding and activation surfaces are now materially better aligned with the REVORY Seller thesis. The flow reads as a short activation path toward booked appointments and revenue visibility, not as an administrative setup checklist. Scope stayed narrow, the shell remains premium, and no new module, wizard branch, or fake operational capability was introduced.

## What was found

- The sidebar and shell still exposed `Setup` framing, which made the product feel closer to software configuration than commercial activation.
- Some step labels still used administrative wording such as `Brand voice`, `Lead source`, `Deal value`, and `Configured`.
- The activation overview mixed strong booking-first framing with a few residues that still sounded like internal setup management.
- The final activation step was close to the target direction, but still had a few copy points that weakened coherence across the path.

## What was refined

- Reframed the main navigation from `Setup` / `Seller Setup` to `Activation` / `Activation Path`.
- Updated shell-level status language from passive setup wording to activation wording, including a less administrative input status when no lead entry exists yet.
- Tightened the onboarding layout so progress, guardrails, and step labels read as activation moves instead of configuration work.
- Renamed core commercial terms for consistency across surfaces:
  - `Lead source` -> `Lead entry`
  - `Brand voice` -> `Seller voice`
  - `Deal value` -> `Value per booking`
  - `Configured` -> `Locked`
- Reframed the setup overview page so it consistently points to booked appointments, booking path, and revenue outcome.
- Cleaned the final activation confirmation so it explains what goes live in Seller without implying a broader system than the MVP actually supports.
- Kept the activation path short and controlled, with no extra steps, no branching, and no added configuration burden.

## Implemented surfaces

- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/layout.tsx`
- `components/onboarding/OnboardingStepLayout.tsx`
- `services/onboarding/wizard-steps.ts`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`

## Scope control

- No new onboarding step was added.
- No new setting, filter, or analytics block was introduced.
- No visual rebuild or dashboard redesign was performed.
- No CRM, inbox, or operational control-center framing was added.

## Veredito

Approved.

Sprint 03 activation and onboarding now present REVORY Seller with stronger sales readiness, cleaner activation integrity, and more coherent first-run messaging. The path feels more like a premium booking acceleration system for MedSpas and less like an admin setup flow.
