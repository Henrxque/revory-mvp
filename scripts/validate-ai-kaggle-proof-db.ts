import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { reviewAiIntakeFile, buildAiIntakePlan, type AiIntakeFile } from "../services/ai-integrity/intake";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { createAiIdentityMapping } from "../services/ai-integrity/identity";
import { exportAiIntegrityScan, getAiIntegrityScan, runAiIntegrityScan } from "../services/ai-integrity/scan";
import type { AiIntegritySourceKind } from "../domain/ai-integrity/contracts";

if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL ?? "").pathname)) throw new Error("Use a disposable DB harness.");
process.env.REVORY_AI_SAAS_PREVIEW = "false";
process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY = "true";
const fixtureRoot = new URL("../docs/qa/kaggle-proof/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", fixtureRoot), "utf8")) as {
  period: { start: string; end: string };
  expected: { providerTokens: number; estimatedCostUsd: string; injectedTokenDelta: number };
};
const { start, end } = manifest.period;
const asOf = new Date().toISOString();

async function importFile(workspaceId: string, userId: string, fileName: string, sourceKind: AiIntegritySourceKind) {
  const file: AiIntakeFile = { bytes: await readFile(new URL(fileName, fixtureRoot)), fileName, mimeType: "text/csv" };
  const review = await reviewAiIntakeFile(file, sourceKind);
  assert.ok(review.requiredFields.every((field) => Object.values(review.suggestedMapping).includes(field)));
  const plan = await buildAiIntakePlan(file, { workspaceId, sourceKind, sourceSystem: `kaggle-proof/${fileName}`, windowStart: start, windowEnd: end, sourceTimezone: "UTC" }, review.suggestedMapping);
  assert.ok(plan.batch && plan.reviewToken);
  assert.equal(plan.rejectedCount, 0);
  const first = await persistAiIntegrityBatch(plan.batch, userId);
  const replay = await persistAiIntegrityBatch(plan.batch, userId);
  assert.equal(replay.batch.id, first.batch.id); assert.equal(replay.replayed, true);
  return { batch: first.batch, plan };
}

async function runScenario(userId: string, scenario: "unlinked" | "injected-linked") {
  const suffix = randomUUID().slice(0, 8);
  const ws = await prisma.workspace.create({ data: { name: `Kaggle proof ${scenario}`, slug: `kaggle-${scenario}-${suffix}`, ownerUserId: userId } });
  const revenue = await importFile(ws.id, userId, "revenue-adapted.csv", "STRIPE_REVENUE");
  const ledger = await importFile(ws.id, userId, `ledger-${scenario}.csv`, "INTERNAL_LEDGER");
  const provider = await importFile(ws.id, userId, `provider-${scenario}.csv`, "PROVIDER_REPORT");
  assert.equal(revenue.plan.acceptedCount, 12);
  assert.equal(ledger.plan.acceptedCount, 20);
  assert.equal(provider.plan.acceptedCount, 1);
  assert.ok(provider.plan.issues.some((issue) => issue.code === "COST_ESTIMATED"));
  if (scenario === "injected-linked") {
    await createAiIdentityMapping({ workspaceId: ws.id, actorUserId: userId, kind: "PROVIDER_PROJECT", externalId: "proj_kaggle_fixture", provider: "openai", organizationId: "org_kaggle_fixture", internalCustomerExternalId: "customer_kaggle_fixture", sourceBatchId: provider.batch.id, ledgerBatchId: ledger.batch.id, validFrom: start, validUntil: end, exclusiveProjectConfirmed: true });
  }
  const batchIds = [revenue.batch.id, ledger.batch.id, provider.batch.id];
  const request = { workspaceId: ws.id, actorUserId: userId, batchIds, asOf, lagHours: 24, syntheticDataConfirmed: true,
    sourceReviews: batchIds.map((batchId) => ({ batchId, exportedAt: asOf, completeThrough: end })) };
  const first = await runAiIntegrityScan(request);
  const replay = await runAiIntegrityScan(request);
  assert.equal(replay.snapshotId, first.snapshotId); assert.equal(replay.replayed, true);
  assert.equal(first.result.dataQuality.revenueTreatment.includes("not summed"), true);
  assert.ok(first.result.findings.every((finding) => finding.findingType !== "UNATTRIBUTED_PROVIDER_SPEND" && finding.valueAmount === null));
  const scan = await getAiIntegrityScan(ws.id, first.snapshotId);
  assert.ok(scan);
  const exported = JSON.parse(exportAiIntegrityScan(scan, "json")) as { result: typeof first.result };
  assert.deepEqual(exported.result.findings, first.result.findings);
  if (scenario === "unlinked") {
    assert.equal(first.result.findings.length, 0);
    assert.ok(first.result.suppressions.some((item) => item.code === "CONFIRMED_COMPARABLE_SCOPE_REQUIRED"));
  } else {
    assert.equal(first.result.findings.length, 1);
    const finding = first.result.findings[0];
    assert.equal(finding.findingType, "LEDGER_PROVIDER_USAGE_MISMATCH");
    assert.equal(finding.evidence.delta, String(manifest.expected.injectedTokenDelta));
    assert.equal(finding.valueCurrency, null);
    assert.equal(finding.valueAmount, null);
  }
  return { scenario, workspaceId: ws.id, snapshotId: first.snapshotId, imported: { revenue: revenue.plan.acceptedCount, ledger: ledger.plan.acceptedCount, provider: provider.plan.acceptedCount },
    findings: first.result.findings.map((finding) => ({ type: finding.findingType, delta: finding.evidence.delta ?? null, monetaryValue: finding.valueAmount })),
    suppressionCodes: [...new Set(first.result.suppressions.map((item) => item.code))].sort(),
    estimatedProviderCostUsd: manifest.expected.estimatedCostUsd, providerTokens: manifest.expected.providerTokens };
}

try {
  const user = await prisma.user.create({ data: { email: `kaggle-proof-${randomUUID().slice(0, 8)}@example.invalid` } });
  const scenarios = [await runScenario(user.id, "unlinked"), await runScenario(user.id, "injected-linked")];
  console.log(JSON.stringify({ status: "KAGGLE_PROOF_PASS", scenarios }));
} finally { await prisma.$disconnect(); }
