# Sprint 6 — Starter recurring loop and paid beta

Status: recurring product slice implemented locally; paid-beta release gate remains closed.

## Implemented

- Second-read comparison for new, persistent, worsening and resolved findings.
- Customer-confirmed recovered disposition and recovered value kept separate from estimated opportunity.
- Saved canonical mappings continue to refresh through secure import.
- Weekly digest preference and authenticated cron endpoint with minimized email payload and idempotency key.
- Existing billing portal retained; Starter uses its dedicated US$399 price identity.
- Workspace JSON export, configurable retention policy, destructive analysis-data deletion and audit events.
- Structured logs for digest, export and deletion operations.
- Tenant authorization enforced server-side on settings, export and finding dispositions.

## Deliberate gates

- Stripe checkout/webhook cannot be verified until the company setup is complete and dedicated Stripe sandbox values are configured.
- Resend delivery remains paused until its API key and verified sender exist.
- Automated retention enforcement, production backup/restore exercise, external monitoring and production security scan require the deployment environment.
- The authenticated Sprint 4 browser harness still needs a valid local NextAuth test session.

## Exit

**Implementation ready, paid-beta gate not passed.** Nothing in public copy claims Starter is available today.
