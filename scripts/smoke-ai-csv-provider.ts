import fs from "node:fs";
import path from "node:path";

type SmokeResult = {
  durationMs?: number;
  model: string;
  payloadBytes?: number;
  reason?: string;
  status: "FAILED" | "PASSED" | "SKIPPED";
};

const cwd = process.cwd();
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_TIMEOUT_MS = "4000";

function readEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries: Record<string, string> = {};
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

function resolveEnvValue(key: string) {
  if (process.env[key]?.trim()) {
    return process.env[key]?.trim() ?? "";
  }

  if (typeof dotEnvLocal[key] === "string" && dotEnvLocal[key].trim().length > 0) {
    return dotEnvLocal[key].trim();
  }

  if (typeof dotEnv[key] === "string" && dotEnv[key].trim().length > 0) {
    return dotEnv[key].trim();
  }

  return "";
}

function hydrateLlmEnvironment() {
  const keys = [
    "OPENAI_API_KEY",
    "REVORY_LLM_ENABLED",
    "REVORY_LLM_MODEL",
    "REVORY_LLM_TIMEOUT_MS",
  ];

  keys.forEach((key) => {
    if (!process.env[key]?.trim()) {
      const value = resolveEnvValue(key);

      if (value) {
        process.env[key] = value;
      }
    }
  });
}

function logResult(result: SmokeResult) {
  console.log(`[ai-csv-provider-smoke] ${JSON.stringify(result)}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function hasDeterministicFallbackWarning(warnings: readonly string[]) {
  return warnings.some((warning) =>
    warning.toLowerCase().includes("deterministic mapping fallback"),
  );
}

hydrateLlmEnvironment();

const featureEnabled = process.env.REVORY_LLM_ENABLED !== "false";
const apiKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim());
const model = process.env.REVORY_LLM_MODEL?.trim() || DEFAULT_MODEL;

if (!featureEnabled) {
  logResult({
    model,
    reason: "REVORY_LLM_ENABLED=false",
    status: "SKIPPED",
  });
  process.exit(0);
}

if (!apiKeyPresent) {
  logResult({
    model,
    reason: "OPENAI_API_KEY is not configured",
    status: "SKIPPED",
  });
  process.exit(0);
}

process.env.REVORY_LLM_TIMEOUT_MS =
  process.env.REVORY_LLM_TIMEOUT_MS?.trim() || DEFAULT_TIMEOUT_MS;

const syntheticAppointmentCsv = [
  "Appt ID,Appt Date,Status,Client Full Name,Email,Mobile,Price,Provider,Service,Notes",
  "synthetic-appt-1,2026-06-01,NO_SHOW,Synthetic Client,synthetic@example.test,+15550000001,450,Synthetic Provider,Hydrafacial,Synthetic note",
  "synthetic-appt-2,2026-06-03,CANCELED,Synthetic Client 2,synthetic2@example.test,+15550000002,650,Synthetic Provider,Botox,Synthetic note",
].join("\n");

const originalFetch = globalThis.fetch;
let payloadBytes = 0;
let providerDurationMs = 0;
let providerRequestBody = "";

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof init?.body === "string") {
    providerRequestBody = init.body;
    payloadBytes = Buffer.byteLength(init.body, "utf8");
  }

  const startedAt = Date.now();
  const response = await originalFetch(input, init);

  providerDurationMs = Date.now() - startedAt;

  return response;
}) as typeof fetch;

async function main() {
  const { requestAiCsvTriage } = await import("../services/imports/ai-csv-triage");
  const { buildDeterministicCsvMappingFallback } = await import(
    "../services/imports/csv-mapping-fallback"
  );
  const deterministic =
    buildDeterministicCsvMappingFallback(syntheticAppointmentCsv);

  const providerResult = await requestAiCsvTriage({
    deterministic,
    encoding: "utf-8",
  });

  const forbiddenRawValues = [
    syntheticAppointmentCsv,
    "Synthetic Client",
    "Synthetic Client 2",
    "synthetic@example.test",
    "synthetic2@example.test",
    "+15550000001",
    "+15550000002",
    "Synthetic note",
  ];

  for (const value of forbiddenRawValues) {
    assert(
      !providerRequestBody.includes(value),
      `Provider payload must not contain raw synthetic value: ${value}.`,
    );
  }

  assert(
    providerRequestBody.includes("redacted_text") &&
      providerRequestBody.includes("email_like") &&
      providerRequestBody.includes("phone_like"),
    "Provider payload should contain sanitized value shapes.",
  );
  assert(
    !hasDeterministicFallbackWarning(providerResult.warnings),
    "Configured provider did not return valid strict structured output; deterministic fallback was used.",
  );
  assert(
    providerResult.reviewRequired === true,
    "AI CSV provider smoke must keep reviewRequired=true.",
  );
  assert(
    providerResult.detectedDatasetType === "APPOINTMENTS",
    `Expected APPOINTMENTS, got ${providerResult.detectedDatasetType}.`,
  );
  assert(
    providerResult.columnMapping["Appt Date"] === "scheduledAt",
    "Provider response did not return the expected scheduledAt mapping.",
  );
  assert(
    payloadBytes > 0 && payloadBytes < 20000,
    `Expected bounded payload under 20KB, got ${payloadBytes} bytes.`,
  );

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        output_text: "{invalid-json",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      },
    )) as typeof fetch;

  const fallbackResult = await requestAiCsvTriage({
    deterministic,
    encoding: "utf-8",
  });

  assert(
    hasDeterministicFallbackWarning(fallbackResult.warnings),
    "Invalid provider output should fall back to deterministic mapping.",
  );
  assert(
    fallbackResult.reviewRequired === true,
    "Fallback result must still require user review.",
  );
  assert(
    fallbackResult.columnMapping["Appt Date"] === "scheduledAt",
    "Fallback should preserve deterministic mapping.",
  );

  logResult({
    durationMs: providerDurationMs,
    model,
    payloadBytes,
    status: "PASSED",
  });
}

main()
  .catch((error) => {
    logResult({
      durationMs: providerDurationMs || undefined,
      model,
      payloadBytes: payloadBytes || undefined,
      reason: error instanceof Error ? error.message : "Unknown smoke failure",
      status: "FAILED",
    });
    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
  });
