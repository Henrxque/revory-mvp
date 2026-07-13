import "server-only";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/db/prisma";
import { parseRevoryOffer } from "@/services/billing/revory-offers";
import { getRevoryOffer, getRevoryOfferPriceId } from "@/services/billing/revory-offers";

export async function getWorkspaceEntitlements(workspaceId: string) { return prisma.workspaceEntitlement.findMany({ where: { workspaceId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }, orderBy: { createdAt: "desc" } }); }
export async function hasCurrentRevoryAccess(workspaceId: string) { return (await getWorkspaceEntitlements(workspaceId)).length > 0; }
function stripeObjectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function fulfillRevoryCheckoutSession(session: Stripe.Checkout.Session, eventCreatedAt = new Date()) {
  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id; if (!workspaceId) throw new Error("Checkout session is missing workspace ownership.");
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, stripeCustomerId: true } }); if (!workspace) throw new Error("Checkout workspace was not found.");
  const offerKey = parseRevoryOffer(session.metadata?.offerKey ?? null);
  if (!offerKey) throw new Error("Checkout session contains an unsupported offer.");
  const offer = getRevoryOffer(offerKey);
  if (session.mode !== offer.mode || !session.customer || session.currency?.toLowerCase() !== "usd") throw new Error("Checkout session does not match the configured offer contract.");
  const customerId = stripeObjectId(session.customer);
  if (!workspace.stripeCustomerId || customerId !== workspace.stripeCustomerId) throw new Error("Checkout customer does not belong to the workspace.");
  if (offer.mode === "payment" && session.payment_status !== "paid") throw new Error("One-time checkout is not paid.");
  if (session.payment_status === "unpaid") throw new Error("Checkout payment is incomplete.");
  const configuredPriceId = getRevoryOfferPriceId(offerKey);
  const observedPriceIds = session.line_items?.data.map((item) => item.price?.id).filter(Boolean) ?? [];
  if (!configuredPriceId || observedPriceIds.length !== 1 || observedPriceIds[0] !== configuredPriceId) throw new Error("Checkout line item does not match the configured offer price.");
  const paymentIntentId = stripeObjectId(session.payment_intent);
  const subscriptionId = stripeObjectId(session.subscription);
  const endsAt = offerKey === "QUOTE_RECOVERY_AUDIT" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
  return prisma.$transaction(async (tx) => {
    const existing = subscriptionId
      ? await tx.workspaceEntitlement.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
      : await tx.workspaceEntitlement.findUnique({ where: { stripeCheckoutSessionId: session.id } });
    if (existing && (existing.workspaceId !== workspaceId || existing.offerKey !== offerKey)) throw new Error("Stripe entitlement ownership or offer mismatch.");
    const expandedSubscription = typeof session.subscription === "object" && session.subscription && "status" in session.subscription
      ? session.subscription as Stripe.Subscription
      : null;
    const subscriptionIsActive = expandedSubscription ? ["active", "trialing"].includes(expandedSubscription.status) : offer.mode === "payment";
    let entitlement;
    if (existing) {
      const updated = await tx.workspaceEntitlement.updateMany({
        where: { id: existing.id, stripeEventCreatedAt: existing.stripeEventCreatedAt },
        data: {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeSubscriptionId: subscriptionId,
          status: subscriptionIsActive ? "ACTIVE" : "REVOKED",
          endsAt: subscriptionIsActive ? endsAt : eventCreatedAt,
          maxAnalysisRuns: offerKey === "QUOTE_RECOVERY_AUDIT" ? 1 : null,
          stripeEventCreatedAt: eventCreatedAt,
        },
      });
      if (updated.count !== 1) throw new Error("Checkout entitlement changed concurrently; retry with current Stripe state.");
      entitlement = await tx.workspaceEntitlement.findUniqueOrThrow({ where: { id: existing.id } });
    } else {
      entitlement = await tx.workspaceEntitlement.create({ data: { workspaceId, offerKey, stripeCheckoutSessionId: session.id, stripePaymentIntentId: paymentIntentId, stripeSubscriptionId: subscriptionId, status: subscriptionIsActive ? "ACTIVE" : "REVOKED", endsAt: subscriptionIsActive ? endsAt : eventCreatedAt, maxAnalysisRuns: offerKey === "QUOTE_RECOVERY_AUDIT" ? 1 : null, stripeEventCreatedAt: eventCreatedAt } });
    }
    if (offerKey === "QUOTE_RECOVERY_AUDIT") await tx.revoryEvidenceEvent.upsert({
      where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: `billing:checkout:${session.id}` } },
      create: { workspaceId, metric: "AUDIT_CONVERSION", source: "BILLING", offerKey, booleanValue: true, idempotencyKey: `billing:checkout:${session.id}`, relatedEntityId: entitlement.id },
      update: {},
    });
    if (offerKey !== "QUOTE_RECOVERY_AUDIT") {
      const priorAudit = await tx.workspaceEntitlement.findFirst({ where: { workspaceId, offerKey: "QUOTE_RECOVERY_AUDIT" } });
      if (priorAudit) await tx.revoryEvidenceEvent.upsert({
        where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: `billing:audit-to-subscription:${session.id}` } },
        create: { workspaceId, metric: "AUDIT_TO_SUBSCRIPTION_CONVERSION", source: "BILLING", offerKey, booleanValue: true, idempotencyKey: `billing:audit-to-subscription:${session.id}`, relatedEntityId: entitlement.id },
        update: {},
      });
    }
    await tx.workspaceAuditEvent.create({ data: { workspaceId, action: subscriptionIsActive ? "ENTITLEMENT_ACTIVATED" : "ENTITLEMENT_REVOKED", metadataJson: { entitlementId: entitlement.id, offerKey, checkoutSessionId: session.id } } });
    return entitlement;
  });
}

export async function syncRevoryEntitlementFromSubscription(subscription: Stripe.Subscription, eventCreatedAt: Date) {
  const existing = await prisma.workspaceEntitlement.findUnique({ where: { stripeSubscriptionId: subscription.id } });
  const updateExisting = async (
    data: Prisma.WorkspaceEntitlementUpdateManyMutationInput,
    action: string,
    metadataJson: Record<string, string>,
  ) => {
    if (!existing) return null;
    return prisma.$transaction(async (tx) => {
      const updated = await tx.workspaceEntitlement.updateMany({
        where: { id: existing.id, stripeEventCreatedAt: existing.stripeEventCreatedAt },
        data: { ...data, stripeEventCreatedAt: eventCreatedAt },
      });
      if (updated.count !== 1) {
        throw new Error("Subscription entitlement changed concurrently; retry with current Stripe state.");
      }
      await tx.workspaceAuditEvent.create({
        data: {
          workspaceId: existing.workspaceId,
          action,
          metadataJson: { entitlementId: existing.id, stripeSubscriptionId: subscription.id, ...metadataJson },
        },
      });
      return tx.workspaceEntitlement.findUniqueOrThrow({ where: { id: existing.id } });
    });
  };
  const quarantineExisting = async (reason: string) => {
    return updateExisting(
      { status: "REVOKED", endsAt: eventCreatedAt },
      "ENTITLEMENT_QUARANTINED",
      { reason },
    );
  };
  const offerKey = parseRevoryOffer(subscription.metadata.offerKey ?? null);
  const workspaceId = subscription.metadata.workspaceId ?? null;
  if (!offerKey || !workspaceId || offerKey === "QUOTE_RECOVERY_AUDIT") {
    await quarantineExisting("INVALID_SUBSCRIPTION_METADATA");
    return null;
  }
  if (existing && (existing.workspaceId !== workspaceId || existing.offerKey !== offerKey)) {
    await quarantineExisting("SUBSCRIPTION_OWNERSHIP_OR_OFFER_MISMATCH");
    throw new Error("Subscription entitlement ownership or offer mismatch.");
  }
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { stripeCustomerId: true } });
  if (!workspace) {
    await quarantineExisting("SUBSCRIPTION_WORKSPACE_NOT_FOUND");
    throw new Error("Subscription workspace was not found.");
  }
  const customerId = stripeObjectId(subscription.customer);
  if (!workspace.stripeCustomerId || workspace.stripeCustomerId !== customerId) {
    await quarantineExisting("SUBSCRIPTION_CUSTOMER_MISMATCH");
    throw new Error("Subscription customer does not belong to the workspace.");
  }
  const configuredPriceId = getRevoryOfferPriceId(offerKey);
  const observedPriceIds = subscription.items.data.map((item) => item.price.id);
  if (!configuredPriceId || observedPriceIds.length !== 1 || observedPriceIds[0] !== configuredPriceId) {
    await quarantineExisting("SUBSCRIPTION_PRICE_MISMATCH");
    throw new Error("Subscription price does not match the configured offer.");
  }
  const active = ["active", "trialing"].includes(subscription.status);
  if (existing) return updateExisting(
    { status: active ? "ACTIVE" : "REVOKED", endsAt: active ? null : eventCreatedAt },
    "ENTITLEMENT_STRIPE_STATE_SYNCED",
    { status: subscription.status },
  );
  return prisma.workspaceEntitlement.create({ data: { workspaceId, offerKey, stripeSubscriptionId: subscription.id, status: active ? "ACTIVE" : "REVOKED", stripeEventCreatedAt: eventCreatedAt, endsAt: active ? null : eventCreatedAt } });
}
