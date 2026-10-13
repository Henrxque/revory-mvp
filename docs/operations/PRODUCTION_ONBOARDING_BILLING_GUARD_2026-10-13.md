# Production onboarding: historical billing guard

Observed on `revory.app`: a newly created account was redirected from `/app` to `/start`, where Quote Recovery prices and checkout were shown. The public AI SaaS presentation is the only new-product experience authorized for production; the AI SaaS paid workspace is not live.

## Route decisions

| Route | Classification | Decision |
| --- | --- | --- |
| `/app` | keep | Preserve access for entitled historical customers and admins. Send a new account without a historical billing relationship to `/ai-integrity/account-preview` instead of Quote Recovery billing. |
| `/start` | adapt | Preserve historical customer checkout and plan management; redirect new AI SaaS accounts to the account preview. |
| `/api/billing/checkout` | adapt | Enforce the same guard server-side before creating or reusing a Stripe customer or Checkout Session. |
| `/ai-integrity/account-preview` | add | Explain the current public scope to a signed-in new account and link to the static synthetic demo. |
| Authentication, legacy entitlements, Stripe webhooks, existing customer records | keep | No provider, schema, credential or historical Price ID changes. |

The historical cohort includes accounts created through October 2, 2026, or accounts with a prior Stripe customer, legacy plan/billing state or any recorded entitlement. Admin and internal preview access remain available. The cutoff protects users who were already in the old journey when the public AI SaaS presentation launched. A new account without these signals sees the preview; no data upload, paid AI SaaS offer or customer analysis is exposed.

Before production promotion, verify: new account `/app` and direct `/start` reach account preview; direct legacy checkout does not create a Stripe session; an entitled historical account still reaches `/app`; a historical unpaid account can still reach `/start`; Google and email/password login still work. Record the deployment and rollback target. Do not promote the full AI SaaS migration branch as part of this fix.
