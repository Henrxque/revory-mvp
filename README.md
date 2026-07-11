# REVORY

REVORY is Revenue Leak Intelligence for High-Ticket Service Businesses. It begins with Quote Recovery across estimates and follow-ups, then expands—after explicit evidence and release gates—into Revenue Realization across jobs, invoices, change orders, underbilling and margin risk.

## Migration status

This repository is being migrated from the discontinued MedSpa REVORY implementation. The current schema and authenticated product still contain appointment, booking and clinic behavior. They are reusable technical substrate, not proof that the hybrid contractor domain is implemented.

Do not market or sell estimate, change-order, invoice, underbilling or margin capability from this repository until the corresponding roadmap gate passes.

## Living product documents

- [Canonical source of truth](docs/source-of-truth.md)
- [Detailed hybrid scope](REVORY_ESCOPO_HIBRIDO.md)
- [Product and launch roadmap](docs/REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md)
- [Continuous execution guide](docs/REVORY_CONTINUOUS_EXECUTION_GUIDE.md)
- [Migration inventory and vertical-slice plan](docs/REVORY_MIGRATION_INVENTORY_AND_VERTICAL_SLICES.md)
- [Historical documentation policy](docs/historical/README.md)

## Product guardrails

- Premium and self-service
- High-ticket-service-business-first
- CSV/XLSX-first
- Evidence and Data Quality before financial claims
- Explicit matching, provenance and workspace isolation
- Deterministic core with optional bounded AI
- No CRM, inbox, autonomous follow-up, FSM, accounting, project-management or generic BI expansion

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
