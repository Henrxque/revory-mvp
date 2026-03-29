# Revenue Attribution Review

## Objective

Reinforce that the revenue shown by REVORY Seller comes from the Seller motion itself: activation integrity, booking path, visible booked outcomes, and deal value. The goal was to make revenue feel earned and explainable without expanding the product into analytics-heavy BI.

## Alignment verdict

The implementation is aligned with REVORY Seller. Revenue still stays dominant and executive-first, but it now reads as the result of a narrow booking system rather than as a disconnected KPI. The product remains premium, self-service, and booking-first without drifting into heavy reporting.

## Findings

- Revenue was already visually dominant, but the causal chain behind it still needed to be clearer.
- Setup and activation referenced deal value, but they did not yet show the full line from activation integrity to revenue visibility clearly enough.
- Imports already fed the dashboard honestly, but the relationship between imported booked outcomes and the revenue number needed one more layer of explicitness.
- The dashboard needed a tighter explanation of why the executive number is believable without turning the page into a BI surface.

## Scope adjustments

- Preserved the revenue-first dashboard structure.
- Did not add new analytics, attribution engines, charts, or extra KPI layers.
- Strengthened revenue attribution with supporting copy, short explanatory cards, and clearer sequencing only.
- Kept the explanation intentionally narrow: activation -> booking path -> booked appointment -> revenue read.

## Copy adjustments

- Setup now includes a `Revenue line of sight` section explaining how activation and booking path support revenue visibility.
- The final activation step now explicitly states why revenue only appears after activation and visible booked outcomes.
- Dashboard now includes `Why this revenue is believable` to explain that the metric comes from locked setup plus visible bookings plus deal value.
- Imports now clarify that once booked outcomes are visible, deal value is what turns motion into a trusted revenue read.

## Files changed

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/imports/page.tsx`

## What changed

- Added a revenue-attribution explanation block to the dashboard without adding analytics complexity.
- Added a revenue line-of-sight section to setup so the customer understands revenue before reaching the dashboard.
- Strengthened activation copy so revenue is framed as a result of live booked outcomes, not of setup alone.
- Tightened imports copy so sources remain clearly subordinate to motion and revenue trust.

## Validation

- `npm run typecheck`
- `npx eslint "src/app/(app)/app/dashboard/page.tsx" "src/app/(app)/app/setup/page.tsx" "src/app/(app)/app/setup/[step]/page.tsx" "src/app/(app)/app/imports/page.tsx"`
- `npm run build`

## Clear verdict

**Approved.**

Revenue now feels more clearly connected to the Seller core motion and activation integrity, while the dashboard remains short, premium, and executive-first.
