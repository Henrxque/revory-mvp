# REVORY Sprint 0 — Hybrid truth, inventory and gate report

> Status: **PASS for the Sprint 0 truth/inventory gate**. This is not a product-launch approval. Updated 2026-07-12.

## Project identity

- Active product: **REVORY**.
- Category: Revenue Leak Intelligence for High-Ticket Service Businesses.
- Initial sellable path: **Quote Recovery Audit — US$799 one-time**, only after Sprint 5 passes.
- Initial domain: customers, estimates and activities/follow-ups for high-ticket service businesses.
- Historical substrate: discontinued MedSpa REVORY and historical QuoteSignal implementation.
- Canonical authority: [`docs/source-of-truth.md`](../source-of-truth.md).

## Alignment verdict

The repository contains a strong reusable SaaS platform, but the executable product domain is still predominantly MedSpa. Authentication, workspace isolation patterns, Stripe plumbing, email delivery, CSV intake architecture, mapping confirmation, Data Quality patterns, bounded-AI infrastructure, evidence primitives and dashboard composition are reusable. Contractor-native contracts, imports, deterministic Quote Recovery rules and export/report completion are not implemented end to end and must not be sold yet.

## Delivered Sprint 0 artifacts

- This current-state inventory and exit-gate report.
- [`SPRINT_0_PUBLIC_CLAIM_REGISTER.md`](SPRINT_0_PUBLIC_CLAIM_REGISTER.md): public claims, implementation status, owner and release gate.
- [`REVORY_DATA_FLOW_AND_THREAT_MODEL.md`](../security/REVORY_DATA_FLOW_AND_THREAT_MODEL.md): upload, provider, billing, export and storage threat model.
- [`REVORY_REUSE_AND_RESTORE_AUDIT.md`](../REVORY_REUSE_AND_RESTORE_AUDIT.md): keep/restore/adapt/retire register.
- `scripts/validate-sprint-0-product-truth.mjs`: repeatable public-brand and prelaunch-truth guard.

## Capability matrix

| Capability | Executable evidence | Status | Migration decision | Owner | Earliest gate |
|---|---|---|---|---|---|
| Google OAuth and email/password auth | `auth.ts`, auth routes/forms, verification/reset services | Implemented horizontal | Keep | Platform/Auth | Retest every release |
| User sync and workspace creation | `services/auth/sync-user.ts`, `services/workspaces/get-or-create-workspace.ts` | Implemented horizontal | Keep | Platform/Auth | Sprint 1 isolation baseline |
| Workspace-scoped reads/writes | pervasive `workspaceId` filters and app context | Partial; patterns exist, cross-tenant suite incomplete | Keep and harden | Security/Data | Sprint 1 and every vertical slice |
| Stripe checkout, portal and webhooks | billing API routes and Stripe sync services | Implemented plumbing for legacy plan keys | Keep protected; do not reuse old price mapping | Billing | Sprint 5 |
| Transactional email | Resend-backed verification/reset flows | Implemented horizontal | Keep | Platform/Auth | Sprint 5 operational readiness |
| CSV parsing and mapping review | legacy appointment/client parsers, mapping UI and persistence | Implemented for legacy contracts only | Adapt architecture | Data Intake | Sprint 2 |
| Data Quality | structural validation and legacy eligibility/warning patterns | Partial; wrong active domain | Adapt | Data Intake | Sprint 2 |
| Optional AI mapping assistance | bounded sanitized profile, schema, timeout and fallback | Implemented for legacy compatibility | Adapt prompt/contracts; deterministic fallback remains mandatory | AI/Data | Sprint 2 |
| Finding evidence/confidence/severity/fingerprint | revenue-leak services and persistence | Implemented primitives for legacy rules | Adapt primitives, replace rules | Domain Engine | Sprint 3 |
| Contractor customer/estimate/activity contracts | no canonical end-to-end models | Planned | Additive implementation | Domain/Data | Sprint 1 |
| Quote Recovery engine | no tested contractor rules | Planned | Build after contracts/intake | Domain Engine | Sprint 3 |
| Quote Recovery dashboard/opportunities | premium legacy composition exists; contractor read model absent | Partial visual substrate | Adapt | Product UX | Sprint 4 |
| CSV export | no contractor-safe export route | Planned | Build with formula-injection controls | Reporting/Security | Sprint 4 |
| Executive PDF/report | print/read composition exists; contractor report incomplete | Partial substrate | Adapt | Reporting | Sprint 5 |
| US$799 Quote Recovery Audit checkout | target card and preserved billing shell; entitlement not mapped | Planned and visibly gated | Primary launch offer | Billing/Product | Sprint 5 |
| Starter recurring loop | no contractor second-read movement | Planned | Do not sell | Product/Engine | Sprint 6 |
| Jobs/invoices/change orders/costs | absent | Planned | Add after Quote Recovery | Domain/Data | Sprints 7–9 |
| Growth/Pro intelligence | absent | Planned | Do not expose as available | Product | Sprints 10–11 |
| CRM/inbox/dispatch/scheduling/accounting | outside product thesis | Prohibited | Retire/reject | Product | Never |

## Contamination map

### Customer-facing — remediated or explicitly gated

| Surface | Prior contamination | Sprint 0 treatment | Remaining rule |
|---|---|---|---|
| Landing | historical QuoteSignal name and mechanically translated MedSpa copy | public name normalized to REVORY; explicit private-build notice; capability copy framed as in development | No claim becomes sellable until its claim-register gate passes |
| `/start` | legacy plan hierarchy and Stripe prices | US$799 audit made primary; all prices labeled targets; charge CTA remains gated | Never map old price IDs to new offers without evidence and authority |
| Auth | legacy product continuity language | REVORY identity retained; authenticated legacy substrate remains migration-only | Contractor onboarding replaces legacy setup later |
| App shell | clinic/booking navigation | neutral Executive Read, Revenue Leaks, Data Imports and Plans & Billing labels | Internal domain components stay compatibility-only |
| Imports/findings | legacy appointment/client behavior | visible migration-preview framing; no contractor claim | Route remains internal until Sprint 2–4 replacements pass |

### Internal technical debt — intentionally preserved

- Prisma models and enums: `MedSpaProfile`, `Client`, `Appointment`, booking/no-show/cancellation types.
- Legacy services: onboarding, imports, booking opportunities, MedSpa profile and appointment leak engine.
- Legacy fixtures, QA scripts and historical review documents.
- Historical landing reference HTML used as visual substrate.

These may remain only while isolated. They cannot define contractor objects, financial semantics or public claims.

### Estimate-only contamination

The landing currently positions Quote Recovery first, which is strategically correct. It must not imply that Revenue Realization is already implemented. Jobs, invoices, change orders, underbilling and margin appear only as future/gated offer context.

## Test and release-gate baseline

| Baseline | Current state | Required evolution |
|---|---|---|
| Typecheck/lint/build | Available and passing at Sprint 0 close | Required on every sprint |
| Prisma schema validation | Available | Required before migrations |
| Legacy leak/read/brief QA | Available; validates historical substrate only | Retain as regression, never count as contractor evidence |
| AI fallback/structured-output QA | Available | Add contractor mapping fixtures in Sprint 2 |
| Cross-tenant negative tests | Insufficient as a formal suite | Mandatory from Sprint 1 onward |
| Idempotent rerun tests | Legacy harness exists | Rebuild around contractor fingerprints in Sprint 3 |
| Thin/insufficient-data tests | Legacy coverage exists | Contractor rule eligibility required in Sprint 2–3 |
| Public claim guard | Added in Sprint 0 | Must run before release |
| Browser desktop/mobile | Available but not yet a contractor E2E | Required for Sprint 4–5 |
| Security scanning/restore drills | Not evidenced | Required before paid beta |

## Sprint 0 exit evidence

| Exit criterion | Result | Evidence |
|---|---|---|
| One vocabulary and active product identity | PASS | Source of truth, public REVORY normalization and contamination register |
| Product/copy/code inventory complete | PASS | Capability matrix and reuse audit |
| Legacy and estimate-only contamination mapped | PASS | Contamination map above |
| Every public claim has status and owner | PASS | Public claim register |
| Upload/export/provider threat model complete | PASS | Data-flow and threat-model document |
| Test/release baseline established | PASS | Baseline table and repeatable validator |
| No unresolved source-of-truth conflict | PASS for Sprint 0 | Public surfaces are explicitly prelaunch; legacy behavior is labeled compatibility-only; unsupported capabilities remain gated |

## Verification run

- `npm run qa:sprint-0`: 9/9 product-truth checks passed.
- `npm run db:validate`: Prisma schema valid.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: production artifact generated successfully.
- `npm run qa:revenue-leaks`: legacy deterministic engine and idempotent rerun passed; migration evidence only.
- `npm run qa:ai-csv-intake`: deterministic fallback, sanitized payload and invalid-output fallback passed; migration evidence only.
- `npm run qa:public-demo`: historical demo contract harness passed; public route remains gated.
- Browser check: no rendered `QuoteSignal`, visible private-build/US$799 gate, all audit CTAs resolve to `/start`, no framework error overlay.

## What this PASS does not authorize

- It does not authorize charging US$799.
- It does not make Quote Recovery executable.
- It does not authorize destructive schema migration or relabeling `Appointment` as `Estimate`.
- It does not authorize Growth, Pro, change-order, underbilling or margin claims.
- It does not authorize a Vercel deploy without explicit user direction.

## Next eligible sprint

Sprint 1: canonical multi-dataset contracts and additive migration/compatibility strategy. No later sprint is eligible until Sprint 1 passes.
