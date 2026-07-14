# REVORY — Hybrid Continuous Execution Guide

## 1. Purpose

Use this guide to execute the hybrid REVORY strategy without confusing vision, implemented capability and sellable product.

The delivery sequence is:

1. prove Quote Recovery;
2. sell a one-time audit and Starter only after the quote engine is trustworthy;
3. add jobs, invoices, change orders and costs;
4. prove Revenue Realization detection;
5. sell Growth/Pro only after recurring and financial-reconciliation gates pass.

The source of truth is `docs/source-of-truth.md`. `REVORY_ESCOPO_HIBRIDO.md` contains broader hypotheses; it is not permission to market unimplemented rules.

## 2. Commercial gates

| Offer | Target price | Earliest gate | What must be true |
|---|---:|---|---|
| Quote Recovery Audit | US$799 one-time | Sprint 5 | Valid import, evidence-first quote findings, export/report and low founder intervention |
| Starter | US$399/month | Sprint 6 | Second-read loop, recurring value, billing, security and paid-beta readiness |
| Full Revenue Leak Audit | US$1,499 one-time | Sprint 9 | Reconciled estimate/job/invoice/change-order evidence and executive report |
| Growth | US$799/month | Sprint 10 | Useful history, segmentation with sample guards and weekly management decision |
| Pro | US$1,499/month | Sprint 11 | Trustworthy change-order, underbilling and margin reads plus independent security review |
| Multi-location | US$2,499+/month | Future | Proven multi-unit demand, permissions, isolation and branch-level decisions |

No price is “defended” by scope on paper. Defensibility requires paid evidence, repeat usage, low support burden and findings whose value basis survives customer review.

## 3. GPT-5.6 routing

Select the model in Codex; naming it in a prompt records intent but may not switch the runtime automatically.

- **Luna / light:** mechanical edits, formatting, fixture expansion and low-risk documentation cleanup.
- **Terra / medium-high:** normal implementation, UI, schemas, tests and bounded refactors.
- **Sol / high:** domain contracts, leak logic, pricing/copy truth, security architecture and release decisions.
- **Sol / max:** financial reconciliation, tenant isolation, migration review and launch gates.
- **Sol / ultra, when available:** final independent challenge of Pro security or cross-domain financial logic; do not use as the everyday default.

## 4. Sprint matrix

| Sprint | Outcome | Primary model | Review model | Required skills |
|---:|---|---|---|---|
| 0 | Hybrid truth, inventory and threat model | Sol high | Sol max | `$revory`, `$alice` |
| 1 | Canonical multi-dataset contracts | Sol max | Sol max | `$revory`, `$alice`, `vercel:nextjs` |
| 2 | Secure CSV/XLSX intake and Data Quality | Terra high | Sol high | `$revory`, `vercel:nextjs`, `vercel:auth` |
| 3 | Quote and follow-up engine V1 | Sol max | Sol max | `$revory`, `$alice` |
| 4 | Quote Recovery experience | Terra high | Sol high | `$revory`, `$alice`, `vercel:react-best-practices`, `vercel:agent-browser-verify` |
| 5 | One-time Quote Recovery Audit | Terra high | Sol high | `$revory`, `$alice`, `vercel:payments`, `vercel:verification` |
| 6 | Starter recurring loop and paid beta | Sol high | Sol max | `$revory`, `$alice`, `vercel:auth`, `vercel:payments`, `vercel:observability` |
| 7 | Job/invoice/change-order ingestion | Sol max | Sol max | `$revory`, `$alice`, `vercel:nextjs` |
| 8 | Matching and reconciliation engine | Sol max | Sol max | `$revory`, `$alice` |
| 9 | Change-order, underbilling and margin rules | Sol max | Sol max/ultra | `$revory`, `$alice`, `vercel:verification` |
| 10 | Growth history, segmentation and reports | Terra high | Sol high | `$revory`, `$alice`, `vercel:react-best-practices` |
| 11 | Pro security/compliance and paid beta | Sol max | Sol ultra or independent max | `$revory`, `$alice`, `vercel:vercel-firewall`, `vercel:observability`, `vercel:verification` |
| 12 | Paid evidence and packaging decision | Sol high | Sol max | `$revory`, `$alice`, `spreadsheets:Spreadsheets` when needed |
| 13 | Commercial packaging and pricing clarity | Terra high | Sol high | `$revory`, `$alice`, `vercel:react-best-practices` |

Use Luna only for bounded support tasks inside a sprint. Luna must not own financial semantics, authorization, migrations or an exit-gate decision.

## 5. Objective prompt — Quote Recovery launch

```text
Use $revory and $alice.

Objective: execute Sprints 0–6 from docs/REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md and make the Quote Recovery Audit and Starter paid beta genuinely launch-ready.

Treat docs/source-of-truth.md as canonical and REVORY_ESCOPO_HIBRIDO.md as detailed product context. REVORY is the single public identity for the hybrid product; the former MedSpa product is historical migration substrate. Do not implement jobs/invoices/change orders before their dependencies merely to fill future screens.

Use GPT-5.6 Sol high for ownership, Sol max for Sprints 1, 3 and the Sprint 6 gate, Terra high for bounded implementation, and Luna light only for mechanical support.

For each sprint: inventory current behavior, preserve unrelated user changes, implement the smallest coherent vertical slice, run focused and proportional verification, verify the UI when applicable, update documentation, and publish an evidence report against every exit criterion. Stop on a failed gate; do not call a partially evidenced feature complete.
```

## 6. Objective prompt — Hybrid Revenue Leak launch

```text
Use $revory and $alice.

Objective: after Sprints 0–6 have passed, execute Sprints 7–11 from docs/REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md and make the Full Revenue Leak Audit, Growth and Pro paid betas trustworthy.

Build explicit contracts and matching for jobs, invoices, change orders and costs. Separate observed amounts, deterministic gaps, estimated recoverable value, operational risk and data-quality risk. Never infer performed or approved work as fact from weak text. Suppress financial output when required links or inputs are missing.

Use GPT-5.6 Sol max for Sprints 7–9 and 11, Terra high for Sprint 10, and Sol ultra only for the final independent security/financial-logic challenge when available.

For each sprint: prove tenant isolation, idempotency, reconciliation, false-positive behavior and copy-to-capability traceability. Stop when a predecessor gate fails. Do not publish Pro pricing until the Pro module and security gate pass.
```

## 7. Prompt for one sprint

```text
Use $revory and $alice. Execute only Sprint [N] from docs/REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md.

Primary model: GPT-5.6 [Sol/Terra/Luna]. Effort: [light/medium/high/max].

Read AGENTS.md, docs/source-of-truth.md, REVORY_ESCOPO_HIBRIDO.md and the sprint dependencies. Inspect the current implementation before editing. Implement every required deliverable that is safely in scope, verify it proportionally, and update relevant living documentation.

At the end report: delivered files/behavior, tests and visual checks, security and tenant-isolation evidence, copy-to-capability evidence, unresolved risks, and pass/fail for each exit criterion. Do not advance automatically.
```

## 8. Continuous workflow

For fastest safe development, use one task as sprint owner and a fresh task as gate reviewer for high-risk sprints. The owner implements; the reviewer receives the raw diff, test output and exit criteria and attempts to reject unsupported claims.

Use this command for day-to-day continuation:

```text
Use $revory. Identify the next eligible incomplete sprint, execute it to its exit gate, and stop. If no sprint is eligible, report the exact predecessor evidence missing.
```

## 9. Definition of done

A sprint is complete only when:

- behavior exists end to end, not only as UI;
- tests cover success, boundary, insufficient-data and tenant-isolation cases;
- financial labels match value basis;
- data quality gates unsupported claims;
- AI is optional to core value;
- relevant security controls are evidenced;
- user-facing documentation matches implementation;
- every exit criterion explicitly passes.
