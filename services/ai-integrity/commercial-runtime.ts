import "server-only";
import { isSourceCredentialStorageConfigured } from "./credential-vault";
import { COMMERCIAL_RELEASE } from "@/domain/ai-integrity/commercial-offers";

// A separate deployment decision, never implied by a public demo or a price.
export function isAiCommercialRuntimeEnabled() {
  if (process.env.REVORY_AI_RECURRING_MONITOR !== "true" || process.env.REVORY_AI_CUSTOMER_SOURCES !== "true" || process.env.REVORY_AI_CONNECTED_REPORTS !== "true"
    || process.env.REVORY_AI_COMMERCIAL_ENABLED !== "true"
    || !["monitor-399/v1", COMMERCIAL_RELEASE].includes(process.env.REVORY_AI_COMMERCIAL_RELEASE ?? "")
    || process.env.REVORY_AI_COMMERCIAL_SECURITY_REVIEWED !== "true"
    || process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY === "true"
    || !isSourceCredentialStorageConfigured()) return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? "");
    const expected = process.env.REVORY_AI_COMMERCIAL_DATABASE ?? "";
    const app = new URL(process.env.NEXTAUTH_URL ?? "");
    return expected.length > 0 && database.pathname.slice(1) === expected
      && !/^revory_ai_(sandbox|homolog)_/.test(expected)
      && app.protocol === "https:" && !["localhost", "127.0.0.1"].includes(app.hostname)
      && ["test", "live"].includes(process.env.REVORY_AI_MONITOR_BILLING_MODE ?? "")
      && ["test", "live"].includes(process.env.REVORY_AI_CUSTOMER_STRIPE_MODE ?? "")
      && (process.env.VERCEL_ENV !== "production" || process.env.REVORY_AI_MONITOR_BILLING_MODE === "live");
  } catch { return false; }
}
export function monitorLiveMode() {
  return isAiCommercialRuntimeEnabled() && process.env.REVORY_AI_MONITOR_BILLING_MODE === "live";
}
