import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_TIMEOUT_MS = 4000;

function normalizeTimeoutMs(value) {
  const parsed = Number(value ?? `${DEFAULT_TIMEOUT_MS}`);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function fileHasOpenAiKey(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^OPENAI_API_KEY\s*=\s*"?(.+?)"?\s*$/);

    if (!match) {
      continue;
    }

    return match[1].trim().length > 0;
  }

  return false;
}

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
    const value = trimmed.replace(/^"/, "").replace(/"$/, "");

    entries[key] = value;
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

const featureEnabled = resolveEnvValue("REVORY_LLM_ENABLED") !== "false";
const apiKeyPresent = Boolean(resolveEnvValue("OPENAI_API_KEY"));
const model = resolveEnvValue("REVORY_LLM_MODEL") || DEFAULT_MODEL;
const timeoutMs = normalizeTimeoutMs(resolveEnvValue("REVORY_LLM_TIMEOUT_MS"));

const status = {
  apiKeyPresent,
  dotenvHasKey: fileHasOpenAiKey(path.join(cwd, ".env")),
  dotenvLocalHasKey: fileHasOpenAiKey(path.join(cwd, ".env.local")),
  featureEnabled,
  model,
  providerAvailable: featureEnabled && apiKeyPresent,
  timeoutMs,
};

console.log(JSON.stringify(status, null, 2));
