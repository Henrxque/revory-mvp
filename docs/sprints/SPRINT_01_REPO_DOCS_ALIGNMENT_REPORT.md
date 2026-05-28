# SPRINT 01 - Repo Docs Alignment Report

## Summary

This pass updated repo-facing documentation so future contributors do not accidentally rebuild the old REVORY Seller product promise.

The current source of truth is now explicit: REVORY is a Revenue Leak Detector for premium MedSpas. Older Seller-era docs remain available as historical implementation substrate, not as current public positioning.

## Files changed

- `AGENTS.md`
- `README.md`
- `docs/source-of-truth.md`
- `docs/revory-seller-project-documentation.md`
- `docs/domain-model.md`
- `docs/wireframes.md`
- `docs/user-journey.md`

## Docs marked historical

- `docs/revory-seller-project-documentation.md`
  - Added the required banner: `Historical REVORY Seller reference. Not current public positioning. Current source of truth is REVORY Revenue Leak Detector.`
  - Clarified that the document is historical implementation substrate for the old Seller / booking-assistance foundation.

- `docs/domain-model.md`
  - Marked as historical implementation reference.
  - Clarified that model names and examples may still be useful implementation history, but should not define current buyer-facing category, copy or scope.

- `docs/wireframes.md`
  - Marked as historical wireframe reference.
  - Clarified that older claims such as recovered revenue, protected revenue, booking acceleration or Seller language must be checked against the current source of truth before reuse.

- `docs/user-journey.md`
  - Marked as historical journey reference.
  - Clarified that current journeys should be interpreted through revenue leak detection, appointment evidence, data quality, estimated revenue at risk and bounded action guidance.

## Current source of truth clarified

- `README.md`
  - Now states: `REVORY is now a Revenue Leak Detector for premium MedSpas.`
  - Points contributors to `docs/source-of-truth.md`.
  - Tells contributors to prefer the narrower V3 Revenue Leak Detector interpretation when old docs conflict.

- `docs/source-of-truth.md`
  - Now opens with the current public positioning.
  - Clarifies that historical REVORY Seller references are implementation context, not public positioning.
  - Points to the V3 external scope doc for Revenue Leak Detector.

- `AGENTS.md`
  - Updated the preferred external source path from the old Seller MVP lousa to the V3 Revenue Leak Detector lousa.
  - Replaced `booking-first` guardrails with `revenue leak-first`, `evidence-first`, `estimated revenue at risk`, and `data quality before claims`.
  - Added explicit category-avoidance guardrails for BI, scheduling, RCM, AI sales agent and clinical/diagnostic product.

## Remaining docs to revisit later

- Historical review files under `docs/reviews/` still contain extensive REVORY Seller language. They were not rewritten because they are dated sprint/review artifacts, not current product source of truth.
- Some technical docs may still reference old model names or Seller-era implementation substrate. They should be updated only when the underlying technical model changes, not as a broad docs rewrite.
- Any future contributor should treat `docs/source-of-truth.md` and the V3 lousa as authoritative when historical docs conflict with current positioning.

## Scope not changed

- No historical docs were deleted.
- No architecture was changed through documentation.
- No technical model was renamed.
- No V3 leak engine, AI CSV Intake, BI surface or new product surface was implied through docs changes.

## Veredito

Aligned. The repo now has a clear hierarchy: current source of truth first, historical Seller docs second as implementation context only. The biggest accidental-rebuild risk, `AGENTS.md` pointing to the old Seller lousa, was corrected.
