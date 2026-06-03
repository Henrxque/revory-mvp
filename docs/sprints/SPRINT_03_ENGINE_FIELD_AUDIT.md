# REVORY — Sprint 03 Leak Engine Field Audit

## Summary

The current schema supports a deterministic Leak Engine V1 without a new migration, as long as Sprint 03 stays conservative.

The engine can safely detect:

- no-show revenue leaks from `Appointment.status = NO_SHOW`;
- canceled-not-recovered revenue leaks by looking for absence of later scheduled/completed appointments for the same client;
- missing contact operational risks from `LeadBookingOpportunity.blockingReason = "missing_contact"` plus missing email/phone;
- booking path blocked operational risks from `LeadBookingOpportunity.blockingReason = "missing_booking_path"`;
- stale appointment evidence/data quality risk from `DataSource` freshness fields.

The main constraint: there is no explicit rebooking/recovery link. Canceled-not-recovered must be inferred conservatively from same-client future appointment evidence, not stated as confirmed lost revenue.

## 1. Exact Appointment status values available

`AppointmentStatus` in `prisma/schema.prisma` contains:

- `SCHEDULED`
- `COMPLETED`
- `CANCELED`
- `NO_SHOW`

CSV normalization supports exactly the same values through `normalizeAppointmentStatus` in `services/imports/normalize-import-values.ts`.

## 2. Exact field for appointment estimated revenue

Appointment estimated revenue field:

- `Appointment.estimatedRevenue`
- Type: `Decimal?`
- Prisma annotation: `@db.Decimal(10, 2)`

Import source:

- CSV column: `estimated_revenue`
- Parsed in `services/imports/parse-appointments-csv.ts`
- Normalized by `normalizeEstimatedRevenue`
- Persisted by `services/imports/persist-appointments-import.ts`

Important semantics:

- This is an imported or normalized estimate, not confirmed accounting revenue.
- Sprint 03 should convert it to `RevenueLeak.estimatedValueCents` only through a careful decimal-to-cents helper.

## 3. Exact relation between Appointment and Client

Appointment relation:

- `Appointment.clientId` is required.
- `Appointment.client` is required.
- Relation uses `@relation(fields: [clientId], references: [id], onDelete: Cascade)`.

Client relation:

- `Client.appointments` is the back-relation.

This is enough for:

- no-show leak relation to client;
- canceled-not-recovered same-client future booking lookup;
- evidence payloads that include client identity support without exposing personal data unnecessarily.

## 4. Exact future appointment/rebooking criteria available

Current existing future booking logic appears in:

- `services/lead-booking/sync-lead-booking-opportunities.ts`
- `services/lead-booking/create-manual-lead-booking-opportunity.ts`

Existing criterion:

- same `workspaceId`;
- same `clientId`;
- `Appointment.status = SCHEDULED`;
- `Appointment.scheduledAt >= new Date()`.

For Sprint 03 canceled-not-recovered detection, this exact criterion is too narrow because a cancellation may have been recovered by a later completed appointment or later scheduled appointment that is not necessarily future relative to today.

Recommended conservative V1 recovery criterion:

- same `workspaceId`;
- same `clientId`;
- appointment id is not the canceled appointment;
- `status IN (SCHEDULED, COMPLETED)`;
- `scheduledAt > (canceledAppointment.canceledAt ?? canceledAppointment.scheduledAt)`.

This should be treated as "replacement booking evidence found", not as guaranteed recovery.

Recommended no-show criteria:

- `status = NO_SHOW`;
- attach appointment and client relation;
- use direct `estimatedRevenue` if present;
- otherwise use `ActivationSetup.averageDealValue` if present;
- if neither exists, create a leak without financial value or lower confidence based on Sprint 03 rules.

## 5. Exact LeadBookingOpportunity status/blocking fields

`LeadBookingOpportunityStatus` values:

- `OPEN`
- `READY`
- `BLOCKED`
- `BOOKED`
- `CLOSED`

Fields available:

- `LeadBookingOpportunity.status`
- `LeadBookingOpportunity.blockingReason`
- `LeadBookingOpportunity.nextAction`
- `LeadBookingOpportunity.bookingPath`
- `LeadBookingOpportunity.mainOfferKey`
- `LeadBookingOpportunity.handoffOpenedAt`
- `LeadBookingOpportunity.openedAt`
- `LeadBookingOpportunity.resolvedAt`
- `LeadBookingOpportunity.clientId`
- `LeadBookingOpportunity.intakeDataSourceId`
- `LeadBookingOpportunity.intakeSourceType`
- `LeadBookingOpportunity.intakeSourceName`

Blocking reasons are string values produced by `evaluateLeadBookingOpportunity`:

- `missing_contact`
- `missing_main_offer`
- `missing_booking_path`
- `ineligible_for_handoff`

Sprint 03 V1 should map only:

- `missing_contact` -> `MISSING_CONTACT`
- `missing_booking_path` -> `BOOKING_PATH_BLOCKED`

Do not map `missing_main_offer` or `ineligible_for_handoff` into V1 `RevenueLeakType` unless the sprint explicitly expands scope.

## 6. Exact fields for email/phone missing contact detection

Client fields:

- `Client.email`
- `Client.phone`

Normalization exists in:

- `normalizeEmail`
- `normalizePhone`
- `persistImportedClient`
- `createManualLeadBookingOpportunity`

Recommended V1 missing contact detector:

- query `LeadBookingOpportunity` with `status = BLOCKED`;
- `blockingReason = "missing_contact"`;
- include `client`;
- verify `client.email IS NULL` and `client.phone IS NULL`;
- create `MISSING_CONTACT` operational risk with `estimatedValueCents = null`.

Important nuance:

- Manual Quick Add requires at least one contact detail, so many missing-contact cases will come from imported client evidence with an external ID but no email/phone.

## 7. Exact DataSource freshness fields

`DataSource` fields available:

- `lastSyncAt`
- `lastImportedAt`
- `lastImportCompletedAt`
- `lastImportFileName`
- `lastImportRowCount`
- `lastImportSuccessRowCount`
- `lastImportErrorRowCount`
- `lastImportError`
- `status`
- `type`
- `updatedAt`
- `configJson`

CSV metadata behavior:

- `registerCsvUploadMetadata` sets `lastImportedAt` at upload/registration time.
- `finalizeCsvImport` sets `lastImportCompletedAt` when import completes.
- `status` becomes `IMPORTED` if at least one row succeeds.

Existing freshness thresholds in Daily Brief:

- fresh threshold: 48 hours;
- stale threshold: 7 days.

Recommended V1 stale data detector:

- target `DataSource.type = APPOINTMENTS_CSV`;
- require a live source: `status IN (IMPORTED, CONNECTED)` or `lastImportSuccessRowCount > 0`;
- freshness timestamp: `lastImportCompletedAt ?? lastImportedAt ?? updatedAt`;
- if older than 7 days, create `STALE_BOOKED_PROOF`;
- set category via helper as `DATA_QUALITY_RISK`;
- set `estimatedValueCents = null`;
- relate through `sourceDataSourceId`.

Naming caution:

- Prisma enum is `STALE_BOOKED_PROOF`, but user-facing copy should prefer "stale appointment evidence" or "stale revenue read".

## 8. Exact source for averageDealValue

Average deal value source:

- `ActivationSetup.averageDealValue`
- Type: `Decimal?`
- Prisma annotation: `@db.Decimal(10, 2)`

Setup behavior:

- collected in setup step `deal_value`;
- normalized in `src/app/(app)/app/setup/actions.ts`;
- stored as `new Prisma.Decimal(parsedValue)`;
- required for activation by `completeActivationSetup`.

Recommended V1 use:

- fallback value for financial leak estimates when `Appointment.estimatedRevenue` is missing;
- evidence must record whether the value came from appointment value or average deal value;
- confidence should be lower when using average deal value than when using direct appointment value.

## 9. Decimal/money conversion concerns

Current money fields use dollars as Decimal:

- `Appointment.estimatedRevenue: Decimal? @db.Decimal(10, 2)`
- `ActivationSetup.averageDealValue: Decimal? @db.Decimal(10, 2)`
- historical `RecoveryOpportunity.estimatedValue: Decimal? @db.Decimal(10, 2)`

RevenueLeak stores:

- `estimatedValueCents: Int?`

Risk:

- direct `Number(decimal) * 100` can introduce floating-point artifacts if not rounded.

Recommended helper for Sprint 03:

- create a single `decimalMoneyToCents` helper in `leak-estimation.ts`;
- use `Math.round(Number(value) * 100)`;
- return `null` for null/undefined/non-finite/negative values;
- evidence should include source: `appointment_estimated_revenue`, `average_deal_value`, or `missing_value`.

Because current DB precision is `Decimal(10, 2)`, this conversion is acceptable for MVP if centralized and tested.

## 10. Recommended detector implementation details

Recommended files:

- `services/revenue-leaks/leak-estimation.ts`
- `services/revenue-leaks/leak-confidence.ts`
- `services/revenue-leaks/leak-severity.ts`
- `services/revenue-leaks/revenue-leak-fingerprint.ts`
- `services/revenue-leaks/detect-revenue-leaks.ts`
- `services/revenue-leaks/sync-revenue-leaks.ts`

Recommended detector shape:

- read all required source data for a workspace;
- produce `RevenueLeakCreateInput[]`;
- do not write from `detect-revenue-leaks.ts`;
- write/upsert only from `sync-revenue-leaks.ts`;
- use `workspaceId + fingerprint` for idempotent upsert;
- preserve user state for `ACKNOWLEDGED`, `DISMISSED`, `RESOLVED` where possible;
- avoid overwriting resolved/dismissed leaks unless an explicit future rule says otherwise.

Recommended fingerprint patterns:

- no-show: `no_show_revenue:${workspaceId}:${appointmentId}`;
- canceled not recovered: `canceled_not_recovered:${workspaceId}:${appointmentId}`;
- missing contact: `missing_contact:${workspaceId}:${leadBookingOpportunityId}`;
- booking path blocked: `booking_path_blocked:${workspaceId}:${leadBookingOpportunityId}`;
- stale source: `stale_booked_proof:${workspaceId}:${dataSourceId}`;

Recommended query payloads:

- Appointments:
  - include `client`;
  - include `dataSource`;
  - filter by workspace;
  - optionally constrain to a recent source window once product policy is defined.

- Lead booking opportunities:
  - include `client`;
  - filter by workspace;
  - use only `BLOCKED` V1 reasons.

- Data sources:
  - filter to appointment CSV source first;
  - avoid generic data source leak claims.

Recommended evidence:

- use compact structured `evidenceJson`;
- include signal names;
- include value source;
- include source ids;
- avoid raw patient/client data in evidence unless necessary.

## 11. Schema gaps

No Sprint 03 blocker was found.

Non-blocking gaps:

- No explicit appointment-to-rebooking relation.
- No explicit "recovered" flag for canceled/no-show appointments.
- No explicit source window policy field.
- No historical sync run model for RevenueLeak sync.
- `LeadBookingOpportunity.blockingReason` is a string, not enum.
- `STALE_BOOKED_PROOF` enum name is historically anchored in booked proof, not the cleaner V3 phrase "stale appointment evidence".

Recommendation:

- Do not create a migration for these gaps in Sprint 03 unless implementation exposes a hard blocker.
- Use conservative evidence and confidence instead of expanding schema early.

## 12. Risk assessment

### Low risk

- No-show leak detection from `Appointment.status = NO_SHOW`.
- Missing contact operational risk from existing lead opportunity state.
- Booking path blocked operational risk from existing lead opportunity state.
- Stale data quality risk from appointment `DataSource` freshness.

### Medium risk

- Canceled-not-recovered detection because recovery is inferred from later same-client booked/completed appointments, not explicitly linked.
- Average deal value fallback because it is an estimate and should lower confidence.
- Decimal-to-cents conversion if not centralized.

### High risk if handled poorly

- Counting operational risks as financial estimated revenue at risk.
- Presenting inferred cancellations as confirmed lost revenue.
- Letting AI produce or alter financial values.
- Creating a UI before deterministic sync/fingerprints are stable.

### Final audit verdict

Sprint 03 can proceed without schema changes.

The right next step is a deterministic engine/sync layer with strong idempotency, conservative confidence, and strict separation between financial leaks and operational/data-quality risks.
