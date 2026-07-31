import "server-only";

import Stripe from "stripe";

import type { RevoryBillingPlan } from "@/types/billing";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "http://localhost:3000";

const priceIdsByPlan: Record<RevoryBillingPlan, string> = {
  BASIC: process.env.STRIPE_BASIC_PRICE_ID?.trim() ?? "",
  GROWTH: process.env.STRIPE_GROWTH_PRICE_ID?.trim() ?? "",
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID?.trim() ?? "",
};

let stripeClientSingleton: Stripe | null = null;

function hasValidStripeSecretKey() {
  if (!stripeSecretKey || /replace|placeholder|changeme/i.test(stripeSecretKey)) {
    return false;
  }

  const isLiveEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase() === "production";

  return isLiveEnvironment
    ? stripeSecretKey.startsWith("sk_live_")
    : stripeSecretKey.startsWith("sk_test_");
}

function hasValidStripeWebhookSecret() {
  return stripeWebhookSecret.startsWith("whsec_") &&
    !/replace|placeholder|changeme/i.test(stripeWebhookSecret);
}

export function isStripeCheckoutConfiguredForPlan(planKey: RevoryBillingPlan) {
  if (planKey === "PREMIUM") {
    return false;
  }

  return Boolean(hasValidStripeSecretKey() && priceIdsByPlan[planKey]?.startsWith("price_"));
}

export function isStripeBillingConfigured() {
  return hasValidStripeSecretKey();
}

export function isStripeWebhookConfigured() {
  return hasValidStripeSecretKey() && hasValidStripeWebhookSecret();
}

export function getStripeAppUrl() {
  return appUrl;
}

export function getStripeWebhookSecret() {
  if (!stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return stripeWebhookSecret;
}

export function getStripePriceId(planKey: RevoryBillingPlan) {
  const priceId = priceIdsByPlan[planKey];

  if (!priceId) {
    throw new Error(`Stripe price ID missing for ${planKey}.`);
  }

  return priceId;
}

export function getBillingPlanByStripePriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  return (
    Object.entries(priceIdsByPlan).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0] ??
    null
  ) as RevoryBillingPlan | null;
}

export function getStripeServerClient() {
  if (!hasValidStripeSecretKey()) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClientSingleton ??= new Stripe(stripeSecretKey);

  return stripeClientSingleton;
}
