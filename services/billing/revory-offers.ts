import "server-only";
import type { RevoryOfferKey } from "@prisma/client";

export const revoryOffers = {
  QUOTE_RECOVERY_AUDIT: { label: "Quote Recovery Audit", priceUsd: 799, mode: "payment", priceEnv: "STRIPE_QUOTE_RECOVERY_AUDIT_PRICE_ID" },
  STARTER: { label: "Starter", priceUsd: 399, mode: "subscription", priceEnv: "STRIPE_STARTER_PRICE_ID" },
} as const;

export function getRevoryOffer(key: RevoryOfferKey) { return revoryOffers[key]; }
export function getRevoryOfferPriceId(key: RevoryOfferKey) { return process.env[revoryOffers[key].priceEnv]?.trim() ?? ""; }
export function isRevoryOfferConfigured(key: RevoryOfferKey) { return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && getRevoryOfferPriceId(key)); }
export function parseRevoryOffer(value: string | null): RevoryOfferKey { return value === "STARTER" ? "STARTER" : "QUOTE_RECOVERY_AUDIT"; }
