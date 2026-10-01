import assert from "node:assert/strict";
import fs from "node:fs";

import { prisma } from "../db/prisma";
import { buildAiIntakePlan, reviewAiIntakeFile } from "../services/ai-integrity/intake";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import type { AiIntegritySourceKind } from "../domain/ai-integrity/contracts";

const sources = [
  ["ai-integrity-stripe-revenue.csv", "STRIPE_REVENUE"],
  ["ai-integrity-internal-ledger.csv", "INTERNAL_LEDGER"],
  ["ai-integrity-provider-report.csv", "PROVIDER_REPORT"],
] as const;

try {
  const user = await prisma.user.create({ data: { email: "sprint2@example.invalid" } });
  const workspaceA = await prisma.workspace.create({ data: { name: "AI Intake A", slug: "ai-intake-a", ownerUserId: user.id } });
  const workspaceB = await prisma.workspace.create({ data: { name: "AI Intake B", slug: "ai-intake-b", ownerUserId: user.id } });
  const meta = (workspaceId: string, sourceKind: AiIntegritySourceKind) => ({ workspaceId, sourceKind, sourceSystem: sourceKind.toLowerCase(), windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-09-01T00:00:00Z", sourceTimezone: "UTC" });
  const file = (name: string) => ({ fileName: name, bytes: new Uint8Array(fs.readFileSync(`public/templates/${name}`)), mimeType: "text/csv" });

  for (const [name, kind] of sources) {
    const upload = file(name);
    const review = await reviewAiIntakeFile(upload, kind);
    const plan = await buildAiIntakePlan(upload, meta(workspaceA.id, kind), review.suggestedMapping);
    assert.ok(plan.batch && plan.reviewToken);
    const committed = await persistAiIntegrityBatch(plan.batch, user.id);
    assert.equal(committed.batch.insertedCount, plan.acceptedCount);
    assert.equal(committed.batch.rowCount, plan.acceptedCount);
    assert.equal((await persistAiIntegrityBatch(plan.batch)).batch.id, committed.batch.id);
  }
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: workspaceA.id } }), 2);
  assert.equal(await prisma.aiIntegrityUsageRecord.count({ where: { workspaceId: workspaceA.id } }), 2);
  assert.equal(await prisma.aiIntegrityProviderBucket.count({ where: { workspaceId: workspaceA.id } }), 1);
  assert.equal(await prisma.aiIntegrityFinding.count({ where: { workspaceId: workspaceA.id } }), 0, "Intake alone cannot create financial claims.");
  assert.equal(await prisma.workspaceAuditEvent.count({ where: { workspaceId: workspaceA.id, action: "AI_INTEGRITY_IMPORT_COMMITTED" } }), 3);

  const mixed = [
    "externalId,eventKind,status,occurredAt,amountMinor,currency,currencyExponent",
    "ch_valid,CHARGE,paid,2026-08-10T12:00:00Z,15000,USD,2",
    "ch_invalid,CHARGE,paid,2026-08-10T12:00:00Z,not-a-number,USD,2",
    "ch_conflict,CHARGE,paid,2026-08-10T12:00:00Z,100,USD,2",
    "ch_conflict,CHARGE,paid,2026-08-10T12:00:00Z,200,USD,2",
  ].join("\n");
  const upload = { fileName: "mixed.csv", bytes: new TextEncoder().encode(mixed), mimeType: "text/csv" };
  const review = await reviewAiIntakeFile(upload, "STRIPE_REVENUE");
  const plan = await buildAiIntakePlan(upload, meta(workspaceA.id, "STRIPE_REVENUE"), review.suggestedMapping);
  assert.equal(plan.acceptedCount, 1);
  assert.equal(plan.rejectedCount, 3);
  if (!plan.batch) throw new Error("Expected one valid row.");
  const committed = await persistAiIntegrityBatch(plan.batch);
  assert.equal(committed.batch.rowCount, 1);
  const quality = committed.batch.dataQualityJson as { inputRows: number; rejectedRows: number; issues: unknown[]; excludedRows: Array<{ sourcePayload: Record<string, string> }> };
  assert.equal(quality.inputRows, 4);
  assert.equal(quality.rejectedRows, 3);
  assert.equal(quality.issues.length, 3);
  assert.equal(quality.excludedRows.length, 3);
  assert.equal(quality.excludedRows.filter((row) => row.sourcePayload.externalId === "ch_conflict").length, 2);
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: workspaceA.id, externalId: "ch_conflict" } }), 0);
  assert.equal(await prisma.aiIntegrityFinding.count({ where: { workspaceId: workspaceA.id } }), 0);

  const otherUpload = file(sources[0][0]);
  const otherReview = await reviewAiIntakeFile(otherUpload, "STRIPE_REVENUE");
  const otherPlan = await buildAiIntakePlan(otherUpload, meta(workspaceB.id, "STRIPE_REVENUE"), otherReview.suggestedMapping);
  if (!otherPlan.batch) throw new Error("Other workspace plan missing.");
  await persistAiIntegrityBatch(otherPlan.batch);
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: workspaceB.id } }), 2);
  assert.equal(await prisma.aiIntegrityRevenueRecord.count({ where: { workspaceId: workspaceA.id } }), 3);
  console.log("AI Integrity Sprint 2 disposable PostgreSQL CSV imports, partial rejection, replay, isolation and no findings: PASS");
} finally {
  await prisma.$disconnect();
}
