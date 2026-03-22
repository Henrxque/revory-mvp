# REVORY Sprint 3 Etapa 1 Review

## Objective
Implement the technical base of assisted import so REVORY can read the real CSV headers sent by the customer, suggest safe initial correlations to the official fields, and prepare a clean payload for the next mapping preview step.

## Files Created Or Updated
- `types/imports.ts`
- `schemas/imports/csv-header-synonyms.ts`
- `lib/imports/csv-template-definitions.ts`
- `services/imports/build-assisted-import-payload.ts`
- `lib/imports/assisted-import.ts`
- `components/imports/CsvUploadCard.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `docs/reviews/sprint-3-etapa-1-import-assisted-header-detection.md`
- `docs/reviews/generate_sprint_3_etapa_1_import_assisted_header_detection_pdf.py`

## Decisions Taken
- Assisted import remains a guided mapping layer, not a free ETL builder.
- Official CSV templates stay as the canonical import contract.
- Header detection and suggestion logic were consolidated into `services/imports`, while `lib/imports/assisted-import.ts` became a compatibility adapter for the current UI.
- Official synonyms were centralized in `schemas/imports/csv-header-synonyms.ts` so the matching surface is explicit and maintainable.
- The preview payload now carries typed mapping suggestions, confidence, classification, reason codes, and import guardrails for the next UI step.

## Heuristic Used
### 1. Header extraction
- REVORY reads the uploaded CSV and extracts the real header row from the file.
- Blank header values are ignored in the assisted preview layer.

### 2. Matching order
- Exact official header match:
  classified as `matched_with_confidence` with `high` confidence
- Exact known alias match:
  classified as `matched_with_confidence` with `high` confidence
- Inclusive safe match:
  classified as `suggested_needs_confirmation` with `medium` confidence
- Shared token overlap only:
  classified as `suggested_needs_confirmation` with `low` confidence
- No safe fit:
  classified as `unresolved`

### 3. Guardrails
- Only one source header is auto-assigned to each official target field.
- Duplicate target mappings are detected and block the import until confirmed.
- Required fields must be mapped before import can continue.
- Identity path rules remain enforced:
  appointments need at least one client identifier path
  clients need at least one identifier path

## Payload Prepared For Mapping Preview
- `detectedHeaders`
- `mapping`
- `preview.canImport`
- `preview.mappingOptions`
- `preview.missingRequiredColumns`
- `preview.missingIdentityPath`
- `preview.duplicateTargets`
- `preview.matchedWithConfidenceCount`
- `preview.suggestedCount`
- `preview.unresolvedCount`
- `preview.exactTemplateMatch`

This is enough for the next step to render a customer-facing mapping confirmation screen without touching the Sprint 2 parser contract.

## What Still Preserves Sprint 2 Compatibility
- The existing import flow still ends in the official REVORY CSV contract before structural validation, parsing, normalization, and persistence.
- `createMappedCsvText()` converts the assisted mapping back into the official column set.
- No parser semantics were changed in this step.
- No KPI semantics were changed in this step.

## Evidence Of What Works
- Validation:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Smoke A: official-style headers
- Result:
  - `canImport = true`
  - `matchedWithConfidenceCount = 6`
  - `suggestedCount = 0`
  - `unresolvedCount = 0`

### Smoke B: safe aliases
- Example headers:
  - `appointment id`
  - `patient name`
  - `scheduled for`
  - `booking status`
  - `email`
  - `amount`
- Result:
  - all mapped with `matched_with_confidence`
  - reason code `exact_alias_match`

### Smoke C: needs confirmation
- Example headers:
  - `appt identifier`
  - `client mobile number`
  - `service performed`
  - `scheduled visit`
  - `status text`
- Result:
  - all classified as `suggested_needs_confirmation`
  - mix of `inclusive_alias_match` and `shared_token_match`

### Smoke D: unresolved column
- Example mixed header:
  - `mystery source`
- Result:
  - classified as `unresolved`
  - not auto-mapped to an arbitrary REVORY field

## Edge Cases Known
- Duplicate raw headers are still a weak point because CSV row parsing currently keys values by header text.
- Very custom legacy naming with no shared tokens will remain unresolved by design.
- Multilingual or heavily abbreviated exports are not broadly supported yet.
- Assisted import still does not perform value transformation, derived fields, or multi-column composition.
- `exactTemplateMatch` is intentionally strict and only fires when the detected headers match the full official order expected by REVORY.

## Pending Work
- Add row preview under the confirmed mapping step.
- Persist mapping confirmation state when the assisted preview becomes multi-step.
- Decide whether customer-approved mappings should be reusable per workspace in a later sprint.

## Known Risks
- A safe heuristic can still under-match legacy headers; this is acceptable for MVP because unresolved is better than arbitrary mapping.
- Shared-token matching is intentionally conservative and may require manual confirmation more often than a looser mapper would.
- The assisted layer depends on the current official contract; future schema changes must keep template definitions and synonyms aligned.

## Next Recommended Steps
- Build the mapping preview confirmation step on top of the payload created here.
- Add a short first-rows sample preview after mapping confirmation.
- Keep reusability and saved mappings out of scope until real repeated customer behavior proves the need.
