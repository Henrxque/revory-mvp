export type CsvInferredFieldType =
  | "date-like"
  | "money-like"
  | "email-like"
  | "phone-like"
  | "status-like"
  | "text";

export const csvCanonicalFields = [
  "appointmentExternalId",
  "clientExternalId",
  "clientName",
  "clientEmail",
  "clientPhone",
  "appointmentStatus",
  "scheduledAt",
  "bookedAt",
  "canceledAt",
  "completedAt",
  "providerName",
  "serviceName",
  "estimatedRevenue",
  "sourceName",
  "lastVisitAt",
  "totalVisits",
  "tags",
  "notes",
  "leadExternalId",
  "leadCreatedAt",
  "leadStatus",
  "bookingPath",
  "blockingReason",
  "paymentExternalId",
  "paymentAmount",
  "paymentDate",
  "paymentStatus",
] as const;

export type CsvCanonicalField = (typeof csvCanonicalFields)[number];

export type CsvColumnProfile = {
  header: string;
  inferredType: CsvInferredFieldType;
  nonEmptyCount: number;
  sampleValues: string[];
};

export type CsvColumnMappingSuggestion = {
  confidence: number;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
  inferredType: CsvInferredFieldType;
  reason:
    | "EXACT_CANONICAL"
    | "EXACT_ALIAS"
    | "INCLUSIVE_ALIAS"
    | "SHARED_TOKENS"
    | "UNMAPPED";
  sourceHeader: string;
  targetField: CsvCanonicalField | null;
};

const STATUS_VALUES = new Set([
  "scheduled",
  "completed",
  "complete",
  "canceled",
  "cancelled",
  "no show",
  "no_show",
  "noshow",
  "booked",
  "open",
  "closed",
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "pending",
  "paid",
  "refunded",
  "failed",
]);

const FIELD_ALIASES: Record<CsvCanonicalField, readonly string[]> = {
  appointmentExternalId: [
    "appointment id",
    "appointment external id",
    "appt id",
    "booking id",
    "visit id",
  ],
  clientExternalId: [
    "client id",
    "client external id",
    "patient id",
    "customer id",
    "contact id",
  ],
  clientName: [
    "client full name",
    "client name",
    "patient name",
    "customer name",
    "full name",
    "name",
  ],
  clientEmail: [
    "client email",
    "patient email",
    "customer email",
    "email address",
    "email",
  ],
  clientPhone: [
    "client phone",
    "patient phone",
    "customer phone",
    "phone number",
    "mobile phone",
    "mobile",
    "phone",
  ],
  appointmentStatus: [
    "appointment status",
    "appt status",
    "booking status",
    "appointment state",
    "visit status",
    "status",
  ],
  scheduledAt: [
    "appt date",
    "appointment date",
    "appointment datetime",
    "appointment time",
    "scheduled at",
    "scheduled date",
    "scheduled for",
    "scheduled time",
    "visit date",
    "start time",
    "start",
  ],
  bookedAt: [
    "booked at",
    "booked date",
    "booking date",
    "date booked",
    "created at",
  ],
  canceledAt: [
    "canceled at",
    "cancelled at",
    "canceled date",
    "cancelled date",
    "cancel date",
  ],
  completedAt: [
    "completed at",
    "completion date",
    "completed date",
    "visit completed at",
  ],
  providerName: [
    "provider name",
    "provider",
    "doctor",
    "specialist",
    "therapist",
    "staff",
  ],
  serviceName: [
    "service name",
    "service",
    "treatment",
    "procedure",
    "appointment type",
    "service type",
  ],
  estimatedRevenue: [
    "estimated revenue",
    "estimated value",
    "service value",
    "appointment value",
    "revenue",
    "amount",
    "price",
    "value",
  ],
  sourceName: [
    "source name",
    "lead source",
    "booking source",
    "campaign source",
    "source",
    "channel",
  ],
  lastVisitAt: [
    "last visit at",
    "last visit",
    "last visit date",
    "latest visit",
    "last seen at",
  ],
  totalVisits: [
    "total visits",
    "visit count",
    "number of visits",
    "visit total",
    "visits",
  ],
  tags: ["tags", "labels", "segments", "categories"],
  notes: ["notes", "note", "comments", "comment", "remarks", "internal notes"],
  leadExternalId: [
    "lead external id",
    "lead id",
    "inquiry id",
    "prospect id",
  ],
  leadCreatedAt: [
    "lead created at",
    "lead date",
    "inquiry date",
    "created date",
    "submitted at",
  ],
  leadStatus: [
    "lead status",
    "inquiry status",
    "prospect status",
    "pipeline status",
  ],
  bookingPath: [
    "booking path",
    "booking link",
    "booking url",
    "booking channel",
    "preferred booking path",
  ],
  blockingReason: [
    "blocking reason",
    "blocked reason",
    "booking blocker",
    "failure reason",
    "not booked reason",
  ],
  paymentExternalId: [
    "payment external id",
    "payment id",
    "transaction id",
    "invoice id",
    "charge id",
  ],
  paymentAmount: [
    "payment amount",
    "transaction amount",
    "amount paid",
    "paid amount",
    "charge amount",
  ],
  paymentDate: [
    "payment date",
    "paid at",
    "transaction date",
    "charge date",
  ],
  paymentStatus: [
    "payment status",
    "transaction status",
    "invoice status",
    "charge status",
  ],
};

const EXPECTED_FIELD_TYPES: Partial<Record<CsvCanonicalField, CsvInferredFieldType>> = {
  appointmentStatus: "status-like",
  bookedAt: "date-like",
  canceledAt: "date-like",
  clientEmail: "email-like",
  clientPhone: "phone-like",
  completedAt: "date-like",
  estimatedRevenue: "money-like",
  lastVisitAt: "date-like",
  leadCreatedAt: "date-like",
  leadStatus: "status-like",
  paymentAmount: "money-like",
  paymentDate: "date-like",
  paymentStatus: "status-like",
  scheduledAt: "date-like",
};

function normalizeLabel(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLabel(value: string) {
  return normalizeLabel(value).replaceAll(" ", "");
}

function getTokens(value: string) {
  return new Set(normalizeLabel(value).split(" ").filter((token) => token.length > 1));
}

function isDateLike(value: string) {
  const normalized = value.trim();

  if (!normalized || !/[\d]/.test(normalized)) {
    return false;
  }

  const hasDateShape =
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(normalized) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(normalized) ||
    /^\d{4}-\d{2}-\d{2}T/.test(normalized);

  return hasDateShape && !Number.isNaN(new Date(normalized).getTime());
}

function isMoneyLike(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return false;
  }

  const hasCurrencyMarker = /[$€£¥]/.test(normalized) || /\b(?:usd|eur|gbp|brl)\b/i.test(normalized);
  const numericValue = normalized
    .replace(/\b(?:usd|eur|gbp|brl)\b/gi, "")
    .replace(/[$€£¥\s,]/g, "");

  return hasCurrencyMarker && /^-?\d+(?:\.\d{1,2})?$/.test(numericValue);
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhoneLike(value: string) {
  const normalized = value.trim();
  const digits = normalized.replace(/\D/g, "");

  return digits.length >= 7 && digits.length <= 15 && /^[+\d().\s-]+$/.test(normalized);
}

function isStatusLike(value: string) {
  return STATUS_VALUES.has(normalizeLabel(value));
}

function inferByRatio(
  values: readonly string[],
  predicate: (value: string) => boolean,
) {
  const nonEmptyValues = values.filter((value) => value.trim().length > 0);

  if (nonEmptyValues.length === 0) {
    return 0;
  }

  return nonEmptyValues.filter(predicate).length / nonEmptyValues.length;
}

export function inferCsvFieldType(
  header: string,
  values: readonly string[],
): CsvInferredFieldType {
  const normalizedHeader = normalizeLabel(header);
  const headerSuggestsMoney = /\b(amount|price|revenue|value|cost|payment|charge)\b/.test(
    normalizedHeader,
  );
  const headerSuggestsPhone = /\b(phone|mobile|cell|telephone)\b/.test(normalizedHeader);
  const headerSuggestsDate = /\b(date|time|at|scheduled|booked|canceled|cancelled|completed)\b/.test(
    normalizedHeader,
  );
  const headerSuggestsStatus = /\b(status|state|stage)\b/.test(normalizedHeader);

  if (inferByRatio(values, isEmailLike) >= 0.6) {
    return "email-like";
  }

  if (inferByRatio(values, isDateLike) >= 0.6 || (headerSuggestsDate && values.length === 0)) {
    return "date-like";
  }

  if (
    inferByRatio(values, isPhoneLike) >= 0.6 &&
    (headerSuggestsPhone || !headerSuggestsMoney)
  ) {
    return "phone-like";
  }

  if (
    inferByRatio(values, isMoneyLike) >= 0.5 ||
    (headerSuggestsMoney &&
      inferByRatio(values, (value) =>
        /^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim().replace(/,/g, "")),
      ) >= 0.6)
  ) {
    return "money-like";
  }

  if (
    inferByRatio(values, isStatusLike) >= 0.5 ||
    (headerSuggestsStatus && values.length === 0)
  ) {
    return "status-like";
  }

  return "text";
}

export function buildCsvColumnProfiles(
  headers: readonly string[],
  sampleRows: readonly Readonly<Record<string, string>>[],
): CsvColumnProfile[] {
  return headers.map((header) => {
    const values = sampleRows
      .map((row) => row[header] ?? "")
      .filter((value) => value.trim().length > 0);

    return {
      header,
      inferredType: inferCsvFieldType(header, values),
      nonEmptyCount: values.length,
      sampleValues: values.slice(0, 5),
    };
  });
}

type MappingCandidate = Omit<
  CsvColumnMappingSuggestion,
  "confidenceLabel" | "targetField"
> & {
  targetField: CsvCanonicalField;
};

function getConfidenceLabel(confidence: number): CsvColumnMappingSuggestion["confidenceLabel"] {
  if (confidence >= 0.9) {
    return "HIGH";
  }

  if (confidence >= 0.65) {
    return "MEDIUM";
  }

  return "LOW";
}

function scoreFieldCandidate(profile: CsvColumnProfile, targetField: CsvCanonicalField) {
  const normalizedHeader = normalizeLabel(profile.header);
  const compactHeader = compactLabel(profile.header);
  const canonicalLabel = normalizeLabel(targetField);
  const aliases = FIELD_ALIASES[targetField];
  const expectedType = EXPECTED_FIELD_TYPES[targetField];
  const typeBonus = expectedType === profile.inferredType ? 0.03 : 0;

  if (
    normalizedHeader === canonicalLabel ||
    compactHeader === compactLabel(targetField)
  ) {
    return {
      confidence: 1,
      inferredType: profile.inferredType,
      reason: "EXACT_CANONICAL" as const,
      sourceHeader: profile.header,
      targetField,
    };
  }

  const exactAlias = aliases.some(
    (alias) =>
      normalizeLabel(alias) === normalizedHeader ||
      compactLabel(alias) === compactHeader,
  );

  if (exactAlias) {
    return {
      confidence: Math.min(0.99, 0.94 + typeBonus),
      inferredType: profile.inferredType,
      reason: "EXACT_ALIAS" as const,
      sourceHeader: profile.header,
      targetField,
    };
  }

  const inclusiveAlias = aliases.find((alias) => {
    const normalizedAlias = normalizeLabel(alias);

    return (
      normalizedAlias.length >= 4 &&
      (normalizedHeader.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedHeader))
    );
  });

  if (inclusiveAlias) {
    return {
      confidence: Math.min(0.84, 0.72 + typeBonus),
      inferredType: profile.inferredType,
      reason: "INCLUSIVE_ALIAS" as const,
      sourceHeader: profile.header,
      targetField,
    };
  }

  const headerTokens = getTokens(profile.header);
  const targetTokens = new Set([
    ...getTokens(targetField),
    ...aliases.flatMap((alias) => [...getTokens(alias)]),
  ]);
  const sharedTokenCount = [...headerTokens].filter((token) =>
    targetTokens.has(token),
  ).length;

  if (sharedTokenCount > 0) {
    return {
      confidence: Math.min(0.64, 0.42 + sharedTokenCount * 0.08 + typeBonus),
      inferredType: profile.inferredType,
      reason: "SHARED_TOKENS" as const,
      sourceHeader: profile.header,
      targetField,
    };
  }

  return null;
}

export function suggestDeterministicCsvColumnMappings(
  profiles: readonly CsvColumnProfile[],
): CsvColumnMappingSuggestion[] {
  const candidates: MappingCandidate[] = [];
  const targetFields = Object.keys(FIELD_ALIASES) as CsvCanonicalField[];

  profiles.forEach((profile) => {
    targetFields.forEach((targetField) => {
      const candidate = scoreFieldCandidate(profile, targetField);

      if (candidate) {
        candidates.push(candidate);
      }
    });
  });

  candidates.sort((left, right) => right.confidence - left.confidence);

  const assignedHeaders = new Set<string>();
  const assignedTargets = new Set<CsvCanonicalField>();
  const selected = new Map<string, CsvColumnMappingSuggestion>();

  candidates.forEach((candidate) => {
    if (
      candidate.confidence < 0.5 ||
      assignedHeaders.has(candidate.sourceHeader) ||
      assignedTargets.has(candidate.targetField)
    ) {
      return;
    }

    selected.set(candidate.sourceHeader, {
      ...candidate,
      confidenceLabel: getConfidenceLabel(candidate.confidence),
    });
    assignedHeaders.add(candidate.sourceHeader);
    assignedTargets.add(candidate.targetField);
  });

  return profiles.map(
    (profile) =>
      selected.get(profile.header) ?? {
        confidence: 0,
        confidenceLabel: "LOW",
        inferredType: profile.inferredType,
        reason: "UNMAPPED",
        sourceHeader: profile.header,
        targetField: null,
      },
  );
}

export function calculateCsvMappingConfidence(
  suggestions: readonly CsvColumnMappingSuggestion[],
) {
  if (suggestions.length === 0) {
    return 0;
  }

  const weightedTotal = suggestions.reduce(
    (total, suggestion) => total + suggestion.confidence,
    0,
  );

  return Math.round((weightedTotal / suggestions.length) * 100);
}
