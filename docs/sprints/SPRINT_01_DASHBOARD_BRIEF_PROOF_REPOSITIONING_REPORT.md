# Sprint 01 Dashboard, Brief and Revenue Read Repositioning Report

## Summary

This pass updated dashboard, Daily Brief and Executive Summary language toward REVORY as a revenue leak-first product without pretending the new leak engine already exists.

The work was copy and visible framing only. No `RevenueLeak` model, leak engine, new calculation, fake risk score or new route was added.

## Files changed

- `src/app/(app)/app/dashboard/page.tsx`
- `services/dashboard/get-dashboard-overview.ts`
- `services/briefs/get-daily-booking-brief-read.ts`
- `components/briefs/DailyBookingBrief.tsx`
- `services/proof/get-executive-proof-summary-read.ts`
- `components/proof/ExecutiveProofSummaryCard.tsx`
- `components/proof/ExecutiveProofSummarySheet.tsx`

## Metrics reframed

- `Booked revenue now` became `Observed revenue read`.
- `Booked proof` became `Appointment evidence`.
- `Proof visible` / `Proof pending` became `Evidence visible` / `Evidence pending`.
- `Value per booking` became `Estimated value` where visible in the dashboard read.
- `Lead-base support` became `Client support`.
- `Recent booked momentum` became `Recent appointment momentum`.
- `Revenue View` visible framing became `Revenue leak read` / `revenue read`.
- Executive proof framing became `Executive revenue read`.

## What was renamed

- `Daily booking brief` visible label became `Daily revenue brief`.
- `Executive proof` visible label became `Executive revenue read`.
- `Share proof` became `Share revenue read`.
- `Executive proof share` became `Executive revenue read`.
- `Proof position` became `Evidence position`.
- Appointment-data empty state now says: `Upload appointment data to start detecting revenue at risk.`
- Stale data state now says: `Your appointment data may be outdated. Upload a fresh file to keep your revenue risk read current.`

## What stayed unchanged

- Internal component/type/service names stayed unchanged:
  - `DailyBookingBrief`
  - `DailyBookingBriefRead`
  - `ExecutiveProofSummarySheet`
  - `ExecutiveProofSummaryCard`
  - `ExecutiveProofSummaryRead`
  - `getBookedProofRead`
  - `bookedProofSource`
  - `hasBookedProofVisible`
- Existing dashboard calculations stayed unchanged.
- Existing appointment/revenue/momentum/attribution data structures stayed unchanged.
- Existing billing gate `EXECUTIVE_PROOF_SHARE` stayed unchanged.
- Existing routes and anchors stayed unchanged, including `#revenue-view`, `#booking-inputs-flow` and `#booking-assistance-flow`.

## Why any legacy naming stayed temporarily

- Internal names still reflect the previous Seller implementation and are not user-facing in this pass.
- Renaming internal services/types now would create avoidable churn before the actual Revenue Leak model and leak engine exist.
- The dashboard still reads from appointment evidence, booked appointments and current revenue calculations. It does not yet have a dedicated leak taxonomy or real revenue-at-risk engine.

## Promises avoided

- Did not show `Estimated Revenue at Risk` as a real calculated metric.
- Did not claim confirmed lost revenue.
- Did not claim REVORY generated, recovered or guaranteed revenue.
- Did not imply automated recovery.
- Did not imply full no-show/cancellation/blocked-opportunity leak detection is fully active.
- Added an honesty note: revenue at risk is an estimate based on imported data, not a confirmed accounting loss.

## What should be completed in Sprint 06/07

- Implement the actual leak read taxonomy before renaming more internal models.
- Add honest no-show, cancellation, blocked booking and stale-data signals only when the current data supports them.
- Decide whether `Daily Revenue Brief` becomes `Daily Leak Brief` after leak logic is real.
- Decide whether `Executive Revenue Read` becomes `Executive Revenue Leak Summary` after leak summary logic is real.
- Revisit internal service/type names once the leak engine exists to avoid long-term naming drift.
- Revalidate Basic/Growth plan gating after any new leak-specific proof/share features are introduced.

## Validation

- Scoped dashboard/brief/proof scan found no remaining visible `Daily Booking Brief`, `Executive Proof Summary`, `booked proof`, `Proof visible`, `Proof pending`, `Proof sharing`, `Revenue View`, `Booked revenue`, `Seller`, `Revenue Generated`, `lost revenue`, `recovered revenue` or `generated revenue` references in the edited surfaces.
- `npm run lint` passed.
- `npm run typecheck` passed.
