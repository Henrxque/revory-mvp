import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/auth";
import { hasCompletedQuoteRecoveryBaseline } from "@/services/billing/commercial-readiness";
import { ensureStripeCustomerForWorkspace } from "@/services/billing/stripe-sync";
import { getStripeAppUrl, getStripeServerClient } from "@/services/billing/stripe-runtime";
import { getRevoryOffer, getRevoryOfferPriceId, isRevoryOfferConfigured, parseRevoryOffer } from "@/services/billing/revory-offers";
import { getWorkspaceEntitlements } from "@/services/billing/entitlements";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";
import { prisma } from "@/db/prisma";
import { CHECKOUT_LEGAL_VERSIONS } from "@/content/revory-legal";

export async function POST(request: NextRequest) {
  const startedAt = Date.now(); const offerKey = parseRevoryOffer(request.nextUrl.searchParams.get("offer"));
  const origin = request.headers.get("origin"); if (origin && new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!offerKey) return NextResponse.redirect(new URL("/start?billing=invalid", request.url), { status: 303 });
  const session = await getAuthSession(); if (!session?.user?.id) return NextResponse.redirect(new URL(buildSignUpRedirectPath(`/start?offer=${offerKey}`), request.url), { status: 303 });
  if (!isRevoryOfferConfigured(offerKey)) return NextResponse.redirect(new URL(`/start?billing=unavailable&offer=${offerKey}`, request.url), { status: 303 });
  const user = await syncAuthenticatedUser(); if (!user) return NextResponse.redirect(new URL("/sign-in?redirect_url=%2Fstart", request.url), { status: 303 });
  const workspace = await getOrCreateWorkspace(user); const existing = await getWorkspaceEntitlements(workspace.id);
  if (existing.some((entitlement) => entitlement.offerKey === offerKey)) return NextResponse.redirect(new URL("/app/dashboard", request.url), { status: 303 });
  const activeRecurringEntitlement = existing.find((entitlement) => entitlement.offerKey !== "QUOTE_RECOVERY_AUDIT");
  if (getRevoryOffer(offerKey).mode === "subscription" && activeRecurringEntitlement) {
    return NextResponse.redirect(new URL("/app/settings?billing=manage-subscription", request.url), { status: 303 });
  }
  if (offerKey === "STARTER" && !(await hasCompletedQuoteRecoveryBaseline(workspace.id))) {
    return NextResponse.redirect(new URL("/start?billing=baseline-required&offer=STARTER", request.url), { status: 303 });
  }
  try {
    const customer = await ensureStripeCustomerForWorkspace({ existingStripeCustomerId: workspace.stripeCustomerId, userEmail: user.email, userName: user.fullName, workspaceId: workspace.id, workspaceName: workspace.name });
    const offer = getRevoryOffer(offerKey); const stripe = getStripeServerClient();
    const priceId = getRevoryOfferPriceId(offerKey);
    const priorSessions = await stripe.checkout.sessions.list({ customer, limit: 10, expand: ["data.line_items"] });
    const prior = priorSessions.data.find((candidate) => {
      const observedPriceIds = candidate.line_items?.data.map((item) => item.price?.id).filter(Boolean) ?? [];
      return candidate.metadata?.workspaceId === workspace.id
        && candidate.metadata?.offerKey === offerKey
        && ["open", "complete"].includes(candidate.status ?? "")
        && observedPriceIds.length === 1
        && observedPriceIds[0] === priceId;
    });
    if (prior?.status === "complete") return NextResponse.redirect(new URL("/start?billing=processing", request.url), { status: 303 });
    if (prior?.status === "open" && prior.url) {
      await prisma.legalAcceptance.create({ data: { userId: user.id, workspaceId: workspace.id, event: "CHECKOUT_STARTED", locale: "en", documentVersionsJson: CHECKOUT_LEGAL_VERSIONS, contextJson: { checkoutSessionId: prior.id, offerKey, priceId, reused: true } } });
      return NextResponse.redirect(prior.url, { status: 303 });
    }
    const checkout = await stripe.checkout.sessions.create({ allow_promotion_codes: true, cancel_url: `${getStripeAppUrl()}/start?checkout=cancel`, client_reference_id: workspace.id, customer, line_items: [{ price: priceId, quantity: 1 }], metadata: { offerKey, userId: user.id, workspaceId: workspace.id, legalTermsVersion: CHECKOUT_LEGAL_VERSIONS.terms, legalPrivacyVersion: CHECKOUT_LEGAL_VERSIONS.privacy, legalRefundsVersion: CHECKOUT_LEGAL_VERSIONS.refunds }, mode: offer.mode, ...(offer.mode === "subscription" ? { subscription_data: { metadata: { offerKey, userId: user.id, workspaceId: workspace.id } } } : {}), success_url: `${getStripeAppUrl()}/start?checkout=success&session_id={CHECKOUT_SESSION_ID}` }, { idempotencyKey: `revory-checkout:${workspace.id}:${offerKey}:${priceId}:${new Date().toISOString().slice(0, 10)}` });
    await prisma.$transaction([
      prisma.legalAcceptance.create({ data: { userId: user.id, workspaceId: workspace.id, event: "CHECKOUT_STARTED", locale: "en", documentVersionsJson: CHECKOUT_LEGAL_VERSIONS, contextJson: { checkoutSessionId: checkout.id, offerKey, priceId, reused: false } } }),
      prisma.workspaceAuditEvent.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: "CHECKOUT_SESSION_CREATED", metadataJson: { checkoutSessionId: checkout.id, legalVersions: CHECKOUT_LEGAL_VERSIONS, offerKey, priceId } } }),
    ]);
    console.log(JSON.stringify({ level: "info", message: "checkout_created", offerKey, workspaceId: workspace.id, durationMs: Date.now() - startedAt }));
    return checkout.url ? NextResponse.redirect(checkout.url, { status: 303 }) : NextResponse.redirect(new URL("/start?billing=error", request.url), { status: 303 });
  } catch (error) { console.error(JSON.stringify({ level: "error", message: "checkout_failed", offerKey, workspaceId: workspace.id, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt })); return NextResponse.redirect(new URL("/start?billing=error", request.url), { status: 303 }); }
}

export async function GET() { return NextResponse.json({ error: "Use POST for checkout creation." }, { status: 405, headers: { Allow: "POST" } }); }
