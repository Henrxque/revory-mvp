# Metric Precision Review

Date: 2026-03-29
Stage: Sprint 04
Product: REVORY Seller

## Objective

Correct metric labels in Booking Inputs so each label describes the underlying count precisely, especially around suggested mappings and confirmation state.

## Alignment verdict

The flow is now more literal and trustworthy. The counters in the upload and mapping review area no longer imply completed review when the underlying count is actually about suggested mappings still awaiting confirmation or about confident matches that were simply kept.

## What was reviewed

- `components/imports/CsvUploadCard.tsx`
- `components/imports/AssistedImportMappingPreview.tsx`
- `services/imports/build-assisted-import-payload.ts`

## Findings and adjustments

### 1. The QA finding in CsvUploadCard was real

Problem:

- The post-import summary used `Suggestions reviewed` for `suggestedPendingConfirmationCount`.
- That label implied a completed review while the metric came from the `suggested_pending_confirmation` bucket.

Underlying evidence:

- `services/imports/build-assisted-import-payload.ts:446-448`

Adjustment:

- Changed the post-import summary label from `Suggestions reviewed` to `Suggested matches kept`.

Why this is safer:

- It now describes what the count actually means in the saved result: suggested matches that were left in place and imported as-is.

### 2. Final review summary was tightened to reflect pending confirmation

Adjustment:

- Changed `Suggestions to review` to `Suggestions still to confirm`.

Why:

- This is more precise than a generic review label and matches the current pre-import state more directly.

### 3. Confident-match labels were aligned across the assisted mapping flow

Adjustment:

- Changed `Kept from REVORY match` to `Confident matches kept` in `CsvUploadCard`.
- Changed `Kept` to `Confident matches kept` in the post-import execution summary.
- Changed `Kept as suggested` to `Confident matches kept` in `AssistedImportMappingPreview`.
- Updated the helper copy for `kept_confident_match` to say the mapping keeps the confident match, instead of saying it keeps it "as suggested".

Why:

- These counters are not about suggested matches.
- They refer specifically to confident REVORY matches that the user left unchanged.

## Evidence

Updated labels:

- `components/imports/CsvUploadCard.tsx:741-749`
- `components/imports/CsvUploadCard.tsx:942-950`

Updated mirrored wording in the mapping preview:

- `components/imports/AssistedImportMappingPreview.tsx:91-96`
- `components/imports/AssistedImportMappingPreview.tsx:317-320`

## Scope adjustments

- No redesign of the upload flow
- No business-logic change
- No new metrics
- No copy expansion outside the precise labels that were actually misleading

## Validation evidence

- `npm run lint` -> passed
- `npm run typecheck` -> passed

## Verdict

Approved.

The Booking Inputs metrics now read with better precision and better product honesty. The change stayed surgical and materially improves confidence in a sensitive part of the MVP.
