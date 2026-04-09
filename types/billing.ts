export const revoryBillingPlanKeys = [
  "BASIC",
  "GROWTH",
  "PREMIUM",
] as const;

export const revoryBillingStatuses = [
  "INACTIVE",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
] as const;

export type RevoryBillingPlan = (typeof revoryBillingPlanKeys)[number];
export type RevoryBillingState = (typeof revoryBillingStatuses)[number];

export type WorkspaceBillingLike = {
  billingStatus: RevoryBillingState;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  planKey: RevoryBillingPlan | null;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  stripeSubscriptionId: string | null;
};

export type RevoryBillingPlanDefinition = {
  badgeLabel: string;
  ctaLabel: string;
  fitLabel: string;
  framing: string;
  inAppSignal: string;
  key: RevoryBillingPlan;
  label: string;
  supportPoints: readonly string[];
  rank: number;
  valueSignal: string;
};

export type RevoryWorkspaceBillingSummary = {
  billingStatus: RevoryBillingState;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  hasActiveAccess: boolean;
  hasStripeIdentity: boolean;
  plan: RevoryBillingPlanDefinition | null;
  planKey: RevoryBillingPlan | null;
  requiresCheckout: boolean;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  stripeSubscriptionId: string | null;
};
