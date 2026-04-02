import "server-only";

import { requestBoundedStructuredOutput } from "@/services/llm/request-bounded-structured-output";
import type { RevoryConfidenceBand } from "@/types/intent-classification";
import type {
  RevoryOperationalOutreachPreparationState,
  RevoryOperationalTemplateKey,
  RevoryTemplateObjectionCode,
} from "@/types/operational-template";
import { revoryTemplateObjectionCodes } from "@/types/operational-template";

type TemplateSelectionCandidate = {
  blockedReason: string | null;
  key: RevoryOperationalTemplateKey;
  liveItemCount: number;
  outreachState: RevoryOperationalOutreachPreparationState;
  replyBlock: string;
  suggestedNextStep: string;
  title: string;
};

type RevoryTemplateSelectionAssist = {
  confidenceBand: RevoryConfidenceBand;
  objectionCode: RevoryTemplateObjectionCode;
  recommendedTemplateKey: RevoryOperationalTemplateKey;
  replyBlock: string;
};

const replyBlockSchema = {
  additionalProperties: false,
  properties: {
    confidenceBand: {
      enum: ["low", "medium", "high"],
      type: "string",
    },
    objectionCode: {
      enum: [...revoryTemplateObjectionCodes],
      type: "string",
    },
    recommendedTemplateKey: {
      enum: ["confirmation", "reminder", "recovery", "review_request"],
      type: "string",
    },
    replyBlock: {
      maxLength: 110,
      minLength: 8,
      type: "string",
    },
  },
  required: [
    "confidenceBand",
    "objectionCode",
    "recommendedTemplateKey",
    "replyBlock",
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

function isConfidenceBand(value: string): value is RevoryConfidenceBand {
  return ["low", "medium", "high"].includes(value);
}

function isTemplateKey(value: string): value is RevoryOperationalTemplateKey {
  return ["confirmation", "reminder", "recovery", "review_request"].includes(value);
}

function isObjectionCode(value: string): value is RevoryTemplateObjectionCode {
  return (revoryTemplateObjectionCodes as readonly string[]).includes(value);
}

function parseSelectionAssist(
  value: unknown,
  allowedTemplateKeys: readonly RevoryOperationalTemplateKey[],
): RevoryTemplateSelectionAssist | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.confidenceBand !== "string" ||
    typeof value.objectionCode !== "string" ||
    typeof value.recommendedTemplateKey !== "string" ||
    typeof value.replyBlock !== "string"
  ) {
    return null;
  }

  if (
    !isConfidenceBand(value.confidenceBand) ||
    !isObjectionCode(value.objectionCode) ||
    !isTemplateKey(value.recommendedTemplateKey) ||
    !allowedTemplateKeys.includes(value.recommendedTemplateKey)
  ) {
    return null;
  }

  const replyBlock = normalizeText(value.replyBlock, 110);

  if (!replyBlock) {
    return null;
  }

  return {
    confidenceBand: value.confidenceBand,
    objectionCode: value.objectionCode,
    recommendedTemplateKey: value.recommendedTemplateKey,
    replyBlock,
  };
}

function getDefaultCandidate(candidates: readonly TemplateSelectionCandidate[]) {
  return [...candidates].sort((left, right) => {
    const leftRank =
      left.outreachState === "ready"
        ? 0
        : left.outreachState === "recommended"
          ? 1
          : left.outreachState === "prepared"
            ? 2
            : 3;
    const rightRank =
      right.outreachState === "ready"
        ? 0
        : right.outreachState === "recommended"
          ? 1
          : right.outreachState === "prepared"
            ? 2
            : 3;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right.liveItemCount - left.liveItemCount;
  })[0] ?? null;
}

function getDefaultObjection(
  candidate: TemplateSelectionCandidate,
): RevoryTemplateObjectionCode {
  if (candidate.blockedReason) {
    return "CONTACT_PATH_BLOCKED";
  }

  switch (candidate.key) {
    case "confirmation":
      return "SCHEDULE_CHANGE_RISK";
    case "reminder":
      return "ATTENDANCE_DROP_RISK";
    case "recovery":
      return "RETURN_TO_BOOKING_RESISTANCE";
    case "review_request":
      return "FEEDBACK_FRICTION";
  }
}

export async function getTemplateSelectionAssist(
  candidates: readonly TemplateSelectionCandidate[],
): Promise<RevoryTemplateSelectionAssist | null> {
  const defaultCandidate = getDefaultCandidate(candidates);

  if (!defaultCandidate) {
    return null;
  }

  const result = await requestBoundedStructuredOutput({
    context: {
      candidates,
      defaultCandidate: {
        key: defaultCandidate.key,
        objectionCode: getDefaultObjection(defaultCandidate),
        replyBlock: defaultCandidate.replyBlock,
      },
    },
    outputName: "revory_template_selection_assist",
    parse: (value) =>
      parseSelectionAssist(
        value,
        candidates.map((candidate) => candidate.key),
      ),
    prompt:
      "Choose the single best REVORY reply template for the current controlled state and return one short reply block adaptation only for that template. Stay booking-focused, premium, and narrow. Do not generate a full message. Do not invent placeholders, channels, or new workflow branches. Keep the reply block to one short sentence that fits inside the existing template playbook.",
    schema: replyBlockSchema,
    useCase: "template_selection",
  });

  if (result) {
    return result;
  }

  return {
    confidenceBand: "low",
    objectionCode: getDefaultObjection(defaultCandidate),
    recommendedTemplateKey: defaultCandidate.key,
    replyBlock: defaultCandidate.replyBlock,
  };
}
