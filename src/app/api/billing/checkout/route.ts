import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/auth";
import { ensureStripeCustomerForWorkspace } from "@/services/billing/stripe-sync";
import { getStripeAppUrl, getStripeServerClient } from "@/services/billing/stripe-runtime";
import { getRevoryOffer, getRevoryOfferPriceId, isRevoryOfferConfigured, parseRevoryOffer } from "@/services/billing/revory-offers";
import { getWorkspaceEntitlements } from "@/services/billing/entitlements";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

export async function GET(request: NextRequest) {
  const startedAt = Date.now(); const offerKey = parseRevoryOffer(request.nextUrl.searchParams.get("offer"));
  const session = await getAuthSession(); if (!session?.user?.id) return NextResponse.redirect(new URL(buildSignUpRedirectPath(`/api/billing/checkout?offer=${offerKey}`), request.url));
  if (!isRevoryOfferConfigured(offerKey)) return NextResponse.redirect(new URL(`/start?billing=unavailable&offer=${offerKey}`, request.url));
  const user = await syncAuthenticatedUser(); if (!user) return NextResponse.redirect(new URL("/sign-in?redirect_url=%2Fstart", request.url));
  const workspace = await getOrCreateWorkspace(user); const existing = await getWorkspaceEntitlements(workspace.id);
  if (existing.some((entitlement) => entitlement.offerKey === offerKey)) return NextResponse.redirect(new URL("/app/dashboard", request.url));
  try {
    const customer = await ensureStripeCustomerForWorkspace({ existingStripeCustomerId: workspace.stripeCustomerId, userEmail: user.email, userName: user.fullName, workspaceId: workspace.id, workspaceName: workspace.name });
    const offer = getRevoryOffer(offerKey); const stripe = getStripeServerClient();
    const checkout = await stripe.checkout.sessions.create({ allow_promotion_codes: true, cancel_url: `${getStripeAppUrl()}/start?checkout=cancel`, client_reference_id: workspace.id, customer, line_items: [{ price: getRevoryOfferPriceId(offerKey), quantity: 1 }], metadata: { offerKey, userId: user.id, workspaceId: workspace.id }, mode: offer.mode, ...(offer.mode === "subscription" ? { subscription_data: { metadata: { offerKey, userId: user.id, workspaceId: workspace.id } } } : {}), success_url: `${getStripeAppUrl()}/start?checkout=success&session_id={CHECKOUT_SESSION_ID}` });
    console.log(JSON.stringify({ level: "info", message: "checkout_created", offerKey, workspaceId: workspace.id, durationMs: Date.now() - startedAt }));
    return checkout.url ? NextResponse.redirect(checkout.url, { status: 303 }) : NextResponse.redirect(new URL("/start?billing=error", request.url));
  } catch (error) { console.error(JSON.stringify({ level: "error", message: "checkout_failed", offerKey, workspaceId: workspace.id, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt })); return NextResponse.redirect(new URL("/start?billing=error", request.url)); }
}
