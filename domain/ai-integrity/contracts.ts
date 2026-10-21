import { createHash } from "node:crypto";

export type AiIntegritySourceKind = "STRIPE_REVENUE" | "INTERNAL_LEDGER" | "PROVIDER_REPORT";
export type AiIntegrityCostBasis = "REPORTED" | "ESTIMATED" | "UNAVAILABLE";

type SourceRow = {
  workspaceId: string;
  externalId: string;
  sourceVersion?: string | null;
  sourceRowNumber: number;
  sourcePayload: Record<string, unknown>;
  provenance: Record<string, unknown>;
};

export type AiRevenueInput = SourceRow & {
  eventKind: string;
  status: string;
  stripeCustomerExternalId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentId?: string | null;
  parentExternalId?: string | null;
  amountMinor?: string | null;
  currency?: string | null;
  currencyExponent?: number | null;
  occurredAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type AiUsageInput = SourceRow & {
  internalCustomerExternalId?: string | null;
  provider?: string | null;
  providerRequestId?: string | null;
  providerProjectId?: string | null;
  model?: string | null;
  quantity: string;
  unit: string;
  creditsDelta?: string | null;
  occurredAt: string;
};

export type AiProviderBucketInput = SourceRow & {
  provider: string;
  organizationId?: string | null;
  projectId?: string | null;
  model?: string | null;
  usageQuantity?: string | null;
  usageUnit?: string | null;
  costAmount?: string | null;
  costCurrency?: string | null;
  costBasis: AiIntegrityCostBasis;
  pricingVersion?: string | null;
  adjustmentKind?: string | null;
  windowStart: string;
  windowEnd: string;
  reportedAt?: string | null;
};

export type AiIntegrityBatchInput = {
  workspaceId: string;
  sourceSystem: string;
  fileName: string;
  fileSha256: string;
  mappingSha256: string;
  windowStart: string;
  windowEnd: string;
  sourceTimezone: string;
  dataQuality: Record<string, unknown>;
} & (
  | { sourceKind: "STRIPE_REVENUE"; records: AiRevenueInput[] }
  | { sourceKind: "INTERNAL_LEDGER"; records: AiUsageInput[] }
  | { sourceKind: "PROVIDER_REPORT"; records: AiProviderBucketInput[] }
);

export type PreparedAiIntegrityBatch = AiIntegrityBatchInput & {
  idempotencyKey: string;
  recordHashes: string[];
  normalizedWindowStart: Date;
  normalizedWindowEnd: Date;
};

const SHA256 = /^[a-f0-9]{64}$/i;
const UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;
const MAX_ROWS = 25_000;
const MAX_I64 = BigInt("9223372036854775807");

function required(value: string, name: string) {
  if (!value || !value.trim()) throw new Error(`${name} is required.`);
  return value.trim();
}

function date(value: string, name: string) {
  if (!UTC_OFFSET.test(value)) throw new Error(`${name} must include an explicit timezone offset.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`${name} is invalid.`);
  return parsed;
}

function optionalDate(value: string | null | undefined, name: string) {
  return value ? date(value, name) : null;
}

function period(start: string, end: string, name: string) {
  const from = date(start, `${name}.start`);
  const to = date(end, `${name}.end`);
  if (from >= to) throw new Error(`${name} must be a non-empty half-open interval.`);
  return [from, to] as const;
}

function decimal(value: string, scale: number, name: string) {
  if (!new RegExp(`^-?\\d{1,18}(?:\\.\\d{1,${scale}})?$`).test(value)) {
    throw new Error(`${name} must be a decimal with at most ${scale} fractional digits.`);
  }
}

function currency(value: string | null | undefined, name: string) {
  if (value != null && !/^[A-Z]{3}$/.test(value)) throw new Error(`${name} must be an uppercase ISO currency code.`);
}

export function canonicalAiJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalAiJson).join(",")}]`;
  if (typeof value === "object" && value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalAiJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error("Source payload must contain only JSON values.");
}

const canonical = canonicalAiJson;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function prepareAiIntegrityBatch(input: AiIntegrityBatchInput): PreparedAiIntegrityBatch {
  required(input.workspaceId, "workspaceId");
  if (input.workspaceId !== input.workspaceId.trim()) throw new Error("workspaceId must be canonical.");
  if (!["STRIPE_REVENUE", "INTERNAL_LEDGER", "PROVIDER_REPORT"].includes(input.sourceKind)) throw new Error("Unsupported source kind.");
  required(input.sourceSystem, "sourceSystem");
  required(input.fileName, "fileName");
  required(input.sourceTimezone, "sourceTimezone");
  if (!SHA256.test(input.fileSha256) || !SHA256.test(input.mappingSha256)) throw new Error("File and mapping SHA-256 hashes are required.");
  const [normalizedWindowStart, normalizedWindowEnd] = period(input.windowStart, input.windowEnd, "batchWindow");
  if (!input.records.length || input.records.length > MAX_ROWS) throw new Error(`Batch must contain 1–${MAX_ROWS} rows.`);
  canonical(input.dataQuality);

  const ids = new Set<string>();
  const recordHashes = input.records.map((record) => {
    if (record.workspaceId !== input.workspaceId) throw new Error("Cross-workspace row rejected.");
    const externalId = required(record.externalId, "externalId");
    if (ids.has(externalId)) throw new Error(`Duplicate external ID in batch: ${externalId}`);
    ids.add(externalId);
    if (!Number.isSafeInteger(record.sourceRowNumber) || record.sourceRowNumber < 1) throw new Error("sourceRowNumber must be positive.");
    canonical(record.sourcePayload);
    canonical(record.provenance);

    if (input.sourceKind === "STRIPE_REVENUE") {
      const revenue = record as AiRevenueInput;
      required(revenue.eventKind, "eventKind");
      required(revenue.status, "status");
      date(revenue.occurredAt, "occurredAt");
      const from = optionalDate(revenue.periodStart, "periodStart");
      const to = optionalDate(revenue.periodEnd, "periodEnd");
      if (from && to && from >= to) throw new Error("Revenue period is invalid.");
      if (revenue.amountMinor != null) {
        if (!/^-?\d+$/.test(revenue.amountMinor) || BigInt(revenue.amountMinor) > MAX_I64 || BigInt(revenue.amountMinor) < -MAX_I64 - BigInt(1)) throw new Error("amountMinor must fit signed 64-bit integer.");
        if (!revenue.currency || revenue.currencyExponent == null) throw new Error("Revenue amount needs currency and exponent.");
      }
      currency(revenue.currency, "currency");
      if (revenue.currencyExponent != null && (!Number.isInteger(revenue.currencyExponent) || revenue.currencyExponent < 0 || revenue.currencyExponent > 6)) throw new Error("currencyExponent is invalid.");
    } else if (input.sourceKind === "INTERNAL_LEDGER") {
      const usage = record as AiUsageInput;
      decimal(usage.quantity, 9, "quantity");
      if (usage.creditsDelta != null) decimal(usage.creditsDelta, 9, "creditsDelta");
      required(usage.unit, "unit");
      date(usage.occurredAt, "occurredAt");
    } else {
      const bucket = record as AiProviderBucketInput;
      required(bucket.provider, "provider");
      period(bucket.windowStart, bucket.windowEnd, "providerWindow");
      if (bucket.usageQuantity != null) {
        decimal(bucket.usageQuantity, 9, "usageQuantity");
        required(bucket.usageUnit ?? "", "usageUnit");
      }
      if (bucket.costAmount != null) {
        decimal(bucket.costAmount, 12, "costAmount");
        if (!bucket.costCurrency) throw new Error("Provider cost needs currency.");
      }
      currency(bucket.costCurrency, "costCurrency");
      if (!["REPORTED", "ESTIMATED", "UNAVAILABLE"].includes(bucket.costBasis)) throw new Error("Unsupported provider cost basis.");
      if (bucket.costBasis === "UNAVAILABLE" && bucket.costAmount != null) throw new Error("Unavailable provider cost cannot have an amount.");
      if (bucket.costBasis !== "UNAVAILABLE" && bucket.costAmount == null) throw new Error("Reported or estimated provider cost needs an amount.");
      optionalDate(bucket.reportedAt, "reportedAt");
    }
    const semanticRecord = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "sourceRowNumber" && key !== "provenance"));
    semanticRecord.externalId = externalId;
    return hash(canonical(semanticRecord));
  });
  const idempotencyKey = hash(canonical({
    workspaceId: input.workspaceId,
    sourceKind: input.sourceKind,
    sourceSystem: input.sourceSystem.trim(),
    fileSha256: input.fileSha256.toLowerCase(),
    mappingSha256: input.mappingSha256.toLowerCase(),
    windowStart: normalizedWindowStart.toISOString(),
    windowEnd: normalizedWindowEnd.toISOString(),
    sourceTimezone: input.sourceTimezone.trim(),
    recordHashes: [...recordHashes].sort(),
  }));
  return { ...input, idempotencyKey, recordHashes, normalizedWindowStart, normalizedWindowEnd };
}
