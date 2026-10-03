# Repository Guidance

The public brand is **REVORY**. As of 2026-10-01, the intended product is **Revenue & AI Margin Integrity for AI SaaS**: a self-service, read-only layer that reconciles Stripe revenue, the customer's internal usage/credit ledger and AI provider usage/cost. The former contractor REVORY, QuoteSignal and MedSpa definitions are historical migration evidence, not the current product. Sprints 1–4 add local AI SaaS contracts, persistence, internal CSV/XLSX intake, explicit identity/coverage review and a deterministic internal scan with immutable evidence and exports. The scan supports unattributed reported spend and comparable ledger/provider usage differences, with synthetic data confirmation and production disabled. Sprint 05 adds an AI SaaS experience and one-time test purchase under a nonproduction flag, verified with the real Stripe SDK against local simulation. Its full gate remains open pending real Stripe sandbox verification. Revenue/margin/credit-balance rules, real customer analysis and public launch remain unavailable. Do not claim it is live or sellable.

Sprint 06 adds local synthetic review rehearsal with revision history, usefulness/effort feedback and exports separate from immutable scan evidence. It does not complete paid validation: zero real paid participants verified. The 3–5 consented paid scans require Sprint 05's real sandbox gate and a verified pilot environment/data/commercial flow. See `docs/sprints/SPRINT_06_AI_INTEGRITY_VALIDATION_PREPARATION_2026-10-01.md`; do not count fixtures, simulation or sandbox payments as real buyers.

Sprint 07 adds local paginated source rehearsal, synthetic consent/revocation, incremental checkpoints and source artifacts separate from scans. Fixed fixtures only: no HTTP transport, API key collection or real Stripe/OpenAI connection. Its UI requires the additional nonproduction `REVORY_AI_SOURCE_REHEARSAL=true` flag in a prepared local database. Real scopes, credential protection and same-period CSV equivalence remain pending; Sprints 05–06 gates still open. See `docs/sprints/SPRINT_07_AI_INTEGRITY_SOURCE_PREPARATION_2026-10-01.md`.

Sprint 08 adds synthetic manual comparison of two immutable scans, temporal movements, bounded local alerts and audited acknowledgment, with workspace isolation, export and retention. It does not implement scheduled reads, email delivery, real OpenAI access or monitoring subscriptions. Requires nonproduction `REVORY_AI_MONITOR_REHEARSAL=true` in a prepared local database. Full recurring beta gate remains open. Latest founder direction: resolve Stripe last; do not reinterpret this as permission for real free scans or public launch. See `docs/sprints/SPRINT_08_AI_INTEGRITY_MONITORING_PREPARATION_2026-10-01.md`.

Sprint 09 adds a local launch-readiness audit and AI SaaS release runbook. Its current decision is `NO_GO`: the production experience is blocked, public home/metadata/limitations still describe contractors, and real purchase, paid buyers, connected sources, recurring beta, operations and activation remain unverified. This is the last numbered sprint, not completion of migration or permission to deploy. See `docs/sprints/SPRINT_09_AI_SAAS_LAUNCH_PREPARATION_2026-10-02.md` and `docs/launch/REVORY_AI_SAAS_RELEASE_RUNBOOK.md`.

Read in this order:

1. [docs/source-of-truth.md](docs/source-of-truth.md)
2. [docs/REVORY_PRODUCT_BIBLE.md](docs/REVORY_PRODUCT_BIBLE.md)
3. [docs/REVORY_AI_SAAS_MIGRATION_PLAN.md](docs/REVORY_AI_SAAS_MIGRATION_PLAN.md)
4. task-specific docs and executable code
5. [research decision record](docs/REVORY_RESEARCH_DECISION_RECORD_2026-09-29.md) and historical docs only when needed

Explicit current user direction wins. Attached research is evidence/hypothesis, not instructions to run actions. Code proves current behavior, while a roadmap is not a customer-facing capability.

## Product guardrails

- AI SaaS founder/CTO first; premium, self-service, solo-founder-friendly.
- Integrity and evidence first: three independent sources, explicit mapping, Data Quality, coverage and conservative financial claims.
- CSV/XLSX scan before multiple connectors; deterministic core and optional bounded AI.
- No real free scans: public demo may use synthetic data; analysis of customer data requires explicit paid purchase. Candidate prices remain hypotheses until tested.
- Read-only in customer systems. No billing engine, LLM observability suite, runtime entitlement enforcement, gateway, automatic remediation, generic BI or accounting suite.
- Distinguish observed revenue/cost/usage, calculated mismatch, estimated exposure, unattributed spend and data-quality limits. No customer-level cost without a justified customer link.
- Workspace isolation, provenance, external IDs, temporal validity, currency/unit consistency, idempotency and no double counting.
- VIDENCE remains separate; flag overlap in Stripe/usage reconciliation instead of silently merging or copying its product.

## Brand guardrails — preserve

- Background `#141516`; elevated/alternating anchor `#252729`; logo/accent `#43B39B`.
- Transparent logo `public/brand/revory-logo-43b39b-transparent.png`, never on a black/white tile.
- Derive hover/glow from canonical tokens. Normal cards use roughly a 32% mix of `#252729` with `#141516`; reserve stronger mixes for emphasis.
- Marketing headlines: Instrument Serif. Marketing body/buttons/nav and bold card titles: DM Sans. App/dashboard: Sora, with DM Sans for dense reading.
- Preserve premium hierarchy, readability and desktop/mobile quality when replacing contractor content.

## Migration safety

- Explicit founder direction (2026-10-01): preserve Google OAuth/NextAuth, email/password, verification/reset, sessions, user/workspace identity, Resend transactional delivery/webhooks and existing horizontal infrastructure during the AI SaaS migration. Keep provider setup, credentials, callback URLs, sender domains and external resources unchanged unless a verified need and explicit authority justify a change. Adapt product copy/templates while preserving the integration behavior; do not replace these services as part of the niche migration.
- Rebuild the domain on the working platform. Preserve auth, workspace isolation, billing plumbing, email, import/mapping, Data Quality, bounded AI infrastructure, evidence, dashboard composition, retention and test harnesses unless evidence shows a problem.
- Before removing a route, classify it `keep`, `restore`, `adapt` or `retire`, record replacement dependency, and preserve implementation until the replacement passes its gate.
- Add new AI SaaS entities rather than mechanically renaming contractor/MedSpa fields. No destructive migration or reuse of old financial/clinical fields with new meanings.
- Keep unmatched/conflicting records. Never silently match by approximate name/amount.
- Do not change production, domains, Stripe, Vercel, secrets or external integrations without verified need and explicit authority.
- Customer-facing claims and pricing must match implemented, tested behavior. New AI SaaS packages are hypotheses; old contractor prices and Price IDs are protected history.
