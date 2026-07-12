# REVORY — Data flow and threat model

> Sprint 0 baseline. This model covers current horizontal infrastructure, legacy compatibility flows and planned contractor surfaces.

## Trust boundaries

1. User browser and uploaded files.
2. Next.js/Vercel application boundary.
3. Auth providers: Google OAuth and email/password.
4. Database: managed PostgreSQL/Neon through Prisma.
5. Stripe checkout, portal and signed webhooks.
6. Resend transactional email API.
7. Optional OpenAI Responses API for bounded mapping assistance.
8. Future export/download boundary.

## High-level data flow

```text
browser
  -> auth -> NextAuth -> Google or credential verification
  -> server session -> user sync -> workspace authorization
  -> CSV upload -> structural validation -> deterministic mapping
       -> optional sanitized AI profile -> reviewed mapping
       -> normalization -> workspace-scoped persistence
       -> Data Quality / eligibility -> deterministic rules
       -> evidence read model -> dashboard / findings / export
  -> checkout -> Stripe -> signed webhook -> workspace entitlement
  -> email request -> hashed token -> Resend -> verification/reset callback
```

## Flow-by-flow threat model

| Flow | Sensitive data | Primary threats | Existing controls | Open gap / required control | Owner | Gate |
|---|---|---|---|---|---|---|
| Google OAuth | identity, email, provider subject | client misconfiguration, account-link confusion, redirect abuse, session theft | explicit provider config, server session, fixed callback | automated callback/subject-linking regression; privileged MFA policy | Platform/Auth | Sprint 1/paid beta |
| Email/password | email, password hash, verification/reset tokens | brute force, enumeration, token replay/leak, weak password | hashed passwords/tokens, expiries, generic failure copy, rate-limit utility | prove rate limit on every action; credential abuse monitoring | Platform/Auth/Security | Sprint 1/6 |
| User/workspace sync | identity and tenant membership | cross-tenant link, duplicate workspace, email collision | idempotent get/create patterns and workspace IDs | formal cross-tenant negative suite and account-link policy | Security/Data | Sprint 1 |
| CSV upload | customer/export data, values, dates, identifiers | oversized file, malformed quoting, formula injection, malware/polyglot, CSV parser ambiguity, duplicate replay | extension/size checks, structural validation, mapping confirmation, row result tracking | contractor file/row limits, XLSX parser policy, malware-risk handling, upload audit event | Data Intake/Security | Sprint 2 |
| Mapping/persistence | schema mapping, normalized records | wrong mapping, duplicate target, silent data loss, partial write, tenant overwrite | deterministic mapping, human confirmation, saved mapping, workspace keys | atomic contractor persistence, external IDs, provenance, conflict/unmatched review | Data Intake | Sprint 2 |
| Optional AI mapping | sanitized shape/sample labels | raw PII exfiltration, prompt injection in cells, hallucinated mapping, provider outage/cost | bounded columns/rows, sanitized samples, strict schema, timeout, deterministic fallback, review required | contractor prompt/fields, payload audit, provider retention disclosure and cost telemetry | AI/Data/Security | Sprint 2 |
| Deterministic rule engine | imported evidence and financial values | unsupported claim, false positive, value-basis mixing, stale rerun, duplicate findings | confidence/severity/evidence/fingerprint primitives in legacy engine | contractor eligibility, false-positive corpus, stable idempotency and value-basis enum | Domain Engine | Sprint 3 |
| Dashboard/findings | tenant evidence and estimated amounts | IDOR, cached cross-tenant read, misleading totals, sensitive UI exposure | workspace-scoped queries and app context | cross-tenant cache tests, claim suppression, access audit | Product UX/Security | Sprint 4 |
| CSV/PDF export | customer and financial evidence | IDOR, formula injection, excessive data, stale link, browser leakage | no contractor export currently exposed | server authorization, safe cell encoding, scoped file, short retention, export event | Reporting/Security | Sprint 4–5 |
| Stripe checkout | identity, workspace ID, plan/price | old price reuse, forged plan, customer mismatch, open redirect | server-created session, workspace metadata, configured price lookup | new product entitlement model and approved price mapping | Billing | Sprint 5 |
| Stripe webhook | billing/subscription state | forged event, replay, out-of-order update, tenant mismatch | signature verification and known event set | explicit event idempotency ledger and stale-event ordering tests | Billing/Security | Sprint 5–6 |
| Billing portal | Stripe customer identity | portal for wrong workspace, unauthorized access | authenticated workspace and stored customer ID | cross-tenant negative test and audit event | Billing/Security | Sprint 6 |
| Resend email | email and action link | token leakage, enumeration, phishing/spoofing, provider failure | hashed tokens, expiry, generic responses | verified domain evidence, rate limits, delivery/abuse monitoring | Platform/Auth | Sprint 5–6 |
| Vercel/env/secrets | provider secrets and runtime config | secret exposure, preview/prod drift, unauthorized deployment | managed sensitive variables and ignored local env files | secret scanning, rotation playbook and environment consistency gate | Platform/Security | Before paid beta |
| Database/backup | all tenant data | destructive migration, restore failure, excessive retention | Prisma migrations and additive-migration guardrail | retention/deletion, backup verification and restore drill | Data/Security | Sprint 6 |

## Priority risks

### Critical before any paid audit

- Contractor workspace isolation is not evidenced by a formal cross-tenant negative suite.
- Contractor data contracts and eligibility do not exist; current rules cannot support the US$799 result.
- Existing Stripe price IDs belong to historical plans and must not be remapped by name.

### High before Sprint 5

- Export authorization and spreadsheet-formula neutralization are absent.
- Billing webhook idempotency is not evidenced by a persistent event ledger.
- Retention/deletion and restore procedures are not implemented/evidenced.
- Public legal/security surfaces are incomplete for a paid data product.

### Medium during Sprints 1–4

- Legacy data and prompts may be mistaken for contractor evidence if compatibility labeling is removed.
- Optional AI needs contractor-specific payload tests and retention disclosure.
- Dashboard cache/read composition needs explicit tenant-boundary tests.

## Security invariants

- Every record, read, write, finding, export and job carries `workspaceId`.
- No financial claim survives missing eligibility inputs or ambiguous linkage.
- No approximate name/amount match silently changes financial output.
- Every provider call is bounded, minimized and optional to core value.
- Every webhook is signed and idempotent.
- Every export is authorized at generation time and safe for spreadsheet opening.
- Preview/local bypasses require `NODE_ENV !== "production"` and an explicit flag.
- No production/domain/secret change occurs without verified need and explicit authority.
