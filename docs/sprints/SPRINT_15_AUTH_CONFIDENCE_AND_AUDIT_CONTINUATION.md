# Sprint 15 — Authentication confidence and Audit continuation

## Status

**IMPLEMENTED LOCALLY · QA PASSED · STRIPE SANDBOX CATALOG PREPARED · NO LIVE PAYMENT ACTIVATION, DEPLOY OR PUBLIC SALE.**

## Implemented evidence

- Email/password sign-up now requires password confirmation in the browser and in the server action. A successful creation or verification resend replaces the form with an accessible, persistent next-step card.
- Password-reset requests now end in the enumeration-safe `Check your inbox` state with the real 45-minute expiry. The token form confirms the new password in both client and server paths and ends in a persistent `Password updated` state.
- The reset service retains strength validation, durable rate limiting, single-use/expiry enforcement and session-version revocation. No confirmation value is logged or persisted.
- The authenticated Executive Read shows the Audit-to-Starter explanation only when the workspace has a completed Quote Recovery Audit baseline and no active Starter entitlement. It contains no checkout form, grants no entitlement and leaves the existing server-side Starter prerequisite unchanged.
- `npm run qa:sprint-15` passed the structural contract plus real local-database cases for mismatch, strength, success, replay, expiry and rate limiting.
- `npm run qa:sprint-15:browser` passed isolated desktop/mobile auth checks and proved the post-Audit card appears after the baseline and disappears after an active Starter entitlement.
- Full `lint`, `typecheck`, production `build`, Sprint 13 pricing regression, Sprint 14 product regression and Sprint 14 security regression passed on 2026-07-16.

- The public primary CTA now reaches pricing; the sample demo is a separate secondary path.
- `/demo` now mirrors the authenticated Executive Read, opportunity, Data Quality and finding-evidence hierarchy with fictional contractor records and no write, import, entitlement or checkout action.
- Public pricing now separates monthly plans from one-time Audits, shows cadence on every price, keeps Growth, Pro and Full Revenue Leak Audit closed, and contains no annual billing control.
- `npm run qa:sprint-15`, `npm run qa:sprint-15:browser`, `npm run qa:public-demo`, `npm run qa:public-demo:browser`, `npm run qa:sprint-13`, `npm run qa:sprint-13:browser`, `npm run qa:sprint-14`, `npm run qa:active-copy`, `npm run lint`, `npm run typecheck` and the production build passed on 2026-07-16.
- The founder-authorized Stripe sandbox now contains the US$799 paid-once Quote Recovery Audit and the US$399/month Starter. This external preparation does not enable checkout or change an entitlement.

Sprint 14 already has the local landing, demo, pricing-screen and buyer-language work. This sprint fixes two user-facing moments that are currently technically functional but unclear: email/password access and the next step after a completed Audit.

## Decisions

1. Sign-up and password reset use `Password` plus `Confirm password`.
2. Success is a persistent confirmation card with a next action; never a toast alone.
3. Password-reset requests keep neutral wording and never reveal whether an account exists.
4. The US$799 Audit establishes the baseline; Starter is US$399/month only after that completed baseline. The UI explains this directly after the Audit, but Stripe remains disabled.

## Scope

### 15.1 Account creation

- Add `Confirm password` to email/password sign-up. Sign-in keeps one password field.
- Validate mismatch before submit and again on the server. Never log or persist confirmation values.
- Preserve the current password-strength, verification and rate-limit protections.
- On success, replace the form with an accessible card: `Account created`, state that a confirmation email was sent, tell the user to open it, and offer a safe route to sign-in or re-send when supported.
- Keep errors visible, specific and keyboard/screen-reader accessible.

### 15.2 Password recovery

- On reset request, replace the form with `Check your inbox`. Use enumeration-safe language: `If an email/password REVORY account matches this address, we sent a reset link.` Include the 45-minute expiry and sign-in link.
- Add `Confirm new password` to the reset-token form with client and server validation.
- On success, replace the form with `Password updated` and one `Sign in` action. Do not auto-sign-in or claim session revocation unless it is implemented.
- Test valid, mismatched, expired, replayed and rate-limited cases. A toast can reinforce the result but cannot be the sole confirmation.

### 15.3 Audit to Starter

- In the completed Quote Recovery Audit journey (result, history and/or report), show one small continuation card:
  - `Your Audit establishes the baseline.`
  - `Starter keeps this review current with refreshed imports and movement over time.`
  - `US$399/month after the completed Audit.`
- Link to the commercial explanation. Before the release flag and Stripe lifecycle pass, it cannot show a payment button or claim immediate availability.
- Keep the existing server-side completed-Audit check as the only authority for Starter checkout. The card must never grant access.
- If an Audit-ready email is added, it is a bounded product-status message, not a sales sequence, and uses the same truthful availability state.

### 15.4 Verification

- Verify sign-up, duplicate pending account, verification, sign-in, reset request, reset confirmation and all error states on desktop and mobile.
- Verify focus, labels, `aria-live` status, and that password values are absent from telemetry/logs.
- Verify the continuation card is visible only after a completed Quote Recovery Audit and changes neither payment state nor entitlement.
- Run focused tests, typecheck/build and relevant browser checks. Commit Sprint 14 only after its documented QA passes.

### 15.5 Commercial CTA and product-faithful sample demo

- Restore the commercial hierarchy on the public home page: the primary header and hero CTA must take the buyer to the Quote Recovery pricing/offer path (`#pricing` or `/start`), never to the sample demo.
- Add a separate, visually secondary `View sample demo` action. It must be an intentional exploration path, not a replacement for pricing or account creation.
- Keep every pricing/Audit CTA pointed to the commercial explanation; no pricing card may silently route a buyer to `/demo`.
- Rebuild the public sample as a read-only sample workspace that reuses the authenticated product's dashboard, opportunities, Data Quality and finding-detail composition as closely as the public boundary allows. It must look and navigate like the paid REVORY product, not like a separate marketing mockup.
- Use only fictional contractor data and make the read-only/sample state obvious. No import, disposition, billing, account creation, entitlement or data persistence may be possible from the demo.
- Remove implementation-facing labels from the demo, including `source lineage`, and use the same buyer-language dictionary as the product.
- If a user signs in, they enter their private workspace. The public sample remains a separate, read-only route and must not masquerade as their workspace or change their session state.

### 15.6 Landing/demo verification

- Desktop and mobile browser checks prove the header/hero primary CTA reaches pricing and the sample CTA alone reaches `/demo`.
- Compare the demo's navigation, dashboard hierarchy, metric cards, opportunity list and finding detail against the authenticated product using the same synthetic fixture; document any deliberate read-only omission.
- Verify that the demo cannot import, mutate data, access a private workspace, create checkout or expose customer records.

### 15.7 Pricing hierarchy and Full Audit clarity

- Bring the public `#pricing` section and `/start` into the same explicit commercial hierarchy. Price alone must never make an Audit look like a monthly plan.
- Present the recurring group first, with truthful availability states:
  - `Starter — US$399/month`, after the completed US$799 Quote Recovery Audit;
  - `Growth — US$799/month`, closed until its release gate;
  - `Pro — US$1,499/month`, closed until its release gate.
- State once, directly above the recurring group: `Every ongoing plan begins with the matching one-time Audit.`
- Present a separate `Start with an Audit` group beneath it:
  - `Quote Recovery Audit — US$799 paid once`, leading only to Starter continuity when the recurring gate is open;
  - `Full Revenue Leak Audit — US$1,499 paid once`, explaining that it is the advanced estimate/job/invoice/change-order baseline and may later lead to Growth or Pro. It remains visibly closed until its evidence and release gates pass.
- Include a compact visual relationship, not a false price ladder:
  - `US$799 once Audit → US$399/month Starter`;
  - `US$1,499 once Full Audit → US$799/month Growth or US$1,499/month Pro` when those products are released.
- Preserve the single actionable Quote Recovery decision in the first commercial viewport. Growth, Pro and the Full Audit can be informative and collapsed/secondary, but they cannot disappear so completely that a buyer cannot tell the difference between the monthly US$1,499 Pro and the one-time US$1,499 Full Audit.
- Keep annual billing absent. No new Stripe price, checkout button, entitlement or public-availability claim may be added for Growth, Pro or the Full Audit.

### 15.8 Pricing verification

- Desktop and mobile checks prove every visible price includes its cadence (`paid once` or `per month`), the US$1,499 Full Audit is distinct from US$1,499/month Pro, and every closed offer is non-purchasable.
- Verify the public home and `/start` communicate the same audit-to-subscription tree without presenting an Audit as an included or automatically activated subscription.

## Non-goals

- No Stripe product/price, Checkout Session, portal, billing activation or annual plan.
- No Growth, Pro or Full Revenue Leak Audit sale, checkout, entitlement, CRM, automated follow-up or sales call. This sprint may explain their truthful future/closed state only.
- No change to evidence logic, imports/matching, retention policy or legal policy.

## Exit gate

1. [x] Password confirmation works in both client and server paths for sign-up and reset.
2. [x] All successful auth moments have durable, accessible next-step confirmations.
3. [x] Reset remains account-enumeration safe.
4. [x] The post-Audit Starter explanation is correct, gated and cannot enable payment or bypass the baseline.
5. [x] Browser and focused security regression checks pass.
6. [x] The primary public CTA returns to pricing, and the read-only demo is product-faithful rather than a separate mockup.
7. [x] Public pricing distinguishes every one-time Audit from every monthly plan, including the closed US$1,499 Full Revenue Leak Audit.

## Actual work remaining after Sprint 15

These are external activation tasks, not product features:

1. final CNPJ/legal entity details plus a refund/cancellation decision and legal review of Terms, Privacy and DPA;
2. Stripe sandbox lifecycle tests and later production lifecycle tests for the configured US$799 Audit and US$399/month Starter;
3. one isolated database restore, external uptime alert and MFA/recovery-owner check for operating accounts;
4. one customer-shaped usefulness test, then paid evidence before public availability is claimed.

Resend is not a new blocker: the founder confirmed a delivered password-reset email on 2026-07-16. Keep its redacted provider and delivery-webhook references outside the repository.
