import "server-only";

import type { RevenueLeakType } from "@prisma/client";

import {
  csvCanonicalFields,
  type CsvColumnMappingSuggestion,
  type CsvColumnProfile,
} from "@/services/imports/csv-column-mapping";
import type { CsvDatasetType } from "@/services/imports/csv-dataset-type";
import type { CsvMappingFallbackResult } from "@/services/imports/csv-mapping-fallback";
import { requestBoundedStructuredOutput } from "@/services/llm/request-bounded-structured-output";

export type AiCsvTriageConfidence = "LOW" | "MEDIUM" | "HIGH";

export type AiCsvTriageOutput = {
  detectedDatasetType: CsvDatasetType;
  probableSourceFormat: string | null;
  confidence: AiCsvTriageConfidence;
  columnMapping: Record<string, string>;
  supportedLeaks: string[];
  missingFields: string[];
  warnings: string[];
  reviewRequired: boolean;
};

type RequestAiCsvTriageInput = {
  deterministic: CsvMappingFallbackResult;
  encoding?: string | null;
};

const MAX_AI_COLUMNS = 40;
const MAX_AI_SAMPLE_ROWS = 5;
const MAX_WARNING_COUNT = 8;
const AI_TIMEOUT_MS = 8000;
const DATASET_TYPES = [
  "APPOINTMENTS",
  "CLIENTS",
  "LEADS",
  "PAYMENTS_UNSUPPORTED",
  "UNKNOWN",
] as const satisfies readonly CsvDatasetType[];
const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
const SUPPORTED_LEAK_TYPES = [
  "NO_SHOW_REVENUE",
  "CANCELED_NOT_RECOVERED",
  "STALE_BOOKED_PROOF",
  "MISSING_CONTACT",
  "BOOKING_PATH_BLOCKED",
] as const satisfies readonly RevenueLeakType[];
const canonicalFieldSet = new Set<string>(csvCanonicalFields);
const datasetTypeSet = new Set<string>(DATASET_TYPES);
const confidenceSet = new Set<string>(CONFIDENCE_LEVELS);
const supportedLeakTypeSet = new Set<string>(SUPPORTED_LEAK_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeShortText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

function sanitizeWarningList(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const warnings = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeShortText(item, 180))
    .filter((item): item is string => item !== null)
    .slice(0, MAX_WARNING_COUNT);

  return warnings.length === value.length || warnings.length > 0 ? warnings : [];
}

function sanitizeStringList(
  value: unknown,
  allowedValues?: ReadonlySet<string>,
) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(
      (item) =>
        item.length > 0 &&
        item.length <= 80 &&
        (!allowedValues || allowedValues.has(item)),
    );

  return [...new Set(items)];
}

function parseAiCsvTriageOutput(
  value: unknown,
  allowedHeaders: readonly string[],
): AiCsvTriageOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.detectedDatasetType !== "string" ||
    !datasetTypeSet.has(value.detectedDatasetType) ||
    typeof value.confidence !== "string" ||
    !confidenceSet.has(value.confidence) ||
    typeof value.reviewRequired !== "boolean" ||
    !isRecord(value.columnMapping)
  ) {
    return null;
  }

  const probableSourceFormat =
    value.probableSourceFormat === null
      ? null
      : typeof value.probableSourceFormat === "string"
        ? normalizeShortText(value.probableSourceFormat, 80)
        : null;

  if (value.probableSourceFormat !== null && !probableSourceFormat) {
    return null;
  }

  const allowedHeaderSet = new Set(allowedHeaders);
  const columnMapping: Record<string, string> = {};

  for (const [sourceHeader, targetField] of Object.entries(value.columnMapping)) {
    if (
      !allowedHeaderSet.has(sourceHeader) ||
      typeof targetField !== "string" ||
      (targetField !== "UNMAPPED" && !canonicalFieldSet.has(targetField))
    ) {
      return null;
    }

    columnMapping[sourceHeader] = targetField;
  }

  if (Object.keys(columnMapping).length !== allowedHeaders.length) {
    return null;
  }

  const supportedLeaks = sanitizeStringList(
    value.supportedLeaks,
    supportedLeakTypeSet,
  );
  const missingFields = sanitizeStringList(value.missingFields, canonicalFieldSet);
  const warnings = sanitizeWarningList(value.warnings);

  if (!supportedLeaks || !missingFields || !warnings) {
    return null;
  }

  return {
    columnMapping,
    confidence: value.confidence as AiCsvTriageConfidence,
    detectedDatasetType: value.detectedDatasetType as CsvDatasetType,
    missingFields,
    probableSourceFormat,
    reviewRequired: true,
    supportedLeaks,
    warnings,
  };
}

function getProfileByHeader(profiles: readonly CsvColumnProfile[]) {
  return new Map(profiles.map((profile) => [profile.header, profile]));
}

function getMappingByHeader(
  mappings: readonly CsvColumnMappingSuggestion[],
) {
  return new Map(mappings.map((mapping) => [mapping.sourceHeader, mapping]));
}

function sanitizeSampleValue(
  sourceHeader: string,
  rawValue: string,
  profile: CsvColumnProfile | undefined,
  mapping: CsvColumnMappingSuggestion | undefined,
) {
  const value = rawValue.trim();

  if (!value) {
    return "blank";
  }

  const targetField = mapping?.targetField;

  if (
    targetField === "clientName" ||
    targetField === "notes" ||
    targetField === "sourceName" ||
    sourceHeader.toLowerCase().includes("note")
  ) {
    return "redacted_text";
  }

  switch (profile?.inferredType) {
    case "email-like":
      return "email_like";
    case "phone-like":
      return "phone_like";
    case "date-like":
      return "date_like";
    case "money-like":
      return "money_like";
    case "status-like":
      return `status:${value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 32)}`;
    default:
      return value.length > 40 ? "long_text_present" : "text_present";
  }
}

function buildSafeAiContext(input: RequestAiCsvTriageInput) {
  const headers = input.deterministic.profile.columns.slice(0, MAX_AI_COLUMNS);
  const profileByHeader = getProfileByHeader(input.deterministic.columnProfiles);
  const mappingByHeader = getMappingByHeader(
    input.deterministic.mappingSuggestions,
  );
  const sampleRows = input.deterministic.profile.sampleRows
    .slice(0, MAX_AI_SAMPLE_ROWS)
    .map((row) =>
      Object.fromEntries(
        headers.map((header) => [
          header,
          sanitizeSampleValue(
            header,
            row[header] ?? "",
            profileByHeader.get(header),
            mappingByHeader.get(header),
          ),
        ]),
      ),
    );
  const columnProfiles = headers.map((header) => {
    const profile = profileByHeader.get(header);
    const mapping = mappingByHeader.get(header);
    const nonEmptyCount = input.deterministic.profile.sampleRows.filter(
      (row) => (row[header] ?? "").trim().length > 0,
    ).length;
    const sampledRowCount = input.deterministic.profile.sampleRows.length;

    return {
      deterministicConfidence: mapping?.confidenceLabel ?? "LOW",
      deterministicTarget: mapping?.targetField ?? null,
      fillRate:
        sampledRowCount > 0
          ? Math.round((nonEmptyCount / sampledRowCount) * 100)
          : 0,
      header,
      inferredType: profile?.inferredType ?? "text",
    };
  });

  return {
    columnProfiles,
    columns: headers,
    deterministicDatasetType:
      input.deterministic.classification.datasetType,
    deterministicMappingConfidence: input.deterministic.mappingConfidence,
    delimiter: input.deterministic.profile.delimiter,
    encoding: input.encoding ?? null,
    rowCount: input.deterministic.profile.rowCount,
    sampleRows,
    sampleRowsAreSanitized: true,
    truncatedColumnCount: Math.max(
      0,
      input.deterministic.profile.columns.length - headers.length,
    ),
  };
}

function buildTriageSchema(headers: readonly string[]) {
  const columnMappingProperties = Object.fromEntries(
    headers.map((header) => [
      header,
      {
        enum: [...csvCanonicalFields, "UNMAPPED"],
        type: "string",
      },
    ]),
  );

  return {
    additionalProperties: false,
    properties: {
      columnMapping: {
        additionalProperties: false,
        properties: columnMappingProperties,
        required: [...headers],
        type: "object",
      },
      confidence: {
        enum: [...CONFIDENCE_LEVELS],
        type: "string",
      },
      detectedDatasetType: {
        enum: [...DATASET_TYPES],
        type: "string",
      },
      missingFields: {
        items: {
          enum: [...csvCanonicalFields],
          type: "string",
        },
        maxItems: 20,
        type: "array",
      },
      probableSourceFormat: {
        anyOf: [
          {
            maxLength: 80,
            type: "string",
          },
          {
            type: "null",
          },
        ],
      },
      reviewRequired: {
        const: true,
        type: "boolean",
      },
      supportedLeaks: {
        items: {
          enum: [...SUPPORTED_LEAK_TYPES],
          type: "string",
        },
        maxItems: SUPPORTED_LEAK_TYPES.length,
        type: "array",
      },
      warnings: {
        items: {
          maxLength: 180,
          type: "string",
        },
        maxItems: MAX_WARNING_COUNT,
        type: "array",
      },
    },
    required: [
      "detectedDatasetType",
      "probableSourceFormat",
      "confidence",
      "columnMapping",
      "supportedLeaks",
      "missingFields",
      "warnings",
      "reviewRequired",
    ],
    type: "object",
  } as const;
}

function buildDeterministicFallback(
  deterministic: CsvMappingFallbackResult,
  warning?: string,
): AiCsvTriageOutput {
  const warnings = [...deterministic.dataQuality.warnings];

  if (warning) {
    warnings.unshift(warning);
  }

  return {
    columnMapping: Object.fromEntries(
      deterministic.mappingSuggestions.map((suggestion) => [
        suggestion.sourceHeader,
        suggestion.targetField ?? "UNMAPPED",
      ]),
    ),
    confidence: deterministic.classification.confidenceLabel,
    detectedDatasetType: deterministic.classification.datasetType,
    missingFields: deterministic.dataQuality.missingFields,
    probableSourceFormat: null,
    reviewRequired: true,
    supportedLeaks: deterministic.dataQuality.supportedLeakPreview
      .filter((preview) => preview.supportLevel !== "NOT_SUPPORTED")
      .map((preview) => preview.leakType),
    warnings: warnings.slice(0, MAX_WARNING_COUNT),
  };
}

function reconcileAiTriage(
  deterministic: CsvMappingFallbackResult,
  aiOutput: AiCsvTriageOutput,
): AiCsvTriageOutput {
  const warnings = [
    ...deterministic.dataQuality.warnings,
    ...aiOutput.warnings,
  ];
  const columnMapping = Object.fromEntries(
    deterministic.mappingSuggestions.map((suggestion) => {
      const aiTarget = aiOutput.columnMapping[suggestion.sourceHeader];
      const keepDeterministic =
        suggestion.targetField !== null && suggestion.confidence >= 0.9;
      let finalTarget = suggestion.targetField ?? "UNMAPPED";

      if (keepDeterministic && suggestion.targetField) {
        finalTarget = suggestion.targetField;
      } else if (
        aiTarget &&
        (aiTarget === "UNMAPPED" || canonicalFieldSet.has(aiTarget))
      ) {
        finalTarget = aiTarget;
      }

      return [suggestion.sourceHeader, finalTarget];
    }),
  ) as Record<string, string>;
  const deterministicDatasetType =
    deterministic.classification.datasetType;
  const protectDeterministicDataset =
    deterministic.classification.confidenceLabel === "HIGH" &&
    deterministicDatasetType !== aiOutput.detectedDatasetType;

  if (protectDeterministicDataset) {
    warnings.unshift(
      `AI suggested ${aiOutput.detectedDatasetType}, but REVORY kept the high-confidence deterministic classification ${deterministicDatasetType}.`,
    );
  }

  const deterministicSupportedLeaks = new Set(
    deterministic.dataQuality.supportedLeakPreview
      .filter((preview) => preview.supportLevel !== "NOT_SUPPORTED")
      .map((preview) => preview.leakType),
  );
  const supportedLeaks = aiOutput.supportedLeaks.filter((leakType) =>
    deterministicSupportedLeaks.has(leakType as RevenueLeakType),
  );
  const missingFields = [
    ...new Set([
      ...deterministic.dataQuality.missingFields,
      ...aiOutput.missingFields.filter((field) => canonicalFieldSet.has(field)),
    ]),
  ];

  return {
    columnMapping,
    confidence: aiOutput.confidence,
    detectedDatasetType: protectDeterministicDataset
      ? deterministicDatasetType
      : aiOutput.detectedDatasetType,
    missingFields,
    probableSourceFormat: aiOutput.probableSourceFormat,
    reviewRequired: true,
    supportedLeaks:
      supportedLeaks.length > 0
        ? supportedLeaks
        : [...deterministicSupportedLeaks],
    warnings: [...new Set(warnings)].slice(0, MAX_WARNING_COUNT),
  };
}

export async function requestAiCsvTriage(
  input: RequestAiCsvTriageInput,
): Promise<AiCsvTriageOutput> {
  const context = buildSafeAiContext(input);
  const schema = buildTriageSchema(context.columns);
  const aiOutput = await requestBoundedStructuredOutput({
    context,
    maxOutputTokens: 700,
    outputName: "revory_ai_csv_triage",
    parse: (value) => parseAiCsvTriageOutput(value, context.columns),
    prompt:
      "Review this sanitized CSV profile as a bounded intake assistant for REVORY, a Revenue Leak Detector for premium MedSpas. Return only the strict JSON schema. Suggest dataset type and column mapping, but never import data, create revenue leaks, calculate revenue, claim confirmed loss, or override deterministic validation. Every mapping remains subject to user review. The sample rows contain shape labels rather than raw patient data. Do not reconstruct or request names, emails, phones, notes, medical details, documents, or full CSV content. Use only the supplied canonical mapping fields and V1 leak types. PAYMENTS_UNSUPPORTED and UNKNOWN must remain honest. reviewRequired must always be true.",
    schema,
    timeoutMs: AI_TIMEOUT_MS,
    useCase: "ai_csv_triage",
  });

  if (!aiOutput) {
    return buildDeterministicFallback(
      input.deterministic,
      "AI triage was unavailable or invalid. REVORY kept the deterministic mapping fallback.",
    );
  }

  return reconcileAiTriage(input.deterministic, aiOutput);
}
