# Sprint 01 Trust Surfaces Repositioning Report

## Summary

This pass updated trust-sensitive surfaces so auth, password reset, transactional email, Privacy and Terms no longer describe the product as `REVORY Seller` or booking acceleration software.

The work was copy/positioning only. Auth redirects, session handling, password reset token logic, transactional email delivery configuration and billing/legal flows were not changed.

## Files changed

- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `components/auth/AuthOptionsPanel.tsx`
- `services/email/transactional-email.ts`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`

## Logic untouched confirmation

- No auth provider logic was changed.
- No password reset token creation, validation, expiry or persistence logic was changed.
- No email delivery configuration was changed.
- No billing flow, checkout, portal or subscription logic was changed.
- No legal route structure was changed.

## Legal and trust copy updated

- `REVORY Seller` was changed to `REVORY` in auth, password reset and transactional email surfaces.
- `Seller path` and `Seller setup flow` were changed to `REVORY workspace` / `REVORY workspace setup`.
- Auth copy now frames the product as a secure workspace for a revenue leak read, not a booking workflow.
- Privacy copy now says structured appointment, client and import data may be processed for:
  - revenue leak reads
  - estimated revenue at risk
  - data quality checks
  - bounded AI intake, triage and explanation support
  - executive summaries
- Terms copy now frames REVORY as narrow revenue leak detection software for premium MedSpas based on structured clinic data.
- Terms copy explicitly says REVORY is not:
  - CRM
  - inbox
  - scheduling system
  - healthcare BI suite
  - revenue cycle management platform
  - clinical or diagnostic software
  - managed consulting service
- Terms copy now includes the honesty line: revenue at risk is an estimate based on imported or connected data, not a confirmed accounting loss.

## Remaining Seller references and why

- No `REVORY Seller`, `Seller path`, `Seller setup`, `booking acceleration` or `booked proof` references remain in the scoped trust/auth/legal/email files after this pass.
- Remaining `REVORY Seller` / `booked proof` references exist outside this step in historical docs and deeper in-app implementation areas such as onboarding, daily brief, decision support, billing labels and project documentation.
- Those were intentionally not changed here because this step was limited to trust surfaces and did not include the full in-app revenue leak migration.

## Risks avoided

- Avoided describing REVORY as a CRM, inbox, BI suite, scheduling system, RCM tool, diagnostic tool or consulting service.
- Avoided claiming confirmed lost revenue.
- Avoided implying guaranteed recovery, generated revenue or accounting-grade attribution.
- Avoided implying a new leak engine, model or new AI intake feature was implemented in this copy-only step.

## Validation

- Scoped trust/auth/legal/email copy scan found no remaining `REVORY Seller`, `Seller path`, `Seller setup`, `booking acceleration` or `booked proof` references.
- The only scoped match for `managed consulting` is in Terms as an explicit negative claim: REVORY is not a managed consulting service.
- `npm run lint` passed.
- `npm run typecheck` passed.

## Suggested next execution order

1. Reposition app shell, onboarding and activation copy.
2. Reposition Daily Brief, proof summary and dashboard reads around leak/risk language.
3. Reposition decision-support and LLM prompts so the backend guidance no longer talks as Seller.
4. Only after language alignment, implement leak-specific models, data reads or AI CSV triage in a separate scoped step.
