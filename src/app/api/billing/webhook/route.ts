import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createHash } from "node:crypto";

import { prisma } from "@/db/prisma";
import {
  getStripeServerClient,
  getStripeWebhookSecret,
  isStripeWebhookConfigured,
} from "@/services/billing/stripe-runtime";
import {
  syncWorkspaceBillingFromCheckoutSession,
  syncWorkspaceBillingFromInvoice,
  syncWorkspaceBillingFromStripeSubscription,
} from "@/services/billing/stripe-sync";
import { fulfillRevoryCheckoutSession, syncRevoryEntitlementFromSubscription } from "@/services/billing/entitlements";

const handledStripeEvents = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
]);

async function claimExistingWebhookEvent(id: string, payloadHash: string) {
  const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id } });
  if (!existing) return { response: NextResponse.json({ error: "Webhook claim was not found." }, { status: 409 }) };
  if (existing.payloadHash !== payloadHash) return { response: NextResponse.json({ error: "Webhook event payload mismatch." }, { status: 400 }) };
  if (existing.status === "PROCESSED") return { response: NextResponse.json({ received: true, replay: true }) };
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
  if (existing.status === "PROCESSING" && existing.updatedAt > staleBefore) {
    return { response: NextResponse.json({ received: true, processing: true }, { status: 202 }) };
  }
  const claimed = await prisma.stripeWebhookEvent.updateMany({
    where: {
      id,
      payloadHash,
      OR: [
        { status: "FAILED" },
        { status: "PROCESSING", updatedAt: { lte: staleBefore } },
      ],
    },
    data: { status: "PROCESSING", attemptCount: { increment: 1 }, lastError: null },
  });
  return claimed.count === 1
    ? { response: null }
    : { response: NextResponse.json({ received: true, processing: true }, { status: 202 }) };
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parent = invoice.parent?.subscription_details?.subscription ?? null;
  return typeof parent === "string" ? parent : parent?.id ?? null;
}

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const stripe = getStripeServerClient();
  const payload = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.error("[revory-billing] webhook signature verification failed", error instanceof Error ? error.message : "unknown error");

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  if (!handledStripeEvents.has(event.type)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const payloadHash = createHash("sha256").update(payload).digest("hex");
  const inserted = await prisma.stripeWebhookEvent.createMany({
    data: [{ id: event.id, type: event.type, payloadHash }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) {
    const claim = await claimExistingWebhookEvent(event.id, payloadHash);
    if (claim.response) return claim.response;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        if ((event.data.object as Stripe.Checkout.Session).metadata?.offerKey) {
          const expanded = await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id, { expand: ["line_items", "subscription"] });
          const observedAt = new Date();
          await fulfillRevoryCheckoutSession(expanded, observedAt);
        } else {
          await syncWorkspaceBillingFromCheckoutSession((event.data.object as Stripe.Checkout.Session).id);
        }
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        {
          const eventSubscription = event.data.object as Stripe.Subscription;
          const currentSubscription = await stripe.subscriptions.retrieve(eventSubscription.id);
          const observedAt = new Date();
        await Promise.all([
          syncWorkspaceBillingFromStripeSubscription(currentSubscription),
          syncRevoryEntitlementFromSubscription(currentSubscription, observedAt),
        ]);
        }
        break;
      case "invoice.payment_failed":
        await syncWorkspaceBillingFromInvoice(event.data.object as Stripe.Invoice);
        {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoiceSubscriptionId(invoice);
          if (subscriptionId) {
            const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            const observedAt = new Date();
            await syncRevoryEntitlementFromSubscription(currentSubscription, observedAt);
          }
        }
        break;
      case "invoice.paid":
        await syncWorkspaceBillingFromInvoice(event.data.object as Stripe.Invoice);
        {
          const subscriptionId = invoiceSubscriptionId(event.data.object as Stripe.Invoice);
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const observedAt = new Date();
            await syncRevoryEntitlementFromSubscription(subscription, observedAt);
          }
        }
        break;
      default:
        break;
    }
    await prisma.stripeWebhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), lastError: null } });
  } catch (error) {
    await prisma.stripeWebhookEvent.update({ where: { id: event.id }, data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 500) : "Webhook processing failed" } });
    console.error("[revory-billing] webhook handling failed", {
      message: error instanceof Error ? error.message : "unknown error",
      type: event.type,
    });

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
