import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

import { prisma } from "../db/prisma";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { persistAiIntegritySnapshot } from "../services/ai-integrity/persist-snapshot";
import { buildWorkspaceExport } from "../services/data-portability/workspace-export";
import { enforceWorkspaceRetention } from "../services/data-portability/enforce-retention";
import type { AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";

try {
  const user = await prisma.user.create({ data: { email: "sprint1@example.invalid" } });
  const wsA = await prisma.workspace.create({ data: { name: "AI A", slug: "ai-a", ownerUserId: user.id } });
  const wsB = await prisma.workspace.create({ data: { name: "AI B", slug: "ai-b", ownerUserId: user.id } });
  const template = (workspaceId: string): AiIntegrityBatchInput => ({
    workspaceId, sourceKind: "STRIPE_REVENUE", sourceSystem: "stripe-export",
    fileName: "charges.csv", fileSha256: "a".repeat(64), mappingSha256: "b".repeat(64),
    windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-09-01T00:00:00Z", sourceTimezone: "UTC", dataQuality: { issues: [] },
    records: [{ workspaceId, externalId: "ch_1", sourceRowNumber: 2, sourcePayload: { id: "ch_1" }, provenance: { line: 2 }, eventKind: "CHARGE", status: "paid", amountMinor: "12000", currency: "USD", currencyExponent: 2, occurredAt: "2026-08-10T12:00:00Z" }],
  });

  const first = await persistAiIntegrityBatch(template(wsA.id));
  assert.equal(first.replayed, false);
  assert.equal(first.batch.insertedCount, 1);
  const replay = await persistAiIntegrityBatch(template(wsA.id));
  assert.equal(replay.replayed, true);
  assert.equal(replay.batch.id, first.batch.id);

  const concurrentInput = template(wsA.id);
  if (concurrentInput.sourceKind !== "STRIPE_REVENUE") throw new Error("Fixture changed.");
  concurrentInput.fileSha256 = "d".repeat(64);
  concurrentInput.records[0].externalId = "ch_concurrent";
  concurrentInput.records[0].sourcePayload = { id: "ch_concurrent" };
  const concurrent = await Promise.all([persistAiIntegrityBatch(concurrentInput), persistAiIntegrityBatch(concurrentInput)]);
  assert.equal(concurrent[0].batch.id, concurrent[1].batch.id);
  assert.equal(concurrent.filter((result) => result.replayed).length, 1);
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: wsA.id, externalId: "ch_concurrent" } }), 1);

  const repeatFile = template(wsA.id);
  repeatFile.fileSha256 = "c".repeat(64);
  const deduped = await persistAiIntegrityBatch(repeatFile);
  assert.equal(deduped.batch.insertedCount, 0);
  assert.equal(deduped.batch.duplicateCount, 1);

  const revised = template(wsA.id);
  if (revised.sourceKind !== "STRIPE_REVENUE") throw new Error("Fixture changed.");
  revised.records[0].amountMinor = "13000";
  const revision = await persistAiIntegrityBatch(revised);
  assert.equal(revision.batch.insertedCount, 1);
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: wsA.id } }), 3);

  const foreignRow = template(wsA.id);
  foreignRow.records[0].workspaceId = wsB.id;
  await assert.rejects(() => persistAiIntegrityBatch(foreignRow), /Cross-workspace/);
  const other = await persistAiIntegrityBatch(template(wsB.id));
  assert.equal(other.batch.insertedCount, 1);
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: wsB.id } }), 1);

  const usage: AiIntegrityBatchInput = {
    workspaceId: wsA.id, sourceKind: "INTERNAL_LEDGER", sourceSystem: "internal-ledger", fileName: "usage.csv",
    fileSha256: "e".repeat(64), mappingSha256: "b".repeat(64),
    windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-09-01T00:00:00Z", sourceTimezone: "UTC", dataQuality: {},
    records: [{ workspaceId: wsA.id, externalId: "evt_1", sourceRowNumber: 2, sourcePayload: { id: "evt_1" }, provenance: { line: 2 }, internalCustomerExternalId: "cus_internal_1", quantity: "1500.25", unit: "tokens", occurredAt: "2026-08-10T12:00:00Z" }],
  };
  const provider: AiIntegrityBatchInput = {
    workspaceId: wsA.id, sourceKind: "PROVIDER_REPORT", sourceSystem: "openai-cost-export", fileName: "provider.csv",
    fileSha256: "f".repeat(64), mappingSha256: "b".repeat(64),
    windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-09-01T00:00:00Z", sourceTimezone: "UTC", dataQuality: {},
    records: [{ workspaceId: wsA.id, externalId: "bucket_1", sourceRowNumber: 2, sourcePayload: { id: "bucket_1" }, provenance: { line: 2 }, provider: "openai", usageQuantity: "1500.25", usageUnit: "tokens", costAmount: "2.500000000000", costCurrency: "USD", costBasis: "REPORTED", windowStart: "2026-08-10T00:00:00Z", windowEnd: "2026-08-11T00:00:00Z" }],
  };
  const usageBatch = await persistAiIntegrityBatch(usage);
  const providerBatch = await persistAiIntegrityBatch(provider);
  assert.equal(usageBatch.batch.insertedCount, 1);
  assert.equal(providerBatch.batch.insertedCount, 1);

  const snapshotInput = {
    workspaceId: wsA.id, ruleVersion: "sprint1-contract-only", windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-09-01T00:00:00Z",
    inputBatchIds: [first.batch.id, usageBatch.batch.id, providerBatch.batch.id], dataQuality: {}, coverage: {}, suppressions: {},
  };
  const snapshot = await persistAiIntegritySnapshot(snapshotInput);
  assert.equal(snapshot.replayed, false);
  assert.equal((await persistAiIntegritySnapshot(snapshotInput)).snapshot.id, snapshot.snapshot.id);
  await assert.rejects(() => persistAiIntegritySnapshot({ ...snapshotInput, inputBatchIds: [other.batch.id] }), /foreign-workspace/);
  const fkCheckClient = new PrismaClient({ log: [] });
  try {
    await assert.rejects(() => fkCheckClient.$executeRaw`
      INSERT INTO "ai_integrity_snapshot_inputs" ("workspaceId", "snapshotId", "importBatchId")
      VALUES (${wsA.id}, ${snapshot.snapshot.id}, ${other.batch.id})
    `, (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2010"));
  } finally {
    await fkCheckClient.$disconnect();
  }

  const exported = await buildWorkspaceExport(wsA.id);
  assert.equal(exported.aiIntegrity.revenueRecords.length, 3);
  assert.equal(exported.aiIntegrity.usageRecords.length, 1);
  assert.equal(exported.aiIntegrity.providerBuckets.length, 1);
  assert.doesNotThrow(() => JSON.stringify(exported));
  await prisma.aiIntegritySnapshot.update({ where: { id: snapshot.snapshot.id }, data: { createdAt: new Date("2027-12-01T00:00:00Z") } });
  const retention = await enforceWorkspaceRetention(wsA.id, new Date("2028-01-01T00:00:00Z"));
  assert.ok(retention.deletedAiImportBatches >= 1);
  assert.equal(retention.deletedAiSnapshots, 1, "A newer snapshot must expire with its older input evidence.");
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: wsA.id } }), 0);
  assert.equal(await prisma.aiIntegrityUsageRecord.count({ where: { workspaceId: wsA.id } }), 0);
  assert.equal(await prisma.aiIntegrityProviderBucket.count({ where: { workspaceId: wsA.id } }), 0);
  console.log("AI Integrity disposable PostgreSQL migration, tenant FK, replay, revisions, export and retention: PASS");
} finally {
  await prisma.$disconnect();
}
