# Sprint 1 — Canonical multi-dataset contracts

Status: implemented locally on 2026-07-12. No migration was applied to a remote database.

## Delivered

- Canonical contracts for customer, lead, estimate, activity, job, invoice, change order and cost in `domain/revory/contracts.ts`.
- Workspace-scoped external IDs, explicit relationship IDs and row-level provenance.
- Separate `OBSERVED`, `CALCULATED`, `ESTIMATED`, `OPERATIONAL` and `DATA_QUALITY` value bases.
- Quote Recovery finding family/type/category/confidence/severity/fingerprint contract.
- Additive Prisma substrate for import sessions, canonical records, saved mappings and Quote Recovery findings.
- Sample templates for all eight entity types.

## Compatibility decision

Historical `Client`, `Appointment` and `RevenueLeak` models remain untouched. They are a compatibility substrate only and do not redefine the current contractor domain. No clinical field was renamed or reused with a financial meaning. New data is written to canonical records; legacy removal is deferred until the replacement path has passed later experience and production gates.

## Exit evidence

The QA fixture represents Quote Recovery and Revenue Realization entity shapes, requires workspace ownership on every record and rejects cross-workspace analysis. Composite uniqueness includes workspace, entity type, source system and external ID.
