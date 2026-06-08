import type { RevenueLeakType } from "@prisma/client";

import type {
  CsvCanonicalField,
  CsvColumnMappingSuggestion,
  CsvColumnProfile,
} from "@/services/imports/csv-column-mapping";
import type {
  CsvDatasetClassification,
  CsvDatasetType,
} from "@/services/imports/csv-dataset-type";

export type CsvDataQualityState =
  | "READY"
  | "REVIEW_REQUIRED"
  | "BLOCKED"
  | "UNSUPPORTED";

export type CsvSupportedLeakPreview = {
  leakType: RevenueLeakType;
  missingFields: CsvCanonicalField[];
  supportLevel: "SUPPORTED" | "SUPPORTED_WITH_LOWER_CONFIDENCE" | "NOT_SUPPORTED";
  summary: string;
};

export type CsvDataQualityCheck = {
  datasetType: CsvDatasetType;
  importSupported: boolean;
  mappingConfidence: number;
  missingFields: CsvCanonicalField[];
  qualityScore: number;
  state: CsvDataQualityState;
  supportedLeakPreview: CsvSupportedLeakPreview[];
  warnings: string[];
};

const REQUIRED_FIELDS: Record<CsvDatasetType, readonly CsvCanonicalField[]> = {
  APPOINTMENTS: [
    "appointmentExternalId",
    "clientName",
    "scheduledAt",
    "appointmentStatus",
  ],
  CLIENTS: ["clientName"],
  LEADS: ["clientName"],
  PAYMENTS_UNSUPPORTED: [],
  UNKNOWN: [],
};

const IDENTITY_FIELDS: Partial<Record<CsvDatasetType, readonly CsvCanonicalField[]>> = {
  APPOINTMENTS: ["clientExternalId", "clientEmail", "clientPhone"],
  CLIENTS: ["clientExternalId", "clientEmail", "clientPhone"],
  LEADS: ["leadExternalId", "clientEmail", "clientPhone"],
};

function mappedFieldSet(suggestions: readonly CsvColumnMappingSuggestion[]) {
  return new Set(
    suggestions
      .filter((suggestion) => suggestion.targetField && suggestion.confidence >= 0.5)
      .map((suggestion) => suggestion.targetField)
      .filter((field): field is CsvCanonicalField => field !== null),
  );
}

function getMissingFields(
  datasetType: CsvDatasetType,
  mappedFields: ReadonlySet<CsvCanonicalField>,
) {
  const missingRequired = REQUIRED_FIELDS[datasetType].filter(
    (field) => !mappedFields.has(field),
  );
  const identityFields = IDENTITY_FIELDS[datasetType] ?? [];
  const hasIdentity =
    identityFields.length === 0 ||
    identityFields.some((field) => mappedFields.has(field));

  return hasIdentity
    ? missingRequired
    : [...missingRequired, ...identityFields];
}

function buildLeakPreview(
  datasetType: CsvDatasetType,
  mappedFields: ReadonlySet<CsvCanonicalField>,
): CsvSupportedLeakPreview[] {
  const appointmentCore: CsvCanonicalField[] = [
    "scheduledAt",
    "appointmentStatus",
    "clientName",
  ];
  const identityOptions: CsvCanonicalField[] = [
    "clientExternalId",
    "clientEmail",
    "clientPhone",
  ];
  const missingAppointmentCore = appointmentCore.filter(
    (field) => !mappedFields.has(field),
  );
  const hasIdentity = identityOptions.some((field) => mappedFields.has(field));
  const missingIdentity = hasIdentity ? [] : identityOptions;
  const appointmentMissing = [...missingAppointmentCore, ...missingIdentity];
  const hasEstimatedRevenue = mappedFields.has("estimatedRevenue");

  if (datasetType === "APPOINTMENTS") {
    return [
      {
        leakType: "NO_SHOW_REVENUE",
        missingFields: appointmentMissing,
        supportLevel:
          appointmentMissing.length > 0
            ? "NOT_SUPPORTED"
            : hasEstimatedRevenue
              ? "SUPPORTED"
              : "SUPPORTED_WITH_LOWER_CONFIDENCE",
        summary:
          appointmentMissing.length > 0
            ? "No-show revenue risk needs appointment status, schedule, client evidence and an identity path."
            : hasEstimatedRevenue
              ? "No-show revenue risk can use direct appointment value."
              : "No-show risk can be detected, but financial confidence may rely on workspace average value.",
      },
      {
        leakType: "CANCELED_NOT_RECOVERED",
        missingFields: appointmentMissing,
        supportLevel:
          appointmentMissing.length > 0
            ? "NOT_SUPPORTED"
            : hasEstimatedRevenue
              ? "SUPPORTED"
              : "SUPPORTED_WITH_LOWER_CONFIDENCE",
        summary:
          appointmentMissing.length > 0
            ? "Unrecovered cancellation risk needs appointment status, schedule, client evidence and an identity path."
            : hasEstimatedRevenue
              ? "Cancellation risk can use direct appointment value and future appointment evidence."
              : "Cancellation risk can be detected, but financial confidence may rely on workspace average value.",
      },
      {
        leakType: "STALE_BOOKED_PROOF",
        missingFields: [],
        supportLevel: "SUPPORTED",
        summary:
          "Once imported, appointment source freshness can support a stale-data quality signal.",
      },
    ];
  }

  if (datasetType === "LEADS") {
    const missingContactFields = ["clientName"] satisfies CsvCanonicalField[];
    const bookingPathFields = [
      "clientName",
      "bookingPath",
      "blockingReason",
    ] satisfies CsvCanonicalField[];
    const missingContact = missingContactFields.filter(
      (field) => !mappedFields.has(field),
    );
    const missingBookingPath = bookingPathFields.filter(
      (field) => !mappedFields.has(field),
    );

    return [
      {
        leakType: "MISSING_CONTACT",
        missingFields: missingContact,
        supportLevel:
          missingContact.length === 0
            ? "SUPPORTED_WITH_LOWER_CONFIDENCE"
            : "NOT_SUPPORTED",
        summary:
          "Lead-shaped files can preview missing-contact risk, but lead import is not available in this version.",
      },
      {
        leakType: "BOOKING_PATH_BLOCKED",
        missingFields: missingBookingPath,
        supportLevel:
          missingBookingPath.length === 0
            ? "SUPPORTED_WITH_LOWER_CONFIDENCE"
            : "NOT_SUPPORTED",
        summary:
          "Lead-shaped files can preview booking-path risk, but lead import is not available in this version.",
      },
    ];
  }

  return [];
}

function getTypeMismatchWarnings(
  profiles: readonly CsvColumnProfile[],
  suggestions: readonly CsvColumnMappingSuggestion[],
) {
  const profileByHeader = new Map(profiles.map((profile) => [profile.header, profile]));
  const expectedTypes: Partial<
    Record<CsvCanonicalField, CsvColumnProfile["inferredType"]>
  > = {
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

  return suggestions.flatMap((suggestion) => {
    if (!suggestion.targetField || suggestion.confidence < 0.5) {
      return [];
    }

    const expectedType = expectedTypes[suggestion.targetField];
    const actualType = profileByHeader.get(suggestion.sourceHeader)?.inferredType;

    if (!expectedType || !actualType || expectedType === actualType) {
      return [];
    }

    return [
      `${suggestion.sourceHeader} maps to ${suggestion.targetField}, but sampled values look ${actualType}.`,
    ];
  });
}

export function buildCsvDataQualityCheck(input: {
  classification: CsvDatasetClassification;
  mappingConfidence: number;
  mappingSuggestions: readonly CsvColumnMappingSuggestion[];
  profiles: readonly CsvColumnProfile[];
}): CsvDataQualityCheck {
  const mappedFields = mappedFieldSet(input.mappingSuggestions);
  const missingFields = getMissingFields(
    input.classification.datasetType,
    mappedFields,
  );
  const warnings = getTypeMismatchWarnings(input.profiles, input.mappingSuggestions);
  const unmappedCount = input.mappingSuggestions.filter(
    (suggestion) => suggestion.targetField === null,
  ).length;
  const importSupported =
    input.classification.datasetType === "APPOINTMENTS" ||
    input.classification.datasetType === "CLIENTS";
  const unsupported =
    input.classification.datasetType === "PAYMENTS_UNSUPPORTED" ||
    input.classification.datasetType === "LEADS";
  const unknown = input.classification.datasetType === "UNKNOWN";
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      input.mappingConfidence -
        missingFields.length * 15 -
        warnings.length * 8 -
        Math.min(unmappedCount, 5) * 2,
    ),
  );
  let state: CsvDataQualityState = "READY";

  if (unsupported) {
    state = "UNSUPPORTED";
  } else if (unknown || missingFields.length > 0) {
    state = "BLOCKED";
  } else if (warnings.length > 0 || input.mappingConfidence < 80) {
    state = "REVIEW_REQUIRED";
  }

  if (input.classification.datasetType === "PAYMENTS_UNSUPPORTED") {
    warnings.unshift(
      "This looks like a payments file. Payments are not supported in this version yet.",
    );
  }

  if (input.classification.datasetType === "LEADS") {
    warnings.unshift(
      "Lead-shaped files can be profiled, but lead import is not available in this version. Current import persists appointments and clients only.",
    );
  }

  if (unknown) {
    warnings.unshift(
      "REVORY could not classify this file confidently. Review the source and mapping before import.",
    );
  }

  return {
    datasetType: input.classification.datasetType,
    importSupported,
    mappingConfidence: input.mappingConfidence,
    missingFields,
    qualityScore,
    state,
    supportedLeakPreview: buildLeakPreview(
      input.classification.datasetType,
      mappedFields,
    ),
    warnings,
  };
}
