# Sprint 9 — Revenue Realization findings and executive report

Implementation status: **PASS locally** on 2026-07-13.

Commercial exit status: **BLOCKED**. Full Revenue Leak Audit controlled sale still requires a genuinely independent logic review, customer validation and commercial configuration. This document does not authorize Stripe, Vercel, production or public pricing changes.

## Product identity and promise

The active product is REVORY, governed by `docs/source-of-truth.md`. Sprint 9 turns the Sprint 8 explicit reconciliation ledger into conservative, evidence-first review findings for high-ticket contractors. It does not certify accounting loss, guarantee recovery or operate billing workflows.

## Delivered

- Additive `RevenueRealizationFinding` persistence with workspace isolation, stable fingerprint, idempotent upsert and stale-finding resolution.
- Tier 2 deterministic rules:
  - calculated underbilling gap from supported expected billing minus observed eligible invoices;
  - observed approved change order explicitly marked unbilled and carrying no invoice link;
  - calculated gross-margin basis below an explicitly imported target gross margin;
  - suspected missing change order from an explicit scope-change flag with no linked change order;
  - bounded scope-creep text candidate with no financial value and mandatory human review.
- Priority, urgency, severity, confidence, category, value basis, formula, calculation inputs, recommended action and source lineage on every finding.
- Financial aggregation guard: only underbilling gaps contribute to the executive billing-gap total. Approved-change review and margin-at-risk values remain separate. Multiple currencies suppress aggregate totals.
- New canonical fields for explicit change-order billing status, target gross-margin percentage, scope-change flag and bounded job notes.
- Dedicated Revenue Realization workspace, per-finding evidence route and print-ready Full Revenue Leak executive report.
- Distinct icons for each finding type and brand-aligned `#141516` / `#252729` / `#43B39B` product surfaces.
- Import-triggered sync plus a bounded manual refresh for previously imported local evidence.

## False-positive and evidence policy

- Ambiguous or conflicting external-ID links suppress financial findings.
- A change order is not called unbilled from a missing invoice link alone; the source must explicitly mark its billing status as unbilled.
- An explicitly matched invoice suppresses the unbilled-change finding even when source text is contradictory.
- Margin-at-risk requires observed invoice revenue, observed matched costs and an imported target gross-margin basis.
- Scope text never creates a financial amount. Generic wording such as “extra care” is included in the negative corpus and does not trigger a candidate.
- The deterministic core does not read the AI flag; AI-on and AI-off outputs are equivalent.

## Verification evidence

- `npm run qa:sprint-9`: Tier 2 success cases, exact formulas, non-additive totals, false positives, conflicting IDs, matched-invoice suppression, AI-off equivalence, mixed-currency suppression, deterministic reruns and cross-workspace rejection.
- `npm run qa:sprint-9:copy`: copy-to-capability guard for accounting-loss, recovery and non-additive labeling.
- `npm run qa:sprint-9:browser`: authenticated assisted import → persistence → reconciliation → persisted findings → evidence detail → executive report → idempotent refresh → mobile, with no horizontal overflow or browser console errors.
- `npm run typecheck`, `npm run lint`, `npm run build` and `npm run db:validate` are the proportional repository gates.
- Existing Sprint 7–8 and Quote Recovery suites remain regression requirements.

Visual evidence is written outside the repository to `%TEMP%\revory-sprint-4\` to avoid dev-watcher contamination:

- `sprint-9-findings-desktop.png`
- `sprint-9-evidence-desktop.png`
- `sprint-9-report-desktop.png`
- `sprint-9-findings-mobile.png`

## Exit criteria

| Criterion | Status | Evidence / blocker |
|---|---|---|
| Tier 2 rules | PASS locally | Deterministic corpus and authenticated E2E pass. |
| Dedicated evidence views | PASS locally | Workspace-scoped finding detail with formula, inputs and file/row lineage. |
| Executive Full Revenue Leak report | PASS locally | Print-ready report with non-additive financial sections and Data Quality counts. |
| False-positive corpus | PASS locally | Ambiguity, weak text, linked invoice, incomplete basis and currency tests. |
| AI-off equivalence | PASS locally | Identical engine output with the AI feature flag changed. |
| Customer-shaped fixtures | PASS locally | Completed-job, one-to-many invoice, approved-change, cost and target-margin fixtures. |
| Independent logic review | BLOCKED | Must be challenged by a fresh independent reviewer; the implementing task cannot self-certify independence. |
| Controlled sale | BLOCKED | Independent review, customer validation and commercial configuration are not complete. |

Sprint 10 must not begin automatically from this document, and Sprint 9 must not be described as commercially released.
