import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import { isAiCommercialRuntimeEnabled } from "../services/ai-integrity/commercial-runtime";

// No transport or database access: exercise the actual production routing gate.
Object.assign(process.env, {
  VERCEL_ENV: "production", DATABASE_URL: "postgresql://runtime:fixture@localhost/neondb",
  NEXTAUTH_URL: "https://revory.app", REVORY_AI_COMMERCIAL_DATABASE: "neondb",
  REVORY_AI_COMMERCIAL_ENABLED: "true", REVORY_AI_COMMERCIAL_RELEASE: "monitor-399/v1",
  REVORY_AI_COMMERCIAL_SECURITY_REVIEWED: "true", REVORY_AI_RECURRING_MONITOR: "true",
  REVORY_AI_CUSTOMER_SOURCES: "true", REVORY_AI_CONNECTED_REPORTS: "true",
  REVORY_AI_SAAS_SYNTHETIC_ONLY: "false", REVORY_AI_MONITOR_BILLING_MODE: "live",
  REVORY_AI_CUSTOMER_STRIPE_MODE: "live", REVORY_AI_CONNECTION_ACTIVE_KEY: "fixture",
  REVORY_AI_CONNECTION_KEYRING: JSON.stringify({ fixture: Buffer.alloc(32, 7).toString("base64") }),
});
const response = (path: string) => proxy(new NextRequest("https://revory.app" + path));
assert.equal(isAiCommercialRuntimeEnabled(), true);
for (const path of ["/app/dashboard", "/app/imports", "/app/settings"]) {
  assert.equal(response(path).status, 303);
  assert.equal(response(path).headers.get("location"), "https://revory.app/app/ai-integrity/dashboard");
}
for (const path of ["/app/ai-integrity/dashboard", "/app/settings/data-export", "/api/auth/session", "/api/billing/webhook", "/api/health"]) {
  assert.equal(response(path).headers.get("x-middleware-next"), "1");
}
for (const [key, bad] of Object.entries({
  REVORY_AI_COMMERCIAL_ENABLED: "false", REVORY_AI_COMMERCIAL_DATABASE: "wrong_database",
  REVORY_AI_COMMERCIAL_SECURITY_REVIEWED: "false", REVORY_AI_MONITOR_BILLING_MODE: "test",
  REVORY_AI_CONNECTION_KEYRING: "{}", REVORY_AI_SAAS_SYNTHETIC_ONLY: "true",
})) {
  const original=process.env[key]; process.env[key]=bad;
  assert.equal(isAiCommercialRuntimeEnabled(), false, key);
  assert.equal(response("/app/dashboard").headers.get("x-middleware-next"), "1", key);
  process.env[key]=original;
}
console.log("PASS: commercial routing, closed/misconfigured gates, legacy webhook/auth preservation.");
