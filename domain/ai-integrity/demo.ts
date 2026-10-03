import { providerProjectMappingKey } from "./mapping-key";
import { AI_INTEGRITY_RULE_VERSION, reconcileAiIntegrity, type AiScanInput, type ScanBatch } from "./reconciliation";

export function aiIntegrityDemoInput(): AiScanInput {
  const start = "2026-08-01T00:00:00Z", end = "2026-09-01T00:00:00Z", exportedAt = "2026-09-03T00:00:00Z";
  const batch = (id: string, sourceKind: ScanBatch["sourceKind"], rowCount: number): ScanBatch => ({ id, sourceKind, sourceSystem: sourceKind,
    windowStart: start, windowEnd: end, sourceTimezone: "UTC", fileSha256: "a".repeat(64), mappingSha256: "b".repeat(64),
    rowCount, insertedCount: rowCount, duplicateCount: 0, dataQualityJson: {} });
  const row = (id: string, importBatchId: string) => ({ id, importBatchId, sourceSystem: importBatchId, externalId: id, recordHash: id, sourceRowNumber: 2 });
  const input: AiScanInput = { workspaceId: "synthetic_demo", ruleVersion: AI_INTEGRITY_RULE_VERSION, asOf: "2026-09-04T00:00:00Z", lagHours: 24,
    batches: [batch("demo_revenue", "STRIPE_REVENUE", 1), batch("demo_ledger", "INTERNAL_LEDGER", 1), batch("demo_provider", "PROVIDER_REPORT", 2)],
    sourceReviews: ["demo_revenue", "demo_ledger", "demo_provider"].map((batchId) => ({ batchId, exportedAt, completeThrough: end })),
    usage: [{ ...row("evt_aster_usage", "demo_ledger"), provider: "openai", providerProjectId: "proj_aster", providerRequestId: null,
      model: "model_sample", internalCustomerExternalId: "workspace_aster", occurredAt: "2026-08-15T00:00:00Z", quantity: "8640000", unit: "tokens", creditsDelta: null }],
    buckets: [
      { ...row("bucket_aster", "demo_provider"), provider: "openai", organizationId: "org_sample", projectId: "proj_aster", model: "model_sample",
        windowStart: start, windowEnd: end, reportedAt: exportedAt, usageQuantity: "9020000", usageUnit: "tokens",
        costAmount: "1840.50", costCurrency: "USD", costBasis: "REPORTED", adjustmentKind: null },
      { ...row("bucket_shared", "demo_provider"), provider: "openai", organizationId: "org_sample", projectId: "proj_shared", model: "model_sample",
        windowStart: start, windowEnd: end, reportedAt: exportedAt, usageQuantity: "3100000", usageUnit: "tokens",
        costAmount: "615.25", costCurrency: "USD", costBasis: "REPORTED", adjustmentKind: null },
    ],
    mappings: [{ id: "mapping_aster", kind: "PROVIDER_PROJECT", externalId: providerProjectMappingKey("openai", "org_sample", "proj_aster"), internalCustomerExternalId: "workspace_aster",
      validFrom: start, validUntil: end, status: "CONFIRMED", confirmationMethod: "EXCLUSIVE_PROJECT_VERIFIED", provenanceJson: { synthetic: true } }],
    revenue: [{ ...row("ch_sample", "demo_revenue"), eventKind: "CHARGE", status: "paid", occurredAt: "2026-08-12T00:00:00Z", amountMinor: "224900", currency: "USD", parentExternalId: null }],
    knownUsage: [], knownBuckets: [],
  };
  input.knownUsage = input.usage; input.knownBuckets = input.buckets;
  return input;
}
export function aiIntegrityDemoResult() { return reconcileAiIntegrity(aiIntegrityDemoInput()); }
