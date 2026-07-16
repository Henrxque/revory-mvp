# Sprint 16 — Production operations and recovery evidence

## Status

**PLANNED · START ONLY AFTER STRIPE CONFIGURATION AND TEST-MODE LIFECYCLE PASS.**

This sprint intentionally holds the four external operations tasks deferred from the pre-commercial work: cron observation, uptime monitoring, isolated backup restore and MFA/recovery ownership. They remain important launch controls, but they are not customer-facing product features and should not distract from Sprint 15 or Stripe setup.

## Prerequisites

1. Sprint 15 is complete.
2. Stripe has the US$799 Quote Recovery Audit and US$399/month Starter configured in test mode.
3. Test checkout, signed webhook fulfillment, duplicate-event handling and customer portal have passed end to end.

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
