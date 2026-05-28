# Sprint 01 App Shell Repositioning Report

## Summary

This pass updated the protected app shell and navigation so the product reads as REVORY and a revenue leak read, not as REVORY Seller or a paid-leads-to-booked-appointments workflow.

The work was limited to visible labels, navigation copy and shell status text. Routes, authorization, billing state and data/model names were not changed.

## Files changed

- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/layout.tsx`

## Visible Seller references removed

- Sidebar group label `Seller` was changed to `REVORY`.
- Sidebar subline `Paid leads into booked appointments` was changed to `Estimated revenue at risk, leak evidence and next fix`.
- Navigation item `Revenue View` was changed to `Leak Read`.
- Navigation item `Booking Inputs` was changed to `Clinic Data`.
- Shell fallback `Billing keeps Seller live.` was changed to `Plan keeps REVORY active.`
- Shell status language changed from `Booked proof next` / `Booked proof is live` to `Clinic data next` / `revenue leak read is ready`.
- Sidebar status dots changed from `Proof visible`, `Proof next`, `Proof pending` to `Data visible`, `Data next`, `Data pending`.

## References intentionally kept

- Internal route paths were kept:
  - `/app/dashboard`
  - `/app/imports`
  - `/app/setup`
- Internal variable/function names such as `bookingInputsStatus`, `resolveBookingInputsStatus`, `getBookedProofRead` and `hasBookedProofVisible` were kept to avoid unnecessary behavioral churn in a copy-only step.
- Underlying model names and service names were not changed.
- Deeper feature-specific language outside the app shell remains for later scoped migration.

## Routes unchanged confirmation

- No route was renamed.
- No navigation href was changed.
- No authorization redirect was changed.
- No billing gate or subscription access logic was changed.
- No database, Prisma model or service contract was changed.

## Risks

- The shell now reads as REVORY / revenue leak read, but some deeper app surfaces still use old Seller-era language.
- Because internal service names still reference booked proof, future engineers need to avoid treating those internal names as current public positioning.
- This pass does not implement a leak engine; it only aligns the shell copy with the new product direction.

## Validation

- Scoped shell/navigation scan found no remaining `Seller`, `Paid leads`, `booked appointments`, `Billing keeps`, `Seller setup`, `Live Seller`, `Full Seller core`, `booking acceleration` or `booked proof` references in the edited shell files.
- `npm run lint` passed.
- `npm run typecheck` passed.
