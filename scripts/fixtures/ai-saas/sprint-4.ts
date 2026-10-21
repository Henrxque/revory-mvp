import { providerProjectMappingKey } from "../../../domain/ai-integrity/mapping-key";
import { AI_INTEGRITY_RULE_VERSION, type AiScanInput, type ScanBatch } from "../../../domain/ai-integrity/reconciliation";

export function sprint4Fixture(): AiScanInput {
  const start = "2026-08-01T00:00:00.000Z", end = "2026-09-01T00:00:00.000Z", reported = "2026-09-03T00:00:00.000Z";
  const batch = (id: string, sourceKind: ScanBatch["sourceKind"], rowCount: number): ScanBatch => ({ id, sourceKind, sourceSystem: sourceKind,
    windowStart: start, windowEnd: end, sourceTimezone: "UTC", fileSha256: "a".repeat(64), mappingSha256: "b".repeat(64),
    rowCount, insertedCount: rowCount, duplicateCount: 0, dataQualityJson: {} });
  const evidence = (id: string, importBatchId: string) => ({ id, importBatchId, sourceSystem: importBatchId, externalId: id, recordHash: id, sourceRowNumber: 2 });
  const input: AiScanInput = { workspaceId: "workspace_a", ruleVersion: AI_INTEGRITY_RULE_VERSION, asOf: "2026-09-04T00:00:00.000Z", lagHours: 24,
    batches: [batch("revenue", "STRIPE_REVENUE", 1), batch("ledger", "INTERNAL_LEDGER", 1), batch("provider", "PROVIDER_REPORT", 2)],
    sourceReviews: ["ledger", "revenue", "provider"].map((batchId) => ({ batchId, exportedAt: reported, completeThrough: end })),
    usage: [{ ...evidence("usage_a", "ledger"), provider: "openai", providerProjectId: "proj_a", model: "model_a", providerRequestId: "req_a",
      internalCustomerExternalId: "customer_a", occurredAt: "2026-08-10T12:00:00.000Z", quantity: "100", unit: "tokens", creditsDelta: "-10" }],
    buckets: [
      { ...evidence("bucket_a", "provider"), provider: "openai", organizationId: "org_a", projectId: "proj_a", model: "model_a", windowStart: start, windowEnd: end,
        costAmount: "2.5", costCurrency: "USD", costBasis: "REPORTED", adjustmentKind: null, reportedAt: reported, usageQuantity: "120", usageUnit: "tokens" },
      { ...evidence("bucket_b", "provider"), provider: "openai", organizationId: "org_a", projectId: "proj_b", model: "model_a", windowStart: start, windowEnd: end,
        costAmount: "1.25", costCurrency: "USD", costBasis: "REPORTED", adjustmentKind: null, reportedAt: reported, usageQuantity: "50", usageUnit: "tokens" },
    ],
    mappings: [{ id: "mapping_a", kind: "PROVIDER_PROJECT", externalId: providerProjectMappingKey("openai", "org_a", "proj_a"), internalCustomerExternalId: "customer_a",
      validFrom: start, validUntil: end, status: "CONFIRMED", confirmationMethod: "EXCLUSIVE_PROJECT_VERIFIED", provenanceJson: { sourceBatchId: "provider", ledgerBatchId: "ledger" } }],
    revenue: [{ ...evidence("charge_a", "revenue"), eventKind: "CHARGE", status: "paid", occurredAt: "2026-08-10T12:00:00.000Z", amountMinor: "10000", currency: "USD", parentExternalId: null }],
    knownUsage: [], knownBuckets: [],
  };
  input.knownUsage = input.usage; input.knownBuckets = input.buckets;
  return input;
}
