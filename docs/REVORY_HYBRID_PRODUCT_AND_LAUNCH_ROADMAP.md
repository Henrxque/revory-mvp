# REVORY — Hybrid Product and Launch Roadmap

## 1. Executive decision

Build REVORY in two proven layers:

1. **Quote Recovery:** estimates and follow-ups, monetized through a US$799 one-time audit and US$399/month Starter.
2. **Revenue Realization:** jobs, invoices, change orders and costs, monetized through a US$1,499 full audit and US$799–US$1,499/month Growth/Pro.

Do not build both layers as one big-bang MVP. Quote Recovery establishes intake, evidence, customer trust and the recurring loop. Revenue Realization adds the cross-record financial intelligence that can defend premium pricing.

## 2. Product and commercial architecture

| Offer | Buyer need | Core result | Target price |
|---|---|---|---:|
| Quote Recovery Audit | “What can still close?” | Prioritized estimate/follow-up findings | US$799 one-time |
| Starter | “What changed and needs attention?” | Recurring quote-recovery control loop | US$399/month |
| Full Revenue Leak Audit | “What was not fully billed or realized?” | Estimate-to-invoice/change-order reconciliation | US$1,499 one-time |
| Growth | “Where is leakage concentrating over time?” | History, segmentation and weekly management view | US$799/month |
| Pro | “Where are scope, billing and margin gaps?” | Change-order, underbilling and margin intelligence | US$1,499/month |
| Multi-location | “Which branch is leaking and why?” | Branch controls and comparisons | US$2,499+/month, future |

Pricing is a hypothesis until paid use validates it. Audit-to-subscription conversion is the preferred low-friction path; no call may be mandatory.

## 3. Product loop

```text
select audit type
  -> upload CSV/XLSX exports
  -> map and confirm columns
  -> Data Quality Check
  -> match entities and expose unmatched records
  -> run eligible deterministic rules
  -> classify observed/calculated/estimated/operational/data-quality findings
  -> prioritize recovery review
  -> export or disposition findings
  -> upload the next period
  -> show new, persistent, worsening, resolved and recovered movement
```

## 4. Required screens

### Public and commercial

- landing with hybrid promise and three-step workflow;
- audit and subscription pricing;
- data requirements by audit type;
- security, privacy, terms, subprocessors and limitations;
- checkout, billing portal and entitlement states.

### Product

- workspace and audit-type selection;
- multi-file upload and mapping;
- Data Quality and unmatched-record review;
- executive dashboard with separated value bases;
- Quote Recovery opportunities;
- Change Order and Underbilling opportunities;
- Margin Risk review;
- evidence detail and source lineage;
- analysis history and movement;
- CSV and executive PDF export;
- settings, retention and deletion controls.

## 5. Rule release tiers

### Tier 1 — Quote Recovery

- overdue follow-up;
- high-value stale quote;
- open estimate with no activity;
- estimate aging risk;
- missing owner or next step as operational risk;
- recoverable lost quote only with conservative evidence.

### Tier 2 — Revenue Realization

- observed approved-but-not-billed change order;
- deterministic underbilling gap: supported expected billing minus observed billing;
- suspected missing change order as review risk, not confirmed leak;
- margin at risk from disclosed revenue/cost basis;
- scope-creep text candidate with human review and no unsupported financial value.

### Tier 3 — Segmentation

- source conversion/leak concentration;
- rep or technician gaps;
- service-type and aging trends.

Tier 3 requires minimum sample sizes, comparable cohorts and visible suppression when data is thin.

## 6. Bounded AI

AI may assist mapping, normalize ambiguous labels, classify text into review candidates and explain deterministic findings. Human confirmation is required before assisted mappings persist. Core financial calculations, rule eligibility and totals remain deterministic. Provider payloads must be minimized, sanitized, bounded by cost/time and documented.

## 7. Security and compliance baseline

Treat launch safety as product scope:

- server-side workspace authorization on every read/write/export/job;
- cross-tenant negative tests in CI;
- secure sessions, MFA for privileged access and rate limiting;
- file type/size/row limits, formula-injection-safe exports and malware-risk controls;
- encryption in transit/at rest and managed secret storage;
- signed, idempotent billing webhooks;
- dependency, secret and static scanning;
- audit events for imports, runs, mappings, dispositions, exports and deletion;
- retention/deletion implementation and restore drills;
- incident response, monitoring and vulnerability reporting;
- Terms, Privacy Notice, DPA, Subprocessor List, Security Overview and AI disclosure;
- independent application-security review before Pro paid beta.

No document may claim certification the company does not hold.

## 8. Sprint roadmap

### Sprint 0 — Hybrid truth, inventory and threat model

**Outcome:** establish one vocabulary and an honest current-state gap map.

Deliver:

- product/copy/code inventory against the hybrid source of truth;
- legacy Revory and estimate-only contamination map;
- capability matrix: implemented, partial, planned, prohibited;
- data-flow and threat model for every upload/export/provider;
- test and release-gate baseline.

**Exit:** every public claim has an implementation status and owner; no unresolved source-of-truth conflict.

### Sprint 1 — Canonical multi-dataset contracts

**Outcome:** define entities and financial semantics before UI expansion.

Deliver:

- contracts for customer, lead, estimate, activity, job, invoice, change order and cost;
- external IDs, workspace keys, relationships and provenance;
- observed/calculated/estimated value-basis enum;
- leak family/category/confidence/severity/fingerprint contracts;
- migration and compatibility plan for historical `Client`/`Appointment` substrate.

**Exit:** sample datasets can represent both audit types without ambiguous financial fields or cross-tenant keys.

### Sprint 2 — Secure intake and Data Quality

**Outcome:** import only data that can support honest analysis.

Deliver:

- CSV/XLSX templates and multi-file upload;
- mapping, normalization, duplicate checks and saved mappings;
- entity-link coverage and unmatched-record review;
- rule eligibility report by available fields;
- file, formula, payload, rate and authorization controls.

**Exit:** invalid or insufficient data cannot produce unsupported financial output; persistence is atomic and idempotent.

### Sprint 3 — Quote and follow-up engine V1

**Outcome:** produce trustworthy Quote Recovery findings.

Deliver Tier 1 rules, evidence lineage, confidence, value basis, stable sync and resolution. Add boundary, false-positive, thin-data, rerun, tenant and target-volume tests.

**Exit:** every quote-recovery claim maps to a tested rule; unchanged reruns create no duplicate or value drift.

### Sprint 4 — Quote Recovery experience

**Outcome:** let a target buyer understand the top findings without founder explanation.

Deliver dashboard, opportunities table, detail/evidence view, dispositions, Data Quality states, CSV export and responsive/accessibility QA.

**Exit:** a buyer can identify three priority opportunities, why they were flagged and what to review next in under five minutes after valid import.

### Sprint 5 — One-time Quote Recovery Audit

**Outcome:** make the US$799 entry offer purchasable and self-service.

Deliver audit checkout/entitlement, analysis history, top opportunities, executive report, sample workspace, limitations and audit completion flow.

**Exit:** a test customer can buy, upload, receive and export the audit without manual analysis by the founder.

### Sprint 6 — Starter recurring loop and paid beta

**Outcome:** defend US$399/month through repeated value.

Deliver snapshot comparison, new/persistent/worsening/resolved/recovered states, saved mapping refresh, reminders/digest, billing portal, deletion/export, legal baseline, backup/restore and production security checks.

**Exit:** controlled paid beta may begin; no critical/high security issue; second read is faster and explains material change.

### Sprint 7 — Revenue Realization ingestion

**Outcome:** safely ingest jobs, invoices, change orders and costs.

Deliver templates, mappings, normalization and provenance for the second dataset layer. Support partial inputs and expose which Tier 2 rules are eligible.

**Exit:** realistic datasets import without corrupting Quote Recovery and without inventing missing links.

### Sprint 8 — Matching and reconciliation engine

**Outcome:** establish defensible cross-record comparisons.

Deliver estimate-job-invoice-change-order matching, one-to-many handling, billing reconciliation, cost/revenue bases, unmatched/conflict review and deterministic calculation tests.

**Exit:** every calculated gap can be reconstructed from source records; ambiguous matches suppress the financial claim.

### Sprint 9 — Change-order, underbilling and margin rules

**Outcome:** create premium findings without fake certainty.

Deliver Tier 2 rules, dedicated evidence views, executive Full Revenue Leak report, false-positive corpus and AI-off equivalence.

**Exit:** Full Revenue Leak Audit may enter controlled sale; customer-shaped fixtures and independent logic review pass.

### Sprint 10 — Growth history and intelligence

**Outcome:** defend US$799/month with recurring management decisions.

Deliver 12-month movement, source/rep/service segmentation, minimum-sample guards, weekly executive digest, PDF and plan-aware volume controls.

**Exit:** Growth reveals a repeatable weekly decision unavailable in Starter; thin cohorts never show fake rankings.

### Sprint 11 — Pro trust, security and paid beta

**Outcome:** defend US$1,499/month and challenge the highest-risk surface.

Deliver Pro entitlements, high-volume controls, external penetration test or qualified independent review, remediation, incident/restore exercise, final legal review and production-like E2E/load tests.

**Exit:** Pro paid beta may begin; no critical/high security finding or material legal/product-truth blocker remains.

### Sprint 12 — Paid evidence and packaging decision

**Outcome:** replace pricing opinion with commercial evidence.

Measure audit conversion, first-value time, useful-finding rate, customer-confirmed recovered value, second-read rate, audit-to-subscription conversion, support minutes, 30/60-day retention intent, false-positive disputes and plan upgrade interest.

**Exit:** retain, repackage or delay each price independently. Do not reduce price merely because broad FSM/CRM platforms have more features.

### Sprint 12.1 — Precision and launch-evidence remediation

**Outcome:** resolve independent Sprint 9/11 findings without converting missing external evidence into a pass.

Deliver per-job export-completeness gates, active full-snapshot boundaries, strict boolean/temporal/currency/identity guards, finding reactivation, reconciliation state integrity, adversarial regression tests, tracked-artifact redaction, legal/security status surfaces and an explicit external launch-dependency register.

**Exit:** corrected local logic passes a fresh independent challenge; no tracked QA session artifact remains in the current tree; every external security/legal/production dependency has an owner and reproducible evidence requirement. Customer-data validation may remain pending only when explicitly owned outside the sprint, and then no commercial gate may be called passed.

### Sprint 13 — Commercial packaging and pricing clarity

**Outcome:** explain the audit-to-subscription business model without presenting one-time audits and recurring plans as a false tier ladder.

Deliver a recurring-plan-first visual group, a separate one-time Audit baseline group, explicit billing cadence on every card, server-side Starter baseline enforcement, honest closed states for Growth/Pro/Full Audit and no annual control before dedicated Stripe and renewal evidence exists.

**Exit:** a buyer can distinguish what is paid once, what recurs, which Audit is required first and which paths remain closed; no gated offer can be purchased and no legacy Stripe price can grant hybrid access.

### Sprint 14 — Pre-commercial launch closure

**Outcome:** close every product, UX, email, production-operations and security item that does not depend on the final legal entity/CNPJ or Stripe activation.

Repair cross-browser landing navigation, reduce `/start` to one actionable Quote Recovery decision surface, remove internal implementation language from customer UI, verify email delivery, cron execution, uptime, WAF/throttling, backup restore, bounded AI, MFA ownership and automated security evidence, and prepare factual legal drafts plus a customer-shaped usefulness test.

**Exit:** all non-CNPJ/non-Stripe work passes with reproducible evidence; the only remaining Quote Recovery commercial blockers are explicitly owned legal-entity/counsel work, Stripe lifecycle activation and real customer/paid evidence. Checkout remains disabled.

### Sprint 15 — Authentication confidence and Audit continuation

**Local status:** implemented and verified on 2026-07-16; the founder-authorized Stripe sandbox catalog contains the approved Audit and Starter prices, but no deploy, live payment activation or public-sale claim is included.

**Outcome:** make email/password access unambiguous, restore pricing as the primary commercial path, make the sample demo faithful to the product, restore the audit-versus-subscription pricing hierarchy, and explain the completed-Audit-to-Starter continuation without enabling checkout or expanding product scope.

**Exit:** sign-up and reset have confirmed-password and durable success states; reset remains enumeration-safe; the primary landing CTA reaches pricing while a separate sample route mirrors the read-only product experience; every visible price distinguishes paid-once Audit from monthly plan, including the closed US$1,499 Full Audit; and a completed Audit accurately explains Starter at US$399/month without bypassing its baseline or payment gate.

### Sprint 15.1 — Growth commercial connection

**Current founder decision:** Growth at US$799/month is the main recurring REVORY plan and may start directly. Starter remains the lighter post-Audit continuation, while Pro and the Full Revenue Leak Audit retain their own gates.

**Outcome:** connect the implemented Sprint 10 Growth surface to a dedicated non-legacy Stripe price, present it as the recommended recurring plan and keep charging fail-closed until the signed webhook and subscription lifecycle pass end to end.

**Exit:** Growth uses `STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID`, no legacy Stripe key is reused, the home and `/start` agree on cadence and availability, and `REVORY_PAID_CHECKOUT_ENABLED` remains false until live verification evidence exists.

### Sprint 16 — Production operations and recovery evidence

**Prerequisite:** Stripe is configured and the Quote Recovery Audit plus every recurring offer intended to open, including main-plan Growth, have passed test-mode checkout, signed webhook, duplicate-event and portal verification.

**Outcome:** turn the already-deployed operational foundations into reproducible production evidence: observed digest/retention schedules, external uptime alerting, one isolated restore and MFA/recovery ownership. This is an operations sprint, not a feature sprint.

**Exit:** each operational control has a timestamped, redacted private evidence record and an owner; no customer data, secret or provider account identifier is committed; legal-entity and real-customer evidence gates remain separate.

## 9. Launch sequence

1. internal and design-partner Quote Recovery reads;
2. Quote Recovery Audit controlled sale after Sprint 5;
3. Starter paid beta after Sprint 6;
4. Full Revenue Leak Audit controlled sale after Sprint 9;
5. Growth paid beta after Sprint 10 evidence;
6. Pro paid beta after Sprint 11;
7. public packaging only after Sprint 12 evidence.

## 10. Final guardrail

REVORY wins by turning messy contractor exports into a trustworthy, prioritized economic decision. It does not win by matching Buildertrend, Jobber, ServiceTitan or Procore feature for feature.
