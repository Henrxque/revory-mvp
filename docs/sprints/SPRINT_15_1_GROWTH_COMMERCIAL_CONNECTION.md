# Sprint 15.1 — Growth commercial connection

## Status

**IMPLEMENTED LOCALLY · STRIPE PRICE AND SIGNED WEBHOOK CONNECTED · LIVE CHECKOUT STILL GATED.**

This sprint records the founder's 2026-07-17 decision that **Growth at US$799/month is REVORY's main recurring plan**. It supersedes the prior presentation of Growth as a future-only offer without rewriting the historical evidence from Sprints 13–15.

## Product decision

- Growth is the recommended recurring plan and can start directly.
- Growth includes recurring Quote Recovery access, 12-month movement history, source/owner/service segmentation and one focused weekly management read with PDF.
- The Quote Recovery Audit remains a US$799 paid-once first-read option.
- Starter remains US$399/month and retains its server-enforced completed Quote Recovery Audit prerequisite.
- Pro at US$1,499/month and the Full Revenue Leak Audit at US$1,499 paid once remain gated until their own commercial release decisions.
- No annual price or automatic Audit bundle is introduced.

## Billing contract

- `GROWTH` is a commercially available `subscription` offer in the new REVORY offer catalog.
- Its dedicated environment key is `STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID`.
- The legacy `STRIPE_GROWTH_PRICE_ID` remains protected migration input and is not reused.
- Checkout, webhook and subscription synchronization already enforce exact offer, customer, workspace and price ownership before granting an entitlement.
- `REVORY_PAID_CHECKOUT_ENABLED` remains the final fail-closed activation switch.

## External configuration completed

- Growth is linked to Stripe price `price_1TuAbnRiSOuAN93TwhJwrpBY` in Vercel Production and Preview.
- Stripe destination `revory-production-billing` points to `https://revory.app/api/billing/webhook`.
- The destination listens only to Checkout completion, subscription create/update/delete and invoice paid/payment-failed events.
- Its signing secret is stored as sensitive `STRIPE_WEBHOOK_SECRET` in Vercel Production and Preview; no secret is stored in the repository.
- The Stripe product description now presents Growth as REVORY's main recurring Quote Recovery plan without Full Audit or release-gated language.

## Activation gate

Growth may appear as the main plan before charging is enabled, but the CTA cannot create a Checkout Session until all of the following pass:

1. the current live Stripe secret is stored in Vercel;
2. a signed webhook points to `https://revory.app/api/billing/webhook`;
3. the dedicated Growth price exists in the deployed environment;
4. checkout completion, webhook replay, subscription update/cancellation and entitlement revocation pass end to end;
5. the Stripe account's required verification tasks no longer block payment capability;
6. only then is `REVORY_PAID_CHECKOUT_ENABLED=true` applied.

The current implementation deliberately keeps charging unavailable until this gate is proven.
