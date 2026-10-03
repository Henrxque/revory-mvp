# REVORY — Source of truth

Updated 2026-10-02. The current intended product is **Revenue & AI Margin Integrity for AI SaaS**: a premium, self-service, read-only layer for founders and CTOs. Its intended three-source read compares Stripe billing context, the customer's internal usage/credit ledger, and AI provider usage/cost. It must show provenance, explicit identity links, coverage and data-quality limits before making financial claims.

## Public state

`revory.app` is authorized to present the new direction with a **static synthetic demo only**. The public pages do not collect customer data, run an AI SaaS scan, connect Stripe/OpenAI accounts, charge for the new offer or start monitoring. No real paid AI SaaS buyers have been verified. The first scan price and monthly plans remain hypotheses; do not publish them as available offers. The production app, login, legacy checkout, user/workspace data and existing customer routes still serve the historical Quote Recovery product. See the [public-presentation release record](launch/REVORY_AI_SAAS_PUBLIC_PRESENTATION_2026-10-02.md).

The full AI SaaS implementation lives on the separate `migration/ai-saas-sprints-0-6` branch and [draft PR #2](https://github.com/Henrxque/revory-mvp/pull/2). Its Sprints 0–9 contain local contracts, intake, mapping, deterministic scans, synthetic review/source/monitoring rehearsals and launch preparation. Their external gates remain open. **Do not merge that branch into production merely to expose the new landing page**: its Vercel build applies pending Prisma migrations before Next.js builds. Code and verified environment behavior, not this roadmap, prove capability.

## Product and brand boundaries

- No real free scans. A synthetic public demo is allowed; customer-data analysis requires an explicit paid purchase after its commercial/data gates pass.
- Never label unattributed provider spend as lost revenue, or a usage difference as a priced exposure without a defensible link and rate. No customer-level margin from aggregate provider data.
- Preserve Google OAuth/NextAuth, e-mail/password, reset/verification, sessions, workspace isolation, Resend and existing billing/entitlement contracts during migration. Existing contractor customers keep their access and records.
- Preserve background `#141516`, elevated anchor `#252729`, accent/logo `#43B39B`, transparent `public/brand/revory-logo-43b39b-transparent.png`, Instrument Serif marketing headlines, DM Sans marketing copy and Sora app typography.
- VIDENCE remains separate. Stripe/usage scope overlap needs an explicit portfolio decision.

The previous contractor source of truth is preserved as [historical migration evidence](historical/REVORY_CONTRACTOR_SOURCE_OF_TRUTH_2026-10-02.md). Contractor, QuoteSignal and MedSpa language must not be presented as the new AI SaaS offer. Preserve legacy code and route behavior until each replacement passes its gate.
