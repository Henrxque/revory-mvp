import type { AiIntegrityBatchInput } from "../../../domain/ai-integrity/contracts";
import { aiDigest, type AiScanInput } from "../../../domain/ai-integrity/reconciliation";
import { persistAiIntegrityBatch } from "../../../services/ai-integrity/persist-batch";
import { createAiIdentityMapping } from "../../../services/ai-integrity/identity";
import { runAiIntegrityScan } from "../../../services/ai-integrity/scan";

// Test helper only: internal synthetic scan path, never a customer purchase or API capability.
export async function seedSprint8Report(workspaceId: string, actorUserId: string, input: AiScanInput) {
  const originalFlag = process.env.REVORY_AI_SAAS_PREVIEW;
  process.env.REVORY_AI_SAAS_PREVIEW = "false";
  try {
    const batches: Record<string, string> = {};
    for (const batch of input.batches) {
      const records = batch.sourceKind === "STRIPE_REVENUE" ? input.revenue.map((r) => ({ ...r, currencyExponent: 2 })) : batch.sourceKind === "INTERNAL_LEDGER" ? input.usage : input.buckets;
      const normalized = { workspaceId, sourceKind: batch.sourceKind, sourceSystem: batch.sourceSystem, fileName: `${batch.id}.csv`, fileSha256: aiDigest({ records, day: batch.windowStart }), mappingSha256: batch.mappingSha256,
        windowStart: batch.windowStart, windowEnd: batch.windowEnd, sourceTimezone: "UTC", dataQuality: batch.dataQualityJson,
        records: records.map((r, index) => ({ ...r, workspaceId, sourceRowNumber: index + 2, sourcePayload: { synthetic: true }, provenance: { synthetic: true } })) } as AiIntegrityBatchInput;
      batches[batch.sourceKind] = (await persistAiIntegrityBatch(normalized)).batch.id;
    }
    await createAiIdentityMapping({ workspaceId, actorUserId, kind: "PROVIDER_PROJECT", externalId: "proj_a", provider: "openai", organizationId: "org_a", internalCustomerExternalId: "customer_a",
      sourceBatchId: batches.PROVIDER_REPORT, ledgerBatchId: batches.INTERNAL_LEDGER, validFrom: input.batches[0].windowStart, validUntil: input.batches[0].windowEnd, exclusiveProjectConfirmed: true });
    return runAiIntegrityScan({ workspaceId, actorUserId, batchIds: Object.values(batches), asOf: input.asOf, lagHours: input.lagHours,
      syntheticDataConfirmed: true, sourceReviews: Object.values(batches).map((batchId) => ({ batchId, exportedAt: input.sourceReviews[0].exportedAt, completeThrough: input.batches[0].windowEnd })) });
  } finally { process.env.REVORY_AI_SAAS_PREVIEW = originalFlag; }
}
