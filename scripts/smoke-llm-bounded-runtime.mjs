import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 4000;

const intentClassificationSchema = {
  additionalProperties: false,
  properties: {
    confidenceBand: {
      enum: ["low", "medium", "high"],
      type: "string",
    },
    intent: {
      enum: [
        "LOCK_MAIN_OFFER",
        "CHOOSE_LEAD_ENTRY",
        "LOCK_BOOKING_PATH",
        "SET_VALUE_PER_BOOKING",
        "COMPLETE_ACTIVATION",
        "START_BOOKED_PROOF",
        "REVIEW_BOOKED_PROOF",
        "OPEN_REVENUE_VIEW",
        "REFRESH_BOOKED_PROOF",
        "ADD_LEAD_BASE_SUPPORT",
      ],
      type: "string",
    },
    objection: {
      enum: [
        "NO_ACTIVE_BLOCKER",
        "MULTI_OFFER_RISK",
        "LEAD_ENTRY_MISSING",
        "BOOKING_PATH_MISSING",
        "VALUE_PER_BOOKING_MISSING",
        "PROOF_NOT_VISIBLE",
        "PROOF_SOURCE_NEEDS_REVIEW",
        "LEAD_BASE_ONLY",
        "SUPPORT_SHOULD_STAY_SECONDARY",
        "THIN_BOOKING_CALENDAR",
      ],
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
};

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const trimmed = rawValue.trim();
    entries[key] = trimmed.replace(/^"/, "").replace(/"$/, "");
  }

  return entries;
}

const dotEnv = readEnvFile(path.join(cwd, ".env"));
const dotEnvLocal = readEnvFile(path.join(cwd, ".env.local"));

function resolveEnvValue(key) {
  if (process.env[key]?.trim()) {
    return process.env[key].trim();
  }

  if (typeof dotEnvLocal[key] === "string" && dotEnvLocal[key].trim().length > 0) {
    return dotEnvLocal[key].trim();
  }

  if (typeof dotEnv[key] === "string" && dotEnv[key].trim().length > 0) {
    return dotEnv[key].trim();
  }

  return "";
}

function extractResponseText(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  for (const item of payload.output) {
    if (!item || typeof item !== "object" || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (
        contentItem &&
        typeof contentItem === "object" &&
        typeof contentItem.text === "string" &&
        contentItem.text.trim().length > 0
      ) {
        return contentItem.text.trim();
      }
    }
  }

  return "";
}

const apiKeyPresent = Boolean(resolveEnvValue("OPENAI_API_KEY"));
const model = resolveEnvValue("REVORY_LLM_MODEL") || DEFAULT_MODEL;
const timeoutMs = Number(resolveEnvValue("REVORY_LLM_TIMEOUT_MS") || `${DEFAULT_TIMEOUT_MS}`);

if (!apiKeyPresent) {
  console.log(
    JSON.stringify(
      {
        apiKeyPresent: false,
        ok: false,
        reason: "missing_openai_api_key",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS);
const startedAt = Date.now();

try {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: [
        {
          content:
            "Classify the current REVORY Seller state using only the provided enums. Return exactly one intent, one objection, one simple confidence band, and one short rationale. Keep the classification narrow, booking-first, and commercially honest. Never invent a new enum, never output prose outside the schema, and never imply chat, CRM, inbox, or autonomous behavior.",
          role: "developer",
        },
        {
          content: JSON.stringify({
            context: {
              allowedIntents: ["START_BOOKED_PROOF", "REVIEW_BOOKED_PROOF"],
              allowedObjections: ["PROOF_NOT_VISIBLE", "PROOF_SOURCE_NEEDS_REVIEW"],
              context: {
                hasAppointmentsSourceReady: true,
                hasBookedProofVisible: false,
                hasLeadBaseVisible: false,
                isRevenueSupported: false,
              },
            },
            useCase: "imports",
          }),
          role: "user",
        },
      ],
      max_output_tokens: 220,
      model,
      store: false,
      text: {
        format: {
          name: "revory_intent_classification",
          schema: intentClassificationSchema,
          strict: true,
          type: "json_schema",
        },
      },
    }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${resolveEnvValue("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: controller.signal,
  });

  const latencyMs = Date.now() - startedAt;
  const payload = await response.json();

  if (!response.ok) {
    console.log(
      JSON.stringify(
        {
          apiKeyPresent: true,
          error: payload?.error ?? null,
          latencyMs,
          model,
          ok: false,
          providerReached: true,
          responseId: payload?.id ?? null,
          status: response.status,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const rawText = extractResponseText(payload);
  let parsed = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  console.log(
    JSON.stringify(
      {
        apiKeyPresent: true,
        latencyMs,
        model,
        ok: true,
        parsed,
        providerReached: true,
        rawText,
        responseId: payload?.id ?? null,
        status: response.status,
        usage: payload?.usage ?? null,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        apiKeyPresent: true,
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
              }
            : String(error),
        latencyMs: Date.now() - startedAt,
        model,
        ok: false,
        providerReached: false,
        status: null,
      },
      null,
      2,
    ),
  );
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
