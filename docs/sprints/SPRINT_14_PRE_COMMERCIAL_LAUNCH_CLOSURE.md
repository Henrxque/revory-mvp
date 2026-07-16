# Sprint 14 — Pre-commercial launch closure

## Status

**LOCAL UX/CODE PASS · EXTERNAL OPERATIONS AND LEGAL EVIDENCE PENDING.**

Implemented locally on 2026-07-16:

- landing navigation no longer creates a clipped vertical scroll container;
- the public hero and pricing section expose a prominent read-only demo using fictional contractor data;
- the Audit and Starter cards now explain buyer fit, included deliverables, expected outcome and entry condition;
- `/start` presents the US$799 one-time Audit first and the US$399/month Starter second, with both actionable cards inside the `1280x720` first viewport;
- Growth, Pro and Full Revenue Leak Audit remain collapsed, disabled and explicitly unavailable;
- a shared buyer-label dictionary formats evidence fields and statuses without changing stored canonical contracts;
- primary auth, imports, Data Quality, settings, Revenue Realization and Growth copy was simplified without weakening evidence or financial-claim limits;
- `qa:sprint-14`, the landing interaction gate, the commercial desktop/mobile gate and the public-demo browser gate pass locally.

Local closure evidence:

- the complete `qa:launch-readiness` suite passed, including lint, typecheck, production build, authenticated browser journeys, landing, `/start`, public demo, mobile, CSV/PDF exports and security-header checks;
- the Sprint 14 tracked-tree and Git-history secret scan passed without exposing a secret value;
- the local database migration `20260715000100_deduplicate_quote_recovery_exposure` was applied and the environment check reports zero pending migrations;
- the load gate processed 50,000 Quote Recovery records with 75,000 findings in 282 ms and 10,000 Revenue Realization records in 493 ms, with 94 MB peak heap in the recorded run;
- the local email contract passed, and the deterministic bounded-AI fallback remained useful; a real provider happy-path smoke remains external because the available runtime key is missing or invalid;
- `npm audit --audit-level=high` reports no critical or high vulnerability. Five moderate transitive findings remain documented for non-breaking remediation; no forced dependency downgrade was applied.

This is not the Sprint 14 exit gate. Resend delivery evidence, observed jobs, uptime/incident ownership, WAF evidence, isolated restore, MFA ownership, DAST/security review, customer-shaped usefulness evidence and final legal/Stripe work remain external or pending.

This sprint closes every launch-readiness item that can be completed before the final legal-entity/CNPJ and Stripe activation work. It does not enable checkout, publish a paid offer, claim legal approval, or make Growth, Pro or Revenue Realization sellable.

## Product identity

REVORY is the evidence-first Revenue Leak Intelligence product for high-ticket service businesses. Sprint 14 protects the current premium visual system and narrows the first commercial path to Quote Recovery:

```text
Quote Recovery Audit — US$799 paid once
  -> Starter — US$399/month after the completed Audit baseline
```

Change orders, invoices, underbilling, margin, Growth, Pro and the Full Revenue Leak Audit remain gated.

## Why this sprint exists

The local product, deterministic engine, imports, Data Quality, dashboard, evidence views and exports are strong enough for a controlled private pilot. A launch-readiness audit still found four classes of unfinished work:

1. browser and commercial-screen UX regressions;
2. buyer-facing language that still exposes internal implementation terminology;
3. production operations, email and security evidence that do not depend on CNPJ or Stripe;
4. legal and commercial dependencies that must remain explicitly blocked until their owners can complete them.

Sprint 14 resolves the first three classes and leaves a reproducible, minimal register for the fourth.

## Scope boundary

### Complete before CNPJ and Stripe

- repair landing fragment navigation in Edge/Chromium and verify back/forward behavior;
- make `/start` a single commercial decision surface: every actionable Quote Recovery choice fits the first desktop viewport, while gated future offers remain secondary and non-purchasable;
- preserve the current billing visual system, card hierarchy, brand tokens and premium interaction quality;
- replace internal/product-development language on customer surfaces with contractor-buyer language;
- normalize imported evidence labels such as `Nextfollowupat` and `Amountcents` into readable labels without changing canonical storage;
- use one consistent vocabulary for imported records, confirmed connections, records needing attention and checks REVORY can run;
- remove production-facing `local gated`, `internal preview`, sprint-number and implementation-status wording;
- verify all public, auth, import, dashboard, finding, Data Quality, settings, billing, empty, error and mobile states;
- prove one Resend transactional delivery and signed delivery webhook using an owned test inbox;
- observe one retention execution and one weekly digest execution in production;
- configure and exercise an external uptime check and name a primary and backup incident owner;
- run the live WAF/throttling evidence check without cross-workspace impact;
- complete a managed backup restore into an isolated database and record measured RPO/RTO;
- review, back up and apply the pending production migration through the approved path, only with explicit deployment authority;
- run a bounded-AI smoke test with synthetic sanitized metadata and confirm deterministic fallback parity;
- complete the platform MFA/ownership and recovery-owner inventory;
- run an automated DAST baseline, dependency review and secret-history scan, then record remediation or explicit risk acceptance for every non-low finding;
- prepare legal documents with verified technical facts, subprocessors and policy choices while leaving legal entity, jurisdiction, tax and counsel approval fields unresolved;
- execute a customer-shaped Quote Recovery usefulness test and record whether the weekly review decision is understandable and actionable.

### Must wait for CNPJ, counsel or Stripe

- final legal entity name, CNPJ, registered address and jurisdiction;
- final Terms, Privacy, DPA and counsel approval tied to that entity;
- tax, invoice and public refund/cancellation decisions requiring the final business setup;
- Stripe business verification, statement descriptor, products, prices, portal and lifecycle E2E;
- enabling `REVORY_PAID_CHECKOUT_ENABLED`;
- paid conversion, willingness-to-pay and retention evidence;
- any public sale or claim that Quote Recovery Audit or Starter is generally available.

## Workstreams

### 14.1 — UX and buyer-language closure

Deliver:

- Edge-safe fragment scrolling without changing the landing composition;
- one-row/one-surface commercial actions at desktop sizes;
- a compact Quote Recovery path on `/start`, with the Audit as the required first action and Starter as the clearly labeled recurring continuation;
- gated Growth, Pro and Full Audit information behind a secondary non-purchasable disclosure instead of competing with the actionable path;
- a buyer-language dictionary used by dashboard, finding evidence, Data Quality, imports, auth and settings;
- removal of `canonical`, `commit`, `profile`, `eligibility`, `explicit link`, `local gate`, sprint labels and raw camelCase field names from primary customer UI;
- restrained hover/glow behavior derived only from `#141516`, `#252729` and `#43B39B`.

Acceptance:

- `How it works`, `Signals`, `Pricing` and `FAQ` land at the correct section in Edge and Chromium on desktop and mobile;
- all actionable `/start` choices are visible without vertical scrolling at `1280x720`; gated roadmap detail may remain collapsed or below the actionable surface;
- no checkout becomes live and no gated offer receives a purchase CTA;
- every evidence field shown to a buyer uses a readable label;
- public/authenticated copy sweep finds no legacy brand/niche contamination or internal release-management wording;
- keyboard focus, accessible names, contrast, reduced motion and 390/768/1280/1440 layouts pass.

### 14.2 — Email and production operations evidence

Deliver:

- one delivered Resend message ID plus the corresponding verified webhook event;
- one observed retention run and one observed digest run with timestamps and redacted logs;
- uptime monitoring for `/api/health` with primary and backup alert owners;
- WAF and durable throttling evidence for expensive routes;
- an isolated restore report with source backup time, restore time, row-count checks and measured RPO/RTO;
- a migration approval record, backup reference and deploy result if explicit production authority is granted.

Acceptance:

- each evidence item is reproducible and contains no secret or customer row data;
- failures generate an actionable alert rather than a silent log;
- no production data is changed by a test except through the separately approved migration/restore procedure.

### 14.3 — Security and dependency closure

Deliver:

- redacted MFA/ownership inventory for GitHub, Vercel, database, Resend, Google and DNS;
- two recovery owners where the platform supports them;
- automated DAST baseline against the public and authenticated non-destructive surfaces;
- review of the five moderate transitive dependency findings, with upgrade, mitigation or dated acceptance;
- secret-history scan and rotation/revocation register;
- bounded-AI happy-path smoke test and deterministic fallback comparison.

Acceptance:

- no unresolved critical/high finding;
- no secret appears in tracked files or the sprint evidence package;
- an independent final DAST/pentest may remain external, but its scope, owner and required retest evidence are fixed before Sprint 14 exits.

### 14.4 — Legal preparation and private-pilot evidence

Deliver:

- verified technical fact sheet for counsel: data categories, purposes, retention, deletion, security controls, active subprocessors and AI boundary;
- draft Terms, Privacy, DPA, refund/cancellation and incident-contact fields with explicit placeholders only where entity/CNPJ or counsel is required;
- one customer-shaped Quote Recovery test using realistic contractor exports;
- a structured result covering first-value time, useful findings, false positives, support minutes and the next weekly decision.

Acceptance:

- drafts never present themselves as approved legal documents;
- no seeded or synthetic outcome is recorded as customer evidence;
- the pilot answer states whether the product told the user what happened, how much deserves review, why it was flagged and what to do next.

## Required verification matrix

### Deterministic product

- valid CSV and XLSX;
- malformed, oversized, formula-bearing and incompatible files;
- duplicate, conflicting, stale, missing and ambiguous IDs;
- exact workspace isolation and idempotent replacement;
- all ten supported source-system suggestions with human confirmation;
- supported currencies and mixed-currency suppression;
- six Quote Recovery rules, insufficient-data cases and false-positive dispositions;
- duplicate financial-finding exposure counted once per estimate;
- CSV/PDF exports and one-time Audit consumption warning.

### Journeys

- public landing -> sample workspace -> sign-up/sign-in;
- Google OAuth and confirmed email/password UI;
- upload -> review files/column matches -> Data Quality -> first executive read;
- dashboard metrics -> filtered records -> evidence detail -> disposition;
- Data Quality issue -> exact record needing attention;
- settings, currency, export, deletion and billing states;
- empty, loading, validation, authorization, 404 and server-error states;
- desktop and mobile keyboard/screen-reader semantics.

### Browsers and breakpoints

- Edge and Chrome as required launch browsers;
- Firefox and Safari/WebKit before public paid beta;
- 390, 768, 1280 and 1440 pixel widths;
- no horizontal overflow, hidden CTA, broken anchor or inaccessible control.

## Required commands

At minimum:

```text
npm run qa:launch-readiness
npm run qa:sprints-1-3
npm run qa:quote-recovery-financial-summary
npm run qa:source-import-pack
npm run qa:sprint-11
npm run qa:sprint-11:load
npm run qa:email
npm run llm:qa
npm run env:check
npm audit --audit-level=high
```

Add a dedicated Sprint 14 copy/browser gate so the Edge fragment behavior, one-surface `/start` layout and buyer-language dictionary cannot regress.

## Evidence package

Store only redacted IDs, timestamps, hashes and results in the repository. Provider screenshots, legal files, account IDs, secrets and customer exports stay outside the public repository.

The final report must classify every item as:

- `PASS — reproducible evidence attached`;
- `FAIL — remediation required`;
- `EXTERNAL — named owner and evidence requirement`;
- `WAITING FOR CNPJ/STRIPE — cannot be completed honestly yet`.

## Exit gate

Sprint 14 passes only when:

1. every code/UX item independent of CNPJ and Stripe passes locally and in production;
2. Resend, cron, uptime, WAF/throttling, restore, MFA, bounded-AI and automated security evidence are reproducible;
3. buyer-facing language contains no internal implementation or release-management terminology;
4. the Quote Recovery path is understandable without founder explanation;
5. every remaining legal/Stripe dependency is isolated, owned and incapable of silently enabling checkout;
6. the full regression, load and browser matrix passes with a clean worktree.

Sprint 14 does **not** authorize public sale. After it passes, the only Quote Recovery launch blockers should be final legal-entity/counsel work, Stripe lifecycle activation and real customer/paid evidence.
