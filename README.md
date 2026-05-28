# REVORY

REVORY is now a Revenue Leak Detector for premium MedSpas.

The current product foundation includes onboarding, imports, billing, dashboard reads, booking evidence, bounded action guidance, and executive summaries. The public positioning now follows the V3 source of truth: show where revenue is at risk from structured appointment and booking data without turning into CRM, inbox, BI, scheduling software, consulting, or an AI sales agent.

## Source Of Truth

Use [docs/source-of-truth.md](docs/source-of-truth.md) as the primary product reference.

When old docs, wireframes, README text, or partial implementation conflict with the source of truth, follow the narrower V3 Revenue Leak Detector interpretation.

## Product Focus

- Premium
- Self-service
- MedSpa-first
- Revenue leak-first
- Estimated revenue at risk
- CSV-first intake
- Evidence and confidence before claims
- Bounded AI only for intake, triage, explanation, and guidance

## Avoid

- CRM
- Inbox
- BI bloat
- Scheduling system
- Revenue cycle management
- Consulting service
- AI sales assistant
- Claims of confirmed lost revenue without evidence

## Stack

- Next.js
- TypeScript
- Tailwind CSS

## How To Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Environment Variables

Copy `.env.example` to `.env.local` and adjust values for the environment.
