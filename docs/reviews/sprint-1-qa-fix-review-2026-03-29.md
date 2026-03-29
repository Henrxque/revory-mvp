# Sprint 1 QA Fix Review - 2026-03-29

## Corrections Implemented
- **Average deal value** now persists in a dedicated `averageDealValue` field instead of the legacy `googleReviewsUrl`.
- **Validation and formatting** for deal value now accept numeric/currency input only and block URLs or arbitrary text.
- **Activation readiness** now requires a valid deal value instead of a reviews URL.
- **Onboarding step key** updated to `deal_value`, with a legacy alias for `reviews` to avoid breaking existing setups.
- **Sidebar Lead Sources status** is now honest: it only shows **Live** after a successful import; otherwise it shows **Awaiting import** or **Not configured**.

## Impact of Each Fix
- **Deal value accuracy:** UI and activation no longer display or accept URLs as revenue baseline. This removes misleading states and restores semantic truth to the Seller revenue model.
- **Activation integrity:** activation cannot complete without a real numeric baseline, preserving the revenue-first posture.
- **Legacy stability:** existing workspaces stuck on the legacy step key still resolve cleanly without surfacing “reviews” to the user.
- **Lead Sources honesty:** the sidebar no longer signals Live when there is no import or real data.

## Legacy Kept Internal
- `googleReviewsUrl` remains **internal-only** for feedback link logic and does not surface in any Seller-facing deal value UI or validation.
- The legacy onboarding key `reviews` is accepted as a **silent alias** to `deal_value` only to avoid broken navigation for existing workspaces.

## Why This No Longer Compromises Seller Framing
The revenue baseline now comes from a clean, numeric **deal value** field, and the UI no longer leaks review/recovery semantics. The Lead Sources status now reflects real data state, aligning the experience with a premium, booking-first system rather than a cosmetic pivot.

## Verdict
**Approved for Product Review Guard.**

## Notes
- A new Prisma migration was added for `averageDealValue`. Run migrations and regenerate Prisma client before deploy.
