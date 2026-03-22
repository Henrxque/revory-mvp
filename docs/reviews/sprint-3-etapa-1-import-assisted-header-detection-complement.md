# REVORY Sprint 3 Etapa 1 Complement Review

## Purpose
This complement review reinforces the approved delivery of Sprint 3 Etapa 1 with small technical hardening, extra edge-case coverage, and clearer readiness notes for Etapa 2.

## What Was Reinforced
- Duplicate raw headers are now explicitly detected in the assisted import preview payload.
- The preview marks duplicate raw headers as a blocking condition for import progression.
- The imports UI now surfaces duplicate raw headers with a clear warning inside the existing REVORY visual system.
- A versioned smoke file was added to cover the main edge cases requested for this reinforcement pass.
- The payload readiness for Etapa 2 was confirmed and documented more explicitly.

## Files Added Or Updated In This Reinforcement Pass
- `types/imports.ts`
- `services/imports/build-assisted-import-payload.ts`
- `components/imports/CsvUploadCard.tsx`
- `docs/testing/assisted-import-edge-cases-smoke.ts`
- `docs/reviews/sprint-3-etapa-1-import-assisted-header-detection-complement.md`
- `docs/reviews/generate_sprint_3_etapa_1_import_assisted_header_detection_complement_pdf.py`

## Duplicate Raw Headers: Current Behavior
- REVORY now detects repeated raw header names directly from the uploaded CSV header row.
- The preview payload exposes:
  - `duplicateSourceHeaders`
  - `hasDuplicateSourceHeaders`
- When duplicate raw headers exist:
  - preview still renders
  - the customer can understand what was detected
  - `preview.canImport` becomes `false`
  - the UI shows a blocking warning

### Why this matters technically
- The current CSV document reader stores row values by raw header name.
- If the same raw header name appears twice, later values can overwrite earlier ones in the row object.
- Blocking import progression here is the safest MVP behavior.
- This keeps Etapa 1 honest and avoids pretending the system can safely distinguish duplicate raw headers before Etapa 2.

## Additional Edge Cases Covered
### 1. Duplicate raw headers
- Case added:
  - repeated `client_email` in the same CSV header row
- Expected behavior:
  - duplicate detected
  - import preview blocked from continuing

### 2. Inconsistent casing
- Case added:
  - uppercase and mixed-case variants such as `STATUS` and `Client Full Name`
- Expected behavior:
  - normalized and matched safely

### 3. Extra spaces
- Case added:
  - padded headers such as ` Appointment External Id `
- Expected behavior:
  - trimmed and normalized before matching

### 4. Simple punctuation
- Case added:
  - headers such as `scheduled.at`
- Expected behavior:
  - normalized and matched without needing a free-form transform layer

## Edge-Case Coverage Artifact
- Versioned smoke coverage file:
  - `docs/testing/assisted-import-edge-cases-smoke.ts`

### Smoke coverage includes
- duplicate raw headers
- casing inconsistency
- extra spaces
- simple punctuation
- a readiness check for the payload consumed by UI

### Validation executed
- `npm run typecheck`
- `npm run lint`
- `npx tsx docs/testing/assisted-import-edge-cases-smoke.ts`
- `npm run build`

## Confirmation Of Etapa 2 Readiness
The Etapa 1 payload is already structurally ready for direct UI consumption in Etapa 2.

### The payload already includes
- `templateKey`
- `detectedHeaders`
- `mapping`
- `preview.mappingOptions`
- `preview.canImport`
- `preview.missingRequiredColumns`
- `preview.missingIdentityPath`
- `preview.duplicateTargets`
- `preview.duplicateSourceHeaders`
- `preview.matchedWithConfidenceCount`
- `preview.suggestedCount`
- `preview.unresolvedCount`

### Practical conclusion
- Etapa 2 does not need structural rework to start rendering a richer mapping confirmation experience.
- The next step can focus on preview UX and confirmation flow, not on redoing the payload contract.

## UX And Visual Identity Observations
### Surfaces touched
- `components/imports/CsvUploadCard.tsx`
- technical import preview state inside the authenticated imports flow

### Visual consistency preserved
- The warning for duplicate raw headers uses the same dark/crimson REVORY shell and alert language already used in the import flow.
- The UI still communicates that REVORY suggests mappings, but does not confirm or assume them silently.
- The experience remains premium and guided rather than technical and builder-like.

### User understanding preserved
- strong matches remain visually strong
- suggested mappings still require confirmation
- unresolved headers remain explicit
- duplicate raw headers are now clearly shown as a source-file issue, not as silent system behavior

## Remaining Risks
- Duplicate raw headers are now blocked, but not yet resolved through an interactive disambiguation flow.
- Extremely custom legacy exports may still over-index on `suggested_needs_confirmation` or `unresolved`.
- Normalization is intentionally narrow and still does not cover multilingual or heavily abbreviated data sets.
- The current reader still uses raw header names as row keys, so duplicate raw headers remain a structural limitation until a later dedicated pass.

## Final Reinforcement Outcome
- Etapa 1 is more defensible technically.
- Edge cases requested for this pass are now covered.
- Duplicate raw header behavior is explicit in both payload and UI.
- The handoff into Etapa 2 is structurally ready without retrabalho.
