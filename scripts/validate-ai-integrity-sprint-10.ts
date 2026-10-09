import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isAiIntegrityExperienceEnabled, isAiIntegrityRemoteSyntheticPreviewEnabled } from "../services/ai-integrity/experience";
import { assertAiSyntheticPreviewSample } from "../services/ai-integrity/synthetic-sample-policy";

const original = Object.fromEntries(["NODE_ENV", "VERCEL_ENV", "REVORY_AI_SAAS_PREVIEW", "REVORY_AI_SAAS_SYNTHETIC_ONLY", "REVORY_AI_SAAS_SYNTHETIC_DATABASE", "DATABASE_URL"].map((key) => [key, process.env[key]]));
try {
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.REVORY_AI_SAAS_PREVIEW = "true";
  process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY = "true";
  process.env.REVORY_AI_SAAS_SYNTHETIC_DATABASE = "revory_ai_homolog_123456abcdef";
  process.env.DATABASE_URL = "postgresql://example:example@localhost:5432/revory_ai_homolog_123456abcdef";
  process.env.VERCEL_ENV = "production";
  assert.equal(isAiIntegrityExperienceEnabled(), false);
  process.env.VERCEL_ENV = "preview";
  assert.equal(isAiIntegrityRemoteSyntheticPreviewEnabled(), true);
  assert.equal(isAiIntegrityExperienceEnabled(), true);
  process.env.DATABASE_URL = "postgresql://example:example@localhost:5432/revory_mvp";
  assert.equal(isAiIntegrityExperienceEnabled(), false);
  process.env.DATABASE_URL = "postgresql://example:example@localhost:5432/revory_ai_homolog_123456abcdef";
  for (const [kind, file] of [["STRIPE_REVENUE", "stripe-revenue.csv"], ["INTERNAL_LEDGER", "internal-ledger.csv"], ["PROVIDER_REPORT", "provider-report.csv"]] as const) {
    const bytes = new Uint8Array(await readFile(`public/samples/ai-integrity/${file}`));
    assert.doesNotThrow(() => assertAiSyntheticPreviewSample({ bytes, fileName: file, mimeType: "text/csv" }, kind));
    const changed = bytes.slice(); changed[0] ^= 1;
    assert.throws(() => assertAiSyntheticPreviewSample({ bytes: changed, fileName: file, mimeType: "text/csv" }, kind), /only the three bundled synthetic/);
  }
  process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY = "false";
  assert.equal(isAiIntegrityExperienceEnabled(), false);
  Reflect.set(process.env, "NODE_ENV", "development");
  assert.equal(isAiIntegrityExperienceEnabled(), true);
  console.log("Sprint 10 preview gate PASS: production closed, protected preview open, only exact synthetic samples accepted.");
} finally {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}
