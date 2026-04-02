# Flow Integrity Remediation

Date: 2026-04-01

## Scope

This pass focused on the audit blockers that were preventing final sign-off of the routed REVORY Seller flow:

- shell honesty around booked proof
- revenue contract between Activation Path and Revenue View
- proof and revenue using the same logic base
- go-live following the real app path
- Booking Inputs CTA/readability when proof is still pending
- source/template edge cases that were weakening trust

## Files Changed

- `C:\Users\hriqu\Documents\revory-mvp\services\proof\get-booked-proof-read.ts`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\layout.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\services\app\get-initial-app-path.ts`
- `C:\Users\hriqu\Documents\revory-mvp\services\dashboard\get-dashboard-overview.ts`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\dashboard\page.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\imports\page.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\imports\actions.ts`
- `C:\Users\hriqu\Documents\revory-mvp\components\imports\ImportsFlowGrid.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\services\decision-support\build-import-decision-support.ts`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\page.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\actions.ts`
- `C:\Users\hriqu\Documents\revory-mvp\src\app\(app)\app\setup\[step]\page.tsx`
- `C:\Users\hriqu\Documents\revory-mvp\services\decision-support\build-activation-step-read.ts`
- `C:\Users\hriqu\Documents\revory-mvp\services\imports\build-assisted-import-payload.ts`

## What Was Fixed

### 1. Shell no longer promotes lead base as booked proof

Before:

- shell/sidebar status could promote `Proof active` from source-level import state
- appointments file presence could be treated as enough proof, even when booked outcomes were not actually visible
- `/app` routing could send an activated workspace to Revenue View too early

After:

- booked proof truth now comes from a shared server read of visible booked appointments (`SCHEDULED` or `COMPLETED`)
- shell subtitle and `Booking Inputs` sidebar status only promote proof when booked outcomes are truly visible
- `/app` path resolution now follows the same proof logic before deciding between `Booking Inputs` and `Revenue View`

### 2. Revenue contract now matches Activation Path promise

Before:

- Activation Path positioned `Value per booking` as the revenue anchor
- Revenue View still depended only on `appointment.estimatedRevenue`
- if the CSV lacked `estimatedRevenue`, revenue could stay pending even with booked proof + configured value per booking

After:

- Revenue View uses the same booked-proof base as the proof section
- revenue is calculated from booked appointments only
- each booked appointment uses `estimatedRevenue` when available, with fallback to configured `averageDealValue`
- canceled and no-show appointments no longer inflate revenue

### 3. Booked proof and lead base were separated more honestly

Before:

- dashboard and Booking Inputs still had paths where support imports could read too close to proof
- a source could be present without making that distinction obvious enough in the UI

After:

- dashboard `Booked proof` stays centered on the appointments source only
- lead base remains secondary support
- Booking Inputs now distinguishes:
  - proof live
  - source present but outcomes still not visible
  - proof still missing

### 4. Go-live now respects the real product path

Before:

- finishing activation redirected directly to `/app/dashboard`
- that bypassed the product’s own path resolution and could skip the proof-first next step

After:

- activation completion redirects to `/app`
- stale or completed onboarding actions also resolve back through `/app`
- the final landing now follows the real state of the workspace

### 5. Booking Inputs hero CTA now respects proof readiness

Before:

- the main hero CTA could send the user to `Revenue View` even when proof was still pending

After:

- if proof is live, the hero opens `Revenue View`
- if proof is pending, the hero keeps the user on `Booking Inputs` and points to the upload flow
- if the appointments source exists but outcomes still are not visible, the hero reframes the step as `Review booked proof`

### 6. Activation default handling became more honest

Before:

- `primaryChannel` default persistence could make the product read as if the booking path had already been consciously locked
- source guidance did not show a truly neutral read when nothing had been chosen yet

After:

- setup overview no longer treats booking path as confirmed before the user reaches/passes the channel step
- source step now has an explicit neutral state when no source was chosen yet
- Email is framed as the recommended default rather than implied explicit user choice

### 7. Edge-case import trust leaks were reduced

Before:

- official mapping depended on exact header order
- some Booking Inputs wording still exposed internal jargon like `lane`

After:

- official mapping now accepts the correct header set regardless of order
- Booking Inputs guidance and helpers were softened into more product-native language

## Before / After Summary

### Shell + routing

- Before: imported file could look like proof
- After: only visible booked outcomes count as proof

### Revenue logic

- Before: revenue and proof could diverge
- After: both use the same booked-outcome base

### Activation completion

- Before: go-live forced dashboard
- After: go-live resolves through `/app`

### Booking Inputs hero

- Before: CTA could imply revenue was ready too early
- After: CTA follows actual proof readiness

### Mapping

- Before: exact match was order-sensitive
- After: exact match is set-sensitive

## What Was Softened

- source-present-without-proof states now read as `Review`, not as live proof
- support language in Booking Inputs is less operational
- guided recommendation copy in activation/import reads more like product guidance and less like internal system terminology

## Validation

Executed locally:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Result:

- all three passed cleanly on the final run

## Residual Note

The biggest integrity leaks from the audit are closed in the active routed path. There is still room for a later semantic cleanup pass if we want every status word across every surface to collapse into one tighter vocabulary, but that is no longer blocking the core product story or the proof-to-revenue contract.

## Verdict

Approved.

The routed REVORY Seller path is now materially more honest, more coherent, and closer to final sign-off. The two central commercial risks are resolved: lead base no longer masquerades as booked proof, and revenue now honors the activation promise around `Value per booking`.
