import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prisma } from "../db/prisma";
import { ACCOUNT_CREATION_LEGAL_VERSIONS } from "../content/revory-legal";
import { hashPassword } from "../services/auth/password-crypto";
import { reviewAiIntakeFile, buildAiIntakePlan, type AiIntakeFile } from "../services/ai-integrity/intake";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { createAiIdentityMapping } from "../services/ai-integrity/identity";
import { runAiIntegrityScan } from "../services/ai-integrity/scan";
import type { AiIntegritySourceKind } from "../domain/ai-integrity/contracts";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV || !["127.0.0.1", "localhost"].includes(url.hostname) || !/^\/revory_kaggle_proof_[a-f0-9]{12}$/.test(url.pathname)) throw new Error("Use a dedicated local Kaggle proof database.");
if (process.env.REVORY_AI_SAAS_PREVIEW === "true") throw new Error("Seed before enabling the preview purchase gate.");
const password = process.env.REVORY_KAGGLE_DEMO_PASSWORD ?? "";
if (password.length < 16) throw new Error("Set a local test password in REVORY_KAGGLE_DEMO_PASSWORD.");
const root = new URL("../docs/qa/kaggle-proof/", import.meta.url);
const start = "2026-05-01T00:00:00Z", end = "2026-06-01T00:00:00Z", asOf = new Date().toISOString();

async function importCsv(workspaceId: string, userId: string, fileName: string, sourceKind: AiIntegritySourceKind) {
  const file: AiIntakeFile = { bytes: await readFile(new URL(fileName, root)), fileName, mimeType: "text/csv" };
  const review = await reviewAiIntakeFile(file, sourceKind);
  const plan = await buildAiIntakePlan(file, { workspaceId, sourceKind, sourceSystem: `kaggle-proof/${fileName}`, windowStart: start, windowEnd: end, sourceTimezone: "UTC" }, review.suggestedMapping);
  assert.ok(plan.batch && plan.rejectedCount === 0);
  return (await persistAiIntegrityBatch(plan.batch, userId)).batch;
}

try {
  const email = "kaggle-proof@example.invalid";
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("This local proof database is already seeded.");
  const user = await prisma.user.create({ data: { email, fullName: "Kaggle Proof", authProvider: "credentials", status: "ACTIVE", emailVerifiedAt: new Date(), passwordHash: await hashPassword(password) } });
  const workspace = await prisma.workspace.create({ data: { name: "REVORY · Kaggle proof", slug: "revory-kaggle-proof", ownerUserId: user.id } });
  await prisma.legalAcceptance.create({ data: { userId: user.id, workspaceId: workspace.id, event: "ACCOUNT_CREATED", documentVersionsJson: ACCOUNT_CREATION_LEGAL_VERSIONS, contextJson: { localSyntheticKaggleProof: true } } });
  const revenue = await importCsv(workspace.id, user.id, "revenue-adapted.csv", "STRIPE_REVENUE");
  const ledger = await importCsv(workspace.id, user.id, "ledger-injected-linked.csv", "INTERNAL_LEDGER");
  const provider = await importCsv(workspace.id, user.id, "provider-injected-linked.csv", "PROVIDER_REPORT");
  await createAiIdentityMapping({ workspaceId: workspace.id, actorUserId: user.id, kind: "PROVIDER_PROJECT", externalId: "proj_kaggle_fixture", provider: "openai", organizationId: "org_kaggle_fixture", internalCustomerExternalId: "customer_kaggle_fixture", sourceBatchId: provider.id, ledgerBatchId: ledger.id, validFrom: start, validUntil: end, exclusiveProjectConfirmed: true });
  const batchIds = [revenue.id, ledger.id, provider.id];
  const scan = await runAiIntegrityScan({ workspaceId: workspace.id, actorUserId: user.id, batchIds, asOf, lagHours: 24, syntheticDataConfirmed: true,
    sourceReviews: batchIds.map((batchId) => ({ batchId, exportedAt: asOf, completeThrough: end })) });
  assert.equal(scan.result.findings.length, 1);
  assert.equal(scan.result.findings[0].findingType, "LEDGER_PROVIDER_USAGE_MISMATCH");
  assert.equal(scan.result.findings[0].evidence.delta, "1000");
  console.log(JSON.stringify({ status: "KAGGLE_APP_SEEDED", email, workspaceId: workspace.id, snapshotId: scan.snapshotId,
    findingFingerprint: scan.result.findings[0].fingerprint, reportPath: `/app/ai-integrity/reports/${scan.snapshotId}` }));
} finally { await prisma.$disconnect(); }
