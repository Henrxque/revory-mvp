# REVORY release handoff — 2026-09-08

Status: preparation in progress; production changes have not been performed by this task.

## Delegation and ownership

- Release preparation and integration: parent task (Reh).
- Retention and weekly digest investigation: Mill, read-only production investigation.
- Billing readiness: Lovelace, local contract review and read-only provider checks where available.
- Qualified legal/fiscal review and buyer validation remain separate from engineering verification.

## Verified baseline

- Local and remote main initially pointed to `f6ca83a`; while this review was running, another task committed `397c77b`, changing only the redacted operations summary. Preserve that work.
- The complete local launch suite passed on 2026-09-04. Today, environment consistency, Sprint 16, Quote Recovery Quick Start, public demo and landing copy checks passed. No full-suite rerun is represented as having occurred today.
- The local database is reachable with zero pending migrations.
- Production health is responsive. The external uptime monitor passed on 2026-09-08 at 11:37 UTC.
- The current production artifact was created on 2026-07-31 and is READY. Live landing HTML still has the old three-export guidance instead of the current estimates-first guidance.
- Production build logs record migration execution on 2026-07-31, 25 discovered migrations and `No pending migrations to apply`. This is historical build evidence, not a current database query or proof of a specific migration row.
- The deployment source is CLI, with commit metadata `1bc9585`. Do not infer exact artifact contents from that SHA: the public prices and other content show that uncommitted working-tree content may have been included.
- Current commercial contracts remain Audit USD399 once, Starter USD399/month and Growth USD599/month. Each is independently selectable; Audit does not start a subscription.

## Concrete release procedure

1. Record the final reviewed commit and diff. Preserve the existing operations summary and avoid shipping unrelated concurrent changes.
2. Confirm the selected Vercel project and production datasource. Inspect the migration ledger read-only, including `20260724000100_open_independent_commercial_paths`, or record its exact outcome during the authorized production build.
3. Publish through `npm run vercel-build` so Prisma migrations must succeed before the application build. Do not substitute a locally built artifact using development environment variables. Any preview must use an isolated datasource because this build script also applies migrations in preview.
4. Verify health, estimates-first landing copy, public demo, authenticated import review, pricing cadence and billing access on the deployed artifact. Verification must not consume a real Audit or create a charge without separate authorization.
5. Record the deployed revision and migration result. A previous application artifact may be a rollback target; application rollback does not undo database migrations. The latest migration adds an enum value and is not a destructive reset.
6. Complete the separate cron and billing findings below before calling the operational sprint complete.

## Pending delegated findings

Cron and billing findings will be consolidated after the delegated reviews return. An empty log query does not establish a failed job or a successful execution.

## Authority boundary

The user requested delegation. This task prepared the release and delegated investigations. A production deployment, production database write, provider configuration change or live financial transaction requires explicit authority under repository AGENTS.md. No such action is represented as completed here.
