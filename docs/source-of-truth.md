# REVORY — Source of Truth

> Status: canonical product definition. The former MedSpa REVORY product is discontinued. Updated 2026-07-11.

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

This repository still contains active MedSpa-era schema, imports, engine rules, fixtures, tests and authenticated UI. Those capabilities are migration substrate, not the new public product.

As of this source-of-truth update:

- contractor workspace, customer, estimate and activity contracts are not implemented end to end;
- Quote Recovery findings are not yet available from the current repository;
- jobs, invoices, change orders, underbilling and margin intelligence are not implemented;
- no hybrid offer is eligible for public sale from this repository;
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

This layer remains roadmap-only until the corresponding ingestion, matching, reconciliation, tenant-isolation, security and reporting gates pass.

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
