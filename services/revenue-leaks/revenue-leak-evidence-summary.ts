import type { Prisma } from "@prisma/client";

export type RevenueLeakEvidenceSummary = {
  confidenceReason: string | null;
  signals: string[];
  sourceRecordIds: string[];
  summary: string;
  valueSummary: string | null;
};

const DEFAULT_EVIDENCE_SUMMARY =
  "Evidence is available from imported clinic data, but the stored details are limited.";

export function buildRevenueLeakEvidenceSummary(
  evidenceJson: Prisma.JsonValue,
): RevenueLeakEvidenceSummary {
  if (!isRecord(evidenceJson)) {
    return {
      confidenceReason: null,
      signals: [],
      sourceRecordIds: [],
      summary: DEFAULT_EVIDENCE_SUMMARY,
      valueSummary: null,
    };
  }

  return {
    confidenceReason: readString(evidenceJson.confidenceReason),
    signals: readStringArray(evidenceJson.signals).slice(0, 5),
    sourceRecordIds: readStringArray(evidenceJson.sourceRecordIds).slice(0, 5),
    summary: readString(evidenceJson.summary) ?? DEFAULT_EVIDENCE_SUMMARY,
    valueSummary: buildValueSummary(evidenceJson.value),
  };
}

function buildValueSummary(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === "boolean") {
    return value ? "Value evidence present" : "No value evidence";
  }

  if (Array.isArray(value)) {
    const values = value
      .map((entry) => readPrimitiveDisplay(entry))
      .filter((entry): entry is string => Boolean(entry));

    return values.length > 0 ? values.slice(0, 3).join(", ") : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidateEntries = [
    ["basis", value.basis],
    ["source", value.source],
    ["estimated value", value.estimatedValueCents],
    ["appointment value", value.appointmentEstimatedRevenueCents],
    ["average deal value", value.averageDealValueCents],
  ]
    .map(([label, entry]) => {
      const display = readPrimitiveDisplay(entry);

      return display ? `${label}: ${display}` : null;
    })
    .filter((entry): entry is string => Boolean(entry));

  return candidateEntries.length > 0 ? candidateEntries.slice(0, 3).join("; ") : null;
}

function readPrimitiveDisplay(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
