import assert from "node:assert/strict";
import { prisma } from "../db/prisma";
import { canonicalAiJson, type AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";
import { aiDigest, reconcileAiIntegrity, type AiScanInput } from "../domain/ai-integrity/reconciliation";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { createAiIdentityMapping, revokeAiIdentityMapping } from "../services/ai-integrity/identity";
import { exportAiIntegrityScan, getAiIntegrityScan, runAiIntegrityScan } from "../services/ai-integrity/scan";
import { buildWorkspaceExport } from "../services/data-portability/workspace-export";
import { enforceWorkspaceRetention } from "../services/data-portability/enforce-retention";

const start = "2026-08-01T00:00:00Z", end = "2026-09-01T00:00:00Z", asOf = "2026-09-04T00:00:00Z";
try {
  const user = await prisma.user.create({ data: { email: "sprint4@example.invalid" } });
  const ws = await prisma.workspace.create({ data: { name: "Synthetic Scan A", slug: "scan-a", ownerUserId: user.id } });
  const other = await prisma.workspace.create({ data: { name: "Synthetic Scan B", slug: "scan-b", ownerUserId: user.id } });
  const common = (sourceKind: AiIntegrityBatchInput["sourceKind"], hash: string) => ({ workspaceId: ws.id, sourceKind, sourceSystem: sourceKind,
    fileName: `${sourceKind}.csv`, fileSha256: hash.repeat(64), mappingSha256: "a".repeat(64), windowStart: start, windowEnd: end, sourceTimezone: "UTC", dataQuality: {} });
  const row = (externalId: string, sourceRowNumber: number) => ({ workspaceId: ws.id, externalId, sourceRowNumber, sourcePayload: { externalId }, provenance: { synthetic: true } });
  const revenue: AiIntegrityBatchInput = { ...common("STRIPE_REVENUE", "b"), sourceKind: "STRIPE_REVENUE", records: [
    { ...row("charge_a", 2), eventKind: "CHARGE", status: "paid", stripeCustomerExternalId: "cus_a", occurredAt: "2026-08-10T00:00:00Z", amountMinor: "10000", currency: "USD", currencyExponent: 2 },
    { ...row("refund_a", 3), eventKind: "REFUND", status: "succeeded", parentExternalId: "charge_a", occurredAt: "2026-08-11T00:00:00Z", amountMinor: "-1000", currency: "USD", currencyExponent: 2 },
  ] };
  const ledger: AiIntegrityBatchInput = { ...common("INTERNAL_LEDGER", "c"), sourceKind: "INTERNAL_LEDGER", records: [
    { ...row("event_a", 2), internalCustomerExternalId: "customer_a", provider: "openai", providerRequestId: "req_a", providerProjectId: "proj_a", model: "model_a",
      quantity: "100", unit: "tokens", creditsDelta: "-10", occurredAt: "2026-08-10T12:00:00Z" },
  ] };
  const provider: AiIntegrityBatchInput = { ...common("PROVIDER_REPORT", "d"), sourceKind: "PROVIDER_REPORT", records: [
    { ...row("bucket_a", 2), provider: "openai", organizationId: "org_a", projectId: "proj_a", model: "model_a", windowStart: start, windowEnd: end,
      usageQuantity: "120", usageUnit: "tokens", costAmount: "2.5", costCurrency: "USD", costBasis: "REPORTED", reportedAt: "2026-09-03T00:00:00Z" },
    { ...row("bucket_b", 3), provider: "openai", organizationId: "org_a", projectId: "proj_b", model: "model_a", windowStart: start, windowEnd: end,
      usageQuantity: "50", usageUnit: "tokens", costAmount: "1.25", costCurrency: "USD", costBasis: "REPORTED", reportedAt: "2026-09-03T00:00:00Z" },
  ] };
  const revenueBatch = (await persistAiIntegrityBatch(revenue)).batch;
  const ledgerBatch = (await persistAiIntegrityBatch(ledger)).batch;
  const providerBatch = (await persistAiIntegrityBatch(provider)).batch;
  const mapping = await createAiIdentityMapping({ workspaceId: ws.id, actorUserId: user.id, kind: "PROVIDER_PROJECT", externalId: "proj_a", provider: "openai", organizationId: "org_a",
    internalCustomerExternalId: "customer_a", sourceBatchId: providerBatch.id, ledgerBatchId: ledgerBatch.id, validFrom: start, validUntil: end, exclusiveProjectConfirmed: true });
  const batchIds = [revenueBatch.id, ledgerBatch.id, providerBatch.id];
  const request = { workspaceId: ws.id, actorUserId: user.id, batchIds, asOf, lagHours: 24, syntheticDataConfirmed: true,
    sourceReviews: batchIds.map((batchId) => ({ batchId, exportedAt: "2026-09-03T00:00:00Z", completeThrough: end })) };
  const [first, second] = await Promise.all([runAiIntegrityScan(request), runAiIntegrityScan(request)]);
  assert.equal(first.snapshotId, second.snapshotId);
  assert.ok(first.replayed !== second.replayed);
  assert.equal(first.result.findings.length, 2);
  assert.equal(await prisma.aiIntegrityFinding.count({ where: { workspaceId: ws.id } }), 2);
  assert.equal(await prisma.workspaceAuditEvent.count({ where: { workspaceId: ws.id, action: "AI_INTEGRITY_SCAN_CREATED" } }), 1);
  const scan = (await getAiIntegrityScan(ws.id, first.snapshotId))!;
  assert.ok(scan);
  const manifest = scan.snapshot.inputManifestJson as unknown as { input: AiScanInput; resultHash: string };
  assert.equal(aiDigest(reconcileAiIntegrity(manifest.input)), manifest.resultHash);
  assert.deepEqual(scan.snapshot.findings.map((f) => f.fingerprint), scan.result.findings.map((f) => f.fingerprint));
  const jsonBefore = exportAiIntegrityScan(scan, "json"), csvBefore = exportAiIntegrityScan(scan, "csv");
  assert.equal(exportAiIntegrityScan(scan, "json"), jsonBefore);
  assert.equal(JSON.parse(jsonBefore).manifest.input.workspaceId, ws.id);
  assert.ok(csvBefore.includes("LEDGER_PROVIDER_USAGE_MISMATCH"));
  const hostileCsv = exportAiIntegrityScan({ ...scan, result: { ...scan.result, findings: [{ ...scan.result.findings[0], recommendedReview: '=HYPERLINK("https://example.invalid")' }] } }, "csv");
  assert.ok(hostileCsv.includes("' =") === false); assert.ok(hostileCsv.includes("\"'=HYPERLINK"));
  assert.equal(await getAiIntegrityScan(other.id, first.snapshotId), null);
  await assert.rejects(() => runAiIntegrityScan({ ...request, workspaceId: other.id }), /this workspace/);
  await assert.rejects(() => runAiIntegrityScan({ ...request, syntheticDataConfirmed: false }), /synthetic/);
  await assert.rejects(() => runAiIntegrityScan({ ...request, asOf: "2099-01-01T00:00:00Z" }), /future/);
  const duplicate = (await persistAiIntegrityBatch({ ...ledger, fileSha256: "e".repeat(64), fileName: "copy.csv" })).batch;
  assert.equal(duplicate.duplicateCount, 1);
  const dupIds = [revenueBatch.id, duplicate.id, providerBatch.id];
  await assert.rejects(() => runAiIntegrityScan({ ...request, batchIds: dupIds,
    sourceReviews: dupIds.map((batchId) => ({ batchId, exportedAt: "2026-09-03T00:00:00Z", completeThrough: end })) }), /membership/);
  assert.equal(await prisma.aiIntegritySnapshot.count({ where: { workspaceId: ws.id } }), 1);
  await revokeAiIdentityMapping(ws.id, user.id, mapping.id);
  const old = (await getAiIntegrityScan(ws.id, first.snapshotId))!;
  assert.equal(exportAiIntegrityScan(old, "json"), jsonBefore); assert.equal(exportAiIntegrityScan(old, "csv"), csvBefore);
  const revised = await runAiIntegrityScan(request);
  assert.notEqual(revised.snapshotId, first.snapshotId); assert.equal(revised.result.coverage.groups[0].attributedCost, "0");
  assert.equal(revised.result.findings.length, 1);
  const portable = canonicalAiJson(JSON.parse(JSON.stringify(await buildWorkspaceExport(ws.id))));
  assert.ok(portable.includes(first.snapshotId)); assert.ok(portable.includes("LEDGER_PROVIDER_USAGE_MISMATCH"));
  // Mark one evidence batch old in this disposable DB; retention must remove every dependent snapshot first.
  await prisma.aiIntegrityImportBatch.update({ where: { id: ledgerBatch.id }, data: { createdAt: new Date("2024-01-01T00:00:00Z") } });
  await enforceWorkspaceRetention(ws.id, new Date("2026-09-30T00:00:00Z"));
  assert.equal(await prisma.aiIntegritySnapshot.count({ where: { workspaceId: ws.id } }), 0);
  assert.equal(await prisma.aiIntegrityFinding.count({ where: { workspaceId: ws.id } }), 0);
  console.log("Sprint 4 disposable DB: atomic concurrent replay, findings/evidence, immutable JSON/CSV, formula escaping, tenant isolation, synthetic gate, duplicate membership, mapping revision, portability and retention PASS");
} finally { await prisma.$disconnect(); }
