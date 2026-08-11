export const revoryCommercialOfferContracts = {
  QUOTE_RECOVERY_AUDIT: {
    amountCents: 39900,
    commerciallyAvailable: true,
    currency: "usd",
    interval: null,
    label: "Quote Recovery Audit",
    mode: "payment",
    priceEnv: "STRIPE_QUOTE_RECOVERY_AUDIT_PRICE_ID",
    priceUsd: 399,
    publiclyListed: true,
  },
  FULL_REVENUE_LEAK_AUDIT: {
    amountCents: 149900,
    commerciallyAvailable: false,
    currency: "usd",
    interval: null,
    label: "Full Revenue Leak Audit",
    mode: "payment",
    priceEnv: "STRIPE_FULL_REVENUE_LEAK_AUDIT_PRICE_ID",
    priceUsd: 1499,
    publiclyListed: false,
  },
  STARTER: {
    amountCents: 39900,
    commerciallyAvailable: true,
    currency: "usd",
    interval: "month",
    label: "Starter",
    mode: "subscription",
    priceEnv: "STRIPE_STARTER_PRICE_ID",
    priceUsd: 399,
    publiclyListed: true,
  },
  GROWTH: {
    amountCents: 59900,
    commerciallyAvailable: true,
    currency: "usd",
    interval: "month",
    label: "Growth",
    mode: "subscription",
    priceEnv: "STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID",
    priceUsd: 599,
    publiclyListed: true,
  },
  PRO: {
    amountCents: 149900,
    commerciallyAvailable: false,
    currency: "usd",
    interval: "month",
    label: "Pro",
    mode: "subscription",
    priceEnv: "STRIPE_REVORY_PRO_MONTHLY_PRICE_ID",
    priceUsd: 1499,
    publiclyListed: false,
  },
} as const;

export type RevoryCommercialOfferKey = keyof typeof revoryCommercialOfferContracts;
export type CurrentPublicOfferKey = "QUOTE_RECOVERY_AUDIT" | "STARTER" | "GROWTH";

/**
 * The commercial journey is a recommendation, never a checkout prerequisite.
 * Keep this order aligned with the public landing and /start presentation.
 */
export const currentPublicOfferJourney = [
  "QUOTE_RECOVERY_AUDIT",
  "STARTER",
  "GROWTH",
] as const satisfies readonly CurrentPublicOfferKey[];

