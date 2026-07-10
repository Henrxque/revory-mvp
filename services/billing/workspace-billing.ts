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
    badgeLabel: "REVORY",
    ctaLabel: "REVORY",
    fitLabel: "Legacy access",
    framing:
      "Legacy REVORY access retained for billing compatibility.",
    inAppSignal: "REVORY access is active.",
    key: "BASIC",
    label: "REVORY",
    supportPoints: [
      "Dashboard leak read and Revenue Leaks Page",
      "AI-assisted CSV review and Data Quality Check",
      "Daily Leak Brief",
      "No Manual Quick Add or shareable executive summary",
    ],
    rank: 1,
    valueSignal: "Legacy access retained for existing subscriptions.",
  },
  GROWTH: {
    badgeLabel: "REVORY",
    ctaLabel: "Get your first leak read",
    fitLabel: "Founding clinic launch price",
    framing:
      "The complete self-service REVORY revenue leak read.",
    inAppSignal: "REVORY access is active.",
    key: "GROWTH",
    label: "REVORY",
    supportPoints: [
      "Dashboard leak read, Revenue Leaks Page and Daily Leak Brief",
      "AI-assisted CSV review and Data Quality Check",
      "Evidence, confidence, and recommended actions",
      "Executive Revenue Leak Summary with copy, share, and print",
    ],
    rank: 2,
    valueSignal: "The complete public REVORY offer.",
  },
  PREMIUM: {
    badgeLabel: "REVORY",
    ctaLabel: "REVORY",
    fitLabel: "Legacy access",
    framing:
      "Legacy REVORY access retained for billing compatibility.",
    inAppSignal: "REVORY access is active.",
    key: "PREMIUM",
    label: "REVORY",
    supportPoints: [
      "Not available for checkout yet",
      "No manual fit review in the current motion",
      "Future tier must stay inside the narrow Revenue Leak Detector model",
    ],
    rank: 3,
    valueSignal: "Legacy access retained for existing subscriptions.",
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
