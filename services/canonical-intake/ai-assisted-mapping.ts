import "server-only";

import type { CanonicalMappingReview } from "@/services/canonical-intake/assisted-mapping";
import { canonicalFields } from "@/services/canonical-intake/definitions";
import { requestBoundedStructuredOutput } from "@/services/llm/request-bounded-structured-output";

type AiCanonicalMappingOutput = {
  confidence: "HIGH" | "LOW" | "MEDIUM";
  mapping: Record<string, string>;
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOutput(
  value: unknown,
  headers: readonly string[],
  targets: readonly string[],
): AiCanonicalMappingOutput | null {
  if (
    !isRecord(value) ||
    !["HIGH", "LOW", "MEDIUM"].includes(String(value.confidence)) ||
    !isRecord(value.mapping) ||
    !Array.isArray(value.warnings)
  ) {
    return null;
  }
  const allowedHeaders = new Set(headers);
  const allowedTargets = new Set([...targets, "UNMAPPED"]);
  const mapping: Record<string, string> = {};
  for (const [header, target] of Object.entries(value.mapping)) {
    if (!allowedHeaders.has(header) || typeof target !== "string" || !allowedTargets.has(target)) {
      return null;
    }
    mapping[header] = target;
  }
  if (Object.keys(mapping).length !== headers.length) return null;
  const warnings = value.warnings
    .filter((warning): warning is string => typeof warning === "string")
    .map((warning) => warning.replace(/\s+/g, " ").trim())
    .filter((warning) => warning.length > 0 && warning.length <= 160)
    .slice(0, 6);
  return {
    confidence: value.confidence as AiCanonicalMappingOutput["confidence"],
    mapping,
    warnings,
  };
}

export async function requestCanonicalMappingAssistance(
  review: CanonicalMappingReview,
): Promise<{
  mapping: Record<string, string>;
  providerUsed: boolean;
  warnings: string[];
}> {
  const targets = Object.keys(canonicalFields[review.entityType]);
  const schema = {
    additionalProperties: false,
    properties: {
      confidence: { enum: ["LOW", "MEDIUM", "HIGH"], type: "string" },
      mapping: {
        additionalProperties: false,
        properties: Object.fromEntries(
          review.headers.map((header) => [
            header,
            { enum: [...targets, "UNMAPPED"], type: "string" },
          ]),
        ),
        required: review.headers,
        type: "object",
      },
      warnings: {
        items: { maxLength: 160, type: "string" },
        maxItems: 6,
        type: "array",
      },
    },
    required: ["confidence", "mapping", "warnings"],
    type: "object",
  } as const;
  const context = {
    columnProfiles: review.columnProfiles,
    entityType: review.entityType,
    headers: review.headers,
    rowCount: review.rowCount,
    sampleShapes: review.columnProfiles.map((column) => ({
      header: column.header,
      samples: [column.inferredType, column.fillRate ? "value_present" : "blank"],
    })),
    samplesAreRedacted: true,
  };
  const output = await requestBoundedStructuredOutput({
    context,
    maxOutputTokens: 520,
    outputName: "revory_canonical_mapping_assistance",
    parse: (value) => parseOutput(value, review.headers, targets),
    prompt:
      "Suggest a bounded CSV header mapping for the specified REVORY canonical entity. Use only the supplied headers, inferred types, fill rates and redacted value-shape labels. Never request or infer names, emails, phones, notes, monetary values or full CSV content. Never change the dataset type, create a finding, calculate money, match records or approve an import. Use UNMAPPED when evidence is insufficient. Human confirmation and deterministic validation are mandatory after this suggestion.",
    schema,
    timeoutMs: 4_000,
    useCase: "canonical_csv_mapping",
  });

  if (!output) {
    return {
      mapping: review.mapping,
      providerUsed: false,
      warnings: ["AI assistance was unavailable or invalid. Deterministic suggestions remain available."],
    };
  }

  const mapping = Object.fromEntries(
    review.headers.flatMap((header) => {
      const deterministicTarget = review.mapping[header];
      const aiTarget = output.mapping[header];
      const target = deterministicTarget || (aiTarget === "UNMAPPED" ? "" : aiTarget);
      return target ? [[header, target]] : [];
    }),
  );
  return { mapping, providerUsed: true, warnings: output.warnings };
}
