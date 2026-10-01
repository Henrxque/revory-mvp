import { createHash } from "node:crypto";

import { canonicalAiJson } from "./contracts";
import { evaluateAiAttributionCoverage, type CoverageBucket, type CoverageMapping } from "./attribution";
import { providerProjectMappingKey } from "./mapping-key";

export const AI_INTEGRITY_RULE_VERSION = "ai-integrity/4.1.0";
const ZERO = BigInt(0);
const SCALE = BigInt(10) ** BigInt(12);
export function aiDecimal(value: string): bigint {
  const match = /^(-?)(\d{1,21})(?:\.(\d{1,12}))?$/.exec(value);
  if (!match) throw new Error("Invalid exact decimal.");
  const result = BigInt(match[2]) * SCALE + BigInt((match[3] ?? "").padEnd(12, "0"));
  return match[1] ? -result : result;
}
export function aiDecimalString(value: bigint): string {
  const abs = value < ZERO ? -value : value;
  const fraction = (abs % SCALE).toString().padStart(12, "0").replace(/0+$/, "");
  return `${value < ZERO ? "-" : ""}${abs / SCALE}${fraction ? `.${fraction}` : ""}`;
}
export function aiDigest(value: unknown) { return createHash("sha256").update(canonicalAiJson(value)).digest("hex"); }
export function aiTimestamp(value: string): number {
  const result = Date.parse(value);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(result)) throw new Error("Explicit valid timestamp offset required.");
  return result;
}
type EvidenceRow = { id: string; importBatchId: string; sourceSystem: string; externalId: string; recordHash: string; sourceRowNumber: number };
export type ScanUsage = EvidenceRow & {
  provider: string | null; providerProjectId: string | null; model: string | null;
  providerRequestId: string | null; internalCustomerExternalId: string | null;
  occurredAt: string; quantity: string; unit: string; creditsDelta: string | null;
};
export type ScanBucket = EvidenceRow & Omit<CoverageBucket, "windowStart" | "windowEnd"> & {
  windowStart: string; windowEnd: string; reportedAt: string | null; usageQuantity: string | null; usageUnit: string | null;
};
export type ScanMapping = Omit<CoverageMapping, "validFrom" | "validUntil"> & { validFrom: string; validUntil: string | null; provenanceJson: unknown };
export type ScanBatch = {
  id: string; sourceKind: "STRIPE_REVENUE" | "INTERNAL_LEDGER" | "PROVIDER_REPORT"; sourceSystem: string;
  windowStart: string; windowEnd: string; sourceTimezone: string; fileSha256: string; mappingSha256: string;
  rowCount: number; insertedCount: number; duplicateCount: number; dataQualityJson: Record<string, unknown>;
};
export type SourceClosureReview = { batchId: string; exportedAt: string; completeThrough: string };
export type AiScanInput = {
  ruleVersion: typeof AI_INTEGRITY_RULE_VERSION; workspaceId: string; asOf: string; lagHours: number;
  sourceReviews: SourceClosureReview[]; batches: ScanBatch[];
  buckets: ScanBucket[]; usage: ScanUsage[]; knownBuckets: ScanBucket[]; knownUsage: ScanUsage[];
  mappings: ScanMapping[];
  // Revenue is retained as context only. No net revenue, margin or billing inference in this rule version.
  revenue: Array<EvidenceRow & { eventKind: string; status: string; occurredAt: string; amountMinor: string | null; currency: string | null; parentExternalId: string | null }>;
};
export type AiScanFinding = {
  fingerprint: string; findingType: "UNATTRIBUTED_PROVIDER_SPEND" | "LEDGER_PROVIDER_USAGE_MISMATCH";
  valueBasis: "OBSERVED" | "CALCULATED"; valueAmount: string | null; valueCurrency: string | null;
  formula: string; confidenceClass: string; attributionClass: string;
  evidence: Record<string, unknown>; limitations: string[]; recommendedReview: string;
};
type Suppression = { scope: string; code: string; recordIds: string[] };
const providerKey = (value: string | null) => value?.trim().toLowerCase() ?? "";
const identityKey = (row: EvidenceRow) => canonicalAiJson([row.sourceSystem, row.externalId]);
const compatible = (a: string | null, b: string | null) => !a || !b || a === b;
function overlap(a: ScanBucket, b: ScanBucket) {
  return aiTimestamp(a.windowStart) < aiTimestamp(b.windowEnd) && aiTimestamp(b.windowStart) < aiTimestamp(a.windowEnd);
}
function usageScopeOverlaps(a: ScanBucket, b: ScanBucket) {
  return providerKey(a.provider) === providerKey(b.provider) && compatible(a.organizationId, b.organizationId)
    && compatible(a.projectId, b.projectId) && compatible(a.model, b.model) && overlap(a, b);
}
function conflictingIds(rows: EvidenceRow[]) {
  const hashes = new Map<string, Set<string>>();
  for (const row of rows) { const key = identityKey(row); const values = hashes.get(key) ?? new Set<string>(); values.add(row.recordHash); hashes.set(key, values); }
  return new Set([...hashes].filter(([, values]) => values.size > 1).map(([key]) => key));
}

// Usage comparability is independent of whether the provider also reports a monetary cost.
function confirmedUsageScope(input: AiScanInput, bucket: ScanBucket) {
  if (!bucket.projectId) return null;
  const from = aiTimestamp(bucket.windowStart), to = aiTimestamp(bucket.windowEnd);
  const key = providerProjectMappingKey(bucket.provider, bucket.organizationId, bucket.projectId);
  const active = input.mappings.filter((m) => m.kind === "PROVIDER_PROJECT" && m.externalId === key && m.status !== "REVOKED"
    && aiTimestamp(m.validFrom) < to && (!m.validUntil || aiTimestamp(m.validUntil) > from));
  if (active.length !== 1) return null;
  const mapping = active[0];
  if (mapping.status !== "CONFIRMED" || mapping.confirmationMethod !== "EXCLUSIVE_PROJECT_VERIFIED"
    || aiTimestamp(mapping.validFrom) > from || (mapping.validUntil && aiTimestamp(mapping.validUntil) < to)) return null;
  const projectUsage = (u: ScanUsage) => providerKey(u.provider) === providerKey(bucket.provider) && u.providerProjectId === bucket.projectId
    && aiTimestamp(u.occurredAt) >= from && aiTimestamp(u.occurredAt) < to;
  if (!input.usage.some(projectUsage) || [...input.knownUsage, ...input.usage].filter(projectUsage).some((u) => !u.internalCustomerExternalId
    || u.internalCustomerExternalId !== mapping.internalCustomerExternalId)) return null;
  if ([...input.knownBuckets, ...input.buckets].some((other) => providerKey(other.provider) === providerKey(bucket.provider)
    && other.projectId === bucket.projectId && other.organizationId !== bucket.organizationId && overlap(other, bucket))) return null;
  return mapping;
}

export function reconcileAiIntegrity(input: AiScanInput) {
  const byId = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  input = { ...input, batches: byId(input.batches), buckets: byId(input.buckets), usage: byId(input.usage), revenue: byId(input.revenue),
    knownUsage: byId(input.knownUsage), knownBuckets: byId(input.knownBuckets), mappings: byId(input.mappings),
    sourceReviews: [...input.sourceReviews].sort((a, b) => a.batchId.localeCompare(b.batchId)) };
  if (input.ruleVersion !== AI_INTEGRITY_RULE_VERSION) throw new Error("Unsupported rule version.");
  const asOf = aiTimestamp(input.asOf);
  if (!Number.isInteger(input.lagHours) || input.lagHours < 0 || input.lagHours > 720) throw new Error("Choose a consolidation lag between 0 and 720 hours.");
  const batchOf = (kind: ScanBatch["sourceKind"]) => {
    const rows = input.batches.filter((batch) => batch.sourceKind === kind);
    if (rows.length !== 1) throw new Error("Select exactly one batch from each of the three sources.");
    return rows[0];
  };
  const providerBatch = batchOf("PROVIDER_REPORT");
  const ledgerBatch = batchOf("INTERNAL_LEDGER");
  const revenueBatch = batchOf("STRIPE_REVENUE");
  if (input.batches.length !== 3 || new Set(input.batches.map((b) => b.id)).size !== 3) throw new Error("Three distinct source batches required.");
  const start = aiTimestamp(providerBatch.windowStart), end = aiTimestamp(providerBatch.windowEnd);
  if (start >= end) throw new Error("Invalid scan window.");
  if (input.buckets.length > 2000 || input.usage.length > 25000 || input.knownUsage.length > 25000 || input.knownBuckets.length > 25000) throw new Error("Internal scan evidence limit exceeded.");
  for (const [batch, rows] of [[providerBatch, input.buckets], [ledgerBatch, input.usage], [revenueBatch, input.revenue]] as const) {
    if (aiTimestamp(batch.windowStart) !== start || aiTimestamp(batch.windowEnd) !== end) throw new Error("All selected source windows must describe the same UTC interval.");
    if (batch.duplicateCount || batch.insertedCount !== batch.rowCount || rows.length !== batch.insertedCount || !rows.length
      || rows.some((row) => row.importBatchId !== batch.id) || new Set(rows.map(identityKey)).size !== rows.length) {
      throw new Error("Selected batch has incomplete or duplicate record membership. Select the original complete import.");
    }
  }
  const suppressions: Suppression[] = [];
  const suppress = (scope: string, code: string, recordIds: string[] = []) => suppressions.push({ scope, code, recordIds: [...recordIds].sort() });
  const ready = new Map<string, boolean>();
  if (input.sourceReviews.length !== 3 || new Set(input.sourceReviews.map((r) => r.batchId)).size !== 3) throw new Error("Review closure for each selected source.");
  for (const batch of input.batches) {
    const review = input.sourceReviews.find((r) => r.batchId === batch.id);
    if (!review) throw new Error("Missing source closure review.");
    const exported = aiTimestamp(review.exportedAt), complete = aiTimestamp(review.completeThrough);
    if (exported > asOf || complete > exported) throw new Error("Source closure cannot be later than export or analysis time.");
    const closed = complete >= end && exported >= end + input.lagHours * 3600000 && end <= asOf;
    ready.set(batch.id, closed);
    if (!closed) suppress(batch.id, "SOURCE_OPEN_OR_CONSOLIDATION_LAG");
    if (Number(batch.dataQualityJson.rejectedRows ?? 0) > 0) suppress(batch.id, "IMPORT_EXCLUDED_ROWS");
  }
  const ledgerComplete = ready.get(ledgerBatch.id) && !Number(ledgerBatch.dataQualityJson.rejectedRows ?? 0);
  const providerComplete = ready.get(providerBatch.id) && !Number(providerBatch.dataQualityJson.rejectedRows ?? 0);
  const providerConflicts = conflictingIds([...input.knownBuckets, ...input.buckets]);
  const usageConflicts = conflictingIds([...input.knownUsage, ...input.usage]);
  const excludedCost = new Set<string>();
  for (const bucket of input.buckets) {
    let code: string | null = null;
    if (!ready.get(providerBatch.id)) code = "SOURCE_OPEN_OR_CONSOLIDATION_LAG";
    else if (providerConflicts.has(identityKey(bucket))) code = "CONFLICTING_PROVIDER_RECORD_VERSION";
    else if (bucket.reportedAt && (aiTimestamp(bucket.reportedAt) < aiTimestamp(bucket.windowEnd) + input.lagHours * 3600000
      || aiTimestamp(bucket.reportedAt) > aiTimestamp(input.sourceReviews.find((r) => r.batchId === providerBatch.id)!.exportedAt))) code = "PROVIDER_BUCKET_NOT_FINAL";
    if (code) { excludedCost.add(bucket.id); suppress(bucket.id, code, [bucket.id]); }
  }
  const usageForCoverage = (rows: ScanUsage[]) => rows.map((row) => ({ ...row, occurredAt: new Date(row.occurredAt) }));
  const coverage = evaluateAiAttributionCoverage({
    providerWindowStart: new Date(start), providerWindowEnd: new Date(end),
    ledgerWindowStart: ledgerComplete ? new Date(start) : null, ledgerWindowEnd: ledgerComplete ? new Date(end) : null,
    // Keep excluded buckets in the overlap check; an excluded aggregate must not make a child appear safe.
    buckets: input.buckets.map((row) => ({ ...row, windowStart: new Date(row.windowStart), windowEnd: new Date(row.windowEnd),
      costBasis: excludedCost.has(row.id) ? "UNAVAILABLE" : row.costBasis })),
    usage: usageForCoverage(input.usage), knownUsage: usageForCoverage([...input.knownUsage, ...input.usage]),
    mappings: input.mappings.map((m) => ({ ...m, validFrom: new Date(m.validFrom), validUntil: m.validUntil ? new Date(m.validUntil) : null })),
  });
  // Cross-import contradictions can invalidate a selected mapping without changing historical mapping rows.
  for (const row of coverage.rows) {
    const bucket = input.buckets.find((b) => b.id === row.bucketId)!;
    if (row.attributionClass === "STRONG" && input.knownBuckets.some((other) => providerKey(other.provider) === providerKey(bucket.provider)
      && other.projectId === bucket.projectId && other.organizationId !== bucket.organizationId && overlap(other, bucket))) {
      row.attributionClass = "UNATTRIBUTED"; row.internalCustomerExternalId = null; row.mappingId = null; row.reason = "PROJECT_ACROSS_ORGANIZATIONS";
    }
    if (!row.inDenominator || row.attributionClass === "UNATTRIBUTED") suppress(row.bucketId, row.reason, [row.bucketId]);
  }
  // Rebuild numerator after cross-import checks; never add findings to cost totals.
  for (const group of coverage.groups) {
    const attributed = coverage.rows.filter((r) => r.inDenominator && r.provider === group.provider && r.currency === group.currency && r.attributionClass === "STRONG");
    const numerator = attributed.reduce((sum, row) => sum + aiDecimal(row.amount!), ZERO), denominator = aiDecimal(group.reportedComparableCost);
    if (aiDecimalString(denominator).split(".")[0].length > 18) throw new Error("Aggregate provider cost exceeds supported decimal precision.");
    group.attributedCost = aiDecimalString(numerator); group.unattributedCost = aiDecimalString(denominator - numerator);
    group.attributedBucketIds = attributed.map((r) => r.bucketId).sort();
    group.denominatorBucketIds.sort(); group.coverageBps = denominator > ZERO ? Number(numerator * BigInt(10000) / denominator) : null;
  }
  const findings: AiScanFinding[] = [];
  const finding = (value: Omit<AiScanFinding, "fingerprint">) => findings.push({ ...value, fingerprint: aiDigest({ ruleVersion: input.ruleVersion, ...value }) });
  for (const group of coverage.groups) {
    if (aiDecimal(group.unattributedCost) <= ZERO) continue;
    const bucketIds = coverage.rows.filter((r) => r.inDenominator && r.provider === group.provider && r.currency === group.currency && r.attributionClass === "UNATTRIBUTED").map((r) => r.bucketId).sort();
    finding({ findingType: "UNATTRIBUTED_PROVIDER_SPEND", valueBasis: "OBSERVED", valueAmount: group.unattributedCost, valueCurrency: group.currency,
      formula: "comparable_reported_provider_cost - strongly_attributed_provider_cost", confidenceClass: "OBSERVED_COVERAGE_GAP", attributionClass: "UNATTRIBUTED",
      evidence: { provider: group.provider, windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString(), bucketIds,
        reportedComparableCost: group.reportedComparableCost, attributedCost: group.attributedCost, coverageBps: group.coverageBps,
        eligibility: "Closed source review; nonnegative reported cost; no adjustment, conflicting version or overlapping cost bucket" },
      limitations: ["Unattributed spend is a coverage gap, not proven loss or waste.", "Denominator includes only eligible rows from the selected provider report; excluded rows and adjustments remain in Data Quality.", "Source closure is explicitly reviewed by the operator, not independently verified by a connector."],
      recommendedReview: "Review missing or shared project identity and confirm customer ownership with source evidence." });
  }
  const comparisons: Array<Record<string, unknown>> = [];
  const consumed = new Set<string>();
  for (const bucket of [...input.buckets].sort((a, b) => a.id.localeCompare(b.id))) {
    const scopeMapping = confirmedUsageScope(input, bucket);
    const relevant = input.usage.filter((u) => providerKey(u.provider) === providerKey(bucket.provider)
      && compatible(u.providerProjectId, bucket.projectId) && compatible(u.model, bucket.model)
      && aiTimestamp(u.occurredAt) >= aiTimestamp(bucket.windowStart) && aiTimestamp(u.occurredAt) < aiTimestamp(bucket.windowEnd));
    let reason: string | null = null;
    if (!ledgerComplete || !providerComplete) reason = "SOURCE_INCOMPLETE_FOR_USAGE_COMPARISON";
    else if (input.usage.some((u) => !u.provider)) reason = "LEDGER_PROVIDER_DIMENSION_INCOMPLETE";
    else if (excludedCost.has(bucket.id)) reason = "PROVIDER_EVIDENCE_NOT_FINAL_OR_CONFLICTED";
    else if (aiTimestamp(bucket.windowStart) < start || aiTimestamp(bucket.windowEnd) > end) reason = "OUTSIDE_SELECTED_WINDOW";
    else if (!scopeMapping) reason = "CONFIRMED_COMPARABLE_SCOPE_REQUIRED";
    else if (!bucket.usageUnit || bucket.usageQuantity === null) reason = "PROVIDER_USAGE_UNAVAILABLE";
    else if (aiDecimal(bucket.usageQuantity) < ZERO || bucket.adjustmentKind || (bucket.costAmount !== null && aiDecimal(bucket.costAmount) < ZERO)
      || relevant.some((u) => aiDecimal(u.quantity) < ZERO)) reason = "USAGE_ADJUSTMENT_REQUIRES_REVIEW";
    else if (input.buckets.some((other) => other.id !== bucket.id && other.usageQuantity !== null && usageScopeOverlaps(other, bucket))) reason = "OVERLAPPING_USAGE_BUCKETS";
    else if (relevant.some((u) => !u.providerProjectId || (bucket.model && !u.model))) reason = "LEDGER_DIMENSION_INCOMPLETE";
    else if (!relevant.length || relevant.some((u) => u.unit !== bucket.usageUnit)) reason = "USAGE_UNIT_NOT_COMPARABLE";
    else if (relevant.some((u) => usageConflicts.has(identityKey(u)))) reason = "CONFLICTING_LEDGER_RECORD_VERSION";
    else if (relevant.some((u) => u.providerRequestId && input.usage.some((other) => other.id !== u.id
      && providerKey(other.provider) === providerKey(u.provider) && other.providerRequestId === u.providerRequestId && other.unit === u.unit))) reason = "DUPLICATE_PROVIDER_REQUEST";
    else if (relevant.some((u) => consumed.has(u.id))) reason = "LEDGER_ROW_ALREADY_COMPARED";
    if (reason) { suppress(bucket.id, reason, [bucket.id, ...relevant.map((u) => u.id)]); continue; }
    const ledgerQuantity = relevant.reduce((sum, u) => sum + aiDecimal(u.quantity), ZERO);
    const delta = aiDecimal(bucket.usageQuantity!) - ledgerQuantity;
    for (const usage of relevant) consumed.add(usage.id);
    const evidence = { bucketId: bucket.id, ledgerRecordIds: relevant.map((u) => u.id).sort(), mappingId: scopeMapping!.id,
      internalCustomerExternalId: scopeMapping!.internalCustomerExternalId, provider: bucket.provider, organizationId: bucket.organizationId, projectId: bucket.projectId, model: bucket.model,
      windowStart: new Date(bucket.windowStart).toISOString(), windowEnd: new Date(bucket.windowEnd).toISOString(), unit: bucket.usageUnit,
      providerQuantity: aiDecimalString(aiDecimal(bucket.usageQuantity!)), ledgerQuantity: aiDecimalString(ledgerQuantity), delta: aiDecimalString(delta),
      eligibility: "Same exact unit, project/model and half-open UTC interval; exclusive confirmed mapping; reviewed closed sources after operator-specified lag" };
    comparisons.push(evidence);
    if (delta !== ZERO) finding({ findingType: "LEDGER_PROVIDER_USAGE_MISMATCH", valueBasis: "CALCULATED", valueAmount: null, valueCurrency: null,
      formula: "provider_usage_quantity - sum(internal_usage_quantity)", confidenceClass: "COMPARABLE_USAGE_DIFFERENCE", attributionClass: "STRONG", evidence,
      limitations: ["Quantity difference only; no monetary conversion, estimated loss or revenue inference.", "Retries, batching, caching, omitted events or differing metering semantics may explain the difference.", "Operator closure and matching unit labels are necessary but do not independently prove instrumentation completeness."],
      recommendedReview: "Compare the listed ledger events with the provider bucket and verify metering semantics before diagnosing a defect." });
  }
  const compared = new Set(comparisons.flatMap((c) => c.ledgerRecordIds as string[]));
  const unreviewedUsage = input.usage.filter((u) => !compared.has(u.id)).map((u) => u.id).sort();
  if (unreviewedUsage.length) suppress(ledgerBatch.id, "LEDGER_ROWS_NOT_COMPARED", unreviewedUsage);
  suppress(revenueBatch.id, "REVENUE_MARGIN_AND_CREDIT_RULES_NOT_IMPLEMENTED", input.revenue.map((r) => r.id));
  return { ruleVersion: input.ruleVersion, windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString(),
    coverage, findings: findings.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)), comparisons,
    suppressions: suppressions.sort((a, b) => canonicalAiJson(a).localeCompare(canonicalAiJson(b))),
    dataQuality: { sourceReviews: input.sourceReviews, lagHours: input.lagHours, asOf: input.asOf,
      sourceAgeHours: input.sourceReviews.map((r) => ({ batchId: r.batchId, hours: (asOf - aiTimestamp(r.exportedAt)) / 3600000 })),
      imports: input.batches.map((b) => ({ batchId: b.id, quality: b.dataQualityJson })),
      revenueTreatment: "Evidence context only; refunds, credits, subscriptions and revenue are not summed or used to infer margin or leakage.",
      valueTreatment: "Cost grouped by provider/currency. Usage deltas have no monetary value. No combined at-risk total." } };
}

export type AiScanResult = ReturnType<typeof reconcileAiIntegrity>;
