# Sprint 09 - Launch Readiness Report

## Summary

Pricing, plan copy, launch-facing billing gates and import copy were tightened to match the current REVORY product truth:

- REVORY is a Revenue Leak Detector for premium MedSpas.
- Basic is a public, lower-priced entry plan with an import-first in-app leak read.
- Growth is the main complete Launch V1 plan.
- Premium is a future tier and is not sold now.
- AI CSV review is bounded, reviewed by the user and not a source of revenue truth.
- No Stripe price IDs, technical billing keys, checkout routes or subscription behavior were renamed.

The pass focused on making promises match what the product actually supports rather than inventing artificial entitlements or parser scope.

## Files Changed

- `src/app/start/page.tsx`
- `services/billing/workspace-billing.ts`
- `src/content/revory-landing-reference.html`
- `src/app/(app)/app/imports/actions.ts`
- `components/imports/AiCsvTriagePanel.tsx`
- `components/imports/DataQualityCheckCard.tsx`
- `services/imports/csv-data-quality-check.ts`
- `services/imports/validate-csv-structure.ts`
- `scripts/smoke-ai-csv-provider.ts`
- `package.json`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`

## Import And AI CSV Intake Copy Tightening

Sprint 08 follow-up copy was tightened without changing import persistence, parser behavior, AI payload size, schema or leak creation.

## Privacy, Terms And Product Truth Tightening

Launch legal/trust copy was tightened without adding broad legal claims or changing product behavior.

### Privacy

Privacy now states that AI-assisted CSV review sends only a bounded, sanitized profile such as column names, inferred field types, fill-rate signals and limited sample shapes.

It also states:

- the full CSV file is not sent to the AI provider;
- AI review does not import rows;
- AI review does not create revenue leaks;
- AI review does not calculate confirmed revenue loss.

### Terms

Terms now make the product truth explicit:

- revenue at risk is an estimate, not confirmed accounting loss;
- operational and data-quality risks are not counted as financial loss unless deterministic financial evidence supports the estimate;
- AI-assisted CSV review is advisory and requires user review;
- AI does not override deterministic validation;
- unsupported datasets, including payments and lead-shaped files, may be profiled but are not imported unless the current product flow explicitly supports them;
- REVORY is not medical, clinical, legal, accounting or billing advice.

The existing "not CRM, inbox, scheduling system, healthcare BI, revenue cycle management, clinical/diagnostic software or managed consulting" positioning remains intact.

### Real Provider Smoke Test

The launch checklist now has a safe optional smoke command for the real provider:

- `npm run smoke:ai-csv-provider`

The command uses synthetic appointment CSV data only. It does not use real clinic, client or patient data; does not persist database rows; does not create `RevenueLeak` rows; and does not run in normal CI.

If `OPENAI_API_KEY` is missing or `REVORY_LLM_ENABLED=false`, the command prints `SKIPPED` and exits successfully. If credentials are configured, it verifies that the provider returns strict structured output, keeps `reviewRequired=true`, uses a bounded payload, and still falls back safely on invalid provider output.

Henrique should run this before production after setting:

- `OPENAI_API_KEY`;
- `REVORY_LLM_MODEL`;
- `REVORY_LLM_TIMEOUT_MS`, if different from the default;
- `REVORY_LLM_ENABLED=true` or unset.

Do not claim production AI readiness until this command returns `PASSED` with the real configured provider.

Current local result with provider configured:

- Model: `gpt-4o-mini`.
- Payload size observed: about 9.4 KB.
- Result: `FAILED`.
- Reason: configured provider timed out and REVORY used deterministic fallback.

This is safe product behavior, but it is not a passed production AI smoke test.

### Multiline Quoted CSV Limitation

Parser support was not expanded in this pass.

User-facing validation now states:

- `CSV files with multiline quoted cells may need to be re-exported before import.`

This keeps the limitation honest without pretending the current parser supports every CSV export shape.

### Non-Comma Delimiters

Delimiter detection remains advisory. Import still requires comma-separated CSV.

The triage warning now states:

- `REVORY detected this file structure, but current import requires comma-separated CSV. Re-export this file with commas before importing.`

This avoids implying semicolon, tab or pipe files can be imported directly.

### LEADS Classification

Lead-shaped files can still be profiled, but they are not importable in this version.

Visible and service-level copy now states:

- `Lead-shaped files can be profiled, but lead import is not available in this version.`
- `Current import persists appointments and clients only.`

No lead import CTA or persistence was added.

### Legacy Import Copy Removed

User-facing import execution copy no longer says `booked visibility`.

It now uses:

- `clinic data visibility`;
- `appointment evidence`;
- `revenue risk read`;
- `data quality`.

## Pricing And Catalog Copy Updated

### Basic

Basic is now communicated as an entry plan for the import-first in-app leak read.

It includes:

- Dashboard leak read.
- Revenue Leaks Page.
- Daily Leak Brief.
- AI-assisted CSV review and Data Quality Check.

It explicitly does not include:

- Manual Quick Add.
- Executive Revenue Leak Summary copy/share/print.

This protects Growth without making Basic feel fake or unusable.

### Growth

Growth is now communicated as the complete self-service Launch V1 package.

It includes:

- Dashboard leak read.
- Revenue Leaks Page.
- AI-assisted CSV review and Data Quality Check.
- Daily Leak Brief.
- Bounded action guidance for operational booking risks.
- Manual Quick Add for one-off evidence.
- Executive Revenue Leak Summary with copy, share and print.

Growth remains the primary plan in `/start` and the strongest commercial recommendation.

### Premium

Premium remains future-only.

It does not open checkout, does not create a manual-fit motion and does not imply enterprise/BI/connector scope.

## Gate Review

### Manual Quick Add

`MANUAL_LEAD_QUICK_ADD` remains Growth-only.

This matches the updated plan copy: Basic does not get manual one-off evidence add; Growth does.

### Executive Summary Copy/Share/Print

`EXECUTIVE_PROOF_SHARE` remains Growth-only.

The key name is legacy technical debt from the former proof-era implementation, but the behavior is correct for the current product: Basic sees the in-app leak read, while Growth unlocks executive copy/share/print affordances.

### Run Leak Read

Run Leak Read remains available to active workspaces after setup rather than being tier-gated between Basic and Growth.

This is intentional: Basic is still a real entry plan for in-app revenue leak detection. Restricting the manual sync action would make Basic too weak and create a misleading "plan exists but cannot really use the product" experience.

### Imports

Imports remain active-plan/setup gated. Manual Quick Add stays Growth-only. AI-assisted CSV review and Data Quality Check are now reflected in both Basic and Growth copy.

## Mismatches Fixed

- Removed vague "limited/full leak read" language that implied unimplemented quota or read-depth differences.
- Reframed Basic around the real limitation: no Manual Quick Add and no Executive Summary copy/share/print.
- Reframed Growth around the real complete Launch V1 package.
- Replaced "AI CSV Intake" style wording with "AI-assisted CSV review and Data Quality Check" to avoid implying automatic import, automatic leak creation or AI-owned revenue truth.
- Preserved Premium as future-only without manual sales burden.
- Replaced visible import execution copy that still framed success as booked visibility.
- Made lead-shaped files explicitly profile-only in Launch V1.
- Made non-comma delimiter handling explicit: detected, but not importable until re-exported as comma-separated CSV.
- Made the multiline quoted CSV limitation explicit instead of implying broad CSV parser support.
- Added optional real-provider AI CSV smoke script using synthetic CSV/profile data only.
- Tightened AI CSV triage runtime payload by reducing sample rows from 10 to 5 while keeping review and fallback behavior unchanged.
- Tightened Privacy and Terms to clarify AI CSV boundaries, estimated revenue-at-risk semantics, unsupported datasets and deterministic validation authority.
- Added import UI copy that the full CSV is not sent to the AI provider.

## Overpromises Avoided

The updated copy avoids:

- guaranteed revenue recovery;
- confirmed lost revenue;
- CRM positioning;
- inbox positioning;
- BI suite positioning;
- connectors;
- automated follow-up;
- AI sales-agent framing;
- claims that REVORY generated or recovered revenue;
- claims that production AI has been smoke-tested;
- claims that lead import exists;
- claims that semicolon, tab or pipe import is supported.
- claims that AI calculates confirmed revenue loss;
- claims that AI overrides deterministic validation;
- medical, clinical, legal, accounting or billing advice positioning.

## Technical Debt Kept Intentionally

- `EXECUTIVE_PROOF_SHARE` remains as a technical billing feature key. Renaming it now would create avoidable billing/gate risk before launch.
- Proof-era component names still exist in the codebase. They are implementation substrate, not current public positioning.
- The CSV parser still does not support multiline quoted cells. The launch correction is honest copy, not parser expansion.
- Non-comma delimiters are still detected but blocked for import.
- Lead-shaped files are classified/profiled but not persisted.

## Validation

Commands run:

- `npm run lint` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run qa:ai-csv-intake` - passed with mocked provider and deterministic fallback coverage.
- `npm run smoke:ai-csv-provider` with `REVORY_LLM_ENABLED=false` - skipped safely.
- `npm run smoke:ai-csv-provider` with local provider credentials - failed safely with deterministic fallback due to provider timeout.

Additional pricing/gate term scan found no new launch-blocking oversell in the touched surfaces. Defensive mentions of CRM/inbox/BI remain acceptable because they clarify what REVORY is not.

Additional import copy scan found no remaining user-facing `booked visibility`, `booking visibility`, `booking proof`, `booked proof`, `Seller`, `booking acceleration` or `revenue generated` language in the imports surfaces checked.

## Remaining Launch Risks

- Production Stripe smoke is still required for Basic checkout, Growth checkout, success return, cancel return, webhook sync and customer portal.
- Production auth/email credentials still need real-domain validation.
- Production AI CSV smoke is still required with the real configured provider before claiming production AI readiness.
- Current real-provider smoke has not passed locally because the configured provider timed out.
- Basic checkout depends on `STRIPE_BASIC_PRICE_ID`; Growth checkout depends on `STRIPE_GROWTH_PRICE_ID`.
- `isStripeBillingConfigured()` still treats Growth as the primary readiness signal, which matches Growth-first strategy but does not prove Basic checkout readiness.

## Final Status

Pass for pricing, plan copy, feature-gate and import-copy launch hardening.

The product is more honest commercially after this pass: Basic is useful but clearly incomplete, Growth is the full MVP package, Premium remains future-only, and AI CSV Intake no longer implies unsupported parser breadth, lead import or production AI validation. The remaining blockers are production credential and smoke-test issues, not product-copy or gate-integrity issues from this pass.

## Launch Readiness QA Script

### What was added

- Added `npm run qa:launch-readiness` as the official browser-level MVP launch QA command.
- Added `scripts/validate-launch-readiness.ts` as a thin entrypoint that documents the local server requirement and delegates to the hardened clean rerun.
- Tightened `scripts/run-clean-rerun.mjs` so the clean rerun now validates the launch journey beyond import success.

### Local server requirement

`npm run qa:launch-readiness` requires a running local app server at `NEXT_PUBLIC_APP_URL` or `http://localhost:3000`.

For non-AI launch QA, run the local server with:

```powershell
$env:REVORY_LLM_ENABLED="false"; npm run dev
```

Use `npm run smoke:ai-csv-provider` separately when explicitly validating the real AI CSV provider with synthetic data.

### Coverage added

- Authenticated app context creation through the existing clean rerun cookie path.
- `/start` workspace creation and authenticated redirect behavior.
- Setup/activation completion.
- Appointment CSV import.
- Client CSV import.
- AI CSV triage or deterministic fallback visibility.
- User mapping review requirement before import.
- Manual `Run leak read` action.
- Dashboard hero with `Estimated Revenue at Risk This Month`.
- Dashboard honesty copy: estimate, not confirmed accounting loss.
- Revenue Leaks Page route and leak cards.
- Daily Leak Brief visibility.
- Executive Revenue Leak Summary Growth gate with `Copy summary` and `Print or save PDF`.
- Privacy and Terms route sanity.
- Persisted RevenueLeak creation after manual read.
- Static contracts for bounded AI CSV triage and review-required import.

### Latest launch QA result

`npm run qa:launch-readiness` passed against the local dev server on `http://localhost:3000`.

Evidence was saved to:

```text
C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun
```

The latest run verified:

- Workspace: `LUMINA AESTHETICS`.
- Plan: `GROWTH`.
- Billing status: `ACTIVE`.
- Clients imported: `200`.
- Appointment rows imported from final fixture: `72`.
- Client rows imported from final fixture: `196`.
- Persisted RevenueLeak rows after manual read: `14`.
- Active financial RevenueLeak rows after manual read: `14`.

### Route and surface screenshots

The rerun generated screenshots for setup, imports, dashboard, Revenue Leaks, Executive Summary gate, Privacy, Terms and final `/start` behavior in:

```text
C:\Users\hriqu\Documents\revory-mvp\.tmp\manual-audit\rerun
```

### Remaining QA limitations

- This script does not prove production Stripe checkout/webhooks/portal. That still requires real Stripe credentials and production-mode smoke.
- This script does not prove production email delivery or production auth domain behavior.
- This script intentionally does not call the real AI provider when running non-AI launch QA. Real-provider validation remains covered by `npm run smoke:ai-csv-provider`.
- The browser QA can verify the visible AI triage/fallback surface and review-required flow, but it cannot intercept server-side provider calls from an already-running app server. The server must be launched with `REVORY_LLM_ENABLED=false` when the goal is no real AI call.

### Final QA status

Pass for MVP self-service launch journey coverage.

The new launch QA command is not a replacement for production credential smoke tests, but it now catches the main launch-breaking risks: broken routes, broken setup/import flow, missing review gate, missing leak sync, empty dashboard after data import, missing Revenue Leaks surface, missing Daily Brief, and broken Growth executive copy/print affordance.
