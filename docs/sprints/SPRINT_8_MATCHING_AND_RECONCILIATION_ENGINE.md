# Sprint 8 — Matching and reconciliation engine

Status: **PASS locally** on 2026-07-12. Sprint 9 findings are now implemented locally; Full Revenue Leak Audit controlled sale remains separately gated.

## Delivered

- Explicit estimate/job/invoice/change-order/cost relationship resolution by external ID inside one workspace.
- `MATCHED`, `UNMATCHED` and `CONFLICT` states; names and amounts are never fuzzy-match inputs.
- One-to-many invoice, change-order and cost aggregation by job.
- Deterministic expected-billing basis, observed eligible invoice total and calculated difference with source-line reconstruction.
- Currency, invoice status, job completion, approval evidence and contract/change-order-basis guards.
- Data Quality suppression whenever datasets, links or bases are incomplete or ambiguous.
- Observed job costs and billed-less-observed-cost basis remain separate; the engine does not call this margin or create a finding.
- Authenticated reconciliation ledger and unmatched/conflict review at `/app/revenue-realization`.

## Exit evidence

`qa:sprints-7-8` proves reconstruction, one-to-many aggregation, deterministic reruns, partial data, unmatched links, conflicting IDs, currency conflict and cross-workspace rejection. `qa:sprints-7-8:browser` verifies both import layers and the ledger in desktop/mobile with no horizontal overflow. `qa:sprints-7-8:copy` prevents commercial or financial overclaiming.

Every eligible difference is reconstructable from provenance-bearing inputs. Ambiguous matches suppress the financial output. Sprint 8 passes locally.
