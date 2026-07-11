# REVORY migration inventory and vertical-slice plan

> Baseline: 2026-07-11. This is a migration plan and capability audit, not a claim that the hybrid domain is implemented.

## Executive verdict

The repository provides valuable platform substrate—auth, workspace isolation patterns, CSV intake, mapping, Data Quality, deterministic finding infrastructure, billing plumbing and premium UI—but its executable domain remains MedSpa-first. A safe migration must replace contracts from the inside out. Search-and-replace would preserve the wrong semantics under new labels and create false financial claims.

The working tree was clean before this task. No database migration, data mutation, deployment, domain, Stripe resource, Vercel configuration, secret or external integration was changed.

## Inventory baseline

| Area | Observed state | Migration classification |
|---|---|---|
| Auth/workspaces | Auth, user sync and workspace-scoped reads/writes exist | Reuse after negative tenant tests |
| CSV intake | Parsing, mapping review, saved mapping, deterministic fallback and Data Quality exist | Adapt contracts; preserve the flow |
| Finding engine | Evidence, confidence, severity, fingerprint and idempotent sync patterns exist | Reuse architecture; replace MedSpa rules |
| Dashboard/reports | Leak-first dashboard, detail, brief and executive summary exist | Adapt only after contractor read models exist |
| Billing | Stripe checkout/webhook/portal and BASIC/GROWTH/PREMIUM keys exist | Protected; do not map to new offers without verified Stripe evidence |
| Schema | `MedSpaProfile`, `Client`, `Appointment`, `LeadBookingOpportunity` and appointment leak enums are active | Compatibility migration required; no destructive rename |
| Imports/templates | Appointment/client templates and demo fixtures are public | Remove from new public flow after replacement templates pass QA |
| Tests | Strong MedSpa fixture and leak coverage exists | Preserve as legacy-regression evidence until replacement slices supersede it |
| Brand | Existing magenta mark differed from the approved asset | New token/asset foundation required |
| Documentation | 399 files; much of `docs/reviews` and `docs/sprints` describes REVORY Seller/MedSpa | Historical by policy; living docs replaced |

Mechanical scan across tracked workspace content found 120 files containing `MedSpa`, 91 containing `clinic`, 305 containing `appointment`, 20 containing `treatment`, 48 containing `no-show`, 275 containing `booking`, 30 containing `patient`, 13 containing `MedSpaProfile`, 65 containing `main offer`, 8 containing `canceled not recovered`, 168 containing `REVORY Seller`, and no pre-migration `QuoteSignal` occurrences. Counts include historical documents and are not counts of executable defects.

## Migration matrix

| Classification | Existing examples | Decision |
|---|---|---|
| Useful and reusable | auth, workspace ownership, Stripe plumbing, mapping review, saved mappings, normalization helpers, Data Quality UI, evidence/confidence/severity patterns, fingerprints, dashboard composition | Keep behind explicit contractor contracts and retest isolation/idempotency |
| MedSpa to remove from active product | `MedSpaProfile`, appointments, no-show/cancellation rules, booking opportunities, clinic onboarding, appointment/client templates, MedSpa demo, provider/service/clinic copy | Isolate as legacy compatibility, then retire after new slices cover data and behavior |
| Requires domain adaptation | `Client` → customer, average deal value, sources/owners, imports, finding read models, dashboard/report shells, plan gating | Add new models and adapters; never reuse clinical fields with financial meanings |
| Hybrid capability missing | company profile, estimate/activity imports, estimate matching, Quote Recovery rules, jobs, invoices/lines, change orders, job costs, reconciliation, unmatched review, recovery confirmation | Implement in gated vertical slices below |
| Schema/data risk | table/enum renames, foreign keys from findings, existing workspace data, plan keys, timestamps/freshness, duplicate external IDs | Additive migrations first; backfill only with explicit transforms; dual-read where required |
| Copy/brand residue | MedSpa metadata, landing reference, start/pricing, sidebar `Clinic Data`, authenticated screens, fixtures/reports | Public shell must be honest; remove only as the matching capability is replaced |
| Obsolete tests | tests asserting appointment parsing, no-show/cancel logic, booking states and MedSpa pricing | Keep during compatibility window; add contractor tests before retiring them |
| Protected external state | `.env*`, `.vercel/`, Stripe IDs/webhooks, auth providers, production DB, domains, deployments | Inspect keys only when needed; never mutate without verified need and authority |

## Brand foundation

The brand direction approved on 2026-07-11 supersedes the earlier sampled black/cyan palette. The historical source remains preserved at `public/brand/revory-mark-approved.png`; it is not the current UI asset.

| Token | Value | Basis |
|---|---|---|
| Brand background | `#141516` | explicit approved application canvas |
| Brand surface | `#252729` | explicit alternating section and panel background |
| Primary | `#43B39B` | explicit approved logo and identity accent |
| Accent | `#43B39B` | one canonical turquoise |
| Primary hover/highlight | derived from `#43B39B` | no competing turquoise literal |
| Text | derived with `color-mix` from primary and white | accessible neutral, not an invented brand hue |
| Borders | alpha variants of primary/foreground | derived, traceable accents |

The canonical transparent asset is `public/brand/revory-logo-43b39b-transparent.png`. The application should use tokens rather than distributing new color literals. Status colors remain semantic and are not brand colors.

## Compatibility strategy before any destructive migration

1. Snapshot schema and measure real row counts, nullability, duplicate external IDs and workspace ownership in a non-production-safe read.
2. Add new contractor tables and enums; do not rename MedSpa tables in place.
3. Add `sourceSystem`, `sourceDataset`, external IDs and import-session provenance to every new record.
4. Persist customer, estimate and activity data atomically per workspace.
5. Expose unmatched, conflicting and insufficient records before findings.
6. Build new read models independently of appointment reads.
7. Dual-run only for platform behavior, never compare MedSpa and contractor financial totals as equivalent.
8. Retire legacy routes/tables only after data retention/export, rollback and tenant-isolation evidence exist.

## Vertical slices and gates

### Slice 0 — Authority, inventory and threat model

Deliver living documents, historical policy, brand assets/tokens, capability audit and protected-state register.

**Gate:** one active product truth; no public claim that hybrid behavior exists; no external-state mutation.

### Slice 1 — Company, customer, estimate and activity contracts

Add additive Prisma models/enums, validation schemas and provenance/external-ID rules. Define compatibility without altering legacy records.

**Tests:** schema validation, duplicate IDs, workspace ownership, cross-tenant negatives, invalid status/date/currency, no destructive SQL.

### Slice 2 — Secure Quote Recovery intake and Data Quality

Ship customer/estimate/activity CSV/XLSX templates, deterministic parsing, confirmed mappings, normalization, atomic persistence and rule eligibility.

**Tests:** official/mappable/ambiguous files, missing fields, formula/file limits, mapping reuse, deterministic no-AI fallback, idempotent re-import, cross-tenant mapping access.

### Slice 3 — Quote Recovery engine V1

Implement conservative overdue follow-up, high-value stale estimate, open estimate without activity, aging, and missing owner/next step as operational risk. Define evidence, value basis, fingerprints and resolution.

**Tests:** false positives, sold/lost/unknown status, thin/stale data, incompatible currencies, insufficient activity evidence, idempotent sync and tenant isolation.

### Slice 4 — Quote Recovery experience

Replace authenticated MedSpa dashboard/import/finding surfaces with contractor-native read models. Show financial, operational and Data Quality findings separately.

**Tests:** desktop/mobile, empty/thin/stale/error/no-AI states, keyboard/contrast, value reconciliation and copy-to-capability traceability.

### Slice 5 — Quote Recovery Audit and Starter gates

Add bounded export/report, second-read movement, recovery confirmation and verified plan entitlements. Map Stripe only after resource evidence and explicit authorization.

**Gate:** useful findings without founder analysis, reproducible totals, security review, low support burden and a controlled paid-beta decision.

### Slice 6 — Revenue Realization intake

Add jobs, invoices/lines, change orders and job costs with explicit one-to-many relationships and unmatched/conflicting review.

**Tests:** missing/duplicate links, partial invoices, multiple change orders, currency/tax/discount treatment, cross-workspace IDs, atomicity and target volume.

### Slice 7 — Matching and reconciliation

Build deterministic links and formulas. Never silently link by approximate name or amount. Separate observed amounts and calculated gaps.

**Tests:** ambiguous candidates, split invoices, revised estimates, voided records, unmatched suppression, deterministic reconciliation and stable reruns.

### Slice 8 — Change-order, underbilling and margin rules

Add approved-but-not-billed and deterministic underbilling only from sufficient evidence. Keep suspected missing change order and scope creep as review candidates. Define margin basis explicitly.

**Tests:** performed/approved/billed distinctions, false positives, insufficient cost data, line-level reconciliation, confidence/value-basis labels and customer-review reproducibility.

### Slice 9 — Growth/Pro evidence and legacy retirement

Add guarded history/segmentation/reporting, independent security review and paid evidence. Retire MedSpa routes, schema and tests only with rollback/retention proof.

**Gate:** no critical/high security blocker, no unsupported commercial claim, no tenant leakage, and explicit retain/repackage/delay decisions for each offer.

## Alice capability-truth check

**Alignment verdict: aligned with adjustment.** The new identity and roadmap are coherent, but the executable product remains contaminated by the discontinued MedSpa domain. The safe adjustment is to keep the hybrid offer unavailable while building Slices 1–5. Change-order, invoice, underbilling and margin language may appear only in roadmap/context until Slices 6–8 pass.

## Remaining MedSpa occurrences

MedSpa language intentionally remains in historical documents and in active legacy schema/import/engine/UI/test files. These are not “cleanup leftovers”; they are dependencies requiring replacement behavior. The next eligible sprint is **Slice 1 — Company, customer, estimate and activity contracts**, preceded by a read-only data-shape/tenant-isolation review of the target database environment.
