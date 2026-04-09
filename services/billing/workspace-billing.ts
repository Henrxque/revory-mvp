import type {
  RevoryBillingPlan,
  RevoryBillingState,
  RevoryBillingPlanDefinition,
  RevoryWorkspaceBillingSummary,
  WorkspaceBillingLike,
} from "@/types/billing";

const billingPlanCatalog: Record<RevoryBillingPlan, RevoryBillingPlanDefinition> = {
  BASIC: {
    badgeLabel: "Basic",
    ctaLabel: "Start with Basic",
    fitLabel: "Premium entry",
    framing: "The narrow Seller core for contained paid lead volume and one clean booking lane.",
    inAppSignal: "Lean core for one tight booking lane.",
    key: "BASIC",
    label: "Basic",
    supportPoints: [
      "Same booked-proof and revenue-first core",
      "Best when one offer and one lane already stay tight",
      "Keeps the product premium without extra software weight",
    ],
    rank: 1,
    valueSignal: "Best when the clinic needs a clean premium entry, not extra room.",
  },
  GROWTH: {
    badgeLabel: "Growth",
    ctaLabel: "Choose Growth",
    fitLabel: "Best fit",
    framing: "The strongest default path for MedSpas that want the clearest value defense and headroom.",
    inAppSignal: "Best fit for clearer value defense.",
    key: "GROWTH",
    label: "Growth",
    supportPoints: [
      "Best overall balance of proof, clarity, and headroom",
      "Easiest plan to defend in both sale and renewal",
      "Default plan when Seller is the real booking system",
    ],
    rank: 2,
    valueSignal: "Best overall fit once Seller is the real booking system.",
  },
  PREMIUM: {
    badgeLabel: "Premium",
    ctaLabel: "Review Premium fit",
    fitLabel: "Selective fit",
    framing:
      "For MedSpas already proving Seller value and needing more room inside the same narrow booking system.",
    inAppSignal: "More room once Seller value is already proving out.",
    key: "PREMIUM",
    label: "Premium",
    supportPoints: [
      "Best once booked proof and revenue read already feel repeatable",
      "Adds room inside the same premium Seller core",
      "Not a broader platform or enterprise operating layer",
    ],
    rank: 3,
    valueSignal: "Top tier for proven volume, not a broader operating stack.",
  },
};

const stripeBillingStatusMap: Record<string, RevoryBillingState> = {
  active: "ACTIVE",
  canceled: "CANCELED",
  incomplete: "INACTIVE",
  incomplete_expired: "CANCELED",
  past_due: "PAST_DUE",
  paused: "PAST_DUE",
  trialing: "ACTIVE",
  unpaid: "PAST_DUE",
};

export function getBillingPlanDefinition(planKey: RevoryBillingPlan | null | undefined) {
  if (!planKey) {
    return null;
  }

  return billingPlanCatalog[planKey];
}

export function getBillingPlanLabel(planKey: RevoryBillingPlan | null | undefined) {
  return getBillingPlanDefinition(planKey)?.label ?? "No plan";
}

export function normalizeBillingPlanKey(
  value: string | null | undefined,
): RevoryBillingPlan | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "BASIC" || normalized === "GROWTH" || normalized === "PREMIUM") {
    return normalized;
  }

  return null;
}

export function mapStripeSubscriptionStatus(
  stripeStatus: string | null | undefined,
): RevoryBillingState {
  if (!stripeStatus) {
    return "INACTIVE";
  }

  return stripeBillingStatusMap[stripeStatus] ?? "INACTIVE";
}

export function hasStripeBillingIdentity(billing: WorkspaceBillingLike) {
  return Boolean(billing.stripeCustomerId || billing.stripeSubscriptionId);
}

export function isWorkspaceBillingActive(
  billing: Pick<WorkspaceBillingLike, "billingStatus" | "currentPeriodEnd" | "planKey">,
  now = new Date(),
) {
  if (billing.billingStatus !== "ACTIVE" || !billing.planKey) {
    return false;
  }

  if (!billing.currentPeriodEnd) {
    return true;
  }

  return billing.currentPeriodEnd.getTime() >= now.getTime();
}

export function getWorkspaceBillingSummary(
  billing: WorkspaceBillingLike,
  now = new Date(),
): RevoryWorkspaceBillingSummary {
  const plan = getBillingPlanDefinition(billing.planKey);
  const isActive = isWorkspaceBillingActive(billing, now);

  return {
    billingStatus: billing.billingStatus,
    cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
    currentPeriodEnd: billing.currentPeriodEnd,
    hasActiveAccess: isActive,
    hasStripeIdentity: hasStripeBillingIdentity(billing),
    plan,
    planKey: billing.planKey,
    requiresCheckout: !isActive,
    stripeCustomerId: billing.stripeCustomerId,
    stripePriceId: billing.stripePriceId,
    stripeSubscriptionId: billing.stripeSubscriptionId,
  };
}
