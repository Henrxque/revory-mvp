import "server-only";

const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_TIMEOUT_MS = 4000;
const loggedProviderStates = new Set<string>();

export type RevoryLlmRuntimeStatus = {
  apiKeyPresent: boolean;
  featureEnabled: boolean;
  model: string;
  providerAvailable: boolean;
  timeoutMs: number;
};

function normalizeTimeoutMs(value: string | undefined) {
  const parsed = Number(value ?? `${DEFAULT_TIMEOUT_MS}`);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function getLlmRuntimeStatus(): RevoryLlmRuntimeStatus {
  const featureEnabled = process.env.REVORY_LLM_ENABLED !== "false";
  const apiKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim());
  const model = process.env.REVORY_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const timeoutMs = normalizeTimeoutMs(process.env.REVORY_LLM_TIMEOUT_MS);

  return {
    apiKeyPresent,
    featureEnabled,
    model,
    providerAvailable: featureEnabled && apiKeyPresent,
    timeoutMs,
  };
}

export function logLlmProviderStateOnce(status: RevoryLlmRuntimeStatus) {
  const key = `${status.featureEnabled}:${status.apiKeyPresent}:${status.model}:${status.timeoutMs}`;

  if (loggedProviderStates.has(key)) {
    return;
  }

  loggedProviderStates.add(key);

  const message = status.providerAvailable
    ? `[revory-llm] provider available (model=${status.model}, timeout_ms=${status.timeoutMs})`
    : `[revory-llm] provider unavailable (feature_enabled=${status.featureEnabled}, api_key_present=${status.apiKeyPresent}, model=${status.model}, timeout_ms=${status.timeoutMs})`;

  if (status.providerAvailable) {
    console.info(message);
    return;
  }

  console.warn(message);
}
