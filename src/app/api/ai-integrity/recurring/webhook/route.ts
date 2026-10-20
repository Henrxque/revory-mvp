import { NextResponse } from "next/server";
import { recurringEnabled } from "@/services/ai-integrity/recurring-access";
import { handleMonitorWebhook } from "@/services/ai-integrity/monitor-billing";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
export async function POST(request: Request) {
  if (!recurringEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new Error();
    await handleMonitorWebhook(await readAiBoundedText(request, 512000), signature);
    return NextResponse.json({ received: true });
  } catch {
    console.error(JSON.stringify({ message: "ai_monitor_webhook_rejected" }));
    return NextResponse.json({ error: "Webhook could not be verified or processed." }, { status: 400 });
  }
}
