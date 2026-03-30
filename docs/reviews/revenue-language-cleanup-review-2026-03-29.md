# Revenue Language Cleanup Reviewer

Date: 2026-03-29
Stage: Sprint 06 revenue-language cleanup
Product: REVORY Seller

## Scope reviewed

- `src/app/(app)/app/dashboard/page.tsx`

## Objective of this cleanup

Close the two light revenue-language caveats left from Sprint 05 without reopening the dashboard as an operational surface.

The target was:

- make configured value language explicitly different from observed revenue language
- remove residual file-processing wording from the revenue-first dashboard
- preserve the existing narrow, executive, premium read

## What was found

### 1. Configured value vs observed value was still slightly blurred

The dashboard had already improved from the earlier `Revenue per booking` issue, but one support block still used wording that could read like an observed metric:

- `Revenue baseline`
- note: `This is the dollar value attached to each visible booking in the revenue number above.`

This was directionally correct, but still softer than ideal for a configured value input.

### 2. The proof-support block still sounded too much like file processing

Inside the revenue surface, the support block still read with import-manager language:

- section title: `Booked visibility`
- labels: `Coverage`, `Visible rows`, `Needs review`, `Rows received`
- file emphasis stayed slightly stronger than necessary for a revenue-first page

This did not break the product, but it weakened the executive feel of the dashboard.

## What changed

### 1. Configured value language was made explicit

Updated in `src/app/(app)/app/dashboard/page.tsx`:

- kept `Value per booking` as the main label
- changed support note to:
  - `The configured dollar value REVORY applies to each visible booking in the revenue read.`
- changed `Revenue baseline` to:
  - `Configured value per booking`
- changed its support note to:
  - `This configured baseline is what REVORY applies to each visible booking in the revenue number above.`

### 2. The proof-support block was reframed out of file-processing language

Updated in `src/app/(app)/app/dashboard/page.tsx`:

- section title:
  - before: `Booked visibility`
  - after: `Revenue proof support`

- section description:
  - before: emphasized files behind the revenue read
  - after: emphasizes proof inputs that substantiate the revenue read, with booked proof first and lead-base support second

- section badge:
  - before: `Proof active` / `Proof building`
  - after: `Support visible` / `Support next`

- source titles:
  - before: raw input naming like `Appointments CSV` / `Clients CSV`
  - after: `Booked proof input` / `Lead-base support`

- source status chip:
  - before: raw status wording based on import state
  - after: commercial support framing like `Supporting revenue`, `Needs cleanup`, `Proof pending`

- support metrics:
  - before: `Coverage`, `Visible rows`, `Needs review`, `Rows received`
  - after: `Confidence kept`, `Visible records`, `Held back`, `Records checked`

- empty state:
  - before: `No booked proof visible yet`
  - after: `No revenue proof support visible yet`

- empty-state support copy:
  - before: focused on adding the file to stop revenue from feeling abstract
  - after: focused on bringing booked proof already on hand so revenue can move from configured potential to visible proof

## Before / after summary

### Configured value language

- Before:
  - support language could still be read as if value per booking were partly observed
- After:
  - the dashboard now explicitly describes this as a configured baseline applied to visible bookings

### Proof-support language

- Before:
  - the dashboard briefly drifted toward import/file-processing wording
- After:
  - the same information now reads as support for revenue proof, not as an operational processing panel

## Why this stays aligned

This cleanup does **not**:

- add analytics
- add new metrics
- add operational depth
- re-open import management as the center of the product

It only tightens naming and framing so the dashboard remains:

- revenue-first
- booking-first
- executive
- narrow
- commercially legible

## Technical validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

**Approved**

Reason:

- The configured-vs-observed leak is now materially clearer.
- The proof-support block no longer drifts toward file-processing language inside the commercial dashboard.
- The page stayed narrow, premium, and revenue-first.
