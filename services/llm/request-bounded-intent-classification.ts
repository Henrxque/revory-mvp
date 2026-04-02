import "server-only";

import { requestBoundedStructuredOutput } from "@/services/llm/request-bounded-structured-output";
import type {
  RevoryIntentClassification,
  RevoryConfidenceBand,
  RevoryIntentCode,
  RevoryObjectionCode,
} from "@/types/intent-classification";
import {
  revoryConfidenceBands,
  revoryIntentCodes,
  revoryObjectionCodes,
} from "@/types/intent-classification";

type RequestBoundedIntentClassificationInput = {
  allowedIntents: readonly RevoryIntentCode[];
  allowedObjections: readonly RevoryObjectionCode[];
  context: Record<string, unknown>;
  useCase: "activation" | "dashboard" | "imports";
};

const intentClassificationSchema = {
  additionalProperties: false,
  properties: {
    confidenceBand: {
      enum: [...revoryConfidenceBands],
      type: "string",
    },
    intent: {
      enum: [...revoryIntentCodes],
      type: "string",
    },
    objection: {
      enum: [...revoryObjectionCodes],
      type: "string",
    },
    rationale: {
      maxLength: 120,
      minLength: 8,
      type: "string",
    },
  },
  required: ["confidenceBand", "intent", "objection", "rationale"],
  type: "object",
} as const;

function normalizeText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIntentCode(value: string): value is RevoryIntentCode {
  return (revoryIntentCodes as readonly string[]).includes(value);
}

function isObjectionCode(value: string): value is RevoryObjectionCode {
  return (revoryObjectionCodes as readonly string[]).includes(value);
}

function isConfidenceBand(value: string): value is RevoryConfidenceBand {
  return (revoryConfidenceBands as readonly string[]).includes(value);
}

function parseIntentClassification(
  value: unknown,
  allowedIntents: readonly RevoryIntentCode[],
  allowedObjections: readonly RevoryObjectionCode[],
): RevoryIntentClassification | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.intent !== "string" ||
    typeof value.objection !== "string" ||
    typeof value.confidenceBand !== "string" ||
    typeof value.rationale !== "string"
  ) {
    return null;
  }

  if (
    !isIntentCode(value.intent) ||
    !isObjectionCode(value.objection) ||
    !isConfidenceBand(value.confidenceBand)
  ) {
    return null;
  }

  if (
    !allowedIntents.includes(value.intent) ||
    !allowedObjections.includes(value.objection)
  ) {
    return null;
  }

  const rationale = normalizeText(value.rationale, 120);

  if (!rationale) {
    return null;
  }

  return {
    confidenceBand: value.confidenceBand,
    intent: value.intent,
    objection: value.objection,
    rationale,
  };
}

export async function requestBoundedIntentClassification({
  allowedIntents,
  allowedObjections,
  context,
  useCase,
}: RequestBoundedIntentClassificationInput): Promise<RevoryIntentClassification | null> {
  return requestBoundedStructuredOutput({
    context: {
      allowedIntents,
      allowedObjections,
      context,
    },
    outputName: "revory_intent_classification",
    parse: (value) =>
      parseIntentClassification(value, allowedIntents, allowedObjections),
    prompt:
      "Classify the current REVORY Seller state using only the provided enums. Return exactly one intent, one objection, one simple confidence band, and one short rationale. Keep the classification narrow, booking-first, and commercially honest. Never invent a new enum, never output prose outside the schema, and never imply chat, CRM, inbox, or autonomous behavior.",
    schema: intentClassificationSchema,
    useCase,
  });
}
