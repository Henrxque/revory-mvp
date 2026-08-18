# Sprint 16 — Production operations and recovery evidence

## Status

**IN PROGRESS · PRODUCTION HEALTH/MONITOR/RESTORE PASS · EXTERNAL EXIT EVIDENCE INCOMPLETE.**

## Execution note — 2026-07-23

**Stripe prerequisite: PASS IN TEST MODE.** An isolated Neon branch and Stripe sandbox were used to exercise the current US$399 paid-once Audit, US$399/month Starter and US$599/month Growth as independent commercial paths. Signed fulfillment, exact-event replay idempotency, customer-portal session creation, cancellation and entitlement revocation passed without a live charge or production entitlement. A live payment remains pending the first real customer.

Safe preparation completed locally:

- the existing retention and weekly-digest schedules remain configured in `vercel.json`, protected by `CRON_SECRET` and instrumented with redacted completion markers;
- `scripts/observe-sprint-16-crons.mjs` observes retention, weekly digest or both independently, evaluates only safe completion fields, scopes queries to production and emits no raw provider log;
- `.github/workflows/revory-uptime-monitor.yml` defines an external GitHub Actions check for `https://revory.app/api/health`, opens one owner-assigned incident issue on failure, closes it on recovery and supports a simulated alert test without changing production;
- `scripts/verify-isolated-restore.mjs` refuses the source database as a target, performs read-only structural and aggregate row-count checks and calculates measured RPO/RTO from operator-supplied timestamps;
- `docs/operations/SPRINT_16_REDACTED_CONTROL_SUMMARY.md` records only non-sensitive pass/pending conclusions.

Current external evidence state:

- the production health endpoint returned HTTP 200 with the application and database reachable on 2026-07-18;
- the authenticated Vercel review on 2026-07-22 found no production 5xx responses or error/fatal runtime lines in the latest 24-hour window; one isolated Node URL-parser deprecation warning remains non-blocking technical debt in the authentication route;
- both protected job routes and schedules are configured. Read-only queries on 2026-08-18 found no retention marker in one day and no weekly-digest marker in two days, so neither execution is marked observed;
- the retention and digest observers were corrected on 2026-07-22 to query only the 30 minutes immediately after each schedule and to scope to the latest production deployment when the project-wide query times out;
- the GitHub monitor is live on the default branch; public browser evidence showed 32 runs and repeated successful scheduled checks on 2026-07-22;
- the founder confirmed receipt of the controlled GitHub alert notification on 2026-07-22; GitHub issue history plus private Vercel runtime logs form the backup/recovery route, while no second human incident operator exists in the current solo-founder phase;
- a provider-created Neon child branch completed an isolated current-state restore drill on 2026-07-19; schema and aggregate counts across 10 control tables matched, with measured RPO under one minute and RTO of 54 seconds;
- authenticated Resend browser evidence confirms MFA, a connected Google authentication route, a verified `revory.app` sender domain and an enabled signed webhook whose prior delivery event received HTTP 200. Founder-confirmed provider recovery ownership is recorded only in the redacted operations summary.
- on 2026-07-23, a production `/app` incident exposed two pending Prisma migrations. The migrations were applied to the production Neon branch, authenticated `/app` loading recovered, and a migration-gated Vercel build was added so future Preview and Production deployments fail before promotion when schema deployment cannot complete.
- the 2026-07-23 Stripe sandbox run passed the Audit, Starter and Growth lifecycle paths, signed webhook delivery, exact-event replay, portal creation and cancellation/revocation on isolated test data. No live transaction was created.

This sprint intentionally holds the four external operations tasks deferred from the pre-commercial work: cron observation, uptime monitoring, isolated backup restore and MFA/recovery ownership. They remain important launch controls, but they are not customer-facing product features and should not distract from Sprint 15 or Stripe setup.

## Prerequisites

1. Sprint 15 and the local Sprint 15.1 Growth connection are complete.
2. Stripe test-mode lifecycle evidence covers the current US$399 paid-once Quote Recovery Audit, US$399/month Starter and US$599/month Growth offers.
3. Test checkout, signed webhook fulfillment, duplicate-event handling and the recurring customer portal have passed end to end for every offer intended to open.

## Scope

### 16.1 Scheduled work

- Observe one production retention run and one production weekly-digest run in Vercel.
- Record timestamp, result and redacted log reference privately.
- Use only owned test data/inboxes for any controlled trigger. Do not change a customer workspace merely to create evidence.

### 16.2 Uptime and incident alerting

- Configure an external monitor for the existing `/api/health` endpoint.
- Name a primary alert owner and a backup/recovery route.
- Test that an alert reaches the owner without deliberately causing a customer-facing outage.

### 16.3 Backup and isolated restore

- Create an isolated restore from the managed-database backup through the provider-approved path.
- Check that the restored database is isolated, reachable only by authorized operators and has expected structural/row-count checks.
- Record backup time, restore start/end and the resulting RPO/RTO privately. Do not commit backup files, customer rows, provider IDs or credentials.

### 16.4 MFA and recovery ownership

- Enable MFA on GitHub, Vercel, database, Resend, Google, DNS and Stripe.
- Confirm a secure recovery method for every provider: recovery codes/password-manager record and, where the provider supports it, a backup owner.
- Store the inventory outside the repository. The repository may contain only a redacted pass/fail summary.

## Non-goals

- No new dashboard, CRM, alerting product, customer notification, billing feature or new plan.
- No public release solely because this sprint passes.
- No production migration, secret rotation, destructive deletion or provider-account change without separate authority.

## Exit gate

1. One successful retention run and one digest run have private, reproducible evidence.
2. The external uptime monitor and its alert route are live and tested.
3. An isolated restore succeeded with a recorded RPO/RTO and no data exposure.
4. MFA and recovery ownership are confirmed for all operator-critical accounts.
5. The only remaining public-sale gates are final legal-entity/counsel work and real customer/paid evidence, in addition to any unresolved Stripe production activation item.

## Evidence location

Keep provider screenshots, message IDs, account identifiers, backup references, timestamps and recovery details in the founder's private operations record. Commit only redacted conclusions and dates.

## Reproducible commands

```bash
npm run qa:sprint-16
npm run ops:observe-crons
npm run ops:verify-restore
```

`ops:verify-restore` intentionally requires explicit source/target database variables, three ISO timestamps and `REVORY_RESTORE_CHECK_ACK=READ_ONLY_ISOLATED_RESTORE`. Never place those values in tracked files.

Observe each job immediately after its next natural production schedule, without invoking its route:

```powershell
$env:REVORY_CRON_JOB="retention"; $env:REVORY_CRON_LOG_WINDOW="1h"; npm run ops:observe-crons
$env:REVORY_CRON_JOB="weekly_digest"; $env:REVORY_CRON_LOG_WINDOW="1h"; npm run ops:observe-crons
Remove-Item Env:REVORY_CRON_JOB -ErrorAction SilentlyContinue
Remove-Item Env:REVORY_CRON_LOG_WINDOW -ErrorAction SilentlyContinue
```

Current next windows: retention after 2026-08-19 05:15 UTC (02:15 Brasília) and weekly digest after 2026-08-24 13:00 UTC (10:00 Brasília).
