# REVORY — Sprint 02 RevenueLeak Data Model Completion Report

## 1. Sprint summary

Sprint 02 created the technical foundation for REVORY's Revenue Leak Detector direction.

The sprint added the `RevenueLeak` database model, V1 leak enums, a safe additive migration, TypeScript domain types, category/label/guard helpers and deterministic fixtures for future tests and UI development.

This sprint intentionally stopped before product behavior. It did not implement leak detection, sync jobs, dashboard reads, Revenue Leaks Page, AI Insight or AI CSV Intake.

## 2. Scope completed

- RevenueLeak Prisma model created.
- V1 RevenueLeak enums created.
- Relations added to existing substrate models.
- Migration created and applied.
- Prisma Client generated.
- TypeScript domain layer created.
- Category derivation implemented in TypeScript, not persisted in Prisma.
- Financial vs operational/data-quality semantics locked.
- Deterministic fixtures created.
- QA Bug Hunt completed.
- Fix Pass completed with no corrective code changes required.

## 3. Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260528170333_sprint_02_revenue_leak_foundation/migration.sql`
- `types/revenue-leak.ts`
- `services/revenue-leaks/revenue-leak-types.ts`
- `services/revenue-leaks/revenue-leak-category.ts`
- `services/revenue-leaks/revenue-leak-guards.ts`
- `services/revenue-leaks/revenue-leak-labels.ts`
- `services/revenue-leaks/revenue-leak-fixtures.ts`
- `docs/sprints/SPRINT_02_SCHEMA_AUDIT.md`
- `docs/sprints/SPRINT_02_REVENUELEAK_DATA_MODEL_REPORT.md`
- `docs/sprints/SPRINT_02_QA_BUG_HUNT_REPORT.md`
- `docs/sprints/SPRINT_02_FIX_PASS_REPORT.md`

## 4. Prisma model created

Created `RevenueLeak` mapped to `revenue_leaks`.

Core fields added:

- `id`
- `workspaceId`
- `sourceDataSourceId`
- `relatedClientId`
- `relatedAppointmentId`
- `relatedLeadBookingOpportunityId`
- `leakType`
- `severity`
- `status`
- `confidence`
- `estimatedValueCents`
- `currency`
- `detectedAt`
- `sourceWindowStart`
- `sourceWindowEnd`
- `reason`
- `recommendedAction`
- `evidenceJson`
- `providerName`
- `serviceName`
- `sourceName`
- `fingerprint`
- `resolvedAt`
- `createdAt`
- `updatedAt`

Important defaults:

- `severity` defaults to `MEDIUM`.
- `status` defaults to `OPEN`.
- `confidence` defaults to `MEDIUM`.
- `currency` defaults to `USD`.
- `detectedAt` defaults to `now()`.
- `createdAt` defaults to `now()`.
- `updatedAt` uses `@updatedAt`.

## 5. Enums created

Created `RevenueLeakType`:

- `NO_SHOW_REVENUE`
- `CANCELED_NOT_RECOVERED`
- `STALE_BOOKED_PROOF`
- `MISSING_CONTACT`
- `BOOKING_PATH_BLOCKED`

Created `RevenueLeakSeverity`:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

Created `RevenueLeakStatus`:

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`
- `DISMISSED`

Created `RevenueLeakConfidence`:

- `LOW`
- `MEDIUM`
- `HIGH`

No `RevenueLeakCategory` Prisma enum was created. Category is intentionally derived in TypeScript from `RevenueLeakType`.

## 6. Relations added

All planned relations were added.

- `RevenueLeak.workspace` is required and uses relation name `WorkspaceRevenueLeaks` with `onDelete: Cascade`.
- `RevenueLeak.sourceDataSource` is optional and uses relation name `DataSourceRevenueLeaks` with `onDelete: SetNull`.
- `RevenueLeak.relatedClient` is optional and uses relation name `ClientRevenueLeaks` with `onDelete: SetNull`.
- `RevenueLeak.relatedAppointment` is optional and uses relation name `AppointmentRevenueLeaks` with `onDelete: SetNull`.
- `RevenueLeak.relatedLeadBookingOpportunity` is optional and uses relation name `LeadBookingOpportunityRevenueLeaks` with `onDelete: SetNull`.

Back-relations were added on:

- `Workspace.revenueLeaks`
- `DataSource.revenueLeaks`
- `Client.revenueLeaks`
- `Appointment.revenueLeaks`
- `LeadBookingOpportunity.revenueLeaks`

No planned relation was skipped because of schema constraints.

## 7. Indexes added

Added:

- Unique `workspaceId + fingerprint`.
- `workspaceId + status + detectedAt`.
- `workspaceId + leakType + status`.
- `workspaceId + severity + status`.
- `workspaceId + confidence`.
- `workspaceId + sourceWindowStart + sourceWindowEnd`.
- `sourceDataSourceId`.
- `relatedClientId`.
- `relatedAppointmentId`.
- `relatedLeadBookingOpportunityId`.

The unique workspace/fingerprint index is the future idempotency anchor for deterministic leak sync.

## 8. Migration created

Migration name:

- `20260528170333_sprint_02_revenue_leak_foundation`

Migration path:

- `prisma/migrations/20260528170333_sprint_02_revenue_leak_foundation/migration.sql`

Migration status:

- Created.
- Applied locally.
- Prisma Client generated.
- Validated.

Migration safety:

- Additive only.
- No reset.
- No destructive migration.
- No `DROP TABLE`.
- No `DROP COLUMN`.
- No `TRUNCATE`.
- No destructive `DELETE`.
- No old row migration.
- No `RecoveryOpportunity` backfill.

## 9. TypeScript domain types created

Created in `types/revenue-leak.ts`:

- `RevenueLeakCategory`
- `RevenueLeakEvidenceValue`
- `RevenueLeakEvidence`
- `RevenueLeakCreateInput`

Semantics:

- `RevenueLeakCategory` is TypeScript-only.
- `RevenueLeakEvidence` is structured and safe for future deterministic services.
- `RevenueLeakCreateInput` is a future service input type; it does not write to the database by itself.

## 10. Helpers created

Created in `services/revenue-leaks/`:

- `REVENUE_LEAK_TYPES`
- `assertNeverRevenueLeakType`
- `getRevenueLeakCategory`
- `getRevenueLeakTypeLabel`
- `isFinancialRevenueLeak`
- `canContributeToEstimatedRevenueAtRisk`

Locked category mapping:

- `NO_SHOW_REVENUE` -> `FINANCIAL_LEAK`
- `CANCELED_NOT_RECOVERED` -> `FINANCIAL_LEAK`
- `MISSING_CONTACT` -> `OPERATIONAL_RISK`
- `BOOKING_PATH_BLOCKED` -> `OPERATIONAL_RISK`
- `STALE_BOOKED_PROOF` -> `DATA_QUALITY_RISK`

Important guardrail:

- Operational risks do not automatically contribute to estimated revenue at risk.

Helper completeness:

- Helpers are complete for V1 category, label and guard semantics.
- Helpers do not estimate values, calculate confidence, score severity or persist leaks. Those belong to Sprint 03.

## 11. Fixtures created

Created `services/revenue-leaks/revenue-leak-fixtures.ts`.

Fixture scenarios:

- No-show high confidence financial leak.
- No-show medium confidence financial leak using average deal value.
- Canceled not recovered financial leak.
- Missing contact operational risk.
- Booking path blocked operational risk.
- Stale booked proof data quality risk.
- Leak without financial value.
- Dismissed leak.
- Resolved leak.
- Low confidence leak.

Fixture safety:

- Deterministic.
- Fake IDs only.
- No real client, patient or clinic data.
- Required `fingerprint` included.
- Required `evidenceJson` included.
- Category is helper-derived.
- `isFinancial` and `canContributeToEstimatedRevenueAtRisk` are helper-derived.
- No seed workflow was added.
- No production data is inserted.

## 12. Commands run

| Command | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npx prisma migrate dev --name sprint_02_revenue_leak_foundation` | Passed; migration created and applied |
| `npx prisma generate` | Passed |
| `npm run db:validate` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run env:check` | Passed |
| `npm run qa:clean-rerun` | Passed after starting local app server |

## 13. QA results

QA Bug Hunt result: passed.

Validated:

- Prisma schema is valid.
- Migration exists.
- Migration is non-destructive.
- `RevenueLeak` has required workspace relation.
- Optional relations exist for `DataSource`, `Client`, `Appointment` and `LeadBookingOpportunity`.
- V1 enums exist and do not include extra future leak types.
- `RevenueLeakCategory` is not persisted in Prisma.
- `RevenueLeakStatus` defaults to `OPEN`.
- `evidenceJson` is required `Json`.
- `fingerprint` is required.
- Indexes exist.
- TypeScript helpers compile.
- Fixtures are fake and safe.
- Existing app builds.
- No UI or fake leak metric was added.
- No leak engine was implemented.
- No AI Insight or AI CSV Intake was implemented.

One operational note:

- First `npm run qa:clean-rerun` failed because the local app server was not running on `localhost:3000`. After starting the app locally, the rerun passed. This was not a Sprint 02 implementation bug.

## 14. Known limitations

- The model does not detect revenue leaks yet.
- No service writes `RevenueLeak` rows yet.
- No sync job exists yet.
- No estimated revenue-at-risk aggregation exists yet.
- No confidence scoring service exists yet.
- No severity scoring service exists yet.
- No UI reads the model yet.
- Fixtures are static development/test assets, not generated by real detection logic.
- `STALE_BOOKED_PROOF` remains named from the historical booked-proof substrate; Sprint 03 can decide whether the service-level wording should present it as stale appointment evidence/data quality risk.

## 15. Scope intentionally not implemented

Intentionally not implemented:

- `detect-revenue-leaks.ts`
- `sync-revenue-leaks.ts`
- `leak-estimation.ts`
- `leak-confidence.ts`
- `leak-severity.ts`
- Dashboard revenue leak read model.
- Revenue Leaks Page.
- Daily Leak Brief.
- Executive Leak Summary.
- AI Insight Layer.
- AI CSV Intake/Triage.
- Fake dashboard metrics.
- Production seed.
- Migration from `RecoveryOpportunity` into `RevenueLeak`.
- Any change to billing, auth or import persistence logic.

## 16. Risks remaining

- Fingerprint strategy still needs to be implemented carefully in Sprint 03 to avoid duplicate leaks or accidental overwrites.
- Estimation rules must stay honest: use estimated revenue at risk, not confirmed lost revenue.
- Operational risks must remain separate from financial leak totals unless a deterministic financial basis exists.
- Detection services must avoid turning fixtures into fake product proof.
- Future UI must not display RevenueLeak rows as recovered/generated revenue.
- Future AI features must not become the financial source of truth.

## 17. Recommendations for Sprint 03

Sprint 03 should focus on deterministic leak detection and sync foundation:

- Create `detect-revenue-leaks.ts`.
- Create `leak-estimation.ts`.
- Create `leak-confidence.ts`.
- Create `leak-severity.ts`.
- Create `sync-revenue-leaks.ts`.
- Implement no-show revenue leak detection.
- Implement canceled-not-recovered revenue leak detection.
- Implement missing contact operational risk detection.
- Implement booking path blocked operational risk detection.
- Implement stale data quality risk detection.
- Implement deterministic fingerprint generation.
- Keep AI out of the financial source of truth.
- Add unit-level coverage for category, value contribution, confidence and idempotency behavior.

Recommended Sprint 03 guardrail:

- Build the engine before UI. Do not create a Revenue Leaks Page until deterministic detection and sync are trustworthy.

## 18. Pass/fail recommendation

Pass.

Sprint 02 is complete and approved. The foundation is technically valid, migration-safe, type-safe and appropriately scoped. The product did not overclaim or expose unfinished leak capability.
