import assert from "node:assert/strict";
import fs from "node:fs";

import { prepareAiIntegrityBatch, type AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";

const digest = "a".repeat(64);
const mapping = "b".repeat(64);
const common = {
  workspaceId: "ws-a",
  sourceSystem: "stripe-export",
  fileName: "stripe.csv",
  fileSha256: digest,
  mappingSha256: mapping,
  windowStart: "2026-08-01T00:00:00Z",
  windowEnd: "2026-09-01T00:00:00Z",
  sourceTimezone: "UTC",
  dataQuality: { warnings: [] },
};
const revenue: AiIntegrityBatchInput = {
  ...common,
  sourceKind: "STRIPE_REVENUE",
  records: [{
    workspaceId: "ws-a",
    externalId: "ch_1",
    sourceRowNumber: 2,
    sourcePayload: { id: "ch_1", status: "paid" },
    provenance: { file: "stripe.csv", row: 2 },
    eventKind: "CHARGE",
    status: "paid",
    amountMinor: "12000",
    currency: "USD",
    currencyExponent: 2,
    occurredAt: "2026-08-10T12:00:00Z",
  }],
};
const first = prepareAiIntegrityBatch(revenue);
const replay = prepareAiIntegrityBatch(structuredClone(revenue));
assert.equal(first.idempotencyKey, replay.idempotencyKey, "Exact replay must use the same key.");
assert.deepEqual(first.recordHashes, replay.recordHashes);

const reorderedSource = structuredClone(revenue);
reorderedSource.records[0].sourceRowNumber = 9;
reorderedSource.records[0].provenance = { row: 9, file: "other-name.csv" };
assert.equal(prepareAiIntegrityBatch(reorderedSource).recordHashes[0], first.recordHashes[0], "Row position must not create a new semantic revision.");

const changed = structuredClone(revenue);
if (changed.sourceKind !== "STRIPE_REVENUE") throw new Error("Fixture type changed.");
changed.records[0].amountMinor = "13000";
assert.notEqual(prepareAiIntegrityBatch(changed).recordHashes[0], first.recordHashes[0], "Changed financial value must create a new immutable revision.");
assert.notEqual(prepareAiIntegrityBatch(changed).idempotencyKey, first.idempotencyKey, "Changed normalized output must not replay an older batch.");

const otherWorkspace = structuredClone(revenue);
otherWorkspace.workspaceId = "ws-b";
assert.throws(() => prepareAiIntegrityBatch(otherWorkspace), /Cross-workspace/);
otherWorkspace.records[0].workspaceId = "ws-b";
assert.notEqual(prepareAiIntegrityBatch(otherWorkspace).idempotencyKey, first.idempotencyKey, "Replay keys must be tenant-scoped.");

const duplicate = structuredClone(revenue);
duplicate.records.push(structuredClone(duplicate.records[0]));
assert.throws(() => prepareAiIntegrityBatch(duplicate), /Duplicate external ID/);
const invalidMoney = structuredClone(revenue);
if (invalidMoney.sourceKind !== "STRIPE_REVENUE") throw new Error("Fixture type changed.");
invalidMoney.records[0].currency = "usd";
assert.throws(() => prepareAiIntegrityBatch(invalidMoney), /uppercase ISO/);

const usage: AiIntegrityBatchInput = {
  ...common, sourceKind: "INTERNAL_LEDGER", sourceSystem: "internal-ledger", fileName: "usage.csv",
  records: [{ workspaceId: "ws-a", externalId: "evt_1", sourceRowNumber: 2, sourcePayload: { event: "evt_1" }, provenance: { row: 2 }, quantity: "1500.25", unit: "tokens", occurredAt: "2026-08-10T12:00:00Z" }],
};
assert.equal(prepareAiIntegrityBatch(usage).recordHashes.length, 1);
const noTimezone = structuredClone(usage);
if (noTimezone.sourceKind !== "INTERNAL_LEDGER") throw new Error("Fixture type changed.");
noTimezone.records[0].occurredAt = "2026-08-10";
assert.throws(() => prepareAiIntegrityBatch(noTimezone), /timezone/);

const provider: AiIntegrityBatchInput = {
  ...common, sourceKind: "PROVIDER_REPORT", sourceSystem: "openai-cost-export", fileName: "provider.csv",
  records: [{ workspaceId: "ws-a", externalId: "bucket_1", sourceRowNumber: 2, sourcePayload: { bucket: "bucket_1" }, provenance: { row: 2 }, provider: "openai", costAmount: "2.500000000000", costCurrency: "USD", costBasis: "REPORTED", windowStart: "2026-08-10T00:00:00Z", windowEnd: "2026-08-11T00:00:00Z" }],
};
assert.equal(prepareAiIntegrityBatch(provider).recordHashes.length, 1, "Aggregate provider cost without customer ID must be representable as unattributed.");
const unpriced = structuredClone(provider);
if (unpriced.sourceKind !== "PROVIDER_REPORT") throw new Error("Fixture type changed.");
unpriced.records[0].costAmount = null;
assert.throws(() => prepareAiIntegrityBatch(unpriced), /needs an amount/);

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const migration = fs.readFileSync("prisma/migrations/20260929000100_ai_integrity_foundation/migration.sql", "utf8");
for (const table of ["import_batches", "revenue_records", "usage_records", "provider_buckets", "mappings", "snapshots", "findings", "snapshot_inputs"]) {
  assert.match(migration, new RegExp(`CREATE TABLE "ai_integrity_${table}"`), `${table} must be additive.`);
}
assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|ALTER TABLE "(?:canonical_|medspa_|workspaces)/i, "Migration must not destructively change legacy data.");
for (const child of ["revenue_records", "usage_records", "provider_buckets"]) {
  assert.match(migration, new RegExp(`ALTER TABLE "ai_integrity_${child}" ADD CONSTRAINT [^;]+FOREIGN KEY \\("workspaceId", "importBatchId"\\)`), `${child} needs composite tenant FK.`);
}
assert.match(migration, /UNIQUE INDEX "ai_integrity_import_batches_workspaceId_idempotencyKey_key"/, "Batch replay key must be unique per workspace.");
assert.match(schema, /model AiIntegritySnapshotInput[\s\S]*@@id\(\[workspaceId, snapshotId, importBatchId\]\)/, "Snapshot inputs must retain tenant-scoped provenance.");

console.log("AI Integrity Sprint 1 contracts, tenant boundaries, replay and additive migration: PASS");
