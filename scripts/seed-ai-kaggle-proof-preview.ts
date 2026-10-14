import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prisma } from "../db/prisma";
import type { AiIntegritySourceKind } from "../domain/ai-integrity/contracts";
import { createAiIdentityMapping } from "../services/ai-integrity/identity";
import { buildAiIntakePlan, reviewAiIntakeFile, type AiIntakeFile } from "../services/ai-integrity/intake";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { runAiIntegrityScan } from "../services/ai-integrity/scan";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
const database = url.pathname.slice(1);
const targetEmail = "henry@revory.app";
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV
  || !url.hostname.endsWith(".neon.tech")
  || !/^revory_ai_sandbox_[a-f0-9]{12}$/.test(database)
  || process.env.REVORY_AI_SAAS_SYNTHETIC_DATABASE !== database
  || process.env.REVORY_AI_SAAS_PREVIEW === "true"
  || process.env.REVORY_KAGGLE_TARGET_EMAIL !== targetEmail) {
  throw new Error("Kaggle import requires the explicitly selected Neon synthetic Preview database and target account.");
}

const fixtureRoot = new URL("../docs/qa/kaggle-proof/", import.meta.url);
const windowStart = "2026-05-01T00:00:00Z";
const windowEnd = "2026-06-01T00:00:00Z";
const asOf = new Date().toISOString();

async function importCsv(workspaceId: string, userId: string, fileName: string, sourceKind: AiIntegritySourceKind) {
  const file: AiIntakeFile = { bytes: await readFile(new URL(fileName, fixtureRoot)), fileName, mimeType: "text/csv" };
  const review = await reviewAiIntakeFile(file, sourceKind);
  const plan = await buildAiIntakePlan(file, { workspaceId, sourceKind, sourceSystem: `kaggle-proof/${fileName}`,
    windowStart, windowEnd, sourceTimezone: "UTC" }, review.suggestedMapping);
  assert.ok(plan.batch && plan.rejectedCount === 0);
  return (await persistAiIntegrityBatch(plan.batch, userId)).batch;
}

try {
  const user = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true, status: true, authSubject: true } });
  if (!user || user.status !== "ACTIVE" || !user.authSubject) throw new Error("The target account must sign in to this Preview before import.");
  const workspace = await prisma.workspace.findFirst({ where: { ownerUserId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  if (!workspace) throw new Error("The target account needs an existing Preview workspace.");
  const accepted = await prisma.legalAcceptance.findFirst({ where: { userId: user.id, event: "ACCOUNT_CREATED" }, select: { id: true } });
  if (!accepted) throw new Error("The target account must complete its own account acceptance before import.");
  if (process.env.REVORY_KAGGLE_PREVIEW_GRANT === "yes") {
    if (process.env.REVORY_KAGGLE_PREVIEW_IMPORT === "yes") throw new Error("Import and synthetic grant are separate operations.");
    const requestKey = "kaggle-proof-synthetic-grant-v1";
    const existingOrder = await prisma.aiIntegrityScanOrder.findUnique({ where: { workspaceId_requestKey: { workspaceId: workspace.id, requestKey } } });
    const order = existingOrder ?? await prisma.aiIntegrityScanOrder.create({ data: {
      workspaceId: workspace.id, actorUserId: user.id, requestKey, offerVersion: "kaggle-proof-preview/v1",
      amountMinor: 0, currency: "USD", status: "SYNTHETIC_PREVIEW", checkoutDriver: "synthetic-preview",
    } });
    assert.equal(order.status, "SYNTHETIC_PREVIEW");
    assert.equal(order.actorUserId, user.id);
    assert.equal(order.amountMinor, 0);
    assert.equal(order.stripeCheckoutSessionId, null);
    assert.equal(order.stripePaymentIntentId, null);
    const grant = await prisma.aiIntegrityScanGrant.upsert({ where: { orderId: order.id },
      create: { workspaceId: workspace.id, orderId: order.id }, update: {} });
    if (!existingOrder) await prisma.workspaceAuditEvent.create({ data: {
      workspaceId: workspace.id, actorUserId: user.id, action: "AI_SYNTHETIC_PREVIEW_GRANT_CREATED",
      metadataJson: { orderId: order.id, grantId: grant.id, kaggleProof: true, payment: false },
    } });
    console.log(JSON.stringify({ status: "KAGGLE_SYNTHETIC_PREVIEW_GRANT_READY", database,
      workspaceId: workspace.id, grantId: grant.id, replayed: Boolean(existingOrder), payment: false }));
  } else {
  const previous = await prisma.aiIntegrityImportBatch.findFirst({ where: { workspaceId: workspace.id, sourceSystem: { startsWith: "kaggle-proof/" } }, select: { id: true } });
  if (previous) throw new Error("This workspace already has a Kaggle proof import; inspect it before another run.");

  console.log(JSON.stringify({ status: "KAGGLE_PREVIEW_TARGET_CONFIRMED", database, email: targetEmail, workspaceId: workspace.id, workspaceName: workspace.name }));
  if (process.env.REVORY_KAGGLE_PREVIEW_IMPORT !== "yes") {
    console.log("Dry run only. Set REVORY_KAGGLE_PREVIEW_IMPORT=yes for the explicitly authorized import.");
  } else {
    const revenue = await importCsv(workspace.id, user.id, "revenue-adapted.csv", "STRIPE_REVENUE");
    const ledger = await importCsv(workspace.id, user.id, "ledger-injected-linked.csv", "INTERNAL_LEDGER");
    const provider = await importCsv(workspace.id, user.id, "provider-injected-linked.csv", "PROVIDER_REPORT");
    await createAiIdentityMapping({ workspaceId: workspace.id, actorUserId: user.id, kind: "PROVIDER_PROJECT",
      externalId: "proj_kaggle_fixture", provider: "openai", organizationId: "org_kaggle_fixture",
      internalCustomerExternalId: "customer_kaggle_fixture", sourceBatchId: provider.id, ledgerBatchId: ledger.id,
      validFrom: windowStart, validUntil: windowEnd, exclusiveProjectConfirmed: true });
    const batchIds = [revenue.id, ledger.id, provider.id];
    const scan = await runAiIntegrityScan({ workspaceId: workspace.id, actorUserId: user.id, batchIds, asOf,
      lagHours: 24, syntheticDataConfirmed: true,
      sourceReviews: batchIds.map((batchId) => ({ batchId, exportedAt: asOf, completeThrough: windowEnd })) });
    assert.equal(scan.result.findings.length, 1);
    assert.equal(scan.result.findings[0].findingType, "LEDGER_PROVIDER_USAGE_MISMATCH");
    assert.equal(scan.result.findings[0].evidence.delta, "1000");
    console.log(JSON.stringify({ status: "KAGGLE_PREVIEW_IMPORTED", database, workspaceId: workspace.id,
      snapshotId: scan.snapshotId, reportPath: `/app/ai-integrity/reports/${scan.snapshotId}` }));
  }
  }
} finally {
  await prisma.$disconnect();
}
