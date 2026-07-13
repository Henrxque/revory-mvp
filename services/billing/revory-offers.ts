import "server-only";
import type { RevoryOfferKey } from "@prisma/client";

export const revoryOffers = {
  QUOTE_RECOVERY_AUDIT: { commerciallyAvailable: true, label: "Quote Recovery Audit", priceUsd: 799, mode: "payment", priceEnv: "STRIPE_QUOTE_RECOVERY_AUDIT_PRICE_ID" },
  STARTER: { commerciallyAvailable: true, label: "Starter", priceUsd: 399, mode: "subscription", priceEnv: "STRIPE_STARTER_PRICE_ID" },
  GROWTH: { commerciallyAvailable: false, label: "Growth", priceUsd: 799, mode: "subscription", priceEnv: null },
} as const;

export function getRevoryOffer(key: RevoryOfferKey) { return revoryOffers[key]; }
export function getRevoryOfferPriceId(key: RevoryOfferKey) { const priceEnv = revoryOffers[key].priceEnv; return priceEnv ? process.env[priceEnv]?.trim() ?? "" : ""; }
export function isRevoryOfferConfigured(key: RevoryOfferKey) { return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && getRevoryOfferPriceId(key)); }
export function parseRevoryOffer(value: string | null): RevoryOfferKey { return value === "STARTER" ? "STARTER" : "QUOTE_RECOVERY_AUDIT"; }
