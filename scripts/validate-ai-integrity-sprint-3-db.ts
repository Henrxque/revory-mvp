import assert from "node:assert/strict";

import { prisma } from "../db/prisma";
import { createAiIdentityMapping, getAiAttributionCoverage, revokeAiIdentityMapping } from "../services/ai-integrity/identity";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import type { AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";

const windowStart = "2026-08-01T00:00:00Z";
const windowEnd = "2026-09-01T00:00:00Z";
const common = (workspaceId: string, sourceKind: AiIntegrityBatchInput["sourceKind"], fileName: string, hash: string) => ({
  workspaceId, sourceKind, sourceSystem: sourceKind === "STRIPE_REVENUE" ? "stripe-export" : sourceKind === "INTERNAL_LEDGER" ? "internal-ledger" : "provider-report",
  fileName, fileSha256: hash.repeat(64), mappingSha256: "a".repeat(64), windowStart, windowEnd, sourceTimezone: "UTC", dataQuality: {},
});
const row = (workspaceId: string, externalId: string, number: number) => ({ workspaceId, externalId, sourceRowNumber: number,
  sourcePayload: { externalId }, provenance: { rowNumber: number } });

try {
  const user = await prisma.user.create({ data: { email: "sprint3@example.invalid" } });
  const wsA = await prisma.workspace.create({ data: { name: "Identity A", slug: "identity-a", ownerUserId: user.id } });
  const wsB = await prisma.workspace.create({ data: { name: "Identity B", slug: "identity-b", ownerUserId: user.id } });
  const revenue: AiIntegrityBatchInput = { ...common(wsA.id, "STRIPE_REVENUE", "revenue.csv", "b"), sourceKind: "STRIPE_REVENUE",
    records: [{ ...row(wsA.id, "ch_a", 2), eventKind: "CHARGE", status: "paid", occurredAt: "2026-08-10T12:00:00Z",
      stripeCustomerExternalId: "cus_stripe_a", amountMinor: "10000", currency: "USD", currencyExponent: 2 }] };
  const ledger: AiIntegrityBatchInput = { ...common(wsA.id, "INTERNAL_LEDGER", "ledger.csv", "c"), sourceKind: "INTERNAL_LEDGER",
    records: [
      { ...row(wsA.id, "evt_a", 2), occurredAt: "2026-08-10T12:00:00Z", quantity: "100", unit: "tokens", provider: "openai", providerProjectId: "proj_one", internalCustomerExternalId: "customer_a" },
      { ...row(wsA.id, "evt_b", 3), occurredAt: "2026-08-10T12:01:00Z", quantity: "10", unit: "tokens", provider: "openai", providerProjectId: "proj_other", internalCustomerExternalId: "customer_b" },
    ] };
  const provider: AiIntegrityBatchInput = { ...common(wsA.id, "PROVIDER_REPORT", "provider.csv", "d"), sourceKind: "PROVIDER_REPORT",
    records: [{ ...row(wsA.id, "bucket_one", 2), provider: "openai", organizationId: "org_one", projectId: "proj_one",
      windowStart: "2026-08-10T00:00:00Z", windowEnd: "2026-08-11T00:00:00Z", costBasis: "REPORTED", costAmount: "2.500000", costCurrency: "USD" }] };
  const revenueBatch = (await persistAiIntegrityBatch(revenue)).batch;
  const ledgerBatch = (await persistAiIntegrityBatch(ledger)).batch;
  const providerBatch = (await persistAiIntegrityBatch(provider)).batch;
  const stripeInput = { workspaceId: wsA.id, actorUserId: user.id, kind: "STRIPE_CUSTOMER" as const, externalId: "cus_stripe_a",
    internalCustomerExternalId: "customer_a", sourceBatchId: revenueBatch.id, ledgerBatchId: ledgerBatch.id, validFrom: windowStart, validUntil: windowEnd };
  const stripe = await createAiIdentityMapping(stripeInput);
  assert.equal(stripe.status, "CONFIRMED");
  const projectInput = { ...stripeInput, kind: "PROVIDER_PROJECT" as const, externalId: "proj_one", sourceBatchId: providerBatch.id,
    provider: "openai", organizationId: "org_one", exclusiveProjectConfirmed: true };
  const project = await createAiIdentityMapping(projectInput);
  assert.equal(project.status, "CONFIRMED");
  const covered = await getAiAttributionCoverage(wsA.id, providerBatch.id, ledgerBatch.id);
  assert.equal(covered.groups[0].reportedComparableCost, "2.5");
  assert.equal(covered.groups[0].attributedCost, "2.5");
  assert.equal(covered.groups[0].coverageBps, 10000);
  assert.deepEqual(covered.groups[0].denominatorBucketIds, [(await prisma.aiIntegrityProviderBucket.findFirstOrThrow({ where: { workspaceId: wsA.id } })).id]);
  await assert.rejects(() => createAiIdentityMapping({ ...stripeInput, sourceBatchId: providerBatch.id }), /source or ledger batch/);
  await assert.rejects(() => getAiAttributionCoverage(wsB.id, providerBatch.id, ledgerBatch.id), /this workspace/);
  await assert.rejects(() => revokeAiIdentityMapping(wsB.id, user.id, project.id), /this workspace/);
  await assert.rejects(() => createAiIdentityMapping(stripeInput), /already exists/);
  const conflicting = await createAiIdentityMapping({ ...stripeInput, internalCustomerExternalId: "customer_b" });
  assert.equal(conflicting.status, "CONFLICTED");
  assert.equal((await prisma.aiIntegrityMapping.findUniqueOrThrow({ where: { id: stripe.id } })).status, "CONFLICTED");
  await revokeAiIdentityMapping(wsA.id, user.id, conflicting.id);
  assert.equal((await prisma.aiIntegrityMapping.findUniqueOrThrow({ where: { id: stripe.id } })).status, "CONFIRMED");

  const sharedLedger: AiIntegrityBatchInput = { ...common(wsA.id, "INTERNAL_LEDGER", "shared.csv", "e"), sourceKind: "INTERNAL_LEDGER",
    records: [{ ...row(wsA.id, "evt_shared", 2), occurredAt: "2026-08-10T13:00:00Z", quantity: "20", unit: "tokens", provider: "openai",
      providerProjectId: "proj_one", internalCustomerExternalId: "customer_b" }] };
  await persistAiIntegrityBatch(sharedLedger);
  const suppressed = await getAiAttributionCoverage(wsA.id, providerBatch.id, ledgerBatch.id);
  assert.equal(suppressed.groups[0].attributedCost, "0");
  assert.equal(suppressed.rows[0].reason, "SHARED_OR_UNATTRIBUTED_PROJECT");
  assert.equal(await prisma.aiIntegrityFinding.count({ where: { workspaceId: wsA.id } }), 0);
  assert.equal(await prisma.workspaceAuditEvent.count({ where: { workspaceId: wsA.id, action: "AI_INTEGRITY_MAPPING_REVIEWED" } }), 3);
  console.log("AI Integrity Sprint 3 disposable PostgreSQL mapping confirmation, conflict, revocation, cross-tenant isolation and coverage: PASS");
} finally {
  await prisma.$disconnect();
}
