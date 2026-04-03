import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_MAX_OUTPUT_TOKENS = 220;
const MAX_ATTEMPTS = 2;

const intentSchema = {
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
    entries[key] = rawValue.trim().replace(/^"/, "").replace(/"$/, "");
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

function normalizeTimeoutMs(value) {
  const parsed = Number(value ?? `${DEFAULT_TIMEOUT_MS}`);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractResponseText(payload) {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (!isRecord(contentItem)) {
        continue;
      }

      if (typeof contentItem.text === "string" && contentItem.text.trim().length > 0) {
        return contentItem.text.trim();
      }
    }
  }

  return null;
}

function normalizeText(value, maxLength) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

function parseIntentClassification(value, allowedIntents, allowedObjections) {
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

  const validConfidence = ["low", "medium", "high"].includes(value.confidenceBand);
  const validIntent = allowedIntents.includes(value.intent);
  const validObjection = allowedObjections.includes(value.objection);
  const rationale = normalizeText(value.rationale, 120);

  if (!validConfidence || !validIntent || !validObjection || !rationale) {
    return null;
  }

  return {
    confidenceBand: value.confidenceBand,
    intent: value.intent,
    objection: value.objection,
    rationale,
  };
}

async function runBoundedRequest({
  allowedIntents,
  allowedObjections,
  context,
  fetchImpl,
  model,
  timeoutMs,
  useCase,
}) {
  let attempts = 0;
  let lastError = null;
  const apiKey = resolveEnvValue("OPENAI_API_KEY");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    attempts += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetchImpl(OPENAI_RESPONSES_URL, {
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
                  allowedIntents,
                  allowedObjections,
                  context,
                },
                useCase,
              }),
              role: "user",
            },
          ],
          max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
          model,
          store: false,
          text: {
            format: {
              name: "revory_intent_classification",
              schema: intentSchema,
              strict: true,
              type: "json_schema",
            },
          },
        }),
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startedAt;
      const payload = await response.json();

      if (!response.ok) {
        const shouldRetry = response.status >= 500 || response.status === 429;
        lastError = {
          code: payload?.error?.code ?? `http_${response.status}`,
          latencyMs,
          providerReached: true,
          responseId: payload?.id ?? null,
          status: response.status,
        };

        if (shouldRetry && attempt < MAX_ATTEMPTS) {
          continue;
        }

        return {
          attempts,
          error: lastError,
          ok: false,
        };
      }

      const rawText = extractResponseText(payload);

      if (!rawText) {
        return {
          attempts,
          error: {
            code: "empty_output",
            latencyMs,
            providerReached: true,
            responseId: payload?.id ?? null,
            status: response.status,
          },
          ok: false,
        };
      }

      let parsed;

      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          attempts,
          error: {
            code: "invalid_json",
            latencyMs,
            providerReached: true,
            rawText,
            responseId: payload?.id ?? null,
            status: response.status,
          },
          ok: false,
        };
      }

      const result = parseIntentClassification(parsed, allowedIntents, allowedObjections);

      if (!result) {
        return {
          attempts,
          error: {
            code: "schema_validation_failed",
            latencyMs,
            providerReached: true,
            rawText,
            responseId: payload?.id ?? null,
            status: response.status,
          },
          ok: false,
        };
      }

      return {
        attempts,
        latencyMs,
        ok: true,
        parsed: result,
        rawText,
        responseId: payload?.id ?? null,
        status: response.status,
        usage: payload?.usage ?? null,
      };
    } catch (error) {
      lastError = {
        code: error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed",
        latencyMs: Date.now() - startedAt,
        providerReached: false,
        responseId: null,
        status: null,
      };

      if (attempt >= MAX_ATTEMPTS) {
        return {
          attempts,
          error: lastError,
          ok: false,
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    attempts,
    error: lastError,
    ok: false,
  };
}

function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

function createAbortableNeverFetch() {
  return async (_url, options) =>
    await new Promise((resolve, reject) => {
      const onAbort = () => {
        const error = new Error("This operation was aborted");
        error.name = "AbortError";
        reject(error);
      };

      options.signal?.addEventListener("abort", onAbort, { once: true });
    });
}

function applyDecisionSupportPatch(read, patch) {
  if (!patch) {
    return read;
  }

  return {
    ...read,
    detectedObjection: patch.detectedObjection,
    nextBestAction: patch.nextBestAction,
    recommendedPath: patch.recommendedPath,
    summary: patch.summary,
    title: patch.title,
  };
}

function applyDashboardIntentClassification(read, classification) {
  if (!classification || classification.confidenceBand === "low") {
    return read;
  }

  return {
    ...read,
    detectedObjection:
      classification.objection === "PROOF_NOT_VISIBLE"
        ? "Revenue still feels premature because booked proof is not visible yet."
        : read.detectedObjection,
    nextBestAction:
      classification.intent === "START_BOOKED_PROOF"
        ? "Open Booking Inputs and add appointments before asking revenue to carry the story."
        : read.nextBestAction,
    recommendedPath:
      classification.intent === "START_BOOKED_PROOF"
        ? "Booking Inputs -> booked proof -> revenue view"
        : read.recommendedPath,
  };
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const model = resolveEnvValue("REVORY_LLM_MODEL") || DEFAULT_MODEL;
const timeoutMs = normalizeTimeoutMs(resolveEnvValue("REVORY_LLM_TIMEOUT_MS"));
const allowedIntents = ["START_BOOKED_PROOF", "REVIEW_BOOKED_PROOF"];
const allowedObjections = ["PROOF_NOT_VISIBLE", "PROOF_SOURCE_NEEDS_REVIEW"];
const context = {
  hasAppointmentsSourceReady: true,
  hasBookedProofVisible: false,
  hasLeadBaseVisible: false,
  isRevenueSupported: false,
};

const realHappyPath = await runBoundedRequest({
  allowedIntents,
  allowedObjections,
  context,
  fetchImpl: fetch,
  model,
  timeoutMs,
  useCase: "imports",
});

const timeoutScenario = await runBoundedRequest({
  allowedIntents,
  allowedObjections,
  context,
  fetchImpl: createAbortableNeverFetch(),
  model,
  timeoutMs: 25,
  useCase: "imports",
});

let providerFailureCalls = 0;
const providerFailureScenario = await runBoundedRequest({
  allowedIntents,
  allowedObjections,
  context,
  fetchImpl: async () => {
    providerFailureCalls += 1;

    return createJsonResponse(503, {
      error: {
        code: "server_error",
        message: "Simulated provider failure",
        type: "server_error",
      },
    });
  },
  model,
  timeoutMs,
  useCase: "imports",
});

const invalidJsonScenario = await runBoundedRequest({
  allowedIntents,
  allowedObjections,
  context,
  fetchImpl: async () =>
    createJsonResponse(200, {
      id: "mock_invalid_json",
      output_text: "not json at all",
    }),
  model,
  timeoutMs,
  useCase: "imports",
});

const schemaMismatchScenario = await runBoundedRequest({
  allowedIntents,
  allowedObjections,
  context,
  fetchImpl: async () =>
    createJsonResponse(200, {
      id: "mock_schema_mismatch",
      output_text: JSON.stringify({
        confidenceBand: "medium",
        intent: "OPEN_REVENUE_VIEW",
        objection: "NO_ACTIVE_BLOCKER",
        rationale: "Looks fine.",
      }),
    }),
  model,
  timeoutMs,
  useCase: "imports",
});

const fallbackRead = {
  badgeLabel: "Seller guidance",
  detectedObjection:
    "Revenue still reads like configured potential until booked appointments are visible.",
  eyebrow: "Revenue read",
  fallbackLabel: "If proof softens",
  fallbackNote:
    "If booked proof is still missing, Seller keeps revenue waiting and points back to Booking Inputs.",
  guardrailLabel: "Seller stays narrow",
  guardrailNote:
    "This recommendation only uses proof already visible inside the workspace.",
  nextBestAction:
    "Open Booking Inputs and add the appointments file first. That is the shortest move from setup to visible commercial proof.",
  recommendedPath: "Booking Inputs -> booked proof -> revenue view",
  signals: [
    {
      label: "Booked proof",
      note: "This is still the missing proof layer.",
      value: "Not visible yet",
    },
  ],
  summary: "Keep the read simple: booked proof first, then let revenue lead.",
  title: "Booked proof is still the missing link.",
  tone: "future",
};

const continuityAfterNulls = applyDecisionSupportPatch(
  applyDashboardIntentClassification(fallbackRead, null),
  null,
);

const continuityAfterLowConfidence = applyDecisionSupportPatch(
  applyDashboardIntentClassification(fallbackRead, {
    confidenceBand: "low",
    intent: "START_BOOKED_PROOF",
    objection: "PROOF_NOT_VISIBLE",
    rationale: "Low-confidence test only.",
  }),
  null,
);

const result = {
  fallbackContinuity: {
    lowConfidenceKeepsFallback: deepEqual(continuityAfterLowConfidence, fallbackRead),
    nullClassificationAndPatchKeepFallback: deepEqual(continuityAfterNulls, fallbackRead),
    sampleTitle: continuityAfterNulls.title,
    sampleNextBestAction: continuityAfterNulls.nextBestAction,
  },
  runtimeConfig: {
    apiKeyPresent: Boolean(resolveEnvValue("OPENAI_API_KEY")),
    model,
    timeoutMs,
  },
  scenarios: {
    happyPath: realHappyPath,
    invalidJson: invalidJsonScenario,
    providerFailure: {
      ...providerFailureScenario,
      providerCallCount: providerFailureCalls,
    },
    schemaMismatch: schemaMismatchScenario,
    timeout: timeoutScenario,
  },
};

console.log(JSON.stringify(result, null, 2));
