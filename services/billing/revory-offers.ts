import "server-only";
import type { RevoryOfferKey } from "@prisma/client";

import { revoryCommercialOfferContracts } from "@/domain/revory/commercial-offers";
import { isStripeBillingConfigured } from "@/services/billing/stripe-runtime";

export const revoryOffers = revoryCommercialOfferContracts satisfies Record<RevoryOfferKey, (typeof revoryCommercialOfferContracts)[RevoryOfferKey]>;

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
