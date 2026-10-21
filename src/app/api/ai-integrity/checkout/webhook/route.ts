import { NextResponse } from "next/server";
import { aiScanCheckoutDriver, aiScanStripeClient, processAiScanWebhook } from "@/services/ai-integrity/purchase";
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
    event = aiScanStripeClient().webhooks.constructEvent(payload, signature, process.env.REVORY_AI_SCAN_TEST_WEBHOOK_SECRET!);
  } catch { return NextResponse.json({ error: "Unable to verify the test event." }, { status: 400 }); }
  try {
    const result = await processAiScanWebhook(event, payload);
    return NextResponse.json({ received: true, ...result });
  } catch { return NextResponse.json({ error: "Test event fulfillment failed; retry required." }, { status: 500 }); }
}
