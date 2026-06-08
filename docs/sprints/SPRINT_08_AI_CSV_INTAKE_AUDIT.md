# Sprint 08 — AI CSV Intake + Data Quality Check Audit

## Summary

REVORY already has a solid deterministic CSV import substrate: two supported templates, client-side header review, guided mapping, final user confirmation, server-side revalidation, parser normalization, `DataSource` metadata, and import persistence only after review.

Sprint 08 can safely add AI CSV Intake as a bounded triage layer before final import confirmation, but the AI must stay advisory. It should not import data, create `RevenueLeak` rows, calculate financial truth, or become the source of mapping authority.

The safest implementation is:

- deterministic parsing/mapping remains the source of truth;
- AI receives a sanitized intake payload, not the full CSV;
- AI returns a small data-quality and mapping-risk triage;
- user still confirms mapping before import;
- import action still revalidates everything server-side;
- optional saved mapping/triage metadata can use `DataSource.configJson` with versioned, sanitized keys.

## Files Inspected

- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/imports/actions.ts`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/AssistedImportMappingPreview.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `services/imports/build-assisted-import-payload.ts`
- `services/imports/read-csv.ts`
- `services/imports/validate-csv-structure.ts`
- `services/imports/parse-csv-by-template.ts`
- `services/imports/parse-appointments-csv.ts`
- `services/imports/parse-clients-csv.ts`
- `services/imports/register-csv-upload.ts`
- `services/imports/finalize-csv-import.ts`
- `lib/imports/assisted-import.ts`
- `lib/imports/csv-template-definitions.ts`
- `types/imports.ts`
- `prisma/schema.prisma`
- `services/llm/request-bounded-structured-output.ts`
- `services/llm/request-bounded-intent-classification.ts`
- `services/llm/get-llm-runtime-status.ts`
- `scripts/qa-llm-fallback-structured-output.mjs`
- `scripts/validate-revenue-leak-engine.ts`
- `scripts/validate-revenue-leak-read.ts`
- `scripts/validate-revenue-leaks-page.ts`
- `scripts/validate-daily-leak-brief.ts`
- `scripts/validate-executive-revenue-leak-summary.ts`
- `.env.example`
- `package.json`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`

## 1. Current CSV Import Flow

The current flow is review-first and safe:

1. The imports page loads authenticated app context and redirects if setup is incomplete.
2. `ImportsFlowGrid` renders two lanes: appointment evidence and client context.
3. `CsvUploadCard` accepts only `.csv` files within the configured size limit.
4. The selected file is read client-side for preview.
5. `validateCsvStructure` runs client-side enough to block empty/structurally invalid files before review.
6. `buildAssistedImportPayloadFromCsv` reads headers and creates deterministic mapping suggestions.
7. `AssistedImportMappingPreview` lets the user review or adjust mapping.
8. `buildAssistedImportConfirmationDraft` captures the final user-confirmed mapping.
9. `uploadCsvFile` receives the file and optional mapping draft.
10. The server revalidates auth, setup, template key, file extension, file size, mapping shape and mapping blockers.
11. If mapping is confirmed, `createMappedCsvText` rewrites the file into official REVORY columns.
12. Server-side `validateCsvStructure` runs again.
13. `parseCsvByTemplate` parses appointments or clients.
14. `registerCsvUploadMetadata` stores upload metadata in `DataSource`.
15. `persistCsvImport` writes normalized appointments/clients.
16. `finalizeCsvImport` writes import result metadata and final source status.
17. `/app/imports` and `/app/dashboard` are revalidated.

Important: nothing becomes live before final confirmation and server-side validation.

## 2. Existing Parser/Mapping Behavior

Current mapping behavior is deterministic and header-based.

Supported templates:

- `appointments`
- `clients`

Appointment required columns:

- `appointment_external_id`
- `client_full_name`
- `scheduled_at`
- `status`

Appointment identity requirement:

- at least one of `client_external_id`, `client_email`, `client_phone`

Appointment optional columns:

- `service_name`
- `provider_name`
- `estimated_revenue`
- `booked_at`
- `canceled_at`
- `location_name`
- `source_notes`

Client required columns:

- `full_name`

Client identity requirement:

- at least one of `external_id`, `email`, `phone`

Client optional columns:

- `last_visit_at`
- `total_visits`
- `tags`
- `notes`

Mapping currently uses:

- exact official header match;
- exact alias match;
- inclusive alias match;
- shared-token match;
- duplicate source-header detection;
- duplicate target detection;
- required-field detection;
- identity-path detection;
- final confirmation draft.

Parser behavior is conservative:

- unsupported appointment status becomes invalid;
- invalid required dates become errors;
- invalid optional dates become warnings;
- missing usable identifier becomes invalid;
- invalid estimated revenue becomes warning, not financial truth;
- names, emails, phones and tags are normalized deterministically.

This is the correct substrate. AI should not replace it.

## 3. Where AI Triage Can Fit Safely

Best insertion point: inside `CsvUploadCard`, after file selection and deterministic header preview, before the final confirmation step.

Safe placement:

- user selects a CSV;
- deterministic preview is built first;
- a new bounded server action receives a sanitized file profile;
- AI returns data-quality triage and mapping-risk hints;
- UI displays the triage beside the existing mapping preview;
- user still confirms final mapping;
- `uploadCsvFile` remains the only persistence path.

Recommended action shape:

- `triageCsvIntakeAction(input)`
- requires authenticated app context;
- validates template key;
- accepts only sanitized payload, not `File` or raw CSV text;
- calls bounded structured output helper;
- returns display-safe triage;
- does not write database;
- does not revalidate paths;
- does not create `RevenueLeak`.

AI should help answer:

- Does this look like appointment evidence or client context?
- Which required fields look missing?
- Which columns may need review?
- Are there obvious date/status/value quality concerns?
- Is the mapping confidence high enough to proceed to human review?
- What should the user fix before importing?

AI must not answer:

- What revenue was lost?
- Which leaks should be created?
- What rows should be imported automatically?
- What follow-up should be sent automatically?
- What financial value should be counted as true?

## 4. Saved Mapping / `DataSource.configJson`

`DataSource` already has `configJson Json?`, and imports already use it for:

- `lastUpload`
- `lastImportResult`

No migration is required for Sprint 08 if saved mapping or triage snapshots stay lightweight and versioned.

Recommended `configJson` additions after a confirmed import only:

```ts
{
  lastUpload: { ...existing },
  lastImportResult: { ...existing },
  lastConfirmedMapping: {
    version: 1,
    templateKey,
    confirmedAt,
    decisions,
    summary
  },
  lastAiCsvIntakeTriage: {
    version: 1,
    generatedAt,
    provider: "openai" | "fallback",
    model,
    inputProfileHash,
    qualityFlags,
    mappingRisks,
    recommendation
  }
}
```

Rules for saved metadata:

- do not store full CSV content;
- do not store raw sample rows;
- do not store raw client/patient names, emails or phones;
- store only mapping decisions, counts, flags, confidence bands and sanitized summaries;
- keep all keys versioned to avoid future drift.

Migration is only needed later if REVORY wants durable per-template saved mappings across files, cross-source mapping history, or reusable mapping presets. That is not required for Sprint 08.

## 5. Existing LLM Runtime Patterns To Reuse

Current LLM substrate is appropriate for Sprint 08:

- `requestBoundedStructuredOutput`
- `requestBoundedIntentClassification`
- `getLlmRuntimeStatus`
- `REVORY_LLM_ENABLED`
- `OPENAI_API_KEY`
- `REVORY_LLM_MODEL`
- `REVORY_LLM_TIMEOUT_MS`
- strict JSON schema output;
- `store: false`;
- bounded max output tokens;
- timeout;
- retry cap;
- null fallback;
- schema parse validation;
- logging once for provider status.

Sprint 08 should create a dedicated bounded request helper, likely:

- `services/imports/request-ai-csv-intake-triage.ts`

It should call `requestBoundedStructuredOutput` with a strict schema and a prompt that says:

- do not infer confirmed revenue loss;
- do not create leaks;
- do not import data;
- do not act as CRM/inbox/scheduling/BI;
- do not output raw patient/client identifiers;
- only classify data-quality and mapping-review risks;
- deterministic validation remains authoritative;
- return only allowed enums and short explanations.

## 6. How To Avoid Sending Entire CSV To AI

The product should never send the full CSV to the LLM in Sprint 08.

Recommended sanitized AI payload:

- template key;
- file size bucket;
- detected row count;
- useful row count;
- header count;
- sanitized header names;
- deterministic mapping preview summary;
- required columns matched/missing;
- identity path present/missing;
- duplicate header/target flags;
- validation warnings/errors;
- per-column value profiles, not raw values.

Recommended per-column profile:

```ts
{
  sourceHeader: "Client Email",
  suggestedTarget: "client_email",
  mappedConfidence: "high",
  nonEmptyCount: 184,
  emptyCount: 12,
  sampleShapes: ["email_like", "email_like", "blank"],
  detectedKinds: ["email_like"],
  maxValueLengthBucket: "short"
}
```

Allowed sample strategy:

- no raw names;
- no raw emails;
- no raw phones;
- no full notes;
- no full source notes;
- no full CSV rows;
- dates can be reduced to shape/bucket, e.g. `iso_date_like`, `ambiguous_date_like`, `blank`;
- revenue values can be reduced to `currency_like`, `numeric_like`, `invalid_currency_like`, not exact amounts unless absolutely needed, and exact amount is not needed for triage;
- statuses can be reduced to normalized status tokens/counts because status values are operational, not direct PHI;
- cap headers and profiles to a small fixed number;
- hash the input profile for traceability, not the raw CSV.

Hard no:

- do not send `client_full_name`;
- do not send email addresses;
- do not send phone numbers;
- do not send notes/source_notes text;
- do not send entire rows;
- do not send full file content;
- do not send “top examples” containing real patient/client values.

## 7. Recommended Deterministic Fallback

Fallback should be the existing deterministic flow:

- `validateCsvStructure`
- `buildAssistedImportPayloadFromCsv`
- `buildAssistedImportPreview`
- `buildAssistedImportConfirmationDraft`
- `parseCsvByTemplate`

If AI is unavailable, disabled, times out or fails schema validation:

- show deterministic review as normal;
- show a small note: “AI triage is unavailable. Deterministic file review is still active.”
- do not block import just because AI is unavailable;
- do not change final server validation;
- do not degrade the user into a manual founder/contact flow.

Recommended local deterministic data-quality read:

- missing required fields;
- missing identity path;
- duplicate headers;
- duplicate mapped targets;
- unsupported appointment status warnings;
- invalid date warnings;
- invalid estimated revenue warnings;
- row count and useful row count;
- appointment vs client template fit.

This gives REVORY a credible quality check even with `REVORY_LLM_ENABLED=false`.

## 8. Recommended UI Structure

Keep the import surface short and premium. Do not create a new import dashboard.

Recommended UI inside `CsvUploadCard`:

1. Existing file selection.
2. Existing deterministic “Read headers” state.
3. New compact panel: “Data quality check”.
4. AI/deterministic triage status badge:
   - `Deterministic`
   - `AI-assisted`
   - `AI unavailable`
   - `Review needed`
5. Three to five concise signals:
   - required fields;
   - identity path;
   - mapping confidence;
   - quality warnings;
   - import readiness.
6. Existing mapping preview remains the main review.
7. Existing final confirmation remains the gate.

Recommended copy:

- “Review data quality before this file becomes visible.”
- “AI can explain mapping risks, but REVORY still validates the file deterministically.”
- “Nothing imports until you confirm the final mapping.”
- “This check does not create revenue leaks or count financial value.”

Avoid:

- “AI imported your CSV”
- “Auto-detected all leaks”
- “Recovered revenue”
- “Confirmed lost revenue”
- “Connect all systems”
- “Smart CRM”
- “AI agent”

## 9. Files To Edit In Sprint 08

Recommended implementation files:

- `types/imports.ts`
- `services/imports/build-ai-csv-intake-payload.ts`
- `services/imports/build-deterministic-csv-quality-check.ts`
- `services/imports/request-ai-csv-intake-triage.ts`
- `src/app/(app)/app/imports/actions.ts`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/CsvIntakeTriagePanel.tsx`
- `services/imports/register-csv-upload.ts`
- `services/imports/finalize-csv-import.ts`
- `scripts/validate-ai-csv-intake.ts`
- `package.json`
- `docs/sprints/SPRINT_08_AI_CSV_INTAKE_REPORT.md`

Potentially useful but not required:

- `lib/imports/assisted-import.ts` if new helper exports are needed.
- `components/imports/AssistedImportMappingPreview.tsx` if the triage summary should be displayed inside the existing review surface.
- `src/app/privacy/page.tsx` and `src/app/terms/page.tsx` only if implementation expands beyond already documented bounded intake/triage. Current legal copy already mentions bounded AI intake/triage.

Do not edit in Sprint 08 unless a real bug appears:

- `prisma/schema.prisma`
- billing logic;
- auth logic;
- leak engine;
- Revenue Leaks page;
- dashboard read models.

## 10. Risks

### P1 Risks

- Sending full CSV or raw client identifiers to LLM. This would violate the product’s trust posture and is the biggest Sprint 08 risk.
- AI becoming mapping authority. If AI suggestions bypass deterministic validation or user confirmation, the import flow becomes unsafe.
- AI creating implied leaks. Sprint 08 must not create `RevenueLeak` rows or financial totals from AI output.

### P2 Risks

- Overpromising “AI CSV Intake” as automatic import. The product should frame it as “AI-assisted data quality check” or “AI intake triage”.
- Latency making imports feel worse. The triage should be optional/async-feeling and never block deterministic review.
- Storing unsanitized samples in `configJson`. Only sanitized summaries and mapping decisions should be stored.
- Schema drift in `configJson`. Use versioned shapes from the first implementation.
- LLM fallback copy feeling like a failure. The deterministic path should feel intentionally reliable, not second-class.

### P3 Risks

- UI density. Imports already has review, decision support and mapping surfaces; the triage panel must be compact.
- Cost creep. Keep max tokens low and payload small.
- QA fragility. Tests must assert no full CSV/raw PII gets sent to fetch.

## 11. Implementation Plan

### Step 1 — Define types and deterministic quality payload

Create typed shapes for:

- `RevoryCsvIntakeColumnProfile`
- `RevoryCsvIntakeDeterministicQualityCheck`
- `RevoryAiCsvIntakeTriage`
- `RevoryCsvIntakeTriageState`

Build a deterministic payload from existing CSV text and preview:

- headers;
- row counts;
- missing required fields;
- identity path;
- duplicate headers/targets;
- field coverage;
- value-shape profiles;
- deterministic quality flags.

### Step 2 — Build sanitization helpers

Create helpers that convert raw values into safe shapes:

- `blank`
- `email_like`
- `phone_like`
- `date_like`
- `currency_like`
- `numeric_like`
- `status_like`
- `text_present`
- `long_text_present`
- `unknown`

Never pass raw names, emails, phones, notes or full rows to AI.

### Step 3 — Add bounded AI triage helper

Create `request-ai-csv-intake-triage.ts` using `requestBoundedStructuredOutput`.

Strict output should include:

- `triageStatus`
- `confidenceBand`
- `summary`
- `qualityFlags`
- `mappingRisks`
- `recommendedNextStep`
- `humanReviewRequired`

Keep output concise and display-safe.

### Step 4 — Add server action for triage only

Add a server action that:

- requires app context;
- checks activation;
- accepts sanitized payload;
- calls AI helper;
- falls back to deterministic quality check;
- returns a typed result;
- writes nothing;
- imports nothing;
- creates no leaks.

### Step 5 — Render compact triage panel

Add `CsvIntakeTriagePanel` to `CsvUploadCard`.

Show:

- deterministic readiness;
- AI-assisted note when available;
- quality warnings;
- mapping risks;
- final reminder that import requires confirmation.

### Step 6 — Persist sanitized metadata only after confirmed import

If useful, extend `registerCsvUploadMetadata` or `finalizeCsvImport` to persist:

- confirmed mapping summary;
- triage summary;
- input profile hash;
- no raw CSV;
- no raw sample values.

This should use `DataSource.configJson` and should not require a migration.

### Step 7 — Add QA validation

Create `scripts/validate-ai-csv-intake.ts` and `npm run qa:ai-csv-intake`.

Validate:

- no full CSV is sent to OpenAI;
- raw names/emails/phones/notes are redacted or shape-only;
- fallback works with no API key;
- deterministic import still works;
- import cannot happen without final confirmation;
- AI output cannot create `RevenueLeak`;
- no migration was added;
- lint/typecheck/build pass.

## Audit Verdict

Sprint 08 is technically feasible and strategically aligned if scoped as AI-assisted CSV intake triage plus deterministic data-quality check.

Do it, but keep the guardrail sharp: AI explains quality and mapping risk; deterministic services validate and persist. No full CSV to LLM, no leak creation from AI, no automatic import, no new database model unless a later sprint proves a durable mapping entity is needed.
