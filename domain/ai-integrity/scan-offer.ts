import type Stripe from "stripe";

export const AI_SCAN_OFFER = { key: "AI_INTEGRITY_SCAN_V1", amountMinor: 9900, currency: "usd", mode: "payment",
  name: "REVORY Integrity Scan", scope: "One report for one closed period, from three reviewed source exports", version: "scan-offer/test-v1" } as const;

export function aiScanPriceMatches(price: { active: boolean; livemode: boolean; currency: string; unit_amount: number | null; recurring: unknown }) {
  return price.active && !price.livemode && price.currency === AI_SCAN_OFFER.currency && price.unit_amount === AI_SCAN_OFFER.amountMinor && !price.recurring;
}

export function buildAiScanCheckout(input: { orderId: string; workspaceId: string; priceId: string; email: string; appUrl: string; integrationIdentifier: string }): NonNullable<Parameters<Stripe["checkout"]["sessions"]["create"]>[0]> {
  return { mode: "payment", line_items: [{ price: input.priceId, quantity: 1 }], customer_email: input.email,
    client_reference_id: input.orderId, metadata: { aiScanOrderId: input.orderId, workspaceId: input.workspaceId,
      offerKey: AI_SCAN_OFFER.key, offerVersion: AI_SCAN_OFFER.version }, integration_identifier: input.integrationIdentifier,
    success_url: `${input.appUrl}/start?checkout=success&order=${encodeURIComponent(input.orderId)}`,
    cancel_url: `${input.appUrl}/start?checkout=canceled&order=${encodeURIComponent(input.orderId)}` };
}

export function assertAiScanPaidSession(session: Stripe.Checkout.Session, order: { id: string; workspaceId: string; stripeCheckoutSessionId: string | null; amountMinor: number; currency: string }) {
  if (session.livemode || session.mode !== "payment" || session.subscription || session.status !== "complete" || session.payment_status !== "paid"
    || session.id !== order.stripeCheckoutSessionId || session.client_reference_id !== order.id
    || session.metadata?.aiScanOrderId !== order.id || session.metadata?.workspaceId !== order.workspaceId
    || session.metadata?.offerKey !== AI_SCAN_OFFER.key || session.metadata?.offerVersion !== AI_SCAN_OFFER.version
    || session.amount_total !== order.amountMinor || session.currency !== order.currency) throw new Error("Checkout does not satisfy the one-time test scan purchase contract.");
}
