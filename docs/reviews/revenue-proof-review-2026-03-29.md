# Revenue Proof Review

Date: 2026-03-29
Stage: Sprint 05
Product: REVORY Seller

## Objective

Strengthen how booked proof and economic value are perceived in the routed MVP path without turning the product into BI, adding analytics, or duplicating KPI unnecessarily.

## Surfaces reviewed

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `components/imports/CsvUploadCard.tsx`
- `src/app/(app)/app/setup/page.tsx`

## What was found

### 1. Revenue proof was present, but some labels still read more like generic visibility than economic proof

The product already had the right structure, but parts of the dashboard and upload lane still emphasized “visibility” where “booked proof” or “revenue proof” would make the value clearer.

### 2. The booked-outcome-to-revenue link was sometimes one sentence too indirect

The relationship between booked appointments, value per booking, and the top revenue number was accurate, but not always immediate enough in demo.

### 3. The appointments upload lane still carried a few neutral operational labels

Those labels were clear, but they did not fully reinforce that this lane exists to support the revenue read.

## What was refined

### Dashboard

- `Booked appointments` metric card became `Booked proof`
- `Value per booking` support framing became more explicitly economic
- The proof section now uses `Booked proof visible` and `Revenue baseline`
- The commercial read block now shows two short proof anchors:
  - `Booked proof in view`
  - `Revenue proof visible`
- Booked visibility support copy now makes it clearer that the files are visible because they make the value feel earned, not estimated
- Empty-state revenue proof copy now points more directly to making the number feel less abstract

### Booking Inputs

- The hero chip now says `Booked proof`
- Support framing now describes this page more clearly as the place where the bookings behind the revenue view become visible
- Revenue handoff copy now says more directly that value per booking is what turns booked proof into the dashboard revenue read

### Appointments upload lane

- `Latest visibility pass` became `Latest booked proof pass`
- `Coverage` became `Proof coverage`
- `Visible now` became `Proof rows live`
- `Add booked visibility file` became `Add booked proof file`
- In-progress and result states now describe the appointments lane as a booked-proof update rather than a generic visibility update

### Activation support

- `Value per booking` now explains itself more directly as the piece that turns each booked appointment into visible revenue proof
- Supporting activation copy still stays narrow and product-honest

## Evidence

- Dashboard now uses `Booked revenue visible`, `Booked proof`, `Revenue baseline`, and `Booked proof in view`
- Imports now uses `Booked proof` in the hero surface and keeps the revenue handoff explicit
- `CsvUploadCard` now frames the appointments lane as booked-proof support instead of generic visibility support
- Setup keeps value per booking tied to visible revenue proof from day one

## Validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

**Approved**

Revenue proof now reads more clearly as economic proof, not just workflow state. The booked outcome, value-per-booking baseline, and top-line revenue number feel more connected and more convincing in demo, while the product remains narrow, executive, and honest to the MVP.
