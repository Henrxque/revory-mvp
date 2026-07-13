import { NextResponse } from "next/server";
import { Resend } from "resend";

const attentionEvents = new Set([
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
  "email.failed",
  "email.suppressed",
]);

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    return NextResponse.json(
      { error: "Resend webhook is not configured." },
      { status: 503 },
    );
  }

  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signature = request.headers.get("svix-signature") ?? "";

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  try {
    // Webhook verification uses the signing secret, not the API credential. The
    // non-empty fallback keeps the SDK lazy and build-safe while email is gated.
    const resend = new Resend(process.env.RESEND_API_KEY?.trim() || "re_webhook_verification_only");
    const event = resend.webhooks.verify({
      headers: { id, signature, timestamp },
      payload: await request.text(),
      webhookSecret,
    });
    const data = event.data as { email_id?: unknown };
    const emailId = typeof data.email_id === "string" ? data.email_id : null;
    const log = attentionEvents.has(event.type) ? console.error : console.info;

    log(JSON.stringify({
      emailId,
      eventId: id,
      eventType: event.type,
      level: attentionEvents.has(event.type) ? "error" : "info",
      message: "resend_webhook_received",
    }));

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
