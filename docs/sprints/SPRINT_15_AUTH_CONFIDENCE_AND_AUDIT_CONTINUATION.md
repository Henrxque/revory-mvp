# Sprint 15 — Authentication confidence and Audit continuation

## Status

**IMPLEMENTED LOCALLY · QA PASSED · NO PAYMENTS, DEPLOY OR PUBLIC SALE.**

## Implemented evidence

- Email/password sign-up now requires password confirmation in the browser and in the server action. A successful creation or verification resend replaces the form with an accessible, persistent next-step card.
- Password-reset requests now end in the enumeration-safe `Check your inbox` state with the real 45-minute expiry. The token form confirms the new password in both client and server paths and ends in a persistent `Password updated` state.
- The reset service retains strength validation, durable rate limiting, single-use/expiry enforcement and session-version revocation. No confirmation value is logged or persisted.
- The authenticated Executive Read shows the Audit-to-Starter explanation only when the workspace has a completed Quote Recovery Audit baseline and no active Starter entitlement. It contains no checkout form, grants no entitlement and leaves the existing server-side Starter prerequisite unchanged.
- `npm run qa:sprint-15` passed the structural contract plus real local-database cases for mismatch, strength, success, replay, expiry and rate limiting.
- `npm run qa:sprint-15:browser` passed isolated desktop/mobile auth checks and proved the post-Audit card appears after the baseline and disappears after an active Starter entitlement.
- Full `lint`, `typecheck`, production `build`, Sprint 13 pricing regression, Sprint 14 product regression and Sprint 14 security regression passed on 2026-07-16.

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

## Non-goals

- No Stripe product/price, Checkout Session, portal, billing activation or annual plan.
- No Growth, Pro, Full Revenue Leak Audit, CRM, automated follow-up or sales call.
- No change to evidence logic, imports/matching, retention policy or legal policy.

## Exit gate

1. [x] Password confirmation works in both client and server paths for sign-up and reset.
2. [x] All successful auth moments have durable, accessible next-step confirmations.
3. [x] Reset remains account-enumeration safe.
4. [x] The post-Audit Starter explanation is correct, gated and cannot enable payment or bypass the baseline.
5. [x] Browser and focused security regression checks pass.

## Actual work remaining after Sprint 15

These are external activation tasks, not product features:

1. final CNPJ/legal entity details plus a refund/cancellation decision and legal review of Terms, Privacy and DPA;
2. Stripe test-mode and production lifecycle tests for the US$799 Audit and US$399/month Starter;
3. one isolated database restore, external uptime alert and MFA/recovery-owner check for operating accounts;
4. one customer-shaped usefulness test, then paid evidence before public availability is claimed.

Resend is not a new blocker: the founder confirmed a delivered password-reset email on 2026-07-16. Keep its redacted provider and delivery-webhook references outside the repository.
