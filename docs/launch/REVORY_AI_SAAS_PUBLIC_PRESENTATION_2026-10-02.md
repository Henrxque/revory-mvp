# AI SaaS public presentation release

Decision: publish a premium public presentation and a **static synthetic demo** on `revory.app` now. This is a narrow presentation release, not the AI SaaS product launch. The founder explicitly selected this scope on 2026-10-02. The full migration/paid launch remains `NO_GO` until its gates close.

## Route decisions and replacement dependencies

| Route | Class | Action in this release | Later dependency |
| --- | --- | --- | --- |
| `/` | **adapt** | Present AI SaaS direction, limitations and synthetic-demo CTA. No data or purchase CTA. | Replace with commercial landing only after real product, claims, pricing and legal gates. |
| `/ai-integrity/demo` | **add** | Static fictional example with visible calculation and limits. No API/DB requests. | Replace or extend only when an actual engine-backed public demo passes QA. |
| `/ai-integrity/preview-policy` | **add** | Explain exactly what is and is not available. | Replace with approved commercial terms/privacy once real data is accepted. |
| `/demo`, `/start`, `/app`, auth, billing, legal and API routes | **keep** | Preserve existing Quote Recovery behavior for current customers. Public AI navigation links only to existing-customer sign-in. | Route-by-route inventory, customer/entitlement review and tested replacement before any retirement. |
| Google OAuth, e-mail/password, Resend, Stripe plumbing, Prisma schema/migrations, Vercel/domain | **keep** | No configuration or data changes. | Operational and product-specific gates before new customer data or checkout. |

The public home no longer redirects an already signed-in legacy customer automatically; its navigation offers an explicit existing-customer sign-in path. Existing `/app` access is unchanged.

## Claim and data boundary

The pages say “being built” and “fictional example”; they do not state that scans, connected sources, subscriptions or price tiers are available. The example uses a provider cost of USD 2,455.75, linked cost USD 1,840.50, unattributed cost USD 615.25, provider usage 9,020,000 tokens and internal ledger 8,640,000 tokens. The two differences are displayed separately. No revenue leakage, customer margin or financial value from token delta is inferred.

No new form, upload, checkout, telemetry event, API route, Prisma model or migration is part of this release. The existing legacy app and external services remain in place. Public pages use `noindex` while the new product remains in preview.

## Release verification

Before production promotion: TypeScript, lint, production build and browser review at desktop/mobile; inspect links and copy for current capabilities; confirm the diff contains no migrations or billing/auth changes. Preview deployment must be `READY` on the release branch. After promotion: verify `revory.app` serves the AI SaaS preview title and the synthetic demo, while `/demo`, `/start`, `/app`, login and health remain available; record the deployment ID and rollback target. A full commercial launch still follows the separate AI SaaS gate runbook in the migration branch.

Local checks completed: `npm run typecheck` and `npm run lint` passed. `npm run build` passed with a disposable local `AUTH_SECRET`; no production secret was read. Production-mode build generated the three new public routes as static pages and retained all legacy routes. Browser checks at 1280 px and 390 px passed: new home/demo/scope pages, old `/demo`, no client errors or horizontal overflow. Desktop and mobile screenshots were inspected for brand hierarchy, readable cards and honest synthetic labels. Vercel Preview and domain smoke checks remain deployment steps.
