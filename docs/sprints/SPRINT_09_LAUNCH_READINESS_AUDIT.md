# Sprint 09 - Launch Readiness Audit

## 1. Current launch readiness status

**Status: technically strong, commercially not fully launch-ready until production credentials and final copy cleanup are completed.**

The core MVP is materially in good shape:

- Public positioning is now REVORY as a Revenue Leak Detector for premium MedSpas.
- Auth surfaces are real: Google is conditional on configuration, email/password exists, and password reset is wired.
- Billing has a coherent MVP strategy: Basic and Growth are checkout-capable when configured; Growth is the full product; Premium is future-only.
- Onboarding is short, self-service and MedSpa-first.
- Imports work end to end with deterministic fallback and required mapping review.
- AI CSV Intake is bounded and advisory, not a persistence or revenue-truth layer.
- Dashboard, Revenue Leaks Page, Daily Leak Brief and Executive Revenue Leak Summary are backed by persisted `RevenueLeak` reads.
- Legal pages exist and say the correct product truth: estimated revenue at risk, not confirmed accounting loss.
- Local env is coherent: database reachable, migrations applied, critical columns present.

Launch readiness is not blocked by the leak engine or app architecture. The remaining launch risk is mostly **production readiness and semantic cleanup**.

## 2. MVP-critical blockers

These are blockers for a real paid launch, not blockers for local QA.

1. **Production Stripe configuration must be validated.**
   - Basic and Growth checkout depend on `STRIPE_SECRET_KEY`, `STRIPE_BASIC_PRICE_ID`, `STRIPE_GROWTH_PRICE_ID`, webhook secret and Stripe portal configuration.
   - `isStripeBillingConfigured()` currently treats Growth as the primary readiness signal, which is correct.
   - Basic can still open checkout if `STRIPE_BASIC_PRICE_ID` is configured.
   - Premium is correctly disabled at runtime.

2. **Webhook and post-checkout sync need a real test.**
   - Code exists for checkout, portal and webhook.
   - Local checks do not prove Stripe webhook delivery in the production domain.
   - A failed webhook would create a bad first paid-user experience: payment succeeds but app access may remain pending unless `/start?checkout=success&session_id=...` sync covers the case.

3. **Google OAuth and auth URL configuration need production validation.**
   - Google only appears when credentials are configured, which is good.
   - Clean rerun logs still show a `NEXTAUTH_URL` warning.
   - For launch, the canonical production auth URL must be configured to avoid callback/session confusion.

4. **Password reset delivery needs launch email credentials.**
   - Reset logic is wired.
   - The UI honestly says delivery needs configuration if missing.
   - Real launch requires `AUTH_EMAIL_FROM` and email provider credentials to send reset links.

5. **Real provider smoke test is still needed for AI CSV Intake.**
   - Mocked QA passed and privacy boundaries are good.
   - Production readiness still needs one synthetic CSV smoke test with the real configured model provider.

## 3. Non-blocking polish items

1. **Import completion copy still says "booked visibility."**
   - Found in `src/app/(app)/app/imports/actions.ts`.
   - This should become "clinic data visibility", "appointment evidence" or "revenue read evidence".
   - Not a functional blocker, but it is launch-facing copy drift.

2. **Imports page still renders `DailyBookingBrief`.**
   - Found in `src/app/(app)/app/imports/page.tsx`.
   - Dashboard already uses `DailyLeakBrief`.
   - This is semantically old but not a runtime blocker.
   - Recommended Sprint 09 fix: replace visible imports brief with `DailyLeakBrief` or remove the brief from imports.

3. **Setup source option says "fastest path to booked visibility."**
   - Found in `src/app/(app)/app/setup/[step]/page.tsx`.
   - Should become "fastest path to appointment evidence" or "fastest path to the revenue leak read."

4. **Technical names still contain proof/seller/booking vocabulary.**
   - Examples: `EXECUTIVE_PROOF_SHARE`, old proof components, `seller-voice-labels`.
   - Mostly internal/historical and not launch-blocking.
   - Do not rename broad internals before launch unless visible copy is affected.

5. **Browser console warnings during clean rerun.**
   - NextAuth URL warning.
   - Logo image aspect-ratio warning.
   - Smooth-scroll warning.
   - The auth URL warning is production-relevant; the image/smooth-scroll warnings are polish.

## 4. Billing/pricing risks

Current plan strategy is coherent:

- **Basic**: public, lower-priced, limited entry plan.
- **Growth**: main complete Launch V1 plan.
- **Premium**: future tier, not checkout-enabled, no manual-fit motion.

Implementation observations:

- `/start` clearly makes Growth the primary card.
- Basic links to `/api/billing/checkout?plan=basic`.
- Growth links to `/api/billing/checkout?plan=growth`.
- Premium has no checkout href and renders as disabled "Coming later."
- Runtime blocks Premium checkout even if a query asks for it.
- Billing gates currently keep Manual Quick Add and Executive Summary copy/share/print Growth-only.

Risks:

- If Basic price ID is configured incorrectly or not configured while Basic is public, Basic checkout will redirect to unavailable. That is honest but bad for conversion.
- `isStripeBillingConfigured()` only checks Growth readiness. That matches the Growth-first strategy but does not guarantee Basic checkout readiness.
- Stripe portal readiness depends on Stripe customer identity and production portal configuration.
- The feature key `EXECUTIVE_PROOF_SHARE` is semantically old but behaviorally correct.

Launch requirement:

- Test Basic checkout, Growth checkout, cancel URL, success URL, webhook sync and portal return on the final domain.

## 5. Legal/privacy/terms risks

Legal and trust copy is directionally correct:

- Privacy describes structured appointment/client/import data, revenue leak reads, estimated revenue at risk, data quality checks, bounded AI intake/triage and executive summaries.
- Terms explicitly say REVORY is not CRM, inbox, scheduling system, healthcare BI, RCM, clinical/diagnostic software or managed consulting.
- Terms state revenue at risk is estimated, not confirmed accounting loss.

Risks:

- Legal pages are minimal. This is acceptable for MVP readiness but not a substitute for lawyer-reviewed production terms.
- Privacy mentions "support channel provided during purchase or onboarding" but the current app does not expose a clear support destination in the legal surface.
- If real clinics upload patient/client data, production privacy review should confirm whether any HIPAA/BAA-related positioning is needed. Do not add HIPAA claims unless legally true.

Launch recommendation:

- Keep current legal copy, but add a real contact email/support path before paid traffic.
- Do not add compliance claims before they are operationally true.

## 6. AI CSV production-readiness risks

Sprint 08 implementation is narrow and aligned:

- AI is advisory.
- AI does not persist imports.
- AI does not create `RevenueLeak` rows.
- AI does not calculate revenue.
- User review is required.
- Invalid AI JSON falls back to deterministic mapping.
- AI-disabled mode works.
- Provider payload is bounded and sanitized.

Follow-up points:

1. **Real provider smoke test still needed.**
   - Mocked QA passed.
   - Production smoke test should use synthetic data only.

2. **Parser does not support multiline quoted CSV fields.**
   - This is a known limitation from the existing line-oriented parser.
   - Launch risk: some exports with notes or addresses spanning lines may fail or misread.
   - Recommendation: document/reject clearly, or add parser support only if buyer files show this format.

3. **Non-comma delimiters are detected but blocked for import.**
   - This is honest and safe.
   - Launch risk: some users export semicolon CSVs, especially depending on locale.
   - Recommendation: keep detection and explicit re-export message for launch. Do not expand parser/import behavior unless this becomes frequent.

4. **LEADS can be classified but are not importable/persisted.**
   - Current behavior is correct if the UI labels it as unsupported or lower-confidence coverage.
   - Launch risk: a buyer may expect lead import after seeing "Leads" detected.
   - Recommendation: keep the blocked/unsupported framing explicit. Do not add lead persistence before launch.

5. **Import completion copy still contains legacy booked visibility language.**
   - This should be fixed in Sprint 09 because it is visible and cheap.

## 7. Import copy/naming issues

Must tighten before launch:

- `Finish workspace activation before updating booked visibility.`
- `Booked visibility updated successfully using the confirmed mapping for this file.`
- `Booked visibility updated with partial row rejection...`
- Setup source note: `fastest path to booked visibility.`

Recommended replacements:

- `Finish workspace activation before updating clinic data visibility.`
- `Clinic data visibility updated successfully using the confirmed mapping for this file.`
- `Clinic data visibility updated with partial row rejection...`
- `Best when this clinic already has appointment exports and wants the fastest path to appointment evidence.`

Can stay temporarily:

- "Booking path" as a setup concept.
- "Booking path risk" as operational leak-risk language.
- Internal legacy names that do not leak into public positioning.

Should not be done before launch:

- broad rename of all booking/proof internals;
- database model renames;
- billing feature-key migration solely for naming.

## 8. End-to-end journey risks

Validated happy path:

- `/start` authenticated workspace flow;
- setup/activation;
- appointment CSV import;
- client CSV import;
- dashboard rendering;
- deterministic AI-disabled fallback;
- six-month import fixtures;
- persisted data sources and Growth workspace state.

Clean rerun result:

- `npm run qa:clean-rerun` passed.
- Evidence saved under `.tmp/manual-audit/rerun`.
- Final workspace: Growth, active, 72 appointment rows, 196 client rows, 200 clients.

Risks:

- The clean rerun uses a QA shortcut to create active billing state. It does not prove real Stripe checkout.
- The clean rerun disables AI, which proves fallback but not real provider success.
- It does not test real email/password reset delivery.
- It does not test real Google OAuth callback.
- It does not test browser interactions for Executive Summary copy/share/print in the current run.

## 9. QA gaps

Commands run:

| Command | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npm run db:validate` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run env:check` | Passed |
| `npm run qa:revenue-leaks` | Passed |
| `npm run qa:revenue-leak-read` | Passed |
| `npm run qa:revenue-leaks-page` | Passed |
| `npm run qa:daily-leak-brief` | Passed |
| `npm run qa:executive-revenue-leak-summary` | Passed |
| `npm run qa:ai-csv-intake` | Passed when run isolated |
| `npm run qa:clean-rerun` | Passed |

Important QA note:

- `npm run qa:ai-csv-intake` failed when run in parallel with revenue leak QA scripts because it checks global `RevenueLeak` row count while other suites create fixtures.
- It passed when run isolated.
- This is a QA harness concurrency issue, not a product bug.

Recommended QA hardening:

- Mark the QA suites as sequential in CI or scope AI CSV no-leak checks to isolated QA workspace rows instead of global row count.
- Add production-smoke scripts/checklists for Stripe, Google OAuth, password reset email and real AI provider.
- Add a small route/button smoke for legal links, `/start`, `/app/revenue-leaks`, `/app/imports`, dashboard, copy/share/print.

## 10. Recommended Sprint 09 implementation plan

Keep Sprint 09 as launch hardening only.

### P1 - Must do before paid launch

1. **Production config checklist and smoke protocol**
   - Confirm final `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`/auth URL, `AUTH_SECRET`, Google OAuth callback, Stripe keys, Stripe price IDs, webhook secret, portal config, email sender and model provider envs.
   - Add a short launch checklist doc or script output.

2. **Stripe live/test-mode end-to-end smoke**
   - Basic checkout.
   - Growth checkout.
   - Checkout cancel.
   - Checkout success.
   - Webhook subscription update.
   - Customer portal return.

3. **Auth production smoke**
   - Google sign-in/sign-up.
   - Email/password sign-up/sign-in.
   - Forgot password email delivery.
   - Reset password with token.

4. **Real AI provider synthetic smoke**
   - Use synthetic CSV with fake patient data.
   - Confirm provider returns strict JSON or falls back safely.
   - Confirm provider payload excludes raw names/emails/phones/notes.

5. **Replace launch-facing booked visibility copy**
   - Imports server messages.
   - Setup source note.

### P2 - Strongly recommended before launch

1. **Replace visible `DailyBookingBrief` on imports**
   - Use `DailyLeakBrief` or remove the brief from imports to avoid split mental model.

2. **Fix clean browser console polish**
   - Configure auth URL.
   - Fix logo image aspect ratio warning.
   - Add smooth-scroll data attribute if needed.

3. **Make unsupported file behavior extra clear**
   - Semicolon/tab/pipe files: "re-export as comma-separated CSV."
   - Leads: "detected, but not importable in Launch V1."
   - Payments: "unsupported."

4. **CI sequencing**
   - Avoid parallel DB-mutating QA suites until fixtures are fully isolated.

### P3 - Can wait until after launch

1. Rename internal feature key `EXECUTIVE_PROOF_SHARE`.
2. Retire old proof-era services/components.
3. Support multiline quoted CSV fields if real buyer exports require it.
4. Support non-comma delimiter import if it becomes frequent.
5. Add lead persistence only if it becomes central to paid buyer demand.

## 11. What NOT to implement before launch

Do not add:

- connectors;
- new leak types;
- AI dashboard insight;
- chatbot;
- background jobs;
- notifications/email digests;
- CRM or inbox behavior;
- BI charts/trends/reporting suite;
- payments import;
- lead persistence;
- provider roster;
- multi-location setup;
- custom workflow/task assignment;
- migration solely for naming cleanup;
- parser expansion unless it is blocking the first paying customer.

The product is already broad enough for Launch V1. Sprint 09 should remove friction and prove production readiness, not add product surface.

## 12. Final risk rating

**MEDIUM**

Reason:

- The product core is functional and has strong automated coverage.
- The major user journey passed clean browser rerun.
- The leak engine/read/page/brief/summary/import QA suites pass.
- No architectural blocker was found.

But:

- Paid launch still depends on real Stripe, webhook, Google OAuth, email delivery and AI provider smoke tests.
- Some visible copy still carries old booked-visibility language.
- Imports still expose an old Daily Booking Brief surface.
- QA suites should not be run in parallel without fixture isolation.

The right next move is a short Sprint 09 hardening pass, not a new feature sprint.
