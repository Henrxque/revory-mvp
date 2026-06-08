import type {
  CsvCanonicalField,
  CsvColumnMappingSuggestion,
} from "@/services/imports/csv-column-mapping";

export type CsvDatasetType =
  | "APPOINTMENTS"
  | "CLIENTS"
  | "LEADS"
  | "PAYMENTS_UNSUPPORTED"
  | "UNKNOWN";

export type CsvDatasetClassification = {
  confidence: number;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
  datasetType: CsvDatasetType;
  reasons: string[];
  scores: Record<CsvDatasetType, number>;
};

type DatasetRule = {
  headerTerms: readonly string[];
  strongFields: readonly CsvCanonicalField[];
  supportingFields: readonly CsvCanonicalField[];
};

const DATASET_RULES: Record<Exclude<CsvDatasetType, "UNKNOWN">, DatasetRule> = {
  APPOINTMENTS: {
    headerTerms: [
      "appointment",
      "appt",
      "booking",
      "scheduled",
      "visit date",
      "no show",
      "provider",
      "service",
    ],
    strongFields: ["scheduledAt", "appointmentStatus"],
    supportingFields: [
      "appointmentExternalId",
      "clientName",
      "providerName",
      "serviceName",
      "estimatedRevenue",
      "bookedAt",
      "canceledAt",
    ],
  },
  CLIENTS: {
    headerTerms: [
      "client",
      "patient",
      "customer",
      "last visit",
      "total visits",
      "contact",
    ],
    strongFields: ["clientName"],
    supportingFields: [
      "clientExternalId",
      "clientEmail",
      "clientPhone",
      "lastVisitAt",
      "totalVisits",
      "tags",
    ],
  },
  LEADS: {
    headerTerms: [
      "lead",
      "inquiry",
      "prospect",
      "booking path",
      "blocking reason",
      "not booked",
      "campaign",
    ],
    strongFields: ["leadExternalId", "leadCreatedAt", "leadStatus"],
    supportingFields: [
      "clientName",
      "clientEmail",
      "clientPhone",
      "sourceName",
      "bookingPath",
      "blockingReason",
    ],
  },
  PAYMENTS_UNSUPPORTED: {
    headerTerms: [
      "payment",
      "transaction",
      "invoice",
      "charge",
      "paid amount",
      "refund",
    ],
    strongFields: ["paymentExternalId", "paymentAmount", "paymentDate"],
    supportingFields: ["paymentStatus", "clientExternalId", "clientName"],
  },
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function confidenceLabel(confidence: number): CsvDatasetClassification["confidenceLabel"] {
  if (confidence >= 80) {
    return "HIGH";
  }

  if (confidence >= 55) {
    return "MEDIUM";
  }

  return "LOW";
}

export function classifyCsvDatasetType(input: {
  headers: readonly string[];
  mappingSuggestions: readonly CsvColumnMappingSuggestion[];
}): CsvDatasetClassification {
  const normalizedHeaders = input.headers.map(normalize);
  const mappedFields = new Set(
    input.mappingSuggestions
      .filter((suggestion) => suggestion.confidence >= 0.5)
      .map((suggestion) => suggestion.targetField)
      .filter((field): field is CsvCanonicalField => field !== null),
  );
  const scores = {
    APPOINTMENTS: 0,
    CLIENTS: 0,
    LEADS: 0,
    PAYMENTS_UNSUPPORTED: 0,
    UNKNOWN: 0,
  } satisfies Record<CsvDatasetType, number>;
  const reasonsByType = new Map<CsvDatasetType, string[]>();

  (Object.entries(DATASET_RULES) as Array<
    [Exclude<CsvDatasetType, "UNKNOWN">, DatasetRule]
  >).forEach(([datasetType, rule]) => {
    const reasons: string[] = [];
    const matchedStrongFields = rule.strongFields.filter((field) =>
      mappedFields.has(field),
    );
    const matchedSupportingFields = rule.supportingFields.filter((field) =>
      mappedFields.has(field),
    );
    const matchedHeaderTerms = rule.headerTerms.filter((term) =>
      normalizedHeaders.some((header) => header.includes(term)),
    );

    scores[datasetType] =
      matchedStrongFields.length * 30 +
      matchedSupportingFields.length * 8 +
      Math.min(matchedHeaderTerms.length, 4) * 6;

    if (matchedStrongFields.length > 0) {
      reasons.push(`Strong fields: ${matchedStrongFields.join(", ")}.`);
    }

    if (matchedSupportingFields.length > 0) {
      reasons.push(`Supporting fields: ${matchedSupportingFields.join(", ")}.`);
    }

    if (matchedHeaderTerms.length > 0) {
      reasons.push(`Header signals: ${matchedHeaderTerms.slice(0, 4).join(", ")}.`);
    }

    reasonsByType.set(datasetType, reasons);
  });

  const ranked = (Object.keys(DATASET_RULES) as Array<
    Exclude<CsvDatasetType, "UNKNOWN">
  >).sort((left, right) => scores[right] - scores[left]);
  const bestType = ranked[0];
  const bestScore = scores[bestType];
  const secondScore = scores[ranked[1]];
  const scoreGap = Math.max(0, bestScore - secondScore);

  if (bestScore < 30 || scoreGap < 8) {
    return {
      confidence: Math.min(49, bestScore),
      confidenceLabel: "LOW",
      datasetType: "UNKNOWN",
      reasons:
        bestScore < 30
          ? ["The file does not expose enough deterministic dataset signals."]
          : ["The file matches more than one dataset type and needs review."],
      scores,
    };
  }

  const confidence = Math.min(100, Math.round(bestScore * 0.75 + scoreGap * 0.8));

  return {
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    datasetType: bestType,
    reasons: reasonsByType.get(bestType) ?? [],
    scores,
  };
}

