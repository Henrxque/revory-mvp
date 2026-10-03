import { providerProjectMappingKey } from "./mapping-key";

export type AttributionClass = "EXACT" | "STRONG" | "MAPPED" | "ESTIMATED" | "UNATTRIBUTED";

export type CoverageBucket = {
  id: string; provider: string; organizationId: string | null; projectId: string | null; model: string | null;
  windowStart: Date; windowEnd: Date; costAmount: string | null; costCurrency: string | null;
  costBasis: "REPORTED" | "ESTIMATED" | "UNAVAILABLE"; adjustmentKind: string | null;
};
export type CoverageUsage = { provider: string | null; providerProjectId: string | null; internalCustomerExternalId: string | null; occurredAt: Date };
export type CoverageMapping = {
  id: string; kind: "STRIPE_CUSTOMER" | "PROVIDER_PROJECT" | "PROVIDER_KEY"; externalId: string;
  internalCustomerExternalId: string; validFrom: Date; validUntil: Date | null;
  status: "CONFIRMED" | "CONFLICTED" | "REVOKED"; confirmationMethod: string;
};
export type CoverageRow = {
  bucketId: string; provider: string; currency: string | null; amount: string | null;
  attributionClass: AttributionClass; internalCustomerExternalId: string | null;
  inDenominator: boolean; reason: string; mappingId: string | null;
};
export type CoverageGroup = {
  provider: string; currency: string; reportedComparableCost: string; attributedCost: string;
  unattributedCost: string; coverageBps: number | null; denominatorBucketIds: string[]; attributedBucketIds: string[];
};

const SCALE = BigInt(10) ** BigInt(12);
function minorDecimal(value: string) {
  const match = /^(-?)(\d{1,18})(?:\.(\d{1,12}))?$/.exec(value);
  if (!match) throw new Error("Invalid provider cost decimal.");
  const magnitude = BigInt(match[2]) * SCALE + BigInt((match[3] ?? "").padEnd(12, "0"));
  return match[1] ? -magnitude : magnitude;
}
function decimalString(value: bigint) {
  const sign = value < BigInt(0) ? "-" : "";
  const positive = value < BigInt(0) ? -value : value;
  const fraction = (positive % SCALE).toString().padStart(12, "0").replace(/0+$/, "");
  return `${sign}${positive / SCALE}${fraction ? `.${fraction}` : ""}`;
}
function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && rightStart < leftEnd;
}
function sameDimension(left: CoverageBucket, right: CoverageBucket) {
  // A missing dimension is an aggregate, not a separate non-overlapping slice.
  const compatible = (a: string | null, b: string | null) => !a || !b || a === b;
  return left.provider.trim().toLowerCase() === right.provider.trim().toLowerCase()
    && compatible(left.organizationId, right.organizationId) && compatible(left.projectId, right.projectId)
    && compatible(left.model, right.model) && left.costCurrency === right.costCurrency;
}

export function evaluateAiAttributionCoverage(input: {
  providerWindowStart: Date; providerWindowEnd: Date;
  ledgerWindowStart: Date | null; ledgerWindowEnd: Date | null;
  buckets: CoverageBucket[]; usage: CoverageUsage[]; knownUsage?: CoverageUsage[]; mappings: CoverageMapping[];
}) {
  const { buckets, usage, mappings } = input;
  const ledgerCoversWindow = Boolean(input.ledgerWindowStart && input.ledgerWindowEnd
    && input.ledgerWindowStart <= input.providerWindowStart && input.ledgerWindowEnd >= input.providerWindowEnd);
  const rows: CoverageRow[] = [];
  for (const bucket of buckets) {
    const base = { bucketId: bucket.id, provider: bucket.provider.trim().toLowerCase(), currency: bucket.costCurrency,
      amount: bucket.costAmount, attributionClass: "UNATTRIBUTED" as AttributionClass,
      internalCustomerExternalId: null, inDenominator: false, mappingId: null };
    if (bucket.windowStart < input.providerWindowStart || bucket.windowEnd > input.providerWindowEnd) {
      rows.push({ ...base, reason: "OUTSIDE_SELECTED_WINDOW" }); continue;
    }
    if (bucket.costBasis !== "REPORTED" || !bucket.costAmount || !bucket.costCurrency) {
      rows.push({ ...base, reason: bucket.costBasis === "ESTIMATED" ? "ESTIMATED_COST_EXCLUDED" : "COST_NOT_REPORTED" }); continue;
    }
    if (minorDecimal(bucket.costAmount) < BigInt(0) || bucket.adjustmentKind) {
      rows.push({ ...base, reason: "ADJUSTMENT_EXCLUDED" }); continue;
    }
    if (buckets.some((other) => other.id !== bucket.id && sameDimension(bucket, other)
      && overlaps(bucket.windowStart, bucket.windowEnd, other.windowStart, other.windowEnd))) {
      rows.push({ ...base, reason: "OVERLAPPING_PROVIDER_BUCKETS" }); continue;
    }
    const comparable = { ...base, inDenominator: true };
    if (!bucket.projectId) { rows.push({ ...comparable, reason: "NO_PROVIDER_PROJECT" }); continue; }
    if (!ledgerCoversWindow) { rows.push({ ...comparable, reason: "LEDGER_WINDOW_INCOMPLETE" }); continue; }
    const projectKey = providerProjectMappingKey(bucket.provider, bucket.organizationId, bucket.projectId);
    if (buckets.some((other) => other.id !== bucket.id && other.provider.toLowerCase() === bucket.provider.toLowerCase()
      && other.projectId === bucket.projectId && other.organizationId !== bucket.organizationId
      && overlaps(bucket.windowStart, bucket.windowEnd, other.windowStart, other.windowEnd))) {
      rows.push({ ...comparable, reason: "PROJECT_ACROSS_ORGANIZATIONS" }); continue;
    }
    const active = mappings.filter((mapping) => mapping.kind === "PROVIDER_PROJECT" && mapping.externalId === projectKey
      && mapping.status !== "REVOKED" && overlaps(mapping.validFrom, mapping.validUntil ?? new Date(8640000000000000), bucket.windowStart, bucket.windowEnd));
    if (active.some((mapping) => mapping.status === "CONFLICTED") || new Set(active.map((mapping) => mapping.internalCustomerExternalId)).size > 1) {
      rows.push({ ...comparable, reason: "CONFLICTING_PROJECT_MAPPING" }); continue;
    }
    const confirmed = active.filter((mapping) => mapping.status === "CONFIRMED"
      && mapping.confirmationMethod === "EXCLUSIVE_PROJECT_VERIFIED"
      && mapping.validFrom <= bucket.windowStart && (!mapping.validUntil || mapping.validUntil >= bucket.windowEnd));
    if (confirmed.length !== 1) { rows.push({ ...comparable, reason: "NO_EXCLUSIVE_PROJECT_MAPPING" }); continue; }
    const relevantUsage = usage.filter((event) => event.provider?.toLowerCase() === bucket.provider.toLowerCase() && event.providerProjectId === bucket.projectId
      && event.occurredAt >= bucket.windowStart && event.occurredAt < bucket.windowEnd);
    if (!relevantUsage.length) { rows.push({ ...comparable, reason: "NO_CORROBORATING_LEDGER_USAGE" }); continue; }
    const knownProjectUsage = (input.knownUsage ?? usage).filter((event) => event.provider?.toLowerCase() === bucket.provider.toLowerCase()
      && event.providerProjectId === bucket.projectId && event.occurredAt >= bucket.windowStart && event.occurredAt < bucket.windowEnd);
    if (knownProjectUsage.some((event) => !event.internalCustomerExternalId || event.internalCustomerExternalId !== confirmed[0].internalCustomerExternalId)) {
      rows.push({ ...comparable, reason: "SHARED_OR_UNATTRIBUTED_PROJECT" }); continue;
    }
    rows.push({ ...comparable, attributionClass: "STRONG", internalCustomerExternalId: confirmed[0].internalCustomerExternalId,
      mappingId: confirmed[0].id, reason: "EXCLUSIVE_PROJECT_WITH_LEDGER_EVIDENCE" });
  }
  const groupKeys = new Set(rows.filter((row) => row.inDenominator && row.currency).map((row) => `${row.provider}\u0000${row.currency}`));
  const groups: CoverageGroup[] = [...groupKeys].sort().map((key) => {
    const [provider, currency] = key.split("\u0000");
    const eligible = rows.filter((row) => row.inDenominator && row.provider === provider && row.currency === currency);
    const attributed = eligible.filter((row) => row.attributionClass === "STRONG");
    const denominator = eligible.reduce((sum, row) => sum + minorDecimal(row.amount ?? "0"), BigInt(0));
    const numerator = attributed.reduce((sum, row) => sum + minorDecimal(row.amount ?? "0"), BigInt(0));
    return { provider, currency, reportedComparableCost: decimalString(denominator), attributedCost: decimalString(numerator),
      unattributedCost: decimalString(denominator - numerator), coverageBps: denominator > BigInt(0) ? Number(numerator * BigInt(10000) / denominator) : null,
      denominatorBucketIds: eligible.map((row) => row.bucketId), attributedBucketIds: attributed.map((row) => row.bucketId) };
  });
  return { scope: { providerWindowStart: input.providerWindowStart.toISOString(), providerWindowEnd: input.providerWindowEnd.toISOString(),
    ledgerCoversWindow, denominator: "Non-overlapping, non-adjustment, nonnegative reported provider cost in each provider/currency group; selected provider batch only" },
    groups, rows, classAvailability: { EXACT: false, STRONG: true, MAPPED: false, ESTIMATED: false, UNATTRIBUTED: true } };
}
