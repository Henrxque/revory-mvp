import "server-only";
import { isAiCommercialRuntimeEnabled, monitorLiveMode } from "./commercial-runtime";
import { SCAN_LIVE_OFFER_VERSION } from "@/domain/ai-integrity/commercial-offers";

export function isAiIntegrityRemoteSyntheticPreviewEnabled() {
  const expectedDatabase = process.env.REVORY_AI_SAAS_SYNTHETIC_DATABASE ?? "";
  let actualDatabase = "";
  try { actualDatabase = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1); }
  catch { return false; }
  return /^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/.test(expectedDatabase)
    && actualDatabase === expectedDatabase
    && process.env.NODE_ENV === "production"
    && process.env.VERCEL_ENV === "preview"
    && process.env.REVORY_AI_SAAS_PREVIEW === "true"
    && process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY === "true";
}

export function isAiIntegrityExperienceEnabled() {
  return isAiCommercialRuntimeEnabled() || process.env.REVORY_AI_SAAS_PREVIEW === "true"
    && (process.env.NODE_ENV !== "production" || isAiIntegrityRemoteSyntheticPreviewEnabled());
}

export function aiScanEligibleOrderWhere() {
  if (monitorLiveMode()) return { status: "PAID", checkoutDriver: "stripe-live", offerVersion: SCAN_LIVE_OFFER_VERSION };
  return isAiIntegrityRemoteSyntheticPreviewEnabled()
    ? { status: { in: ["PAID", "SYNTHETIC_PREVIEW"] } }
    : { status: "PAID" };
}
export function aiConnectedScanOrderWhere() {
  return monitorLiveMode() ? { status: "PAID", checkoutDriver: "stripe-live", offerVersion: SCAN_LIVE_OFFER_VERSION } : { status: "PAID", checkoutDriver: "stripe-test" };
}
