# Seller Narrative Cleanup Review

Date: 2026-03-29
Stage: Sprint 03
Reviewer lens: Seller Narrative Cleanup Reviewer

## Alignment verdict

The remaining narrative leaks are materially cleaner now. The product reads more consistently as REVORY Seller, a premium booking acceleration system for MedSpas, and less like a leftover mix of setup language, imported-dashboard framing, or operational follow-up terminology.

## What was found

- The auth shell still carried old phrases such as `setup`, `imported dashboard`, and generic product-flow wording that no longer matched the Seller thesis.
- Activation still had one internal-facing note that referenced `Sprint 2`, which weakened polish and demo confidence.
- The dashboard still used one `operational` contrast line that felt more back-office than commercial.
- The operational guidance copy still exposed residues such as `follow-up opportunities`, `follow-up blocked by missing email`, and feedback phrasing that leaned too heavily into old operational framing.

## What was corrected

- Cleaned sign-in and sign-up surfaces to use:
  - `activation`
  - `Booking Inputs`
  - `revenue view`
  - `Seller path`
- Reframed auth copy so the workspace reads as one coherent Seller flow instead of a setup/import utility path.
- Replaced the activation note that referenced `Sprint 2` with a product-facing explanation about unsupported lead-entry types.
- Tightened the dashboard guardrail copy from `operational` framing to a cleaner `back-office` contrast.
- Reframed recovery-style copy toward `return-to-booking` language where that better matches the Seller narrative.
- Tightened post-visit feedback copy so it stays honest and concise without sounding like an old review-ops module.
- Preserved brevity and functional honesty; no surface was expanded into heavier marketing language.

## Implemented surfaces

- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/dashboard/page.tsx`
- `services/operations/build-operational-surface.ts`
- `services/recovery/build-recovery-opportunity-classification.ts`
- `services/review-request/build-review-request-eligibility-classification.ts`
- `services/reminder/build-reminder-classification.ts`

## Scope control

- No broad rewrite was done.
- No new feature or flow was added.
- No copy was inflated into marketing language.
- No product capability was overstated.

## Veredito

Approved.

Sprint 03 now has a cleaner Seller narrative across the remaining high-signal microcopy surfaces. The product feels more coherent, more premium, and more booking-first without losing clarity or honesty.
