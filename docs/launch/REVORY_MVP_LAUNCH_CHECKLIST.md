# REVORY MVP Launch Checklist

Use this checklist before beta or first paid launch.

Status legend:

- `[ ]` Not verified yet.
- `[x]` Verified locally by Codex/QA.
- `[manual]` Henrique must verify manually with real production accounts, credentials or customer-facing assets.

## 1. Environment Variables

- `[manual]` `DATABASE_URL` points to the intended production database.
- `[manual]` `NEXT_PUBLIC_APP_URL` points to the final production URL.
- `[manual]` `AUTH_SECRET` is a strong production secret, not the local/dev value.
- `[manual]` Google OAuth credentials are production-ready if Google login is enabled:
  - `AUTH_GOOGLE_CLIENT_ID`
  - `AUTH_GOOGLE_CLIENT_SECRET`
- `[manual]` Password reset email is configured:
  - `RESEND_API_KEY`
  - `AUTH_EMAIL_FROM`
- `[manual]` Stripe billing envs are configured:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_BASIC_PRICE_ID`
  - `STRIPE_GROWTH_PRICE_ID`
- `[manual]` OpenAI/LLM envs are configured only if AI CSV assistance will be enabled:
  - `OPENAI_API_KEY`
  - model/provider envs used by the project
  - `REVORY_LLM_ENABLED=true`
- `[manual]` If running launch QA without real AI calls, set `REVORY_LLM_ENABLED=false` on the local server.

## 2. Database Migrated

- `[x]` Local Prisma schema validation passed.
- `[x]` Local environment check reported pending migrations: `0`.
- `[manual]` Production database has run the current Prisma migration set.
- `[manual]` Production database has the `RevenueLeak` table and required indexes.
- `[manual]` No destructive reset/drop workflow is used for production.

Recommended commands:

```powershell
npx prisma validate
npm run db:validate
npm run env:check
```

## 3. Stripe / Products / Prices Verified

- `[manual]` Stripe product for Basic exists.
- `[manual]` Stripe product for Growth exists.
- `[manual]` `STRIPE_BASIC_PRICE_ID` maps to the Basic entry plan.
- `[manual]` `STRIPE_GROWTH_PRICE_ID` maps to the Growth full MVP plan.
- `[manual]` Premium is not sold as an active checkout plan.
- `[manual]` Checkout success URL returns the user to the app correctly.
- `[manual]` Checkout cancel URL returns to pricing/start correctly.
- `[manual]` Stripe webhook updates workspace billing state correctly.
- `[manual]` Customer portal opens for active customers.
- `[manual]` Cancel/downgrade/renewal behavior is understood before launch.

Launch blocker if not verified:

- Real Basic/Growth checkout and webhook sync.

## 4. Auth / Password Reset Verified

- `[x]` Auth pages build and render locally.
- `[manual]` Google login works on production domain.
- `[manual]` Email/password sign-up works on production domain.
- `[manual]` Sign-in works after account creation.
- `[manual]` Forgot password sends an email to a real inbox.
- `[manual]` Reset password link opens correctly on production URL.
- `[manual]` Reset token expires/rejects correctly.

Launch blocker if not verified:

- Production sign-up/sign-in/reset flow.

## 5. Transactional Email Verified

- `[manual]` Sender domain is verified in the email provider.
- `[manual]` `AUTH_EMAIL_FROM` uses a real sender.
- `[manual]` Password reset email is delivered to Gmail/Outlook or the target buyer inbox.
- `[manual]` Email content references REVORY correctly and does not say REVORY Seller.
- `[manual]` Reset links use the final production URL.

Launch blocker if not verified:

- Password reset email delivery.

## 6. OpenAI / LLM Provider Smoke Tested With Synthetic CSV

- `[x]` Deterministic fallback and mocked AI CSV QA passed locally.
- `[manual]` Real provider smoke test passed with synthetic CSV/profile data only.
- `[manual]` Real provider returns strict structured output.
- `[manual]` Real provider keeps `reviewRequired=true`.
- `[manual]` Real provider does not receive full CSV data.
- `[manual]` Timeout/fallback behavior remains safe.

Recommended command:

```powershell
npm run smoke:ai-csv-provider
```

Launch blocker if AI is enabled:

- Real provider smoke test must pass before presenting AI CSV assistance as production-ready.

## 7. Deterministic Fallback Verified

- `[x]` `npm run qa:ai-csv-intake` passed.
- `[x]` Deterministic dataset classification works.
- `[x]` AI disabled path falls back safely.
- `[x]` Invalid AI JSON falls back safely.
- `[x]` No RevenueLeak rows are created by AI CSV intake.

## 8. Appointment Import Verified

- `[x]` Browser launch QA imported appointment CSV.
- `[x]` Latest clean rerun imported `72` final appointment fixture rows.
- `[manual]` One production-like appointment CSV from a real target clinic export has been tested without sensitive data exposure beyond intended import.

## 9. Client Import Verified

- `[x]` Browser launch QA imported client CSV.
- `[x]` Latest clean rerun imported `196` final client fixture rows.
- `[manual]` One production-like client CSV from a real target clinic export has been tested without sensitive data exposure beyond intended import.

## 10. AI CSV Intake Review Verified

- `[x]` CSV triage/fallback appears in the browser flow.
- `[x]` User review is required before import.
- `[x]` Mapping confirmation is required before persistence.
- `[x]` Full CSV is not sent to AI in the AI triage contract.
- `[manual]` Henrique has reviewed the copy and is comfortable explaining AI-assisted mapping as advisory.

## 11. Run Leak Read Verified

- `[x]` Browser launch QA clicked `Run leak read`.
- `[x]` Leak read created persisted RevenueLeak rows.
- `[x]` Latest clean rerun produced `14` persisted RevenueLeak rows.
- `[x]` Latest clean rerun produced `14` active financial RevenueLeak rows.
- `[manual]` Henrique has tested Run leak read after importing one realistic customer-shaped file.

## 12. Dashboard Verified

- `[x]` Dashboard builds.
- `[x]` Browser launch QA verified the dashboard after import.
- `[x]` Browser launch QA verified `Estimated Revenue at Risk This Month`.
- `[x]` Browser launch QA verified honesty copy: estimate, not confirmed accounting loss.
- `[manual]` Henrique has reviewed dashboard screenshots and is comfortable demoing the current read.

## 13. Revenue Leaks Page Verified

- `[x]` `/app/revenue-leaks` exists and builds.
- `[x]` Browser launch QA verified the page route.
- `[x]` Browser launch QA verified visible leak cards after manual leak read.
- `[x]` Revenue Leaks Page QA passed.
- `[manual]` Henrique has reviewed the page with realistic fixture data and can explain financial vs operational/data-quality risks.

## 14. Daily Leak Brief Verified

- `[x]` Daily Leak Brief QA passed.
- `[x]` Browser launch QA verified Daily Leak Brief visibility on dashboard.
- `[manual]` Henrique has reviewed the Daily Leak Brief copy and understands it does not send email/Slack/notifications in MVP.

## 15. Executive Summary Copy / Share / Print Verified

- `[x]` Executive Revenue Leak Summary QA passed.
- `[x]` Browser launch QA verified Growth gate visibility.
- `[x]` Browser launch QA verified `Copy summary` button is visible for Growth.
- `[x]` Browser launch QA verified `Print or save PDF` button is visible for Growth.
- `[manual]` Henrique should manually click copy/share/print in the browser before a real demo.
- `[manual]` Henrique should confirm Basic does not receive Growth-only copy/share/print affordances.

## 16. Privacy / Terms Checked

- `[x]` Privacy route builds.
- `[x]` Terms route builds.
- `[x]` Browser launch QA loaded Privacy and Terms.
- `[x]` Product truth copy clarifies:
  - revenue at risk is estimated;
  - operational/data-quality risks are not confirmed financial loss;
  - AI CSV Intake is advisory and requires review;
  - full CSV is not sent to AI;
  - REVORY is not CRM, inbox, scheduling system, RCM, BI suite, clinical/diagnostic software or legal/accounting advice.
- `[manual]` Henrique should do final legal/business review before publishing.

## 17. Pricing / Start Checked

- `[x]` `/start` builds.
- `[x]` Browser launch QA verified `/start` behavior.
- `[x]` Copy is aligned with:
  - Basic public and limited;
  - Growth full MVP and main plan;
  - Premium future/not available.
- `[manual]` Henrique should verify final prices, checkout plan mapping and CTA behavior in production.

## 18. Final Browser Clean Rerun Executed With Local Server

- `[x]` `npm run qa:launch-readiness` passed locally.
- `[x]` Evidence saved to `.tmp/manual-audit/rerun`.
- `[x]` Screenshots were generated for setup, imports, dashboard, Revenue Leaks, Executive Summary gate, Privacy, Terms and final `/start` behavior.

Recommended local flow:

```powershell
$env:REVORY_LLM_ENABLED="false"; npm run dev
npm run qa:launch-readiness
```

## 19. Founder Demo Script Ready

- `[manual]` Founder demo script prepared.
- `[manual]` Demo script uses this structure:
  - "REVORY detects estimated revenue at risk from clinic data."
  - Upload appointments CSV.
  - Upload clients CSV.
  - Review mapping before import.
  - Run leak read.
  - Show dashboard estimated revenue at risk.
  - Open Revenue Leaks Page.
  - Show Daily Leak Brief.
  - Open Executive Summary.
  - Explain limitations honestly.
- `[manual]` Demo script avoids:
  - guaranteed recovery;
  - confirmed lost revenue;
  - CRM/inbox/BI positioning;
  - connectors;
  - automatic follow-up;
  - broad AI agent claims.

## 20. First Customer Onboarding Checklist Ready

- `[manual]` First customer onboarding checklist prepared.
- `[manual]` Customer should provide:
  - appointment CSV;
  - client CSV;
  - approximate appointment value / average deal value;
  - main offer;
  - booking path context.
- `[manual]` Customer should be told before signup:
  - payments files are not supported yet;
  - leads can be profiled but not imported/persisted yet;
  - CSV must be comma-separated;
  - multiline quoted cells may need re-export;
  - AI mapping is advisory;
  - revenue at risk is estimated.

## What Codex Could Not Verify

- Production Stripe checkout.
- Stripe webhook delivery from live/test Stripe dashboard.
- Customer portal in production.
- Production Google OAuth callback.
- Production email/password auth on final domain.
- Production password reset delivery.
- Production sender-domain reputation.
- Real OpenAI/LLM provider success if current credentials timeout or are absent.
- Real customer CSV shape outside the repository fixtures.
- Legal sufficiency of Privacy/Terms.

## What Henrique Must Verify Manually

- Final production domain and callback URLs.
- Stripe Basic/Growth product and price mapping.
- Stripe webhook endpoint and secret.
- Real checkout success/cancel flow.
- Customer portal.
- Password reset email delivery.
- Google login on production domain.
- Real provider AI CSV smoke test with synthetic data.
- First customer CSV import using a safe non-sensitive sample or sanitized export.
- Final demo script.
- First customer onboarding checklist.

## Launch Blockers

Do not launch paid beta until these are complete:

- Production database migrated.
- Production auth works.
- Production password reset email works.
- Stripe Basic/Growth checkout works.
- Stripe webhook sync works.
- Pricing/start page maps to the correct Stripe prices.
- If AI CSV is enabled, real-provider smoke test passes with synthetic data.
- Final browser clean rerun passes against the intended launch environment or a production-like environment.

## Nice-To-Have After Launch

- Production seed/demo workspace for controlled demos.
- Better parser support for multiline quoted CSV fields.
- Safer non-comma delimiter import support.
- Lead import persistence, if it remains strategically useful.
- Provider utilization/treatment gap leak types.
- Post-launch technical rename pass for proof-era internal names.
- Post-launch rewrite or retirement of old LLM fallback QA fixture.
