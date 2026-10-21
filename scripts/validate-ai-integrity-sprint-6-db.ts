import assert from "node:assert/strict";
import { prisma } from "../db/prisma";
import { aiIntegrityDemoInput } from "../domain/ai-integrity/demo";
import type { AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { createAiIdentityMapping } from "../services/ai-integrity/identity";
import { exportAiIntegrityScan, getAiIntegrityScan, runAiIntegrityScan } from "../services/ai-integrity/scan";
import { recordAiValidationReview, getAiValidationReview } from "../services/ai-integrity/validation-review";
import { buildWorkspaceExport } from "../services/data-portability/workspace-export";
import { enforceWorkspaceRetention } from "../services/data-portability/enforce-retention";

if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL!).pathname)) throw new Error("Use disposable DB harness.");
try {
  const user = await prisma.user.create({ data: { email: "sprint6@example.invalid" } });
  const ws = await prisma.workspace.create({ data: { name: "Synthetic review rehearsal", slug: "sprint6", ownerUserId: user.id } });
  const other = await prisma.workspace.create({ data: { name: "Other rehearsal", slug: "sprint6-other", ownerUserId: user.id } });
  const input = aiIntegrityDemoInput(), batches: Record<string, string> = {};
  for (const [index, batch] of input.batches.entries()) {
    const records = batch.sourceKind === "STRIPE_REVENUE" ? input.revenue.map((r) => ({ ...r, currencyExponent: 2 })) : batch.sourceKind === "INTERNAL_LEDGER" ? input.usage : input.buckets;
    const normalized = { workspaceId: ws.id, sourceKind: batch.sourceKind, sourceSystem: batch.sourceSystem, fileName: `${batch.id}.csv`, fileSha256: String(index + 1).repeat(64), mappingSha256: batch.mappingSha256, windowStart: batch.windowStart, windowEnd: batch.windowEnd, sourceTimezone: "UTC", dataQuality: {}, records: records.map((r, index) => ({ ...r, workspaceId: ws.id, sourceRowNumber: index + 2, sourcePayload: { synthetic: true }, provenance: { synthetic: true } })) } as AiIntegrityBatchInput;
    batches[batch.sourceKind] = (await persistAiIntegrityBatch(normalized)).batch.id;
  }
  await createAiIdentityMapping({ workspaceId: ws.id, actorUserId: user.id, kind: "PROVIDER_PROJECT", externalId: "proj_aster", provider: "openai", organizationId: "org_sample", internalCustomerExternalId: "workspace_aster", sourceBatchId: batches.PROVIDER_REPORT, ledgerBatchId: batches.INTERNAL_LEDGER, validFrom: input.batches[0].windowStart, validUntil: input.batches[0].windowEnd, exclusiveProjectConfirmed: true });
  process.env.REVORY_AI_SAAS_PREVIEW = "false";
  const { snapshotId } = await runAiIntegrityScan({ workspaceId: ws.id, actorUserId: user.id, batchIds: Object.values(batches), asOf: input.asOf, lagHours: 24, syntheticDataConfirmed: true, sourceReviews: Object.values(batches).map((batchId) => ({ batchId, exportedAt: "2026-09-03T00:00:00Z", completeThrough: input.batches[0].windowEnd })) });
  const original = exportAiIntegrityScan((await getAiIntegrityScan(ws.id, snapshotId))!, "json");
  const fingerprint = (await getAiIntegrityScan(ws.id, snapshotId))!.result.findings[0].fingerprint;
  const review = { kind: "FINDING", snapshotId, requestKey: "review_concurrent_001", fingerprint, disposition: "FALSE_POSITIVE", sourceEvidenceChecked: true, comment: "Synthetic fixture review for this calculation." };
  await assert.rejects(() => recordAiValidationReview(ws.id, user.id, review), /unavailable/);
  process.env.REVORY_AI_SAAS_PREVIEW = "true";
  await assert.rejects(() => recordAiValidationReview(other.id, user.id, review), /workspace/);
  await assert.rejects(() => recordAiValidationReview(ws.id, user.id, { ...review, fingerprint: "0".repeat(64) }), /Finding/);
  const [first, replay] = await Promise.all([recordAiValidationReview(ws.id, user.id, review), recordAiValidationReview(ws.id, user.id, review)]);
  assert.equal(first.event.id, replay.event.id); assert.equal(first.replayed !== replay.replayed, true);
  assert.equal(await prisma.aiIntegrityReviewEvent.count(), 1);
  await assert.rejects(() => recordAiValidationReview(ws.id, user.id, { ...review, disposition: "EXPECTED_DIFFERENCE" }), /reused/);
  await recordAiValidationReview(ws.id, user.id, { ...review, requestKey: "review_correction_002", disposition: "EXPECTED_DIFFERENCE", comment: "Synthetic review corrected after checking source semantics." });
  await recordAiValidationReview(ws.id, user.id, { kind: "REPORT", snapshotId, requestKey: "review_usefulness_003", usefulness: "PARTLY_USEFUL", assistanceRequired: true, preparationMinutes: 23, comment: "Synthetic test needed assistance during project mapping." });
  const saved = await getAiValidationReview(ws.id, snapshotId);
  assert.ok(saved); assert.equal(saved.summary.eventCount, 3); assert.equal(saved.summary.reviewedFindings, 1); assert.equal(saved.summary.unreviewedFindings, 1);
  assert.equal(saved.summary.falsePositives, 0); assert.equal(saved.summary.realPaidParticipants, 0); assert.equal(saved.summary.reportReview?.preparationMinutes, 23);
  assert.equal(await getAiValidationReview(other.id, snapshotId), null);
  assert.equal(exportAiIntegrityScan((await getAiIntegrityScan(ws.id, snapshotId))!, "json"), original, "Buyer feedback must not rewrite evidence");
  assert.equal(await prisma.workspaceAuditEvent.count({ where: { action: "AI_INTEGRITY_REHEARSAL_REVIEW_RECORDED" } }), 3);
  assert.ok(JSON.stringify(await buildWorkspaceExport(ws.id)).includes(first.event.id));
  await assert.rejects(() => prisma.aiIntegrityReviewEvent.create({ data: { ...first.event, id: "cross_tenant_review", workspaceId: other.id, requestKey: "illegal_reference_001" } }));
  await prisma.aiIntegrityImportBatch.update({ where: { id: batches.INTERNAL_LEDGER }, data: { createdAt: new Date("2024-01-01T00:00:00Z") } });
  await enforceWorkspaceRetention(ws.id, new Date("2026-10-01T00:00:00Z"));
  assert.equal(await prisma.aiIntegrityReviewEvent.count(), 0);
  assert.equal(await getAiValidationReview(ws.id, snapshotId), null);
  console.log("Sprint 6 DB PASS: tenant/finding FKs, bounded synthetic rehearsal gate, concurrent idempotency, conflicting replay, ordered corrections, report effort, immutable evidence, audit, export and retention cascade.");
} finally { await prisma.$disconnect(); }
