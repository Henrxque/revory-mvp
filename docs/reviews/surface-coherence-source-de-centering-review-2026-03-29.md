# Surface Coherence And Source De-Centering Review

Date: 2026-03-29
Stage: Sprint 03
Reviewer lens: Surface Coherence and Source De-Centering Reviewer

## Alignment verdict

The main product surfaces now do a better job of keeping import and source in a supporting role instead of letting them read as the product core. REVORY Seller remains outcome-first, booking-first, and revenue-aware across dashboard, activation, shell, and Booking Inputs without losing the functional utility of CSV-based visibility.

## What was found

- The Booking Inputs hero still opened with a strong `upload path` framing, which risked making the surface feel like an ingestion tool instead of a commercial support surface.
- `CsvUploadCard` still used many highly visible labels such as `Latest upload`, `Import in progress`, `Current import`, and `Confirm mapping and import`, which made the lane feel too process-centric.
- Some dashboard and shell microcopy still referred to uploads more directly than necessary, especially in next-step guidance and status language.
- The underlying behavior was useful and honest, but the visible language was still overweighting the mechanics instead of the outcome.

## What was refined

- Reframed Booking Inputs hero copy from upload-first to booked-outcome and revenue-proof framing.
- Tightened the support blocks in Booking Inputs so they emphasize outcome-first, guided matching, Seller handoff, and revenue proof.
- Updated the card helper texts so appointments and client files read as support for booked visibility and lead-base clarity, not as a system center.
- Rewrote the major `CsvUploadCard` states and labels around:
  - `visibility pass`
  - `go-live check`
  - `visibility update`
  - `make visible`
  - `current file`
- Kept the functional mechanics intact while reducing the perceived weight of import terminology in high-visibility UI.
- Adjusted the import action feedback messages so success and failure read as booked-visibility updates rather than generic import execution.
- Tightened dashboard and shell microcopy so next-step guidance points to booked visibility and revenue confidence instead of upload mechanics.

## Implemented surfaces

- `src/app/(app)/app/imports/page.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `components/imports/CsvUploadCard.tsx`
- `src/app/(app)/app/imports/actions.ts`
- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/layout.tsx`
- `components/app/AppSidebar.tsx`

## Scope control

- No new flow was added.
- No new screen or lateral module was created.
- No product logic was made more complex.
- No existing import capability was removed.
- No premium visual shell was downgraded.

## Veredito

Approved.

Sprint 03 now presents import and source as support infrastructure for booked visibility and revenue confidence, not as the product thesis. REVORY Seller reads more clearly as a premium booking acceleration system and less like an import manager or feed tool.
