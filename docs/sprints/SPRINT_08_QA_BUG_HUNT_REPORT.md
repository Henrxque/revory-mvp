# Sprint 08 - AI CSV Intake + Data Quality Check QA Bug Hunt

## Summary

Sprint 08 is approved with minor reservations.

The implementation preserves the deterministic import path, keeps AI advisory, requires user review before persistence, and does not create `RevenueLeak` rows or alter the leak engine. The provider payload is bounded and sanitized: it contains column metadata, inferred types, fill rates, deterministic suggestions, and up to 10 sample rows converted into non-identifying value shapes.

No critical or medium product bug was found. One QA harness race was found during the clean browser rerun and fixed in `scripts/run-clean-rerun.mjs`. The rerun then passed end to end.

## Scope Reviewed

- deterministic CSV profiling and delimiter detection;
- appointment, client, lead, payment-like and unknown dataset classification;
- deterministic column mapping fallback;
- data-quality state, missing fields and supported leak preview;
- bounded AI request and strict response parsing;
- invalid response and disabled-AI fallback behavior;
- mapping review and confirmation gates;
- saved mapping reuse;
- import persistence boundaries;
- existing appointment and client import regression;
- dashboard, Revenue Leaks Page, Daily Leak Brief and Executive Revenue Leak Summary build compatibility;
- schema, migrations, environment and database readiness;
- product positioning and Sprint 08 scope discipline.

## Commands Run

| Command | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npm run db:validate` | Passed |
| `npm run lint` | Passed with zero warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run env:check` | Passed; database reachable and no pending migrations |
| `npm run qa:revenue-leaks` | Passed |
| `npm run qa:revenue-leak-read` | Passed |
| `npm run qa:revenue-leaks-page` | Passed |
| `npm run qa:daily-leak-brief` | Passed |
| `npm run qa:executive-revenue-leak-summary` | Passed |
| `npm run qa:ai-csv-intake` | Passed |
| `npm run qa:clean-rerun` | Passed after QA harness race fix |
| `git diff --check` | Passed; line-ending notices only |

The Node QA scripts emitted the existing experimental loader warning. It did not affect execution.

## Checklist Results

1. CSV profiling: passed.
2. Dataset type detection: passed for `APPOINTMENTS`, `CLIENTS`, `LEADS`, `PAYMENTS_UNSUPPORTED` and `UNKNOWN`.
3. Deterministic fallback: passed with AI disabled and with invalid AI JSON.
4. Limited AI input: passed.
5. Full CSV exclusion: passed; the provider request contained neither the full fixture nor tested name, email, phone or note values.
6. Strict JSON or safe fallback: passed.
7. Review before import: passed in client flow and server persistence guard.
8. Supported leak preview: passed and remains field-coverage guidance, not detection output.
9. Missing fields: passed.
10. Data Quality Check: passed with ready, review, blocked and unsupported semantics.
11. AI intake creates no `RevenueLeak`: passed by database row-count assertion.
12. Leak engine unchanged: passed by scope review.
13. No AI dashboard insight: passed.
14. No chatbot: passed.
15. No connector: passed.
16. No Sprint 08 migration: passed.
17. Existing imports: passed for appointment and client smoke and six-month fixtures.
18. Existing leak surfaces: passed lint, typecheck, build and dedicated QA suites.

## Bugs Found

### Critical

None.

### Medium

None.

### Small

#### Clean rerun could select a file before React hydration

- Area: `scripts/run-clean-rerun.mjs`
- Impact: the QA walkthrough could time out before opening the second CSV review even though the product import worked.
- Cause: Playwright could set the file on a server-rendered input before its client `change` handler was hydrated after a fast route transition.
- Fix: the harness now waits for the selected filename, retries the file selection once when necessary, scopes actions to the correct import card and uses an explicit review-button timeout.
- Result: the full rerun passed and produced evidence through onboarding, appointment import, client import and final dashboard states.

#### Import completion copy still uses legacy "booked visibility" language

- Area: `src/app/(app)/app/imports/actions.ts`
- Impact: low. The behavior is correct, but the success/error wording is narrower and more Seller-era than the current revenue-leak positioning.
- Recommendation: replace this wording in a later copy-tightening pass with "appointment evidence" or "clinic data visibility." It is not a Sprint 08 functional blocker.

## Privacy Review

The AI provider receives:

- up to 40 column names;
- up to 10 sanitized sample rows;
- inferred field types;
- deterministic targets and confidence;
- fill-rate percentages;
- delimiter, encoding and row count.

Raw names, emails, phones and notes are converted to labels such as `redacted_text`, `email_like` and `phone_like`. Long/default text values become shape labels rather than raw content.

The authenticated server action receives the selected file because the existing import path already requires server-side file validation. The full CSV is not forwarded to the AI provider.

Saved mapping metadata stores normalized headers and mapping decisions in `DataSource.configJson`. It does not store sample rows or full CSV content.

## Product Truth and Scope Discipline

- AI suggests; it does not import.
- User confirmation remains mandatory.
- Deterministic validation can override or constrain AI output.
- AI cannot create leak rows or calculate revenue.
- Supported leak preview describes field support only.
- Payments and unknown datasets remain blocked honestly.
- Leads can be classified but are not presented as a completed persistence flow.
- No chatbot, connector, background job, dashboard AI insight, migration or new leak type was added.

This remains aligned with the narrow Revenue Leak Detector product position.

## Fallback and Regression Results

The AI-disabled browser rerun validated the real deterministic fallback path. It completed:

- account/workspace setup;
- activation;
- appointment smoke import;
- client smoke import;
- six-month appointment import;
- six-month client import;
- dashboard rendering with persisted support data.

Evidence is stored under `.tmp/manual-audit/rerun`, with final verification in `rerun-results.json`.

## Remaining Risks

1. Real provider behavior was not exercised with a paid production request. The strict schema path was tested with a mocked provider, which is the correct safe QA approach, but launch validation still needs configured credentials.
2. The existing line-oriented parser does not support multiline quoted CSV fields.
3. Non-comma delimiters are detected for triage but deliberately blocked for import until the file is re-exported as comma-separated CSV.
4. AI triage receives source column names. This is appropriate for mapping, but clinics should still avoid placing patient data directly in header names.
5. Saved mappings require an exact normalized header signature. This is conservative and safe, but renamed columns require a fresh review.

None of these risks justify expanding Sprint 08 into connectors, generalized ingestion or a larger AI system.

## Recommendation

**PASS WITH MINOR RESERVATIONS**

Sprint 08 is functionally sound, privacy-bounded and honest about its capabilities. It can close without additional feature work. Before production launch, configure and smoke-test the real model provider once with a synthetic CSV, then retain deterministic fallback as the default safety path.
