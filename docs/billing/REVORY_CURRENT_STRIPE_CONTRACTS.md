# REVORY current Stripe contracts

Effective 2026-07-30. Prices remain commercial hypotheses until paid use validates them.

| Offer key | Public | Amount | Mode | Interval | Environment variable |
|---|---:|---:|---|---|---|
| `QUOTE_RECOVERY_AUDIT` | yes | USD 399.00 | payment | none | `STRIPE_QUOTE_RECOVERY_AUDIT_PRICE_ID` |
| `STARTER` | yes | USD 399.00 | subscription | month | `STRIPE_STARTER_PRICE_ID` |
| `GROWTH` | yes | USD 599.00 | subscription | month | `STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID` |
| `FULL_REVENUE_LEAK_AUDIT` | no, preserved | historical contract | payment | none | `STRIPE_FULL_REVENUE_LEAK_AUDIT_PRICE_ID` |
| `PRO` | no, preserved | historical contract | subscription | month | `STRIPE_REVORY_PRO_MONTHLY_PRICE_ID` |

Checkout must fail closed unless the configured Stripe Price is active and exactly matches offer key, Price ID, USD currency, amount, mode and monthly interval where applicable. Audit consumption happens only when the user confirms the reviewed mapping and analysis. A completed Audit never creates a subscription. Existing subscriptions are not migrated or repriced automatically.

`REVORY_PAID_CHECKOUT_ENABLED` remains `false` until test-mode checkout, signed webhook, duplicate-event idempotency, entitlement, portal, end-of-period cancellation, payment failure and workspace-isolation gates pass. Price IDs and secrets belong only in environment configuration and must never be committed.
