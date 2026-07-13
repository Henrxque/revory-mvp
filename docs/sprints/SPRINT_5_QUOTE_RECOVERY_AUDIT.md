# Sprint 5 — One-time Quote Recovery Audit

Status: locally implemented through the checkout boundary; commercial exit gate blocked.

## Implemented

- Dedicated `QUOTE_RECOVERY_AUDIT` and `STARTER` offer identities; legacy Stripe prices are not reused.
- One-time US$799 Checkout Session path and recurring US$399 Starter path.
- Idempotent checkout fulfillment into workspace-scoped entitlements.
- Application access recognizes new entitlements without removing legacy billing compatibility.
- Analysis snapshots, history route, executive printable report and CSV export.
- Checkout/webhook logging with workspace and offer context.
- Start page exposes checkout only when its exact sandbox price is configured.

## External blockers and exit

The local environment has no `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_QUOTE_RECOVERY_AUDIT_PRICE_ID`, `STRIPE_STARTER_PRICE_ID`, `RESEND_API_KEY` or `AUTH_EMAIL_FROM`. No external system was modified.

The exit gate is **failed/blocked**: a test customer cannot yet complete sandbox payment and webhook fulfillment. The locally implemented recurring slice does not override this dependency and Sprint 6 must not be called commercially complete until the payment gate passes.

The previously missing public sample workspace is now delivered at `/demo` with static synthetic contractor data, read-only dashboard/Data Quality/evidence views and a static CSV export. This closes the demo gap but does not change the blocked commercial gate.
