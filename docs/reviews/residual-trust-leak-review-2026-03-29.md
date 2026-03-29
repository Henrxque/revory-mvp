# Residual Trust-Leak Review

Date: 2026-03-29
Stage: Sprint 04
Product: REVORY Seller

## Scope

Short pass over the surfaces already touched in Sprint 04, looking only for small residual leaks that still weaken honesty, status clarity, or future product alignment.

## Inventory

### 1. Operational summary builder still carried old ops-heavy language

Found:

- `services/operations/build-operational-surface.ts` still generated `prioritySummary` copy with older operational framing such as:
  - category-order language
  - broader guided-path language
  - wording that still pulled toward queue-style reading

Adjustment:

- Rewrote the summary copy to stay clearly secondary, booked-proof-aware, and Seller-first.
- Removed the old category-order framing from the surface summary.
- Kept the guidance narrow and explicitly supporting, not operational.

Evidence:

- `services/operations/build-operational-surface.ts:647-695`

### 2. Sidebar status-tone logic still accepted stale shell labels

Found:

- `components/app/AppSidebar.tsx` still recognized older aliases such as `Visible`, `Visibility ready`, and `Active`.
- They were no longer part of the shell’s real current status model, so keeping them increased future regression risk.

Adjustment:

- Reduced the tone mapping to the current shell vocabulary only:
  - `Proof active`
  - `Proof ready`
  - `Proof next`
  - `Activated`
  - `Activating`

Evidence:

- `components/app/AppSidebar.tsx:139-156`

## Validation evidence

- `npm run lint` -> passed
- `npm run build` -> passed
- `npm run typecheck` -> passed

Note:

- The first `typecheck` run hit the same transient `.next/types` route-validator issue seen earlier.
- After the successful production build regenerated Next artifacts, `typecheck` passed cleanly.

## Verdict

Approved.

This pass stayed appropriately small. Two real residual trust leaks were removed, and no broader rewrite was needed. The MVP now reads a little cleaner, a little safer, and a little harder to misinterpret.
