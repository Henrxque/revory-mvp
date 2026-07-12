import "server-only";
import type Stripe from "stripe";

import { prisma } from "@/db/prisma";
import { parseRevoryOffer } from "@/services/billing/revory-offers";

export async function getWorkspaceEntitlements(workspaceId: string) { return prisma.workspaceEntitlement.findMany({ where: { workspaceId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }, orderBy: { createdAt: "desc" } }); }
export async function hasCurrentRevoryAccess(workspaceId: string) { return (await getWorkspaceEntitlements(workspaceId)).length > 0; }
export async function fulfillRevoryCheckoutSession(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id; if (!workspaceId) throw new Error("Checkout session is missing workspace ownership.");
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }); if (!workspace) throw new Error("Checkout workspace was not found.");
  const offerKey = parseRevoryOffer(session.metadata?.offerKey ?? null);
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  return prisma.workspaceEntitlement.upsert({ where: { stripeCheckoutSessionId: session.id }, create: { workspaceId, offerKey, stripeCheckoutSessionId: session.id, stripePaymentIntentId: paymentIntentId, stripeSubscriptionId: subscriptionId }, update: { status: "ACTIVE", stripePaymentIntentId: paymentIntentId, stripeSubscriptionId: subscriptionId } });
}
