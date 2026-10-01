# REVORY

REVORY is being rebuilt as **Revenue & AI Margin Integrity for AI SaaS**. The intended product reconciles Stripe revenue, the customer's internal usage ledger and AI provider usage/cost to surface explainable discrepancies. It is read-only in customer systems and evidence-first.

## Migration status

The deployed/default surfaces still implement the previous contractor product, with some MedSpa-era schema and routes. Sprints 1–4 added local AI SaaS contracts, persistence, CSV/XLSX intake, explicit identity/coverage and a deterministic internal scan. It produces unattributed reported spend and comparable usage differences, immutable snapshots and JSON/CSV exports. Sprint 05 adds AI SaaS landing/demo/start, app navigation/dashboard, report/finding detail and one-time test purchase under `REVORY_AI_SAAS_PREVIEW=true` in development. The complete flow uses synthetic files, disposable PostgreSQL and the real Stripe SDK against a clearly labeled loopback simulation. **Real Stripe sandbox verification is pending; Sprint 05's complete gate remains open.** No deployment or main database migration. Revenue/margin/credit-balance rules, connectors and commercial release remain unavailable. Existing horizontal infrastructure is migration substrate; the visual identity is the brand contract.

Sprint 06 adds synthetic finding/report reviews, revision history, review exports and a paid pilot protocol. Local browser/database checks passed. **Real paid validation is not complete: zero verified paid participants.** The 3–5 consented scans require the Sprint 05 sandbox gate and a verified pilot environment/data/commercial flow. Synthetic confirmation and production restrictions remain active.

Sprint 07 adds paginated synthetic Stripe/OpenAI source reads, consent/revocation, incremental checkpoints and source evidence exports, with CSV parity against the same fixtures. **Real connection gate remains open.** No HTTP transport, API key collection or real provider account connection. The UI requires the additional nonproduction `REVORY_AI_SOURCE_REHEARSAL=true` flag in a prepared local database; it stays off in the common preview. Google auth, Resend and existing billing remain preserved.

Sprint 08 adds manual comparison of two synthetic reports, conservative temporal movements, bounded local alerts, audited acknowledgment, history and exports. **Recurring beta gate remains open:** no scheduled reads, external alert delivery, real OpenAI connection or monitoring subscription. Requires nonproduction `REVORY_AI_MONITOR_REHEARSAL=true` in a prepared local database, off in the common preview. Founder direction: resolve Stripe last, before commercial release.

Do not market or sell the new AI SaaS promise from this repository until its data, reconciliation, security and release gates pass. Existing contractor prices and Stripe objects are protected historical contracts.

## Living product documents

- [Canonical source of truth](docs/source-of-truth.md)
- [Product bible](docs/REVORY_PRODUCT_BIBLE.md)
- [AI SaaS migration plan](docs/REVORY_AI_SAAS_MIGRATION_PLAN.md)
- [Sprint 0 evidence and migration safeguards](docs/sprints/SPRINT_00_AI_SAAS_FOUNDATION_2026-09-29.md)
- [Sprint 1 data contracts and persistence](docs/sprints/SPRINT_01_AI_INTEGRITY_CONTRACTS_2026-09-29.md)
- [Sprint 2 internal assisted intake](docs/sprints/SPRINT_02_AI_INTEGRITY_INTAKE_2026-09-29.md)
- [Sprint 3 explicit identity and coverage](docs/sprints/SPRINT_03_AI_INTEGRITY_ATTRIBUTION_2026-09-29.md)
- [Sprint 4 internal deterministic scan and evidence](docs/sprints/SPRINT_04_AI_INTEGRITY_ENGINE_2026-09-30.md)
- [Sprint 5 local experience, test purchase and pending sandbox gate](docs/sprints/SPRINT_05_AI_INTEGRITY_EXPERIENCE_2026-10-01.md)
- [Sprint 6 validation preparation and synthetic rehearsal](docs/sprints/SPRINT_06_AI_INTEGRITY_VALIDATION_PREPARATION_2026-10-01.md)
- [Sprint 7 local source preparation and pending real connection gate](docs/sprints/SPRINT_07_AI_INTEGRITY_SOURCE_PREPARATION_2026-10-01.md)
- [Sprint 8 local monitoring preparation and pending recurring beta gate](docs/sprints/SPRINT_08_AI_INTEGRITY_MONITORING_PREPARATION_2026-10-01.md)
- [Monitoring rehearsal runbook and data policy](docs/validation/SPRINT_08_MONITORING_REHEARSAL_RUNBOOK.md)
- [Paid pilot protocol and templates](docs/validation/SPRINT_06_PAID_PILOT_PROTOCOL.md)
- [Research analysis and decisions](docs/REVORY_RESEARCH_DECISION_RECORD_2026-09-29.md)
- [Historical documentation policy](docs/historical/README.md)

## Product guardrails

- Premium and self-service
- AI SaaS founder/CTO first
- CSV/XLSX integrity scan before broad connectors
- Evidence and Data Quality before financial claims
- Explicit matching, provenance and workspace isolation
- Deterministic core with optional bounded AI
- No billing engine, model gateway, prompt observability suite, autonomous remediation, accounting or generic BI expansion

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma/PostgreSQL

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run db:validate
```

Copy `.env.example` to `.env.local` and set values for the intended environment. Do not reuse or change production secrets, Stripe resources, domains or deployments as part of the domain migration without separate verification and authorization.
