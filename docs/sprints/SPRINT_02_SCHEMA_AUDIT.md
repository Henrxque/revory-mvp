# REVORY — Sprint 02 Schema Audit

## 1. Which models exist and can be related to RevenueLeak?

The current Prisma schema already has enough substrate to add `RevenueLeak` safely without renaming legacy models.

Relevant models:

- `Workspace`: required parent for every leak. This should be the primary owner relation.
- `Appointment`: direct evidence source for `NO_SHOW_REVENUE` and `CANCELED_NOT_RECOVERED`.
- `Client`: optional context for financial leaks and operational leak risks.
- `LeadBookingOpportunity`: optional context for `MISSING_CONTACT` and `BOOKING_PATH_BLOCKED`.
- `DataSource`: useful optional source relation for import provenance and stale-data evidence.
- `MetricsSnapshot`: overlaps conceptually with old revenue/proof metrics, but should not be the source of truth for V3 leak detection.
- `RecoveryOpportunity`: overlaps with older recovery/rebooking concepts, but should not be reused as the V3 leak model.

Recommended relation map:

- `Workspace` -> many `RevenueLeak`.
- `Appointment` -> many `RevenueLeak`.
- `Client` -> many `RevenueLeak`.
- `LeadBookingOpportunity` -> many `RevenueLeak`.
- `DataSource` -> many `RevenueLeak`.

All relations except `workspaceId` should be optional because not every leak has the same evidence shape:

- No-show leak: usually appointment + client + data source.
- Canceled not recovered leak: usually appointment + client + data source.
- Missing contact risk: usually client and/or lead booking opportunity.
- Booking path blocked risk: usually lead booking opportunity.
- Stale booked proof risk: often workspace/data-source level, not client-level.

## 2. Are relation names required to avoid Prisma conflicts?

Strictly: **not required right now** if each pair of models only has one relation to `RevenueLeak`.

Practically: **recommended** for `RevenueLeak` because this model is likely to grow. It may later need multiple links to the same model, such as source appointment vs recovery appointment, primary client vs affected client group, or detected-from data source vs resolved-by data source.

The existing schema uses explicit relation names only when needed, for example `AutomationTriggeredBy`. For `RevenueLeak`, explicit relation names are a small cost and reduce future Prisma ambiguity.

Recommended relation names:

- `WorkspaceRevenueLeaks`
- `ClientRevenueLeaks`
- `AppointmentRevenueLeaks`
- `DataSourceRevenueLeaks`
- `LeadBookingOpportunityRevenueLeaks`

## 3. What is the safest relation strategy?

Use one required parent relation and optional evidence/context relations.

Recommended strategy:

- `workspaceId` required with `onDelete: Cascade`.
- `relatedClientId` optional with `onDelete: SetNull`.
- `relatedAppointmentId` optional with `onDelete: SetNull`.
- `relatedLeadBookingOpportunityId` optional with `onDelete: SetNull`.
- `sourceDataSourceId` optional with `onDelete: SetNull`.
- Preserve human-readable denormalized fields like `providerName`, `serviceName`, and `sourceName`.
- Preserve deterministic evidence in `evidenceJson`.
- Add a `fingerprint` field and `@@unique([workspaceId, fingerprint])` for idempotent sync.

Why this is safest:

- Deleting a workspace should delete its leaks.
- Deleting or replacing imported client/appointment/source rows should not destroy the leak record if the leak has already been shown; it should retain evidence and denormalized context.
- Optional relations keep workspace-level stale-data risks possible.
- A fingerprint prevents duplicate leaks when the future engine reruns.

## 4. What existing enums or fields can be reused?

Reusable existing enums:

- `AppointmentStatus`: supports detecting `NO_SHOW` and `CANCELED`.
- `DataSourceType`: supports provenance and distinguishing appointment/client/manual import sources.
- `DataSourceStatus`: supports stale/source quality context.
- `LeadBookingOpportunityStatus`: supports `READY`, `BLOCKED`, `BOOKED`, `CLOSED` based operational risk reads.

Reusable existing fields:

- `Appointment.status`
- `Appointment.scheduledAt`
- `Appointment.canceledAt`
- `Appointment.estimatedRevenue`
- `Appointment.serviceName`
- `Appointment.providerName`
- `Client.email`
- `Client.phone`
- `Client.hasLeadBaseSupport`
- `LeadBookingOpportunity.status`
- `LeadBookingOpportunity.blockingReason`
- `LeadBookingOpportunity.bookingPath`
- `LeadBookingOpportunity.mainOfferKey`
- `LeadBookingOpportunity.handoffOpenedAt`
- `DataSource.lastImportedAt`
- `DataSource.lastImportCompletedAt`
- `DataSource.status`
- `ActivationSetup.averageDealValue`

Do not reuse:

- `RecoveryOpportunityStatus` as the leak status. Leak lifecycle is different from recovery workflow lifecycle.
- `MetricsPeriodType` for leak status/windowing. Leaks should have their own `sourceWindowStart` and `sourceWindowEnd`.

## 5. Are there existing data models that overlap with RevenueLeak?

Yes, but none should replace `RevenueLeak`.

### `RecoveryOpportunity`

Overlap:

- Has `reason`, `estimatedValue`, `detectedAt`, `resolvedAt`, `status`.
- Relates to `Workspace`, `Client`, and optional `Appointment`.

Why not reuse:

- It carries old recovery/rebooking semantics.
- It does not separate financial leaks from operational leak risks.
- It does not support the V3 leak types directly.
- Its statuses are recovery-action oriented: `OPEN`, `CONTACTED`, `RECOVERED`, `CLOSED`.

### `MetricsSnapshot`

Overlap:

- Has old estimated revenue fields: `estimatedRevenueProtected`, `estimatedRevenueRecovered`.
- Aggregates appointment/revenue-ish metrics.

Why not reuse:

- It is aggregate/time-series oriented, not evidence-per-leak.
- Old fields risk overclaiming “protected/recovered” revenue.
- The V3 SoT requires each leak to have evidence, confidence, and recommended action.

### `LeadBookingOpportunity`

Overlap:

- Useful for operational risk types: missing contact and booking path blocked.
- Has blocked/readiness state and handoff timestamps.

Why not reuse:

- It represents booking-opportunity assistance, not a canonical leak.
- It should feed `RevenueLeak`, not be the leak table itself.

### `Appointment`

Overlap:

- Direct source for no-show/cancellation evidence.

Why not reuse:

- An appointment is a source record. A leak is a detected interpretation with severity, confidence, evidence, and recommended action.

## 6. Any migration risks?

Low risk if implemented as an additive migration.

Risks to manage:

- Adding enum types in Postgres is safe, but enum names should be final enough to avoid painful later renames.
- Adding back-relations to existing models is non-breaking at the DB level.
- Required fields in a new table are safe because the table starts empty.
- Do not add required fields to existing tables in this sprint.
- Do not migrate old `RecoveryOpportunity` rows into `RevenueLeak` yet.
- If `fingerprint` is added as required, the future sync service must always generate it. That is acceptable and recommended because it prevents duplicate leaks.
- If `estimatedValueCents` uses `Int`, services must convert existing `Decimal` money fields into cents. This is still safer for aggregation than mixing decimal semantics in a leak engine.

## 7. Recommended exact Prisma model and enum implementation

Recommended enum additions:

```prisma
enum RevenueLeakType {
  NO_SHOW_REVENUE
  CANCELED_NOT_RECOVERED
  STALE_BOOKED_PROOF
  MISSING_CONTACT
  BOOKING_PATH_BLOCKED
}

enum RevenueLeakSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum RevenueLeakStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
  DISMISSED
}

enum RevenueLeakConfidence {
  LOW
  MEDIUM
  HIGH
}
```

Recommended parent model additions:

```prisma
model Workspace {
  // existing fields...
  revenueLeaks RevenueLeak[] @relation("WorkspaceRevenueLeaks")
}

model DataSource {
  // existing fields...
  revenueLeaks RevenueLeak[] @relation("DataSourceRevenueLeaks")
}

model Client {
  // existing fields...
  revenueLeaks RevenueLeak[] @relation("ClientRevenueLeaks")
}

model Appointment {
  // existing fields...
  revenueLeaks RevenueLeak[] @relation("AppointmentRevenueLeaks")
}

model LeadBookingOpportunity {
  // existing fields...
  revenueLeaks RevenueLeak[] @relation("LeadBookingOpportunityRevenueLeaks")
}
```

Recommended new model:

```prisma
model RevenueLeak {
  id                              String                       @id @default(cuid())
  workspaceId                     String
  sourceDataSourceId              String?
  relatedClientId                 String?
  relatedAppointmentId            String?
  relatedLeadBookingOpportunityId String?
  leakType                        RevenueLeakType
  severity                        RevenueLeakSeverity          @default(MEDIUM)
  status                          RevenueLeakStatus            @default(OPEN)
  estimatedValueCents             Int?
  currency                        String                       @default("USD")
  confidence                      RevenueLeakConfidence        @default(MEDIUM)
  detectedAt                      DateTime                     @default(now())
  sourceWindowStart               DateTime?
  sourceWindowEnd                 DateTime?
  reason                          String
  recommendedAction               String
  evidenceJson                    Json
  providerName                    String?
  serviceName                     String?
  sourceName                      String?
  fingerprint                     String
  resolvedAt                      DateTime?
  createdAt                       DateTime                     @default(now())
  updatedAt                       DateTime                     @updatedAt
  workspace                       Workspace                    @relation("WorkspaceRevenueLeaks", fields: [workspaceId], references: [id], onDelete: Cascade)
  sourceDataSource                DataSource?                  @relation("DataSourceRevenueLeaks", fields: [sourceDataSourceId], references: [id], onDelete: SetNull)
  relatedClient                   Client?                      @relation("ClientRevenueLeaks", fields: [relatedClientId], references: [id], onDelete: SetNull)
  relatedAppointment              Appointment?                 @relation("AppointmentRevenueLeaks", fields: [relatedAppointmentId], references: [id], onDelete: SetNull)
  relatedLeadBookingOpportunity   LeadBookingOpportunity?      @relation("LeadBookingOpportunityRevenueLeaks", fields: [relatedLeadBookingOpportunityId], references: [id], onDelete: SetNull)

  @@unique([workspaceId, fingerprint])
  @@index([workspaceId, status, detectedAt])
  @@index([workspaceId, leakType, status])
  @@index([workspaceId, severity, status])
  @@index([workspaceId, confidence])
  @@index([workspaceId, sourceWindowStart, sourceWindowEnd])
  @@index([sourceDataSourceId])
  @@index([relatedClientId])
  @@index([relatedAppointmentId])
  @@index([relatedLeadBookingOpportunityId])
  @@map("revenue_leaks")
}
```

Notes on the recommendation:

- `estimatedValueCents` follows the V3 SoT and is safer for deterministic aggregation.
- `fingerprint` is not optional in practice. The future sync service needs it to avoid duplicate leaks.
- Financial vs operational classification should be derived from `leakType` in service code for now, not stored as a separate enum, to avoid drift.
- `evidenceJson` should be deterministic evidence, not LLM-generated explanation.

## 8. Any naming concerns?

### `STALE_BOOKED_PROOF`

This name comes from the SoT, but it still carries older “booked proof” language. It is acceptable if treated as a V1 stale appointment/import evidence risk. A cleaner future name could be `STALE_APPOINTMENT_DATA`, but changing it now would diverge from the current SoT.

Recommendation: keep `STALE_BOOKED_PROOF` for Sprint 02 if the external SoT remains authoritative, but use UI copy like “stale appointment data”.

### `MISSING_CONTACT`

This is operational risk, not confirmed financial loss. Services and UI must not sum this as hard lost revenue unless deterministic financial evidence exists.

### `BOOKING_PATH_BLOCKED`

This is operational risk. It can affect prioritization, but should not be positioned as confirmed lost revenue.

### `estimatedValueCents`

Existing schema money fields use `Decimal`, but the new SoT suggests cents. This is a deliberate new leak-engine convention and should be documented in service code when implemented.

### `RevenueLeak`

Good name. It establishes the new canonical domain object and should not be diluted into `Insight`, `Metric`, or `Opportunity`.

## 9. Suggested migration name

Recommended migration name:

```txt
20260528000100_sprint_02_revenue_leak_foundation
```

Alternative if generated with Prisma CLI timestamp:

```txt
sprint_02_revenue_leak_foundation
```

Do not name it around UI, dashboard, or engine behavior. This migration should only add the technical foundation for `RevenueLeak`.

## Final Recommendation

Add `RevenueLeak` as a new additive model with dedicated enums, optional evidence relations, JSON evidence, denormalized display context, and a required `fingerprint` for idempotent future sync.

Do not reuse `RecoveryOpportunity` or `MetricsSnapshot` as the canonical leak model. They are historical substrate and have semantics that can weaken product truth.

Do not implement the leak engine in Sprint 02. The correct next step is only schema + migration + generated Prisma client + possibly type-level smoke validation.
