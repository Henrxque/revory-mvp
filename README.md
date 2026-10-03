# REVORY

REVORY is being rebuilt as **Revenue & AI Margin Integrity for AI SaaS**. Its intended read-only product will compare Stripe billing context, an AI SaaS customer's internal usage ledger and AI provider usage/cost, with explicit attribution and visible evidence limits.

## What is public now

`revory.app` presents the new direction and a **static synthetic demo**. These pages do not accept customer data, run scans, connect accounts or sell the new product. The authenticated app, existing checkout and customer records still serve the historical Quote Recovery product. The complete AI SaaS migration is in the separate `migration/ai-saas-sprints-0-6` branch and [draft PR #2](https://github.com/Henrxque/revory-mvp/pull/2); its real purchase, customer, connector, monitoring and launch gates remain open.

- [Current source of truth](docs/source-of-truth.md)
- [Public-presentation release record](docs/launch/REVORY_AI_SAAS_PUBLIC_PRESENTATION_2026-10-02.md)
- [Historical contractor product authority](docs/historical/REVORY_CONTRACTOR_SOURCE_OF_TRUTH_2026-10-02.md)

## Stack

Next.js, TypeScript, Tailwind CSS and Prisma/PostgreSQL. Brand tokens, transparent logo and font roles are defined in the source of truth and preserved in `src/app/globals.css`.

## Local development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

The production Vercel build runs `prisma migrate deploy` before `next build`. Verify the target environment before promoting changes that include migrations. This narrow public-presentation release does not include a schema change.
