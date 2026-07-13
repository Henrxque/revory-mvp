# Sprint 7 — Revenue Realization ingestion

Status: **PASS locally** on 2026-07-12. This is an ingestion gate, not a commercial release.

## Delivered

- Assisted CSV/XLSX mapping for Job, Invoice, Change Order and Cost using the same deterministic profiler, optional sanitized AI suggestion, human confirmation and atomic persistence as Quote Recovery.
- Common contractor header aliases, canonical templates, source-system provenance, workspace IDs and external IDs.
- Currency on every financial basis and an explicit job field stating whether contract value already includes approved changes.
- Partial inputs remain importable; Tier 2 eligibility explains which bases remain incomplete.
- Existing Customer, Lead, Estimate and Activity ingestion and Quote Recovery findings remain isolated and unchanged.

## Exit evidence

`qa:sprints-7-8` covers alternate headers, semicolon/comma datasets, normalization, stable idempotency and partial-input suppression. `qa:sprints-7-8:browser` proves authenticated import and review on desktop/mobile using a loopback database only.

Realistic datasets import without mechanically reusing MedSpa fields, corrupting Quote Recovery or inventing a missing link. Sprint 7 therefore passes locally. No production migration or external provider was touched.
