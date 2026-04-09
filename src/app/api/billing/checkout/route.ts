import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/auth";
import { getStripeAppUrl, getStripePriceId, getStripeServerClient, isStripeBillingConfigured } from "@/services/billing/stripe-runtime";
import { ensureStripeCustomerForWorkspace } from "@/services/billing/stripe-sync";
import {
  getWorkspaceBillingSummary,
  normalizeBillingPlanKey,
} from "@/services/billing/workspace-billing";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";
import { prisma } from "@/db/prisma";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  const requestedPlan = normalizeBillingPlanKey(
    request.nextUrl.searchParams.get("plan"),
  ) ?? "GROWTH";

  if (!session?.user?.id) {
    const redirectTarget = `/api/billing/checkout?plan=${requestedPlan.toLowerCase()}`;

    return NextResponse.redirect(
      new URL(buildSignUpRedirectPath(redirectTarget), request.url),
    );
  }

  if (!isStripeBillingConfigured()) {
    return NextResponse.redirect(
      new URL(`/start?billing=unavailable&plan=${requestedPlan.toLowerCase()}`, request.url),
    );
  }

  const user = await syncAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=%2Fstart", request.url));
  }

  const workspace = await getOrCreateWorkspace(user);
  const billingSummary = getWorkspaceBillingSummary(workspace);

  if (billingSummary.hasActiveAccess) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const stripeCustomerId = await ensureStripeCustomerForWorkspace({
    existingStripeCustomerId: workspace.stripeCustomerId,
    userEmail: user.email,
    userName: user.fullName,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  });

  const stripe = getStripeServerClient();
  const stripePriceId = getStripePriceId(requestedPlan);

  await prisma.workspace.update({
    where: {
      id: workspace.id,
    },
    data: {
      billingStatus: "INACTIVE",
      planKey: requestedPlan,
      stripeCustomerId,
      stripePriceId,
    },
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    cancel_url: `${getStripeAppUrl()}/start?checkout=cancel&plan=${requestedPlan.toLowerCase()}`,
    client_reference_id: workspace.id,
    customer: stripeCustomerId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      planKey: requestedPlan,
      userId: user.id,
      workspaceId: workspace.id,
    },
    mode: "subscription",
    subscription_data: {
      metadata: {
        planKey: requestedPlan,
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    success_url: `${getStripeAppUrl()}/start?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!checkoutSession.url) {
    return NextResponse.redirect(
      new URL(`/start?billing=error&plan=${requestedPlan.toLowerCase()}`, request.url),
    );
  }

  return NextResponse.redirect(checkoutSession.url, {
    status: 303,
  });
}
