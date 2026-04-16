import "server-only";

import { createHash } from "node:crypto";

import { requestBoundedStructuredOutput } from "@/services/llm/request-bounded-structured-output";
import type {
  RevoryLeadSuggestedMessage,
  RevoryLeadSuggestedMessageEligibilityReason,
  RevoryLeadSuggestedMessageInput,
  RevoryLeadSuggestedMessageResult,
} from "@/types/lead-suggested-message";

const SUGGESTED_MESSAGE_MAX_LENGTH = 220;
const SUGGESTED_MESSAGE_MIN_LENGTH = 24;
const SUGGESTED_MESSAGE_MAX_OUTPUT_TOKENS = 120;
const SUGGESTED_MESSAGE_CACHE_TTL_MS = 1000 * 60 * 20;

const suggestedMessageSchema = {
  additionalProperties: false,
  properties: {
    message: {
      maxLength: SUGGESTED_MESSAGE_MAX_LENGTH,
      minLength: SUGGESTED_MESSAGE_MIN_LENGTH,
      type: "string",
    },
  },
  required: ["message"],
  type: "object",
} as const;

const suggestedMessageCache = new Map<
  string,
  {
    expiresAt: number;
    value: RevoryLeadSuggestedMessage;
  }
>();
const inFlightSuggestedMessages = new Map<string, Promise<RevoryLeadSuggestedMessage | null>>();

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getLeadName(input: RevoryLeadSuggestedMessageInput) {
  const candidate = input.clientFirstName?.trim() || input.clientName?.trim() || "";

  if (!candidate) {
    return "there";
  }

  return candidate.split(/\s+/)[0] ?? "there";
}

function formatVoiceInstruction(label: string) {
  switch (label) {
    case "Calm & Premium":
      return "Keep the wording calm, polished, and low-pressure.";
    case "Clear & Assertive":
      return "Keep the wording direct, concise, and commercially clear.";
    case "High-Touch Premium":
      return "Keep the wording warm, premium, and concierge-like without becoming chatty.";
    default:
      return "Keep the wording premium, concise, and booking-first.";
  }
}

function pruneSuggestedMessageCache(now: number) {
  for (const [key, entry] of suggestedMessageCache.entries()) {
    if (entry.expiresAt <= now) {
      suggestedMessageCache.delete(key);
    }
  }
}

function splitSentenceCount(value: string) {
  const matches = value.match(/[^.!?]+[.!?]?/g) ?? [];

  return matches
    .map((item) => item.trim())
    .filter((item) => item.length > 0).length;
}

function passesMessageGuardrails(value: string) {
  const normalized = normalizeText(value);

  if (
    normalized.length < SUGGESTED_MESSAGE_MIN_LENGTH ||
    normalized.length > SUGGESTED_MESSAGE_MAX_LENGTH
  ) {
    return false;
  }

  if (splitSentenceCount(normalized) > 2) {
    return false;
  }

  const lowered = normalized.toLowerCase();

  if (
    lowered.includes("http://") ||
    lowered.includes("https://") ||
    lowered.includes("www.") ||
    lowered.includes(" ai ") ||
    lowered.includes("assistant") ||
    lowered.includes("chatbot")
  ) {
    return false;
  }

  if (/[<>{}\[\]]/.test(normalized)) {
    return false;
  }

  return true;
}

function parseSuggestedMessage(value: unknown): { message: string } | null {
  if (!isRecord(value) || typeof value.message !== "string") {
    return null;
  }

  const normalized = normalizeText(value.message);

  if (!passesMessageGuardrails(normalized)) {
    return null;
  }

  return {
    message: normalized,
  };
}

function resolveEligibilityReason(
  input: RevoryLeadSuggestedMessageInput,
): RevoryLeadSuggestedMessageEligibilityReason {
  if (input.status === "BOOKED") {
    return "resolved_as_booked";
  }

  if (input.status === "CLOSED") {
    return "closed";
  }

  if (input.blockedReason === "missing_main_offer") {
    return "blocked_by_main_offer";
  }

  if (input.blockedReason === "missing_booking_path" || !input.bookingPath) {
    return "blocked_by_booking_path";
  }

  if (input.status === "BLOCKED" && input.blockedReason === "missing_contact") {
    return "blocked_by_contact";
  }

  if (input.status === "BLOCKED" && input.blockedReason === "ineligible_for_handoff") {
    return "blocked_by_handoff_fit";
  }

  if (input.status !== "READY") {
    return "not_ready";
  }

  if (!input.hasEmail && !input.hasPhone) {
    return "blocked_by_contact";
  }

  if (input.bookingPath === "EMAIL" && !input.hasEmail) {
    return "blocked_by_handoff_fit";
  }

  if (input.bookingPath === "SMS" && !input.hasPhone) {
    return "blocked_by_handoff_fit";
  }

  return "ready";
}

function formatSurfaceLabel(reason: RevoryLeadSuggestedMessageEligibilityReason) {
  switch (reason) {
    case "ready":
      return "Suggested booking message";
    case "blocked_by_contact":
    case "blocked_by_handoff_fit":
      return "Suggested unblock ask";
    default:
      return null;
  }
}

function buildSuggestedMessageCacheKey(
  input: RevoryLeadSuggestedMessageInput,
  eligibilityReason: RevoryLeadSuggestedMessageEligibilityReason,
) {
  const payload = JSON.stringify({
    blockedReason: input.blockedReason,
    bookingPath: input.bookingPath,
    clientFirstName: getLeadName(input),
    eligibilityReason,
    hasEmail: input.hasEmail,
    hasPhone: input.hasPhone,
    intakeLabel: input.intakeLabel,
    mainOfferLabel: input.mainOfferLabel,
    sellerVoiceLabel: input.sellerVoiceLabel,
    status: input.status,
    workspaceName: input.workspaceName,
  });

  return createHash("sha256").update(payload).digest("hex");
}

function buildFallbackSuggestedMessage(
  input: RevoryLeadSuggestedMessageInput,
): RevoryLeadSuggestedMessage {
  const firstName = getLeadName(input);

  if (input.status === "BLOCKED" && input.blockedReason === "missing_contact") {
    if (input.bookingPath === "SMS") {
      return {
        message: `Hi ${firstName}, what is the best mobile number for your ${input.mainOfferLabel} booking path? Once we have it, we can share the next step.`,
        source: "fallback",
      };
    }

    return {
      message: `Hi ${firstName}, what is the best email for your ${input.mainOfferLabel} booking path? Once we have it, we can share the next step.`,
      source: "fallback",
    };
  }

  if (input.status === "BLOCKED" && input.blockedReason === "ineligible_for_handoff") {
    if (input.bookingPath === "SMS") {
      return {
        message: `Hi ${firstName}, what is the best mobile number for your ${input.mainOfferLabel} booking path? We can share the next step there.`,
        source: "fallback",
      };
    }

    return {
      message: `Hi ${firstName}, what is the best email for your ${input.mainOfferLabel} booking path? We can share the next step there.`,
      source: "fallback",
    };
  }

  if (input.bookingPath === "SMS") {
    switch (input.sellerVoiceLabel) {
      case "Clear & Assertive":
        return {
          message: `Hi ${firstName}, your ${input.mainOfferLabel} booking path is ready. Reply here if you want the next booking step.`,
          source: "fallback",
        };
      case "High-Touch Premium":
        return {
          message: `Hi ${firstName}, your ${input.mainOfferLabel} booking path is ready. Reply here and we can share the next step.`,
          source: "fallback",
        };
      default:
        return {
          message: `Hi ${firstName}, your ${input.mainOfferLabel} booking path is ready. Reply here when you want the next step.`,
          source: "fallback",
        };
    }
  }

  switch (input.sellerVoiceLabel) {
    case "Clear & Assertive":
      return {
        message: `Hi ${firstName}, your ${input.mainOfferLabel} booking path is ready. Reply here and we can send the next step.`,
        source: "fallback",
      };
    case "High-Touch Premium":
      return {
        message: `Hi ${firstName}, your ${input.mainOfferLabel} booking path is ready. Reply here if you would like the next step.`,
        source: "fallback",
      };
    default:
      return {
        message: `Hi ${firstName}, your ${input.mainOfferLabel} booking path is ready. Reply here when you would like the next step.`,
        source: "fallback",
      };
  }
}

function buildPrompt(input: RevoryLeadSuggestedMessageInput) {
  const blockedInstruction =
    input.status === "BLOCKED" && input.blockedReason === "missing_contact"
      ? input.bookingPath === "SMS"
        ? "Write a short ask that gets the lead's best mobile number so the current booking path can open."
        : "Write a short ask that gets the lead's best email so the current booking path can open."
      : input.status === "BLOCKED" && input.blockedReason === "ineligible_for_handoff"
        ? input.bookingPath === "SMS"
          ? "Write a short ask that gets the mobile number needed for the SMS booking path."
          : "Write a short ask that gets the email needed for the email booking path."
        : "Write the next short message that opens the current booking path.";

  return [
    "You generate one short REVORY Seller suggested message for a single lead booking opportunity.",
    "This is not chat. This is not a thread. This is not follow-up logic. Write only the next bounded message.",
    "The message must stay commercially useful, premium, and narrow.",
    `Allowed job: ${blockedInstruction}`,
    "Forbidden: ongoing conversation, multiple options, discounts, claims about availability, promises of follow-up, links, emojis, or anything that sounds like a sales automation engine.",
    "Keep the message to at most 2 sentences.",
    `Keep the message under ${SUGGESTED_MESSAGE_MAX_LENGTH} characters.`,
    "Do not mention AI, assistant, CRM, inbox, workflow, automation, or internal states.",
    "Use the workspace context, main offer, seller voice, and booking path to make the message feel specific but still tight.",
    formatVoiceInstruction(input.sellerVoiceLabel),
  ].join(" ");
}

export function getLeadSuggestedMessageEligibility(
  input: RevoryLeadSuggestedMessageInput,
): RevoryLeadSuggestedMessageResult {
  const eligibilityReason = resolveEligibilityReason(input);

  if (!["ready", "blocked_by_contact", "blocked_by_handoff_fit"].includes(eligibilityReason)) {
    return {
      bookingPath: input.bookingPath,
      eligibilityReason,
      surfaceLabel: null,
      suggestedMessage: null,
    };
  }

  return {
    bookingPath: input.bookingPath,
    eligibilityReason,
    surfaceLabel: formatSurfaceLabel(eligibilityReason),
    suggestedMessage: buildFallbackSuggestedMessage(input),
  };
}

export async function generateLeadSuggestedMessage(
  input: RevoryLeadSuggestedMessageInput,
): Promise<RevoryLeadSuggestedMessageResult> {
  const baseResult = getLeadSuggestedMessageEligibility(input);

  if (!baseResult.suggestedMessage || !baseResult.surfaceLabel) {
    return baseResult;
  }

  const now = Date.now();
  pruneSuggestedMessageCache(now);

  const cacheKey = buildSuggestedMessageCacheKey(input, baseResult.eligibilityReason);
  const cachedResult = suggestedMessageCache.get(cacheKey);

  if (cachedResult && cachedResult.expiresAt > now) {
    return {
      bookingPath: input.bookingPath,
      eligibilityReason: baseResult.eligibilityReason,
      surfaceLabel: baseResult.surfaceLabel,
      suggestedMessage: cachedResult.value,
    };
  }

  const existingRequest = inFlightSuggestedMessages.get(cacheKey);

  if (existingRequest) {
    const sharedResult = await existingRequest;

    return {
      bookingPath: input.bookingPath,
      eligibilityReason: baseResult.eligibilityReason,
      surfaceLabel: baseResult.surfaceLabel,
      suggestedMessage: sharedResult ?? baseResult.suggestedMessage,
    };
  }

  const llmRequest = (async () => {
    try {
      const llmResult = await requestBoundedStructuredOutput({
        context: {
          blockedReason: input.blockedReason,
          bookingPath: input.bookingPath,
          clientFirstName: getLeadName(input),
          eligibilityReason: baseResult.eligibilityReason,
          hasEmail: input.hasEmail,
          hasPhone: input.hasPhone,
          intakeLabel: input.intakeLabel,
          mainOfferLabel: input.mainOfferLabel,
          sellerVoiceLabel: input.sellerVoiceLabel,
          status: input.status,
          workspaceName: input.workspaceName,
        },
        maxOutputTokens: SUGGESTED_MESSAGE_MAX_OUTPUT_TOKENS,
        outputName: "revory_lead_suggested_message",
        parse: parseSuggestedMessage,
        prompt: buildPrompt(input),
        schema: suggestedMessageSchema,
        useCase: "lead_suggested_message",
      });

      if (!llmResult) {
        return null;
      }

      const suggestedMessage = {
        message: llmResult.message,
        source: "llm" as const,
      };

      suggestedMessageCache.set(cacheKey, {
        expiresAt: Date.now() + SUGGESTED_MESSAGE_CACHE_TTL_MS,
        value: suggestedMessage,
      });

      return suggestedMessage;
    } catch {
      return null;
    } finally {
      inFlightSuggestedMessages.delete(cacheKey);
    }
  })();

  inFlightSuggestedMessages.set(cacheKey, llmRequest);

  const llmSuggestedMessage = await llmRequest;

  if (!llmSuggestedMessage) {
    return baseResult;
  }

  return {
    bookingPath: input.bookingPath,
    eligibilityReason: baseResult.eligibilityReason,
    surfaceLabel: baseResult.surfaceLabel,
    suggestedMessage: llmSuggestedMessage,
  };
}
