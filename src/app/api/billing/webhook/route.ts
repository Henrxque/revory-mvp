import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

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

const handledStripeEvents = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

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
    console.error("[revory-billing] webhook signature verification failed", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  if (!handledStripeEvents.has(event.type)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await syncWorkspaceBillingFromCheckoutSession(
          (event.data.object as Stripe.Checkout.Session).id,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncWorkspaceBillingFromStripeSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed":
        await syncWorkspaceBillingFromInvoice(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("[revory-billing] webhook handling failed", {
      error,
      type: event.type,
    });

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
