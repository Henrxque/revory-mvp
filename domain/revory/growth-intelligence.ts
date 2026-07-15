import type { CanonicalRecordContract, ValueBasis } from "./contracts";
import { summarizeQuoteRecoveryFinancialExposure } from "./quote-recovery-financial-summary";

export const GROWTH_MINIMUM_RECORDS = 5;
export const GROWTH_MINIMUM_FINDING_RECORDS = 2;

export type SegmentDimension = "SOURCE" | "OWNER" | "SERVICE_TYPE";
export type SegmentLayer = "QUOTE_RECOVERY" | "REVENUE_REALIZATION";

export type SegmentFinding = {
  currency: string;
  recordExternalId: string;
  valueBasis: ValueBasis;
  valueCents: number | null;
  additive: boolean;
};

export type GuardedSegment = {
  dimension: SegmentDimension;
  layer: SegmentLayer;
  label: string;
  recordCount: number;
  findingRecordCount: number;
  findingRateBps: number;
  financialValueCents: number | null;
  financialValuePerFindingRecordCents: number | null;
  operationalFindingCount: number;
  currency: string | null;
  eligibleForRanking: boolean;
  suppressionReason: "THIN_RECORD_SAMPLE" | "THIN_FINDING_SAMPLE" | "MIXED_CURRENCY" | "VALUE_CONFLICT" | null;
};

export type GuardedSegmentation = {
  minimumRecords: number;
  minimumFindingRecords: number;
  segments: GuardedSegment[];
};

type SegmentRecord = {
  externalId: string;
  dimensions: Record<SegmentDimension, string | null>;
};

function cleanLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length ? normalized.slice(0, 80) : null;
}

function dimensionsFor(
  record: CanonicalRecordContract,
  estimateById: Map<string, CanonicalRecordContract>,
): Record<SegmentDimension, string | null> {
  const estimateId = record.relationExternalIds.estimateExternalId;
  const fallback = estimateId ? estimateById.get(estimateId)?.payload : undefined;
  return {
    OWNER: cleanLabel(record.payload.owner) ?? cleanLabel(fallback?.owner),
    SERVICE_TYPE: cleanLabel(record.payload.serviceType) ?? cleanLabel(fallback?.serviceType),
    SOURCE: cleanLabel(record.payload.source) ?? cleanLabel(fallback?.source),
  };
}

function buildLayerSegments(input: {
  dimensions: readonly SegmentDimension[];
  findings: readonly SegmentFinding[];
  layer: SegmentLayer;
  minimumFindingRecords: number;
  minimumRecords: number;
  records: readonly SegmentRecord[];
}) {
  const findingsByRecord = new Map<string, SegmentFinding[]>();
  for (const finding of input.findings) {
    const current = findingsByRecord.get(finding.recordExternalId) ?? [];
    current.push(finding);
    findingsByRecord.set(finding.recordExternalId, current);
  }

  const segments: GuardedSegment[] = [];
  for (const dimension of input.dimensions) {
    const groups = new Map<string, SegmentRecord[]>();
    for (const record of input.records) {
      const label = record.dimensions[dimension];
      if (!label) continue;
      const current = groups.get(label) ?? [];
      current.push(record);
      groups.set(label, current);
    }
    for (const [label, records] of groups) {
      const segmentFindings = records.flatMap((record) => findingsByRecord.get(record.externalId) ?? []);
      const findingRecordCount = new Set(segmentFindings.map((finding) => finding.recordExternalId)).size;
      const financial = segmentFindings.filter((finding) =>
        input.layer === "QUOTE_RECOVERY"
          ? finding.valueBasis === "ESTIMATED" && finding.valueCents !== null
          : finding.valueBasis === "CALCULATED" && finding.additive && finding.valueCents !== null,
      );
      const currencies = [...new Set(financial.map((finding) => finding.currency))];
      const quoteFinancialSummary = input.layer === "QUOTE_RECOVERY"
        ? summarizeQuoteRecoveryFinancialExposure(financial.map((finding) => ({
            currency: finding.currency,
            estimateExternalId: finding.recordExternalId,
            valueBasis: finding.valueBasis,
            valueCents: finding.valueCents,
          })))
        : null;
      const financialValueCents = quoteFinancialSummary
        ? quoteFinancialSummary.estimatedValueCents
        : financial.reduce((total, finding) => total + (finding.valueCents ?? 0), 0);
      const suppressionReason = records.length < input.minimumRecords
        ? "THIN_RECORD_SAMPLE"
        : findingRecordCount < input.minimumFindingRecords
          ? "THIN_FINDING_SAMPLE"
          : quoteFinancialSummary?.hasConflictingEstimateValues
            ? "VALUE_CONFLICT"
            : currencies.length > 1
            ? "MIXED_CURRENCY"
            : null;
      segments.push({
        currency: currencies.length === 1 ? currencies[0] : null,
        dimension,
        eligibleForRanking: suppressionReason === null,
        financialValueCents: currencies.length <= 1 ? financialValueCents : null,
        financialValuePerFindingRecordCents: currencies.length <= 1 && findingRecordCount > 0 && financialValueCents !== null
          ? Math.round(financialValueCents / findingRecordCount)
          : null,
        findingRecordCount,
        findingRateBps: records.length ? Math.round(findingRecordCount / records.length * 10_000) : 0,
        label,
        layer: input.layer,
        operationalFindingCount: segmentFindings.filter((finding) => finding.valueBasis === "OPERATIONAL").length,
        recordCount: records.length,
        suppressionReason,
      });
    }
  }
  return segments;
}

export function buildGuardedSegmentation(input: {
  records: readonly CanonicalRecordContract[];
  quoteFindings: readonly SegmentFinding[];
  realizationFindings: readonly SegmentFinding[];
  minimumRecords?: number;
  minimumFindingRecords?: number;
}): GuardedSegmentation {
  const workspaceIds = new Set(input.records.map((record) => record.workspaceId));
  if (workspaceIds.size > 1) throw new Error("Cross-workspace segmentation is prohibited.");
  const minimumRecords = input.minimumRecords ?? GROWTH_MINIMUM_RECORDS;
  const minimumFindingRecords = input.minimumFindingRecords ?? GROWTH_MINIMUM_FINDING_RECORDS;
  const estimates = input.records.filter((record) => record.entityType === "ESTIMATE");
  const estimateById = new Map(estimates.map((record) => [record.externalId, record]));
  const jobs = input.records.filter((record) => record.entityType === "JOB");
  const dimensions: SegmentDimension[] = ["SOURCE", "OWNER", "SERVICE_TYPE"];
  const quoteRecords = estimates.map((record) => ({
    dimensions: dimensionsFor(record, estimateById),
    externalId: record.externalId,
  }));
  const realizationRecords = jobs.map((record) => ({
    dimensions: dimensionsFor(record, estimateById),
    externalId: record.externalId,
  }));
  const segments = [
    ...buildLayerSegments({ dimensions, findings: input.realizationFindings, layer: "REVENUE_REALIZATION", minimumFindingRecords, minimumRecords, records: realizationRecords }),
    ...buildLayerSegments({ dimensions, findings: input.quoteFindings, layer: "QUOTE_RECOVERY", minimumFindingRecords, minimumRecords, records: quoteRecords }),
  ].sort((a, b) => {
    if (a.eligibleForRanking !== b.eligibleForRanking) return a.eligibleForRanking ? -1 : 1;
    return (b.financialValueCents ?? 0) - (a.financialValueCents ?? 0) || b.findingRecordCount - a.findingRecordCount || a.label.localeCompare(b.label);
  });
  return { minimumFindingRecords, minimumRecords, segments };
}

export type WeeklyManagementDecision = {
  available: boolean;
  headline: string;
  rationale: string;
  segment: GuardedSegment | null;
};

export function buildWeeklyManagementDecision(segmentation: GuardedSegmentation): WeeklyManagementDecision {
  const eligible = segmentation.segments.filter((segment) => segment.eligibleForRanking);
  const segment = eligible.find((candidate) => candidate.layer === "REVENUE_REALIZATION" && (candidate.financialValueCents ?? 0) > 0)
    ?? eligible.find((candidate) => candidate.layer === "QUOTE_RECOVERY" && (candidate.financialValueCents ?? 0) > 0)
    ?? eligible[0]
    ?? null;
  if (!segment) return {
    available: false,
    headline: "No guarded segment decision yet.",
    rationale: `Import at least ${segmentation.minimumRecords} comparable records with findings on at least ${segmentation.minimumFindingRecords} records before REVORY ranks a cohort.`,
    segment: null,
  };
  const basis = segment.layer === "REVENUE_REALIZATION" ? "calculated billing gap" : "estimated quote opportunity";
  return {
    available: true,
    headline: `Review ${segment.dimension.toLowerCase().replace("_", " ")} “${segment.label}” first.`,
    rationale: `${segment.findingRecordCount} of ${segment.recordCount} comparable records (${Math.round(segment.findingRateBps / 100)}%) carry ${basis}. This is a review priority, not a performance verdict.`,
    segment,
  };
}
