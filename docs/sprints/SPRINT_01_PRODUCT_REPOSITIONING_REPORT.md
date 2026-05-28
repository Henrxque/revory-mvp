# Sprint 01 Product Repositioning Report

## Summary

This pass updated the primary public brand/category surfaces from the old REVORY Seller / booking acceleration framing to the new REVORY Revenue Leak Detector positioning.

The work was intentionally limited to copy and positioning. No leak engine, RevenueLeak model, AI CSV intake, new route or new data model was implemented in this step.

## Files changed

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/content/revory-landing-reference.html`
- `README.md`

## Old positioning removed

- `REVORY Seller` as public-facing brand language.
- `booking acceleration software for MedSpas` as the top-level category.
- `Clone your best seller` as the hero promise.
- `Start Your Booking Flow` as the primary CTA.
- `paid leads into booked appointments` as the top-level product promise.
- `booked proof`, `booked revenue`, `paid demand` and similar booking-first proof language in the public landing reference.
- Seller-specific pricing and feature framing that made the product read like a sales workflow or booking assistant first.

## New positioning added

- Public brand: `REVORY`.
- Category: `Revenue Leak Detector for premium MedSpas`.
- Hero direction: `Detect revenue leaks hidden in your MedSpa data.`
- Primary CTA direction: `Start With Your Clinic Data`.
- Metadata: `REVORY — Revenue Leak Detector for premium MedSpas`.
- Description: `REVORY helps premium MedSpas detect estimated revenue at risk from structured appointment and booking data.`
- Supporting signals:
  - estimated revenue at risk
  - no-shows
  - unrecovered cancellations
  - blocked booking opportunities
  - stale appointment data
  - CSV-first
  - self-service
  - MedSpa-first
  - not CRM
  - not inbox
  - not BI bloat

## Terms intentionally kept

- `booking data` and `booking opportunities` stayed where they describe the source data or the approved `booking path blocked risk` concept.
- `Manual Quick Add`, `Action Pack`, `bounded suggested message` and `Executive Summary` stayed in pricing/reference copy only as existing product surfaces, not as the top-level category.
- `AI sales assistant` and `confirmed lost revenue` remain only in the README avoid-list as explicit prohibited positioning, not as marketing claims.

## Promises avoided

- No claim that REVORY confirms accounting-grade lost revenue.
- No claim that REVORY generated, recovered or guaranteed revenue.
- No claim that REVORY detects every possible future leak type.
- No CRM, inbox, scheduling system, RCM, consulting service or AI sales agent positioning.
- No implication that a new leak engine or RevenueLeak model was implemented in this copy-only step.

## Risks

- Some in-app surfaces still use booking-assistance language because the product implementation has not yet been fully migrated to the Revenue Leak Detector model.
- The landing reference now points the buyer toward revenue leak detection, but deeper app pages will need a later pass so the post-signup experience does not feel like an old Seller product.
- Pricing language references current surfaces such as Manual Quick Add and Executive Summary; these should be revalidated once the leak-specific product architecture is implemented.

## Suggested execution order

1. Keep this public positioning as the active source for buyer-facing copy.
2. Reframe auth, onboarding, pricing and app shell language next so the first logged-in experience matches the new category.
3. Reframe dashboard, Daily Brief, proof summary and import surfaces around leak reads and estimated revenue at risk.
4. Only after copy alignment, implement the actual Revenue Leak model / leak engine / AI CSV intake in a separate scoped step.

## Validation

- Public copy scan passed for old Seller / booking-acceleration terms in the edited public surfaces.
- `npm run lint` passed.
- `npm run typecheck` passed.
