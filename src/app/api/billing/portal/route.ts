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
import { prisma } from "@/db/prisma";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(buildSignInRedirectPath("/app"), request.url), { status: 303 });
  }

  if (!isStripeBillingConfigured()) {
    return NextResponse.redirect(new URL("/start?billing=unavailable", request.url), { status: 303 });
  }

  const user = await syncAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL(buildSignInRedirectPath("/app"), request.url), { status: 303 });
  }

  const workspace = await getOrCreateWorkspace(user);

  if (!workspace.stripeCustomerId) {
    return NextResponse.redirect(new URL("/start", request.url), { status: 303 });
  }

  const stripe = getStripeServerClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${getStripeAppUrl()}/app`,
  });
  await prisma.workspaceAuditEvent.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: "BILLING_PORTAL_SESSION_CREATED", metadataJson: { portalSessionId: portalSession.id } } });

  return NextResponse.redirect(portalSession.url, {
    status: 303,
  });
}

export async function GET() { return NextResponse.json({ error: "Use POST for billing portal creation." }, { status: 405, headers: { Allow: "POST" } }); }
