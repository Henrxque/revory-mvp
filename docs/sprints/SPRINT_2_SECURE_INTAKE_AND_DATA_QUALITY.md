# Sprint 2 — Secure intake and Data Quality

Status: implemented locally on 2026-07-12. The additive migration was applied only to the local PostgreSQL database; no remote environment was changed.

## Delivered

- Multi-file CSV/XLSX intake for all canonical datasets.
- Downloadable canonical templates and explicit mapping confirmation.
- Deterministic normalization for string, date, money, integer and boolean fields.
- File count, size, row, column, extension, duplicate-header, duplicate-target and external-ID controls.
- XLSX formula rejection so calculated spreadsheet cells cannot masquerade as observed source values.
- Explicit entity-link coverage with unmatched records preserved; no fuzzy name/amount linking.
- Rule eligibility report based on actually populated estimate fields.
- Atomic Prisma transaction, deterministic batch idempotency key and canonical-record upserts.
- Saved mapping signatures per workspace/entity/header set.
- Server-derived workspace authorization and per-workspace rate limiting.
- Deterministic comma, semicolon and tab profiling with unambiguous structure checks.
- Common alternate-header suggestions for Customer, Lead, Estimate and Activity.
- Optional bounded-AI mapping suggestions over sanitized profiles only, followed by deterministic validation and explicit human confirmation.

## Exit evidence

`qa:sprints-1-3` proves formula blocking, thin-data ineligibility and stable idempotency. Invalid plans cannot reach persistence, and the transaction commits the whole accepted batch or none of it.

`qa:canonical-assisted-intake` additionally verifies alternate headers, supported delimiters, unavailable/timeout/invalid AI behavior, low confidence, missing required fields, wrong datasets, duplicate targets, confirmation, idempotency and workspace isolation. Revenue Realization datasets remain prepared contracts and are not exposed as current public upload capabilities.
