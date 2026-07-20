# REVORY — Source of Truth

> Status: canonical product definition. The former MedSpa REVORY product is discontinued. Updated 2026-07-18.

## Product identity

REVORY is a self-service B2B SaaS and recurring revenue audit for high-ticket service businesses. It detects and prioritizes money leaking between an estimate and realized revenue.

**Category:** Revenue Leak Intelligence for High-Ticket Service Businesses.

**Narrow category:** Estimate & Change Order Revenue Leak Detector.

**One-liner:** Find the money leaking from estimates, follow-ups, and unbilled changes.

**Core promise:** REVORY shows which estimates and follow-ups may still be recoverable and, only when supported by imported evidence, where approved changes or completed billing may be incomplete.

REVORY does not operate the customer's business. It sits above exports from the customer's existing stack and answers:

> Where has the company already invested commercial or operational effort without fully turning it into revenue?

## Brand system

- Application background: `#141516`.
- Alternating application surface/background: `#252729`.
- Logo and primary identity accent: `#43B39B`.
- Canonical logo asset: `public/brand/revory-logo-43b39b-transparent.png`.
- The logo must remain a large transparent PNG, without a white or black backing tile.
- Hover, glow and surface variants must be derived from these tokens rather than adding competing turquoise values.
- Treat `#252729` as the maximum elevated-surface anchor. Normal cards should blend roughly 32% of it into `#141516`; stronger mixes are reserved for hover or emphasis. Full-width alternation must remain equally subtle.
- Landing and marketing headlines use Instrument Serif.
- Marketing body copy, navigation, labels and buttons use DM Sans.
- Marketing card titles use bold DM Sans; Instrument Serif is reserved for large section-level impact.
- Dashboard and authenticated app surfaces use Sora, with DM Sans reserved for denser reading contexts.

## Current implementation truth

This repository still contains MedSpa-era schema, import services, engine rules, fixtures, tests and isolated compatibility UI. Those capabilities are migration substrate, not the active public or authenticated product.

As of the local implementation on 2026-07-18:

- canonical contractor records, secure intake and deterministic Quote Recovery rules are implemented locally;
- Quote Recovery financial summaries count imported exposure once per estimate across the dashboard, immutable analysis snapshots, CSV annotations, executive PDFs and Growth summaries; conflicting values for one estimate or incompatible currencies suppress the aggregate instead of selecting or multiplying a value;
- the canonical assisted importer, deterministic Data Quality, explicit mapping confirmation and atomic workspace-scoped persistence are implemented and locally verified;
- the contractor-native dashboard, opportunity detail, dispositions and exports passed the isolated authenticated desktop/mobile browser gate;
- the public landing passed the Sprint 4.1 contractor-copy, forbidden-term and desktop/mobile browser gates;
- the public read-only sample workspace passed desktop/mobile browser verification with synthetic contractor data;
- the Sprint 6 recurring loop, second-read movement, recovered-value separation, digest boundary and workspace data controls are implemented locally;
- protected idempotent retention enforcement is implemented and locally tested; the daily retention and weekly digest schedules are deployed and visible in Vercel, while the first observed production executions remain pending;
- dedicated Audit, Starter and Growth entitlement/checkout code exists; Stripe contains the US$799 paid-once Audit, US$399/month Starter and US$799/month Growth prices, and Growth uses the dedicated `STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID` contract rather than the protected legacy price key; secret/webhook wiring and end-to-end payment evidence remain incomplete, so live checkout stays disabled;
- Sprint 14 now presents one commercial sequence: the US$799 Quote Recovery Audit establishes the baseline, then the US$399/month Starter keeps it current only after the Audit; the public landing includes a no-login sample-data demo and fuller offer explanations, while Growth, Pro and Full Revenue Leak Audit remain collapsed and unavailable for purchase;
- Sprint 15 is implemented locally: sign-up and password reset confirm passwords in both client and server paths, successful auth moments use persistent accessible next-step cards, reset requests remain enumeration-safe, a completed Audit explains the US$399/month Starter continuation, the landing keeps pricing primary and the sample secondary, the public demo mirrors contractor product surfaces without writes, and pricing distinguishes every monthly plan from every one-time Audit while annual and gated offers remain unavailable;
- landing fragment navigation, the 1280x720 first-viewport commercial path, desktop/mobile sample workspace and premium card interactions have dedicated browser regression gates;
- customer-facing evidence fields use a shared readable-label dictionary, and primary import, Data Quality, settings, Revenue Realization and Growth surfaces no longer expose sprint labels or local implementation terminology;
- the Starter paid-beta gate remains closed until Stripe, email delivery and production operational checks pass;
- jobs, invoices, change orders and costs now have canonical assisted ingestion, explicit matching and a locally verified deterministic reconciliation ledger;
- ambiguous links, incomplete bases and currency conflicts suppress financial output; no fuzzy name/amount matching is used;
- Tier 2 underbilling, explicitly unbilled approved-change, margin-basis and bounded scope-review findings are implemented locally with stable fingerprints, persisted idempotent sync, dedicated evidence views and a Full Revenue Leak executive report;
- an independent Sprint 9 review initially failed the gate on per-job completeness, ambiguous cross-source identity, mixed-currency costs, snapshot lifecycle, temporal integrity and finding reactivation;
- Sprint 12.1 now adds explicit job-level export completeness, strict boolean validation, explicitly confirmed full-snapshot active-record boundaries, cross-source conflict suppression, record and reconciliation integrity fingerprints, temporal guards, positive-value eligible-invoice checks, contribution-only calculation evidence and an expanded independent adversarial corpus; the final independent Sprint 9/12.1 logic review passed locally, while customer-shaped validation remains required before controlled sale;
- Sprint 10 Growth intelligence is implemented locally with idempotent 12-month snapshots, source/owner/service segmentation, explicit minimum-sample and mixed-currency suppression, one bounded weekly management decision, an authenticated PDF, a Growth-entitlement email boundary and plan-aware import limits;
- thin cohorts remain visible as suppressed and never become performance rankings; Quote Recovery estimates and Revenue Realization calculated gaps remain separate value bases;
- the founder selected Growth at US$799/month as REVORY's main recurring plan on 2026-07-17; its Sprint 10 feature surface and entitlement boundary are implemented, and its dedicated Stripe price is connected to the new billing catalog, but checkout must remain disabled until the live secret, signed webhook and full subscription lifecycle are verified;
- Pro entitlement/capability boundaries, higher bounded batch controls, durable auth throttling/session revocation, XLSX archive/aggregate-expansion checks, pre-parse multipart bounds, an atomically claimed Stripe event ledger, unique subscription ownership, paid-checkout release flag, expanded audit events, health endpoint and public security/legal status surfaces are implemented locally;
- the final independent Sprint 11/12.1 review passed the local security, lineage and concurrency scope after adding Stripe entitlement compare-and-set, price-aware Checkout Session reuse, immutable per-import analysis snapshots and transactional serialization of full replacements;
- Google OAuth has passed a real production round-trip on `revory.app`; the Resend domain and signed delivery webhook are configured in production, and the founder confirmed a delivered password-reset transaction on 2026-07-16; retain redacted provider and delivery-event references outside the repository;
- Vercel Analytics, Speed Insights, default error alerting, a canonical-import WAF rule and durable database-backed throttling are active production foundations; uptime ownership, observed cron runs and independent DAST/pentest remain external gates;
- the legal entity is now confirmed as AMETRINE LABS DESENVOLVIMENTO DE SOFTWARE NAO CUSTOMIZAVEL LTDA, CNPJ 68.046.497/0001-12; public Terms, Privacy, subprocessor and cancellation/refund drafts contain the entity and current operating policy, while contact-alias delivery and qualified counsel approval remain launch gates;
- the managed-database recovery gate passed an isolated Neon current-state branch drill on 2026-07-19: the parent/restore schema diff was empty and aggregate counts matched across 10 control tables, with measured RPO under one minute and RTO of 54 seconds;
- Sprint 16 operational-control preparation is implemented locally with a GitHub-hosted external health workflow, a redacted cron observer and a guarded isolated-restore verifier; the isolated restore passed on 2026-07-19, while the workflow alert test, observed cron runs, MFA ownership and Stripe test-mode lifecycle proof are still missing, so the Sprint 16 exit remains blocked;
- the Sprint 11 paid-beta exit remains closed on external MFA/ownership evidence, Stripe E2E, observed production operations, independent DAST/pentest and qualified final legal review;
- Sprint 12 evidence events and per-offer RETAIN/REPACKAGE/DELAY rules are implemented; absent real customer observations every price correctly remains DELAY;
- no hybrid offer is yet eligible for public sale from this repository;
- MedSpa claims and appointment findings must not be relabeled as contractor findings.

Capability becomes sellable only after its roadmap gate passes with executable evidence.

## Rebuild, do not restart

The migration must build on the proven REVORY platform. Domain-specific MedSpa behavior is replaced deliberately, but horizontal capabilities remain reusable product infrastructure.

Preserve and adapt, rather than reset:

- Google and email/password authentication;
- user synchronization, workspace creation and tenant isolation;
- Vercel project, production domains and environment configuration;
- Stripe checkout, portal, webhook and entitlement plumbing, while keeping old price mappings protected;
- CSV parsing, mapping review, saved mappings, normalization and Data Quality flows;
- bounded-AI provider/fallback infrastructure;
- dashboard, finding, brief, proof and export composition patterns;
- evidence, confidence, severity, fingerprints, idempotency and test harnesses.

A working horizontal route may be disabled only when keeping it live would create a false product claim or unsafe external action. Its implementation must remain available for adaptation until the replacement passes its gate.

## Initial market

Serve high-ticket contractors with 5–100 employees, recurring estimate volume, meaningful job value and real exposure to follow-up, scope-change or margin leakage.

Prioritize remodeling, roofing, premium HVAC, pool builders, and kitchen and bath contractors. Primary buyers are owners, general managers, operations managers, sales managers, estimator managers and project managers in smaller companies.

## Product philosophy

- no mandatory sales or onboarding call;
- self-service upload, mapping and first analysis;
- solo-founder-friendly support and operations;
- CSV/XLSX-first until detection quality and willingness to pay are validated;
- first useful value in minutes without founder-produced analysis.

Every feature must pass this test:

> Does it help the customer find, prioritize, validate or recover leaked revenue faster?

If not, exclude it.

## Two product layers

### Quote Recovery

Use customers, leads when available, estimates and activities/follow-ups to detect evidence-backed opportunities such as overdue follow-up, high-value stale estimate, open estimate without activity, estimate aging, missing owner or next step as operational risk, and cautiously recoverable lost estimate.

This layer must be proven before the first audit or recurring entry offer is sold.

### Revenue Realization

Cross estimates with jobs, invoices, invoice lines, change orders and job costs to detect, only when the data supports it, approved-but-not-billed amounts, unbilled change orders, deterministic underbilling gaps and margin risk. Text may create a review candidate; it may not prove approval, performance or a financial gap.

This layer is implemented as a local gated product surface. It is not sellable until independent logic review, customer validation and the remaining commercial/security release evidence pass.

## Evidence and financial truth

Every finding must include:

- explicit family, type and financial/operational/data-quality category;
- status, priority, urgency, severity and confidence;
- readable reason and traceable source IDs/signals;
- value basis, formula and calculation inputs when financial;
- bounded recommended review or recovery action;
- stable fingerprint and idempotent sync behavior.

Keep these classes separate:

- **Observed amount:** directly present in imported evidence.
- **Calculated gap:** deterministic reconciliation of supported records.
- **Estimated recoverable amount:** modeled opportunity, never guaranteed revenue.
- **Operational risk:** missing process evidence without a defensible financial amount.
- **Data-quality risk:** missing, stale, conflicting or unmatched data that gates a claim.

Do not use “revenue lost” for an opportunity. Do not sum incompatible value bases. Suppress a financial claim when required data or an unambiguous link is missing.

## Canonical data objects

### Quote Recovery

- workspace/company profile;
- customer;
- lead, when available;
- estimate/quote;
- activity/follow-up;
- reps, owners, sources and service types;
- provenance, source system and external IDs.

### Revenue Realization

- job;
- invoice and invoice line, when available;
- change order;
- job cost;
- explicit links among customer, estimate, job, invoice and change order;
- unmatched/conflicting-record review.

Allow partial analysis and expose rule eligibility. Never reuse a MedSpa field merely because its storage type resembles a contractor field.

## MVP sequence

1. Establish canonical contracts, compatibility strategy, isolation and threat model.
2. Build secure CSV/XLSX intake, confirmed mapping, normalization and Data Quality.
3. Deliver the deterministic Quote Recovery engine and evidence-first experience.
4. Prove export/report, second-read behavior, billing and paid-beta readiness.
5. Add job, invoice, change-order and cost ingestion with explicit matching.
6. Deliver conservative reconciliation and Revenue Realization rules.
7. Add guarded history, segmentation, reports and paid-evidence decisions.

The detailed sequence and gates live in [REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md](REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md).

## Packaging direction

Treat these as target hypotheses, not published entitlements:

- Quote Recovery Audit: US$799 one-time;
- Starter: US$399/month;
- Full Revenue Leak Audit: US$1,499 one-time;
- Growth: US$799/month;
- Pro: US$1,499/month;
- Multi-location: US$2,499+/month in the future.

The commercial sequence is not a three-tier price ladder. Growth at US$799/month is the recommended recurring REVORY plan and may start directly; it builds history, segmentation and a focused weekly management decision from the customer's recurring imports. The US$799 Quote Recovery Audit remains a focused paid-once first read, and Starter at US$399/month remains its lighter recurring continuation after that audit. The US$1,499 Full Revenue Leak Audit is a separate advanced one-time audit for customers whose evidence supports jobs, invoices, change orders and cost reconciliation.

The commercial screen must visually prioritize Growth as the main recurring plan while preserving cadence clarity. Starter retains the completed Quote Recovery Audit prerequisite; Growth does not silently add or bundle a one-time Audit. No visual priority may bypass a configured release flag, exact Stripe price match, signed webhook or entitlement gate.

No price or plan is eligible until the specific release gate passes with paid or production-like evidence. Existing MedSpa Stripe plan keys and price IDs are protected migration inputs, not proof that the new packages are configured.

## Bounded AI policy

AI may suggest mappings for human confirmation, classify ambiguous text into review candidates, explain deterministic evidence, summarize findings and draft bounded next-review suggestions.

AI must not create a confirmed leak, calculate or overwrite final financial values, infer approval or performed work as fact, send follow-ups, or become required for core value. The deterministic fallback must remain useful.

## Non-goals

Do not turn REVORY into a CRM, sales inbox, autonomous follow-up agent, field-service/dispatch/scheduling platform, accounting or full job-costing suite, construction/project-management system, generic BI builder, forecasting suite, call center, omnichannel layer, or manual consulting service.

## Authority and conflict resolution

Use this order:

1. explicit current user direction;
2. this file;
3. [REVORY_ESCOPO_HIBRIDO.md](../REVORY_ESCOPO_HIBRIDO.md) for detailed hypotheses and examples;
4. the hybrid roadmap and continuous-execution guide;
5. task-specific documentation;
6. executable code as evidence of current behavior;
7. [historical documentation](historical/README.md) as migration context only.

The names QuoteSignal, REVORY Seller, and the former MedSpa REVORY definition are not concurrent product authorities.
