import "server-only";

import { requestBoundedStructuredOutput } from "@/services/llm/request-bounded-structured-output";
import type {
  RevoryBoundedLlmRequest,
  RevoryDecisionSupportPatch,
} from "@/types/decision-support-llm";

const decisionSupportPatchSchema = {
  additionalProperties: false,
  properties: {
    detectedObjection: {
      maxLength: 180,
      minLength: 12,
      type: "string",
    },
    nextBestAction: {
      maxLength: 180,
      minLength: 12,
      type: "string",
    },
    recommendedPath: {
      maxLength: 120,
      minLength: 8,
      type: "string",
    },
    summary: {
      maxLength: 140,
      minLength: 12,
      type: "string",
    },
    title: {
      maxLength: 96,
      minLength: 8,
      type: "string",
    },
  },
  required: [
    "detectedObjection",
    "nextBestAction",
    "recommendedPath",
    "summary",
    "title",
  ],
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

function parseDecisionSupportPatch(value: unknown): RevoryDecisionSupportPatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? normalizeText(value.title, 96) : null;
  const summary =
    typeof value.summary === "string" ? normalizeText(value.summary, 140) : null;
  const detectedObjection =
    typeof value.detectedObjection === "string"
      ? normalizeText(value.detectedObjection, 180)
      : null;
  const nextBestAction =
    typeof value.nextBestAction === "string"
      ? normalizeText(value.nextBestAction, 180)
      : null;
  const recommendedPath =
    typeof value.recommendedPath === "string"
      ? normalizeText(value.recommendedPath, 120)
      : null;

  if (
    !title ||
    !summary ||
    !detectedObjection ||
    !nextBestAction ||
    !recommendedPath
  ) {
    return null;
  }

  return {
    detectedObjection,
    nextBestAction,
    recommendedPath,
    summary,
    title,
  };
}

export async function requestBoundedDecisionSupportPatch(
  request: RevoryBoundedLlmRequest,
): Promise<RevoryDecisionSupportPatch | null> {
  return requestBoundedStructuredOutput({
    context: {
      context: request.context,
      fallback: request.fallback,
      useCase: request.useCase,
    },
    outputName: "revory_decision_support_patch",
    parse: parseDecisionSupportPatch,
    prompt: request.prompt,
    schema: decisionSupportPatchSchema,
    useCase: request.useCase,
  });
}
