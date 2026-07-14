# REVORY — production operations runbook

Date: 2026-07-13. Scope: Quote Recovery paid-beta preparation. Stripe remains disabled.

## Automated jobs

Vercel Cron is declared in `vercel.json` and protected by `CRON_SECRET`:

- `GET /api/jobs/enforce-retention` — daily at `05:15 UTC`;
- `GET /api/jobs/weekly-digest` — Mondays at `13:00 UTC` (`10:00 America/Sao_Paulo` while UTC-3 applies).

Both endpoints also accept `POST` for an authorized manual drill. A workspace failure is logged and isolated so it cannot abort other workspaces. The retention job also removes stale durable rate-limit buckets.

Required production evidence after deploy:

1. confirm both schedules with `vercel crons list`;
2. execute one authorized retention drill and one digest drill;
3. retain the deployment URL, timestamp, HTTP result and structured completion log;
4. verify a failed workspace is counted without hiding the successful ones.

## Email and Resend

- sender domain: `revory.app`, verified in Resend;
- receiver: `POST /api/webhooks/resend`;
- signed delivery events: sent, delivered, bounced, complained, delivery delayed, failed and suppressed;
- signature secret: production-only Vercel secret `RESEND_WEBHOOK_SECRET`;
- delivery failures are emitted as structured error logs without logging recipient content or the signing secret.

Remaining evidence: send one synthetic transactional email to an address owned by the founder, retain its Resend message ID and confirm both delivery and signed webhook receipt.

## Authentication

- Google OAuth production round-trip on `https://revory.app` is the canonical E2E check;
- email/password signup, verification and reset are throttled through a durable database-backed limiter;
- production auth must fail closed when required secrets are absent;
- OAuth client secrets and callback inventory must stay in managed environment variables, never in the repository.

## Observability

- `/api/health` reports application/database health without caching;
- Vercel Web Analytics and Speed Insights are mounted globally and do not change the visual UI;
- Vercel default owner/admin error alerting remains active;
- structured logs exist for jobs and Resend delivery attention events.

Still required before first customer data: an external uptime check for `/api/health`, named alert primary/backup, and an isolated managed-database restore drill with measured RPO/RTO.

## Security controls

- CSP, HSTS, COOP, frame denial, MIME sniffing denial, referrer and permissions headers;
- database-backed distributed throttling for authentication and expensive import/analysis actions;
- Vercel WAF fixed-window rule for canonical import POST routes;
- workspace isolation, explicit provenance, idempotent imports and immutable analysis snapshots;
- moderate dependency findings recorded without applying npm's unsafe downgrade suggestions.

Still required: independent DAST/pentest, MFA/ownership evidence for every provider, backup restore evidence and periodic dependency re-review.

## Stripe boundary

Checkout, portal, signed webhook ledger, entitlement compare-and-set and price-aware Checkout Session reuse are implemented. They must remain unavailable until the dedicated REVORY price IDs, webhook secret, test lifecycle evidence and `REVORY_PAID_CHECKOUT_ENABLED=true` are supplied intentionally.

Legacy MedSpa Stripe price variables must never activate a current REVORY offer.

## Incident sequence

1. Disable the affected external capability or release flag; do not delete evidence.
2. Preserve Vercel, database, Resend, OAuth and Stripe event IDs/log timestamps.
3. Identify affected workspaces through explicit IDs; never inspect or mix unrelated tenants.
4. Rotate the affected secret and redeploy if compromise is suspected.
5. Restore into an isolated database before any production recovery.
6. Record root cause, user impact, remediation, verification and follow-up owner.

