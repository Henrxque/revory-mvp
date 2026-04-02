import "server-only";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.REVORY_LLM_MODEL?.trim() || "gpt-5-mini";
const DEFAULT_TIMEOUT_MS = Number(process.env.REVORY_LLM_TIMEOUT_MS ?? "2500");
const DEFAULT_MAX_OUTPUT_TOKENS = 220;
const MAX_ATTEMPTS = 2;
const loggedWarnings = new Set<string>();

type RequestBoundedStructuredOutputInput<T> = {
  context: Record<string, unknown>;
  outputName: string;
  parse: (value: unknown) => T | null;
  prompt: string;
  schema: Record<string, unknown>;
  useCase: string;
};

function logFallbackOnce(useCase: string, reason: string) {
  const key = `${useCase}:${reason}`;

  if (loggedWarnings.has(key)) {
    return;
  }

  loggedWarnings.add(key);
  console.warn(`[revory-llm] ${useCase} fallback: ${reason}`);
}

function isFeatureEnabled() {
  return process.env.REVORY_LLM_ENABLED !== "false";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractResponseText(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  const output = payload.output;

  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
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

async function requestStructuredOutputAttempt<T>(
  input: RequestBoundedStructuredOutputInput<T>,
  attempt: number,
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    logFallbackOnce(input.useCase, "missing_openai_api_key");
    return null;
  }

  const timeoutMs = Number.isFinite(DEFAULT_TIMEOUT_MS) ? DEFAULT_TIMEOUT_MS : 2500;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      body: JSON.stringify({
        input: [
          {
            content: input.prompt,
            role: "developer",
          },
          {
            content: JSON.stringify({
              context: input.context,
              useCase: input.useCase,
            }),
            role: "user",
          },
        ],
        max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
        model: DEFAULT_MODEL,
        reasoning: {
          effort: "low",
        },
        store: false,
        text: {
          format: {
            name: input.outputName,
            schema: input.schema,
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

    if (!response.ok) {
      const shouldRetry = response.status >= 500 || response.status === 429;

      if (shouldRetry && attempt < MAX_ATTEMPTS) {
        return null;
      }

      logFallbackOnce(input.useCase, `openai_http_${response.status}`);
      return null;
    }

    const payload = (await response.json()) as unknown;
    const rawText = extractResponseText(payload);

    if (!rawText) {
      logFallbackOnce(input.useCase, "empty_output");
      return null;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      logFallbackOnce(input.useCase, "invalid_json");
      return null;
    }

    const result = input.parse(parsed);

    if (!result) {
      logFallbackOnce(input.useCase, "schema_validation_failed");
      return null;
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[revory-llm] ${input.useCase} success in ${Date.now() - startedAt}ms on attempt ${attempt}`,
      );
    }

    return result;
  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "request_failed";
      logFallbackOnce(input.useCase, reason);
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestBoundedStructuredOutput<T>(
  input: RequestBoundedStructuredOutputInput<T>,
): Promise<T | null> {
  if (!isFeatureEnabled()) {
    logFallbackOnce(input.useCase, "feature_disabled");
    return null;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await requestStructuredOutputAttempt(input, attempt);

    if (result) {
      return result;
    }
  }

  return null;
}
