import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/auth";
import {
  getStripeAppUrl,
  getStripeServerClient,
  isStripeBillingConfigured,
} from "@/services/billing/stripe-runtime";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(buildSignInRedirectPath("/app"), request.url));
  }

  if (!isStripeBillingConfigured()) {
    return NextResponse.redirect(new URL("/start?billing=unavailable", request.url));
  }

  const user = await syncAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL(buildSignInRedirectPath("/app"), request.url));
  }

  const workspace = await getOrCreateWorkspace(user);

  if (!workspace.stripeCustomerId) {
    return NextResponse.redirect(new URL("/start", request.url));
  }

  const stripe = getStripeServerClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${getStripeAppUrl()}/app`,
  });

  return NextResponse.redirect(portalSession.url, {
    status: 303,
  });
}
