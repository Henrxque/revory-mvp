# REVORY reuse and restore audit

> Status: active migration protection register. Updated 2026-07-12.

## Decision

REVORY is being rebuilt on the existing REVORY platform, not recreated from zero. Preserve working horizontal infrastructure and replace only domain-specific MedSpa semantics that would produce wrong data, claims or workflows.

## Classification matrix

| Surface | Current evidence | Decision | Action |
|---|---|---|---|
| Google OAuth | `GoogleProvider`, UI button, callbacks and production/preview env keys exist | Restore/keep | Sign-up restored; local env linkage restored; keep production config unchanged |
| Email/password auth | Credentials provider, verification and reset services exist | Keep | Preserve as second secure access path |
| User sync | Auth subject/email reconciliation exists | Keep | Reuse with tenant and account-linking tests |
| Workspace creation | Idempotent owner workspace creation exists | Keep | Reuse; adapt display copy only |
| Tenant isolation | Workspace-scoped service patterns exist | Keep and retest | Add cross-tenant negatives to each contractor slice |
| Vercel/domain | Project `revory-mvp`, `revory.app` and `www.revory.app` remain linked | Keep | No recreation or domain mutation |
| Environment configuration | Production/preview auth, database, email, Stripe and AI keys exist | Keep | Pull/merge locally when needed; never expose or rotate without authority |
| Stripe infrastructure | Checkout, portal, webhook and plan gating exist | Keep protected | Do not map old prices to new offers until verified; preserve plumbing |
| Public checkout route | Old route sold MedSpa plans; current hybrid gates have not passed | Adapt later | Keep checkout API/code, but do not reopen an unsupported offer |
| CSV intake | Parser, upload flow and file safeguards exist | Adapt | Replace dataset contracts, not the intake architecture |
| Mapping and normalization | Review, saved mapping, deterministic fallback and AI assist exist | Adapt | Add customer/estimate/activity targets and preserve confirmation flow |
| Data Quality | Eligibility and warning patterns exist | Adapt | Reuse before every contractor financial claim |
| Bounded AI | Provider, timeout, sanitation and deterministic fallback exist | Keep/adapt | Change prompts/contracts; preserve limits and fallback |
| Finding engine | Evidence, confidence, severity, fingerprints and sync patterns exist | Adapt | Add contractor rules without reusing appointment semantics |
| Dashboard and findings UI | Premium shells, cards, filters and read composition exist | Adapt | Bind to contractor read models after Slice 3 |
| Briefs/proof/export | Daily brief and executive proof composition exist | Adapt | Reuse layouts and evidence conventions, replace MedSpa reads |
| Demo infrastructure | Demo component/fixtures exist but are MedSpa-specific | Preserve internally | Do not expose publicly; replace fixtures before reopening `/demo` |
| Onboarding shell | Guided steps and activation persistence exist | Adapt | Replace clinic/offer steps with company/data-source setup |
| Email delivery | Resend and auth email configuration exist | Keep | Reuse for verification/reset and future bounded notifications |
| Database/schema | Production schema and legacy records exist | Preserve/additive migration | Add contractor models; no destructive rename or semantic field reuse |
| Automated tests | Auth, imports, findings and migration-era tests exist | Keep | Use as platform regression; add contractor tests before retiring legacy tests |

## Restored in this pass

- Reinstated the complete `/sign-up` route with Google and confirmed email/password access.
- Preserved session redirect behavior and existing-account protection.
- Restored local access to the existing Google OAuth configuration by merging missing auth keys into `.env.local` without changing Vercel or revealing values.
- Confirmed that `revory.app`, `www.revory.app`, the Vercel project and production/preview Google OAuth variables remain intact.
- Restored the premium `/start` checkout and entitlement presentation with the canonical REVORY identity, with the US$799 one-time Quote Recovery Audit as the primary entry path.
- Kept Quote Recovery Audit, Starter and Full Revenue Leak Audit prices visibly classified as target hypotheses; no new checkout or charge path was enabled.
- Restored local review access to the authenticated shell, dashboard, imports and findings through `REVORY_INTERNAL_PREVIEW_MODE`.
- Made the preview bypass impossible in production by requiring both the explicit flag and `NODE_ENV !== "production"`.
- Restored Plans & Billing navigation and renamed the app navigation surfaces to current REVORY language without renaming legacy persistence objects.
- Preserved the existing Stripe checkout, portal, webhook, workspace entitlement and legacy import implementations for later gated adaptation.

## Intentionally not reopened

- The old MedSpa public demo remains hidden until contractor-native fixtures and read models exist.
- Old Stripe prices are not presented as current REVORY offers.
- MedSpa appointment/no-show/cancellation rules are not relabeled as estimate rules.

These are compatibility gates, not permission to delete their reusable infrastructure.

## Protection rule for future work

Before changing an existing surface:

1. Trace the current executable flow and tests.
2. Separate horizontal infrastructure from domain semantics.
3. Classify the surface as `keep`, `restore`, `adapt` or `retire`.
4. Preserve working infrastructure by default.
5. Disable only the smallest unsafe or misleading public behavior.
6. Remove legacy code only after the replacement passes functionality, isolation, migration and rollback gates.
