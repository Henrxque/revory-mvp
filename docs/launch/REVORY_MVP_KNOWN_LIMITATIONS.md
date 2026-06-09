# REVORY MVP Known Limitations

This document should be treated as product-truth guardrail for beta/launch.

REVORY is a premium, self-service Revenue Leak Detector for premium MedSpas. It is not a CRM, inbox, scheduling system, healthcare BI suite, revenue cycle management platform, consulting service, autonomous follow-up engine, clinical tool or accounting system.

## Current MVP Limitations

### 1. Payments Files Are Not Supported

Payments-like CSV files can be profiled/classified as unsupported, but they are not imported or persisted in MVP.

What to say:

- "REVORY can recognize that this looks like a payments file, but payments import is not available in this version."

Do not say:

- "REVORY analyzes payments."
- "REVORY reconciles revenue."
- "REVORY detects all payment leaks."

### 2. Leads Classification Exists, But Lead Import Persistence Is Not Yet Supported

Lead-shaped CSV files can be classified/profiled, but lead import persistence is not currently supported.

What to say:

- "Lead-shaped files can be profiled, but lead import is not available in this version."

Do not say:

- "Upload all leads."
- "REVORY manages lead follow-up."
- "REVORY replaces lead CRM workflows."

### 3. Non-Comma Delimiters Are Profiled, But Import Requires Comma-Separated CSV

REVORY can detect non-comma file structure, but the current import flow requires comma-separated CSV.

What to say:

- "REVORY detected this file structure, but current import requires comma-separated CSV."

Do not say:

- "REVORY imports semicolon, tab and pipe files."

### 4. Multiline Quoted CSV Fields May Require Re-Export

CSV files with multiline quoted cells may need to be re-exported before import.

What to say:

- "If the CSV has multiline quoted cells, re-export it as a cleaner comma-separated CSV before import."

Do not say:

- "REVORY supports every CSV edge case."

### 5. AI CSV Mapping Is Advisory And Requires Review

AI-assisted CSV mapping suggests dataset type and column mapping. It does not import automatically, create leaks, calculate confirmed losses or override deterministic validation.

What to say:

- "AI-assisted mapping is a suggestion. You review the mapping before import."

Do not say:

- "AI detects and imports everything automatically."
- "AI detected leaks from your file."

### 6. Revenue At Risk Is Estimated, Not Confirmed Accounting Loss

Estimated revenue at risk is based on imported or connected structured data. It is not a confirmed accounting loss.

What to say:

- "This is estimated revenue at risk from imported appointment evidence."

Do not say:

- "This is confirmed lost revenue."
- "REVORY recovered this revenue."
- "REVORY generated this revenue."

### 7. No Connectors In MVP

The MVP is CSV-first. Native connectors are not part of the launch scope.

What to say:

- "REVORY starts with structured CSV import."

Do not say:

- "Connect all your systems."
- "REVORY integrates with every scheduler/CRM."

### 8. No Automatic Follow-Up / CRM / Inbox

REVORY does not run automatic follow-up, manage threads, replace CRM, or become an inbox.

What to say:

- "REVORY identifies revenue-risk evidence and bounded next actions."

Do not say:

- "REVORY follows up for you."
- "REVORY manages your leads."
- "REVORY is your sales inbox."

### 9. No Provider Utilization / Treatment Gaps Yet

The current MVP does not deeply analyze provider utilization, treatment plan gaps, incomplete treatment journeys or ticket by professional as full product surfaces.

What to say:

- "Launch V1 focuses on no-shows, unrecovered cancellations, missing contact risks, blocked booking path risks and stale data quality signals."

Do not say:

- "REVORY analyzes every provider and treatment gap."

### 10. Real Provider AI Smoke Test Required Before Production If Not Already Done

If AI CSV assistance is enabled in production, a real-provider smoke test must pass with synthetic data before launch.

Recommended command:

```powershell
npm run smoke:ai-csv-provider
```

If it does not pass:

- keep deterministic fallback enabled;
- avoid claiming production AI readiness;
- do not use real patient/client data for the smoke test.

## What Codex Could Not Verify

- Live Stripe checkout, webhook and portal.
- Production auth callbacks.
- Production email delivery.
- Production password reset deliverability.
- Real customer CSV variations outside the repo fixtures.
- Real OpenAI/LLM provider success if credentials are missing or provider times out.
- Legal sufficiency of Privacy/Terms.
- Buyer comprehension in a real sales environment.

## What Henrique Must Verify Manually

- Production environment variables.
- Production database migration.
- Stripe product/price IDs for Basic and Growth.
- Stripe checkout success/cancel return.
- Stripe webhook updates workspace billing state.
- Customer portal access.
- Google OAuth production callback.
- Email/password login on production.
- Forgot/reset password email delivery.
- Real-provider AI CSV smoke test with synthetic data.
- One or two realistic customer-shaped CSVs.
- Founder demo script.
- First customer onboarding checklist.

## Launch Blockers

These block paid beta if unresolved:

- Production database is not migrated.
- Production auth does not work.
- Password reset email does not send.
- Stripe checkout does not work.
- Stripe webhook does not update billing state.
- Pricing CTAs point to wrong plans/prices.
- AI CSV is marketed as production-ready while real-provider smoke has not passed.
- Import flow fails on a realistic appointment CSV.
- Run leak read fails after import.
- Dashboard does not show either estimated revenue at risk or an honest no-risk/thin-data state.

## Nice-To-Have After Launch

- Multiline quoted CSV support.
- Non-comma delimiter import support.
- Lead import persistence if strategically justified.
- Payments import only if the product intentionally expands toward revenue reconciliation.
- Provider utilization and treatment gap leak types.
- Native connectors.
- Improved first-customer sample CSV guide.
- Founder demo workspace with stable fixture data.
- Post-launch technical rename pass for proof-era internal naming.

## Customer-Facing Limitation Copy

Short version:

> REVORY starts with structured appointment and client CSV data. It estimates revenue at risk from supported evidence such as no-shows, unrecovered cancellations, missing contact risk, blocked booking path risk and stale data. It does not confirm accounting loss, run follow-up, replace your CRM/inbox, import payments files or connect to every system in MVP.

Use this language when a buyer asks what REVORY does not do yet.
