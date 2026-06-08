# Sprint 08 — Deterministic CSV Intake Foundation

## Summary

Implemented the deterministic foundation that must run before any AI CSV triage.

The new services can:

- infer CSV delimiter;
- read columns and a bounded sample using the existing CSV line parser;
- infer basic field types;
- suggest canonical column mappings from aliases;
- classify the likely dataset type;
- calculate mapping confidence;
- identify missing fields;
- run a deterministic data-quality check;
- preview which V1 leak signals the available fields may support.

No AI call, database write, migration, import persistence or `RevenueLeak` creation was added.

## Files Created

- `services/imports/csv-dataset-type.ts`
- `services/imports/csv-column-mapping.ts`
- `services/imports/csv-data-quality-check.ts`
- `services/imports/csv-mapping-fallback.ts`
- `docs/sprints/SPRINT_08_AI_CSV_INTAKE_REPORT.md`

## Deterministic Profiling

`profileCsvDataset` now returns:

- inferred delimiter;
- detected columns;
- total non-empty data row count;
- up to 25 local sample rows.

Supported delimiters:

- comma;
- semicolon;
- tab;
- pipe.

Delimiter detection ignores delimiter characters inside quoted values.

After delimiter normalization, parsing reuses the existing `parseCsvLine` implementation.

The local sample rows are only a deterministic profiling input. They are not approved as a future LLM payload. The later AI step must build a separate sanitized, shape-only payload without raw names, emails, phones or notes.

## Field Type Inference

Implemented field types:

- `date-like`
- `money-like`
- `email-like`
- `phone-like`
- `status-like`
- `text`

Inference uses:

- sampled value shapes;
- header hints;
- conservative ratio thresholds.

It does not calculate revenue, interpret clinical data or treat a numeric-looking value as financial truth.

## Dataset Type Classification

Implemented dataset types:

- `APPOINTMENTS`
- `CLIENTS`
- `LEADS`
- `PAYMENTS_UNSUPPORTED`
- `UNKNOWN`

Classification combines:

- strong canonical fields;
- supporting fields;
- header terms;
- score separation from the second-best candidate.

Behavior:

- `APPOINTMENTS` and `CLIENTS` are recognized as supported by the current import product.
- `LEADS` can be recognized and profiled, but remains unsupported by the current persistence flow.
- `PAYMENTS_UNSUPPORTED` is recognized explicitly and blocked.
- ambiguous or weak files become `UNKNOWN`.

## Column Mapping

Implemented canonical mapping fields for appointment, client, lead and payment classification.

Required examples pass:

- `Appt Date` -> `scheduledAt`
- `Status` -> `appointmentStatus`
- `Client Full Name` -> `clientName`
- `Mobile` -> `clientPhone`
- `Price` -> `estimatedRevenue`
- `Provider` -> `providerName`
- `Service` -> `serviceName`

Mapping uses:

- exact canonical match;
- exact alias match;
- inclusive alias match;
- shared-token match;
- inferred field type as a small confidence modifier;
- one source header per canonical target;
- confidence floor before accepting a suggestion.

Each suggestion returns:

- source header;
- canonical target field;
- inferred type;
- reason;
- numeric confidence;
- `HIGH`, `MEDIUM` or `LOW` confidence label.

The aggregate mapping confidence is a 0–100 score.

## Data Quality Check

Implemented states:

- `READY`
- `REVIEW_REQUIRED`
- `BLOCKED`
- `UNSUPPORTED`

The check considers:

- classified dataset type;
- required mapped fields;
- identity path;
- mapping confidence;
- unmapped columns;
- sampled type mismatches;
- current import support.

Current required checks preserve product truth:

- appointments require appointment ID, client name, schedule and appointment status;
- appointments require at least one client identity path;
- clients require client name and at least one identity path;
- payments are unsupported;
- leads are profiled but not presented as currently importable.

## Supported Leak Preview

The preview is field-coverage guidance only. It does not run detectors or create leaks.

For appointment datasets it can preview:

- `NO_SHOW_REVENUE`
- `CANCELED_NOT_RECOVERED`
- `STALE_BOOKED_PROOF`

Direct `estimatedRevenue` supports stronger financial confidence. Without it, the preview explains that later detection may rely on workspace average value rather than treating value as known.

For lead-shaped datasets it can preview the field coverage related to:

- `MISSING_CONTACT`
- `BOOKING_PATH_BLOCKED`

These remain marked as lower-confidence/unsupported operational previews because LEADS persistence is not wired in the current import flow.

Operational and data-quality previews do not receive financial value.

## Main API

The orchestration entry point is:

```ts
buildDeterministicCsvMappingFallback(csvText)
```

It returns:

- `profile`
- `columnProfiles`
- `mappingSuggestions`
- `mappingConfidence`
- `classification`
- `dataQuality`

This function is pure and performs no network or database operations.

## Validation

Commands run:

- `npm run lint`
- `npm run typecheck`

Both passed.

Manual deterministic validation covered:

- semicolon-delimited appointment file;
- client file;
- lead file;
- payment file;
- unknown file;
- all requested mapping examples.

Results:

- appointments -> `APPOINTMENTS`, `READY`;
- clients -> `CLIENTS`, `READY`;
- leads -> `LEADS`, `UNSUPPORTED`;
- payments -> `PAYMENTS_UNSUPPORTED`, `UNSUPPORTED`;
- weak generic file -> `UNKNOWN`, `BLOCKED`.

## Scope Intentionally Not Implemented

- AI/LLM request;
- sanitized AI payload;
- import UI integration;
- mapping confirmation changes;
- saved workspace mapping;
- `DataSource.configJson` changes;
- LEADS persistence;
- payments import;
- status normalization expansion;
- automatic import;
- leak creation;
- financial estimation;
- migration.

## Risks and Limitations

- Dataset classification is heuristic and must remain reviewable.
- Generic headers such as `Status`, `Date` or `Amount` can be ambiguous without supporting columns.
- The parser still follows the existing line-oriented CSV behavior and does not add multiline quoted-field support.
- Sample rows contain local raw values. They must never be passed directly to the later AI request.
- Mapping confidence measures deterministic header/type fit, not truth or data completeness.
- Leak preview describes field support only; it is not detection output.

## Alignment Verdict

Aligned with REVORY’s narrow MVP.

The implementation reduces future AI dependence instead of expanding it. Deterministic rules remain authoritative, unsupported datasets are blocked honestly, and no capability is presented as an active import or leak result before it exists.

## Bounded AI-Assisted CSV Triage

Implemented:

- `services/imports/ai-csv-triage.ts`

Main entry point:

```ts
requestAiCsvTriage({
  deterministic,
  encoding,
})
```

The service accepts the existing deterministic fallback result. It does not accept or transmit the full CSV.

### AI Input Boundary

The bounded request receives:

- up to 40 column names;
- up to 10 sanitized sample rows;
- inferred field types;
- deterministic mapping suggestions;
- deterministic confidence labels;
- sampled fill-rate statistics;
- delimiter;
- optional encoding;
- row count;
- deterministic dataset classification.

Raw sample values are converted into shape labels:

- `email_like`
- `phone_like`
- `date_like`
- `money_like`
- bounded status token;
- `text_present`
- `long_text_present`
- `redacted_text`
- `blank`

Names, notes, source text, emails and phones are never included as raw values in the LLM context.

### Strict Output

The request uses strict structured output with:

- dynamic mapping properties generated only for the bounded source headers;
- canonical mapping field enums;
- V1 dataset type enums;
- V1 leak type enums;
- bounded warning counts and lengths;
- `reviewRequired` fixed to `true`;
- no additional properties.

Returned contract:

```ts
{
  detectedDatasetType:
    | "APPOINTMENTS"
    | "CLIENTS"
    | "LEADS"
    | "PAYMENTS_UNSUPPORTED"
    | "UNKNOWN";
  probableSourceFormat: string | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  columnMapping: Record<string, string>;
  supportedLeaks: string[];
  missingFields: string[];
  warnings: string[];
  reviewRequired: true;
}
```

### Deterministic Reconciliation

AI output does not silently replace deterministic truth.

Rules:

- deterministic mappings at 90% confidence or higher are preserved;
- invalid or unknown AI mapping fields are rejected;
- high-confidence deterministic dataset classification is preserved on disagreement;
- deterministic missing fields cannot be removed by AI;
- AI-supported leaks are limited to leaks already supported by deterministic field coverage;
- all results require user review;
- the service performs no persistence.

### Safe Fallback

If the provider is disabled, unavailable, times out, returns invalid JSON or fails schema validation:

- deterministic dataset classification remains available;
- deterministic column mapping remains available;
- deterministic data-quality warnings remain available;
- deterministic supported-leak preview remains available;
- the result includes a fallback warning;
- `reviewRequired` remains `true`.

### Runtime

The service reuses:

- `requestBoundedStructuredOutput`;
- configured `REVORY_LLM_MODEL`;
- configured feature flag and API key;
- `store: false`;
- strict JSON schema;
- bounded output tokens.

The generic bounded runtime now supports a per-request timeout ceiling. AI CSV triage uses a 2.5-second ceiling and still respects a lower globally configured timeout.

### Cache Decision

No cache was added.

The existing repository does not have a workspace/file-scoped LLM cache pattern suitable for intake data. Adding one in this step would introduce unnecessary persistence and invalidation complexity. A future cache should use a sanitized profile hash and must never use raw CSV content as the stored key or value.

### Additional Validation

Isolated smoke validation confirmed:

- raw test name was absent from the provider payload;
- raw test email was absent from the provider payload;
- raw test phone was absent from the provider payload;
- raw medical note was absent from the provider payload;
- invalid JSON returned deterministic fallback;
- high-confidence deterministic dataset classification survived deliberate AI disagreement;
- high-confidence deterministic mapping survived deliberate AI disagreement;
- `reviewRequired` remained `true`;
- no database or `RevenueLeak` write occurred.

Final commands:

- `npm run lint` — passed;
- `npm run typecheck` — passed.

## AI-Assisted Mapping Review UI

Implemented the visible review layer on the existing imports flow.

Files created:

- `components/imports/AiCsvTriagePanel.tsx`
- `components/imports/DataQualityCheckCard.tsx`
- `components/imports/CsvMappingReview.tsx`

Files updated:

- `components/imports/CsvUploadCard.tsx`
- `src/app/(app)/app/imports/actions.ts`
- `types/imports.ts`

### Final Flow

1. User selects a CSV using the existing upload control.
2. The existing local deterministic preview appears immediately.
3. One server action runs for that selected file.
4. The action validates auth, activation, extension and file size.
5. Deterministic profiling runs before AI.
6. Bounded AI triage runs using the sanitized profile.
7. The UI shows:
   - detected dataset type;
   - probable source format when available;
   - confidence;
   - deterministic mapping confidence;
   - data-quality score and state;
   - supported leak coverage;
   - missing fields;
   - warnings.
8. Compatible suggestions can refine the existing mapping.
9. The existing mapping review remains the final authority.
10. User can change any mapped field or select `Ignore this column`.
11. The existing final confirmation remains required before persistence.

### Server Action

Added:

```ts
triageCsvFileAction(formData)
```

The action:

- requires authenticated app context;
- requires completed activation;
- accepts only the current CSV and selected import lane;
- performs no database write;
- creates no `RevenueLeak`;
- does not call the leak engine;
- returns a display-safe serializable review state;
- converts canonical suggestions into the existing appointment/client template fields;
- blocks semantic readiness when detected dataset type does not match the selected lane.

### AI Call Frequency

AI triage is triggered only when the user selects a new valid file.

It is not called:

- during render;
- during mapping dropdown changes;
- when opening final confirmation;
- during the final import action.

A request ID prevents a slower response from an older file selection from overwriting the latest file state.

Manual mapping decisions are also protected while triage is pending. If the
user changes or ignores a column before the assisted response returns, the
late suggestion does not overwrite that human decision.

### Fallback Behavior

If AI is disabled, unavailable, invalid or times out:

- the deterministic mapping preview remains visible;
- the user can still adjust or ignore columns;
- the UI labels the review as deterministic fallback;
- import still requires the same final confirmation.

### Product-Truth Guardrails

- High-confidence deterministic mappings remain protected.
- Suggestions do not import automatically.
- Supported leaks are field-coverage guidance, not detected leak rows.
- Missing fields are displayed as confidence limitations.
- LEADS and payments are not presented as currently importable.
- Non-comma delimiters are profiled but explicitly blocked from current persistence, because the existing import parser is still comma-first.
- A mismatched dataset remains blocked in the selected appointment/client lane.

### UI Copy Added

- `Review mapping before importing.`
- `REVORY can detect these leaks from this file.`
- `Missing fields may lower confidence.`
- `AI-assisted mapping is a suggestion, not a final import.`

The leak-detection sentence is shown only when the current dataset/lane is import-supported. Unsupported inputs use narrower potential-coverage language.

### Final Validation

Commands run after UI integration:

- `npm run lint` — passed;
- `npm run typecheck` — passed;
- `npm run build` — passed.

The Browser plugin could not initialize in the current environment, so a visual hands-on browser pass was not completed. Build-time route generation confirmed `/app/imports` compiles and remains available, but responsive visual verification remains a QA follow-up.

## Saved Mapping Reuse

The audit approved a narrow reuse implementation through the existing
`DataSource.configJson`. No migration or new table was needed.

Files added:

- `services/imports/saved-csv-mapping.ts`

Files updated:

- `services/imports/register-csv-upload.ts`
- `src/app/(app)/app/imports/actions.ts`
- `components/imports/CsvUploadCard.tsx`
- `components/imports/AiCsvTriagePanel.tsx`
- `types/imports.ts`

### Storage Boundary

A mapping is saved only after:

- the user confirms the mapping;
- server-side mapping validation passes;
- at least one row imports successfully.

The stored versioned record contains only:

- template key;
- confirmation timestamp;
- normalized header signature;
- normalized source-header-to-target decisions, including ignored columns.

It does not store:

- CSV content;
- sample rows;
- names;
- emails;
- phone numbers;
- notes;
- financial values.

### Reuse Safety

Saved mappings are scoped to the workspace and the existing appointment/client
`DataSource`.

Reuse occurs only when the normalized header set exactly matches the previously
confirmed header signature. Added, removed, duplicated or renamed columns do
not receive the old mapping silently.

When a mapping is reused:

- the UI shows `Using saved mapping`;
- the user can still change or ignore any column;
- final confirmation remains mandatory;
- manual changes made while triage is pending are never overwritten;
- import validation and persistence remain unchanged.

The existing `configJson` update path now preserves previous versioned metadata
instead of replacing it when a new upload is registered.

### Scope Guardrails

- no migration;
- no mapping preset library;
- no cross-workspace reuse;
- no source connector inference;
- no automatic import;
- no leak creation;
- no engine changes.

### Saved Mapping Validation

Commands run after the reuse implementation:

- `npm run lint` - passed;
- `npm run typecheck` - passed;
- `npm run build` - passed.

Repository checks confirmed:

- no Prisma schema change;
- no Sprint 08 migration;
- `/app/imports` remains available in the production build;
- existing import persistence remains behind explicit mapping confirmation.

The server import action now rejects requests without a valid
`mappingDecisionDraft`, including files that already use official REVORY
headers. Confirmation is therefore enforced at the persistence boundary, not
only by the client UI.

## AI CSV Intake QA Coverage

Created:

- `scripts/validate-ai-csv-intake.ts`

Added command:

```bash
npm run qa:ai-csv-intake
```

The validation script covers:

- appointment, client, lead, payment-like and unknown classification;
- deterministic mapping and confidence without AI;
- supported leak preview and missing required fields;
- mocked valid structured AI output;
- invalid AI JSON with deterministic fallback;
- sanitized AI payload without full CSV, names, email, phone or notes;
- mandatory user review;
- no `RevenueLeak` row creation;
- server-side mapping confirmation before import persistence;
- absence of a Sprint 08 migration.

The AI provider is fully mocked through the bounded runtime. The QA command
does not call a real paid model.

### QA Results

Commands run:

- `npm run lint` - passed;
- `npm run typecheck` - passed;
- `npm run build` - passed;
- `npm run qa:ai-csv-intake` - passed.

Observed QA results:

- all five dataset classifications passed;
- deterministic mapping passed with AI disabled and made no provider request;
- valid structured AI output passed through the mocked provider;
- invalid JSON exhausted the bounded retry path and returned deterministic fallback;
- the provider payload contained sanitized shapes instead of the full CSV or raw sensitive sample values;
- supported leaks, missing fields and mapping confidence were returned;
- uncertain/fallback mappings kept `reviewRequired: true`;
- `RevenueLeak` row count was unchanged before and after the QA run;
- import persistence is blocked server-side without a valid confirmation draft;
- no Prisma schema or migration change was introduced.

The command emits the same Node experimental loader warnings as the existing
TypeScript QA scripts. They do not affect the validation result.
