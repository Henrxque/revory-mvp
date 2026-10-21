import { NextResponse } from "next/server";
import { aiScanBillingConfiguration, aiScanCheckoutDriver, aiScanStripeClient, processAiScanWebhook } from "@/services/ai-integrity/purchase";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import type Stripe from "stripe";

export async function POST(request: Request) {
  if (aiScanCheckoutDriver() === "unavailable") return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  let payload: string;
  let event: Stripe.Event;
  try {
    payload = await readAiBoundedText(request, 262144);
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new Error("Signature required.");
    event = aiScanStripeClient().webhooks.constructEvent(payload, signature, aiScanBillingConfiguration().webhookSecret);
  } catch { return NextResponse.json({ error: "Unable to verify the scan event." }, { status: 400 }); }
  try {
    const result = await processAiScanWebhook(event, payload);
    return NextResponse.json({ received: true, ...result });
  } catch { return NextResponse.json({ error: "Scan event fulfillment failed; retry required." }, { status: 500 }); }
}
