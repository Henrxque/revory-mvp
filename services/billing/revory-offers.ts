import "server-only";
import type { RevoryOfferKey } from "@prisma/client";

import { isStripeBillingConfigured } from "@/services/billing/stripe-runtime";

export const revoryOffers = {
  QUOTE_RECOVERY_AUDIT: { amountCents: 39900, commerciallyAvailable: true, currency: "usd", interval: null, label: "Quote Recovery Audit", mode: "payment", priceEnv: "STRIPE_QUOTE_RECOVERY_AUDIT_PRICE_ID", priceUsd: 399, publiclyListed: true },
  FULL_REVENUE_LEAK_AUDIT: { amountCents: 149900, commerciallyAvailable: false, currency: "usd", interval: null, label: "Full Revenue Leak Audit", mode: "payment", priceEnv: "STRIPE_FULL_REVENUE_LEAK_AUDIT_PRICE_ID", priceUsd: 1499, publiclyListed: false },
  STARTER: { amountCents: 39900, commerciallyAvailable: true, currency: "usd", interval: "month", label: "Starter", mode: "subscription", priceEnv: "STRIPE_STARTER_PRICE_ID", priceUsd: 399, publiclyListed: true },
  GROWTH: { amountCents: 59900, commerciallyAvailable: true, currency: "usd", interval: "month", label: "Growth", mode: "subscription", priceEnv: "STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID", priceUsd: 599, publiclyListed: true },
  PRO: { amountCents: 149900, commerciallyAvailable: false, currency: "usd", interval: "month", label: "Pro", mode: "subscription", priceEnv: "STRIPE_REVORY_PRO_MONTHLY_PRICE_ID", priceUsd: 1499, publiclyListed: false },
} as const;

export function getRevoryOffer(key: RevoryOfferKey) { return revoryOffers[key]; }
export function getRevoryOfferPriceId(key: RevoryOfferKey) { const priceEnv = revoryOffers[key].priceEnv; return priceEnv ? process.env[priceEnv]?.trim() ?? "" : ""; }
const legacyPriceEnv: Partial<Record<RevoryOfferKey, string>> = {
  STARTER: "STRIPE_STARTER_LEGACY_PRICE_IDS",
  GROWTH: "STRIPE_REVORY_GROWTH_LEGACY_PRICE_IDS",
  PRO: "STRIPE_REVORY_PRO_LEGACY_PRICE_IDS",
};
export function getRevoryOfferLegacyPriceIds(key: RevoryOfferKey) {
  const envName = legacyPriceEnv[key];
  return new Set((envName ? process.env[envName] : "")?.split(",").map((value) => value.trim()).filter(Boolean));
}
export function revoryStripePriceMatchesContract(
  key: RevoryOfferKey,
  price: { active?: boolean; currency?: string; id?: string; recurring?: { interval?: string } | null; unit_amount?: number | null },
) {
  const offer = getRevoryOffer(key);
  return price.active !== false
    && price.id === getRevoryOfferPriceId(key)
    && price.currency?.toLowerCase() === offer.currency
    && price.unit_amount === offer.amountCents
    && (offer.mode === "payment" ? price.recurring == null : price.recurring?.interval === offer.interval);
}
export function revoryStripePriceMatchesEntitlementContract(
  key: RevoryOfferKey,
  price: { active?: boolean; currency?: string; id?: string; recurring?: { interval?: string } | null; unit_amount?: number | null },
) {
  if (revoryStripePriceMatchesContract(key, price)) return true;
  const offer = getRevoryOffer(key);
  return Boolean(
    price.id
      && getRevoryOfferLegacyPriceIds(key).has(price.id)
      && price.currency?.toLowerCase() === offer.currency
      && offer.mode === "subscription"
      && price.recurring?.interval === offer.interval,
  );
}
export function isPaidCheckoutReleaseEnabled() { return process.env.REVORY_PAID_CHECKOUT_ENABLED?.trim().toLowerCase() === "true"; }
export function isRevoryOfferConfigured(key: RevoryOfferKey) {
  const priceId = getRevoryOfferPriceId(key);

  return Boolean(
    isPaidCheckoutReleaseEnabled() &&
    revoryOffers[key].commerciallyAvailable &&
    isStripeBillingConfigured() &&
    priceId.startsWith("price_"),
  );
}
export function parseRevoryOffer(value: string | null): RevoryOfferKey | null {
  return value === "QUOTE_RECOVERY_AUDIT" || value === "FULL_REVENUE_LEAK_AUDIT" || value === "STARTER" || value === "GROWTH" || value === "PRO"
    ? value
    : null;
}
