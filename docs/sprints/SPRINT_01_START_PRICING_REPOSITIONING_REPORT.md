# Sprint 01 Start and Pricing Repositioning Report

## Summary

This pass updated the `/start` pricing experience and billing catalog copy so the plan selection flow aligns with REVORY as a Revenue Leak Detector for premium MedSpas.

The work was limited to visible product framing and plan copy. Stripe price IDs, checkout routes, plan keys, billing gates and subscription logic were not changed.

## Files changed

- `src/app/start/page.tsx`
- `services/billing/workspace-billing.ts`

## Billing logic touched or not touched

- Stripe price IDs were not changed.
- `BASIC`, `GROWTH` and `PREMIUM` plan keys were not changed.
- Checkout hrefs were not changed:
  - Basic still points to `/api/billing/checkout?plan=basic`.
  - Growth still points to `/api/billing/checkout?plan=growth`.
  - Premium remains unavailable with no checkout href.
- Existing billing access logic, Stripe sync logic and feature gates were not changed.
- The only billing-adjacent change was copy inside the plan catalog definitions.

## Plan names changed or kept

- `Basic` was kept to avoid billing and buyer confusion.
- `Growth` was kept as the main Launch V1 plan.
- `Premium` was kept as a future tier label, not an active checkout plan.

## Old positioning removed

- `Seller core`
- `Seller billing`
- `narrow Seller model`
- `Revenue-first dashboard and booked proof`
- `Full Seller core as it exists today`
- Plan-defining booking-first language as the primary value proposition.

## New positioning added

- `/start` now leads with: `Choose how your clinic wants to start detecting revenue at risk.`
- Basic is framed as a limited estimated revenue at risk read.
- Growth is framed as the full Launch V1 revenue leak read.
- Premium remains future / not available for checkout.
- Plan features now emphasize:
  - structured appointment and booking data
  - estimated revenue at risk
  - no-shows, cancellations and operational booking risks
  - data quality and bounded action guidance
  - Executive Revenue Summary

## Risks

- The billing catalog is now aligned at the copy level, but deeper in-app features still use some Seller-era names such as Manual Quick Add and Action Pack.
- Growth is still the complete current product, but the underlying implementation has not yet been rebuilt around a dedicated RevenueLeak model.
- Basic/Growth gates remain simple and unchanged; future pricing work should avoid creating fake tiering through copy alone.
- Premium stays future-only, which is honest, but it still requires future packaging decisions before activation.

## Follow-up for Sprint 08 pricing/billing

- Decide whether plan feature names should be fully renamed once the leak engine and leak-specific surfaces exist.
- Revalidate Basic vs Growth gating after Revenue Leak Detector features are implemented.
- Confirm Stripe product names and customer-facing checkout descriptions match the new Revenue Leak Detector positioning.
- Recheck portal, invoice, receipt and webhook metadata copy if those are visible to buyers.
- Keep Premium unavailable until there is a real differentiated tier that does not create manual founder burden.

## Validation

- Scoped `/start` and billing copy scan found no remaining `Seller core`, `Seller billing`, `Seller model`, `booked proof`, `revenue-first dashboard` or `booking acceleration` references.
- `npm run lint` passed.
- `npm run typecheck` passed.
