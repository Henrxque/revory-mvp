import type {
  RevoryBillingPlan,
  RevoryBillingState,
  RevoryBillingPlanDefinition,
  RevoryWorkspaceBillingSummary,
  WorkspaceBillingLike,
} from "@/types/billing";

type RevoryBillingFeature =
  | "EXECUTIVE_PROOF_SHARE"
  | "MANUAL_LEAD_QUICK_ADD";

const billingPlanCatalog: Record<RevoryBillingPlan, RevoryBillingPlanDefinition> = {
  BASIC: {
    badgeLabel: "Basic",
    ctaLabel: "Start with Basic",
    fitLabel: "Entry plan",
    framing:
      "A lower-friction entry plan for the narrow Seller core without Growth's premium action and proof tools.",
    inAppSignal: "Entry plan with limited premium actions.",
    key: "BASIC",
    label: "Basic",
    supportPoints: [
      "Revenue-first dashboard and booked proof",
      "Import-first booking assistance read",
      "No Manual Quick Add or shareable proof export",
    ],
    rank: 1,
    valueSignal: "Entry plan for trying the core read; Growth is the complete MVP.",
  },
  GROWTH: {
    badgeLabel: "Growth",
    ctaLabel: "Start with Growth",
    fitLabel: "Main plan",
    framing:
      "The complete self-service plan for the REVORY Seller MVP as it exists today.",
    inAppSignal: "Complete MVP plan.",
    key: "GROWTH",
    label: "Growth",
    supportPoints: [
      "Full booking assistance and bounded suggested message",
      "Manual Quick Add for one-off lead entry",
      "Executive Proof Summary with copy, share, and print",
    ],
    rank: 2,
    valueSignal: "The main plan and the full product package for the current MVP.",
  },
  PREMIUM: {
    badgeLabel: "Premium",
    ctaLabel: "Coming later",
    fitLabel: "Future tier",
    framing:
      "A future tier placeholder. Premium is not available, not checkout-enabled, and not a manual sales motion today.",
    inAppSignal: "Future tier; not available today.",
    key: "PREMIUM",
    label: "Premium",
    supportPoints: [
      "Not available for checkout yet",
      "No manual fit review in the current motion",
      "Future tier must stay inside the narrow Seller model",
    ],
    rank: 3,
    valueSignal: "Future tier only; not part of the current sales motion.",
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

export function canUseBillingPlanFeature(
  planKey: RevoryBillingPlan | null | undefined,
  feature: RevoryBillingFeature,
) {
  switch (feature) {
    case "EXECUTIVE_PROOF_SHARE":
    case "MANUAL_LEAD_QUICK_ADD":
      return planKey === "GROWTH";
  }
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
