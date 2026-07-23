# REVORY — production operations runbook

Updated: 2026-07-23. Scope: Quote Recovery paid-beta preparation. Production Stripe checkout remains disabled.

## Deployment and database migration gate

Vercel's repository `buildCommand` calls the `vercel-build` script, overriding
any stale dashboard build command. For Preview and Production deployments it
runs `prisma migrate deploy` before `next build`.

- a missing `DATABASE_URL` fails the deployment before new application code is promoted;
- an unapplied or failed Prisma migration fails the deployment while the previous Vercel deployment remains active;
- migrations must remain backward-compatible with the currently active deployment because the database changes before the new deployment is promoted;
- Preview must use an isolated Neon branch. Do not point Preview at the production branch merely to make a build pass;
- verify `/api/health` and one authenticated `/app` request after every production promotion.

This gate was added after the 2026-07-23 incident in which application code that
read `legal_acceptances` reached production before the corresponding migration.

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

Current evidence: the external GitHub monitor is live and has repeated successful scheduled checks; the founder confirmed receipt of a controlled GitHub alert notification on 2026-07-22; and the isolated Neon restore passed with measured RPO/RTO. GitHub issue history plus private Vercel runtime logs form the technical recovery route. Henrique remains the only human incident operator, an explicit solo-founder risk that must be revisited before scaling.

## Security controls

- CSP, HSTS, COOP, frame denial, MIME sniffing denial, referrer and permissions headers;
- database-backed distributed throttling for authentication and expensive import/analysis actions;
- Vercel WAF fixed-window rule for canonical import POST routes;
- workspace isolation, explicit provenance, idempotent imports and immutable analysis snapshots;
- moderate dependency findings recorded without applying npm's unsafe downgrade suggestions.

Still required: independent DAST/pentest, complete MFA/recovery ownership evidence for every provider and periodic dependency re-review.

## Operating decisions

- default active-workspace retention: 365 days, configurable to 30, 90, 180 or 365 days;
- after recurring access ends: up to 30 days to export available workspace data, followed by deletion of uploaded analysis/import data subject to legal, security and backup-retention limits;
- weekly digest: Mondays at 10:00 `America/Sao_Paulo`;
- support target: first response within one business day, without a public 24/7 or contractual SLA promise;
- public support/privacy/billing/refund contact: `support@revory.app`;
- vulnerability and incident contact: `security@revory.app`.

## Stripe boundary

Checkout, portal, signed webhook ledger, entitlement compare-and-set and price-aware Checkout Session reuse are implemented. The isolated 2026-07-23 Stripe test-mode run passed for Growth monthly, the one-time Quote Recovery Audit, Starter after its baseline gate, signed webhook delivery, replay idempotency and cancellation/revocation.

Production checkout must remain unavailable until the live REVORY price IDs,
live webhook secret and `REVORY_PAID_CHECKOUT_ENABLED=true` are supplied
intentionally after the account and commercial launch gates are confirmed.

Legacy MedSpa Stripe price variables must never activate a current REVORY offer.

## Incident sequence

1. Disable the affected external capability or release flag; do not delete evidence.
2. Preserve Vercel, database, Resend, OAuth and Stripe event IDs/log timestamps.
3. Identify affected workspaces through explicit IDs; never inspect or mix unrelated tenants.
4. Rotate the affected secret and redeploy if compromise is suspected.
5. Restore into an isolated database before any production recovery.
6. Record root cause, user impact, remediation, verification and follow-up owner.
