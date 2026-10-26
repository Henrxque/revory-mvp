# REVORY — OpenAI, Anthropic/Claude and Google/Gemini

## Authority and delivery boundary

The founder requested one implementation task on 26 October 2026 covering the three provider brands in the existing US$99 scan and US$199/month Monitor. Existing authentication, Stripe subscriptions, Resend, visual identity and immutable reports remain protected. Work starts from main cdb9bb2f2bf9158293e4380474f9538bc08c8b62 in an isolated worktree.

The founder confirmed that Anthropic/Google accounts with usage are not available. Controlled fixtures verify code; authenticated nonempty provider reads and production publication require separate evidence. No provider consumption, customer-system mutations, cloud provisioning, paid services, new credentials or production changes are authorized by fixture tests.

## Official sources checked on 26 October 2026

- Anthropic Usage and Cost: https://platform.claude.com/docs/en/manage-claude/usage-cost-api
- Anthropic organization identity/auth: https://platform.claude.com/docs/en/manage-claude/admin-api
- Gemini billing: https://ai.google.dev/gemini-api/docs/billing
- Google billing export: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery
- Google Monitoring metric descriptors: https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h and https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b

## Work packages

1. Provider registry, versioned multi-provider reconciliation, additive SQL constraints, unchanged reproduction of old rule versions.
2. Anthropic allowlisted read transport, organization verification, pagination and exact token/cache/cost normalization.
3. Google Gemini project-bound service-account read transport, explicit Developer API/Vertex path, bounded billing-export query and documented usage metrics. No generation-key impersonation, quota counters treated as billable usage, inferred missing values or arbitrary SQL/URLs.
4. Connection onboarding, source promotion, multiple provider report selection, per-provider evidence/limitations, recurring consent and identity reuse for every selected provider.
5. Security/normalization/regression, disposable database integration, browser desktop/mobile, build and reviewable PR. Real-account validation remains a named gate.

## Acceptance

One Stripe source, one internal ledger and one to three selected provider sources describe the same closed UTC period. A single scan grant yields one immutable report across the selected providers. Revocation, changed consent, incomplete pagination, scope changes and missing evidence cannot create zero activity or resolution. Provider/model/project/currency/unit boundaries prevent double counting and false comparisons. A Monitor scope change requires renewed consent and makes periods with different source coverage noncomparable.

## Status

Implementation completed locally, with controlled contract/security tests, disposable PostgreSQL integration, regression checks and authenticated desktop/mobile browser proof. New connectors are not published or validated against real accounts. Existing production remains the OpenAI-only release verified on 22 October. See [QA evidence](../qa/multi-provider/README.md) and the [validation/release gate](../operations/REVORY_MULTI_PROVIDER_VALIDATION_AND_RELEASE.md).
