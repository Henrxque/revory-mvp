import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/db/prisma";
import type { RevoryBillingPlan } from "@/types/billing";
import {
  getBillingPlanByStripePriceId,
  getStripeServerClient,
} from "@/services/billing/stripe-runtime";
import {
  getWorkspaceBillingSummary,
  mapStripeSubscriptionStatus,
} from "@/services/billing/workspace-billing";

const workspaceBillingSelect = {
  id: true,
  planKey: true,
  billingStatus: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePriceId: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
} as const;

async function findWorkspaceForStripeSync(input: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  workspaceId?: string | null;
}) {
  if (input.stripeSubscriptionId) {
    const bySubscription = await prisma.workspace.findUnique({
      where: {
        stripeSubscriptionId: input.stripeSubscriptionId,
      },
      select: workspaceBillingSelect,
    });

    if (bySubscription) {
      return bySubscription;
    }
  }

  if (input.stripeCustomerId) {
    const byCustomer = await prisma.workspace.findUnique({
      where: {
        stripeCustomerId: input.stripeCustomerId,
      },
      select: workspaceBillingSelect,
    });

    if (byCustomer) {
      return byCustomer;
    }
  }

  if (input.workspaceId) {
    return prisma.workspace.findUnique({
      where: {
        id: input.workspaceId,
      },
      select: workspaceBillingSelect,
    });
  }

  return null;
}

function resolvePlanKeyFromStripe(input: {
  fallbackPlanKey?: RevoryBillingPlan | null;
  metadataPlanKey?: string | null | undefined;
  stripePriceId?: string | null;
}) {
  return (
    getBillingPlanByStripePriceId(input.stripePriceId) ??
    (input.metadataPlanKey?.toUpperCase() as RevoryBillingPlan | undefined) ??
    input.fallbackPlanKey ??
    null
  );
}

export async function ensureStripeCustomerForWorkspace(input: {
  userEmail: string;
  userName: string | null;
  workspaceId: string;
  workspaceName: string;
  existingStripeCustomerId: string | null;
}) {
  if (input.existingStripeCustomerId) {
    return input.existingStripeCustomerId;
  }

  const stripe = getStripeServerClient();
  const customer = await stripe.customers.create({
    email: input.userEmail,
    metadata: {
      workspaceId: input.workspaceId,
    },
    name: input.workspaceName,
  });

  await prisma.workspace.update({
    where: {
      id: input.workspaceId,
    },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function syncWorkspaceBillingFromStripeSubscription(
  subscription: Stripe.Subscription,
  workspaceIdHint?: string | null,
) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const stripeSubscriptionId = subscription.id;
  const primaryItem = subscription.items.data[0] ?? null;
  const stripePriceId = primaryItem?.price.id ?? null;
  const workspace = await findWorkspaceForStripeSync({
    stripeCustomerId,
    stripeSubscriptionId,
    workspaceId: workspaceIdHint ?? subscription.metadata.workspaceId ?? null,
  });

  if (!workspace) {
    console.warn("[revory-billing] workspace not found for subscription sync", {
      stripeCustomerId,
      stripeSubscriptionId,
      workspaceIdHint,
    });

    return null;
  }

  const planKey = resolvePlanKeyFromStripe({
    fallbackPlanKey: workspace.planKey,
    metadataPlanKey: subscription.metadata.planKey,
    stripePriceId,
  });

  const updatedWorkspace = await prisma.workspace.update({
    where: {
      id: workspace.id,
    },
    data: {
      billingStatus: mapStripeSubscriptionStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: primaryItem?.current_period_end
        ? new Date(primaryItem.current_period_end * 1000)
        : null,
      planKey,
      stripeCustomerId,
      stripePriceId,
      stripeSubscriptionId,
    },
    select: workspaceBillingSelect,
  });

  return getWorkspaceBillingSummary(updatedWorkspace);
}

export async function syncWorkspaceBillingFromInvoice(invoice: Stripe.Invoice) {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  const parentSubscription = invoice.parent?.subscription_details?.subscription ?? null;
  const stripeSubscriptionId =
    typeof parentSubscription === "string"
      ? parentSubscription
      : parentSubscription?.id ?? null;
  const workspace = await findWorkspaceForStripeSync({
    stripeCustomerId,
    stripeSubscriptionId,
  });

  if (!workspace) {
    console.warn("[revory-billing] workspace not found for invoice sync", {
      stripeCustomerId,
      stripeSubscriptionId,
    });

    return null;
  }

  const updatedWorkspace = await prisma.workspace.update({
    where: {
      id: workspace.id,
    },
    data: {
      billingStatus: "PAST_DUE",
      stripeCustomerId: stripeCustomerId ?? workspace.stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId ?? workspace.stripeSubscriptionId,
    },
    select: workspaceBillingSelect,
  });

  return getWorkspaceBillingSummary(updatedWorkspace);
}

export async function syncWorkspaceBillingFromCheckoutSession(sessionId: string) {
  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.mode !== "subscription") {
    return null;
  }

  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id ?? null;
  const expandedSubscription = session.subscription;

  if (!expandedSubscription) {
    return null;
  }

  if (typeof expandedSubscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(expandedSubscription);

    return syncWorkspaceBillingFromStripeSubscription(subscription, workspaceId);
  }

  return syncWorkspaceBillingFromStripeSubscription(expandedSubscription, workspaceId);
}
