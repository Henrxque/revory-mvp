import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";

// Local protocol simulation for the real Stripe SDK. Never contacts Stripe or charges funds.
export async function startAiScanStripeSimulation(appOrigin: string, webhookSecret: string) {
  const stripe = new Stripe("sk_test_local_simulation");
  const sessions = new Map<string, Stripe.Checkout.Session & { success_url: string; cancel_url: string }>();
  const idempotency = new Map<string, { body: string; id: string }>();
  let origin = "";
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url!, origin);
      const json = (value: unknown, status = 200) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(value)); };
      if (url.pathname === "/v1/prices/price_ai_scan_local") return json({ id: "price_ai_scan_local", object: "price", active: true, livemode: false, currency: "usd", unit_amount: 9900, recurring: null });
      if (url.pathname === "/v1/checkout/sessions" && request.method === "POST") {
        let body = ""; for await (const chunk of request) body += chunk;
        const data = new URLSearchParams(body), key = String(request.headers["idempotency-key"]);
        const previous = idempotency.get(key);
        if (previous) {
          if (previous.body !== body) return json({ error: { type: "idempotency_error", message: "Different parameters for the same key" } }, 400);
          return json(sessions.get(previous.id));
        }
        if (data.get("mode") !== "payment" || data.get("line_items[0][price]") !== "price_ai_scan_local" || data.get("line_items[0][quantity]") !== "1") throw new Error("Invalid simulated purchase contract");
        const id = `cs_test_${randomBytes(8).toString("hex")}`;
        const metadata = Object.fromEntries([...data].filter(([key]) => key.startsWith("metadata[")).map(([key, value]) => [key.slice(9, -1), value]));
        const session = { id, object: "checkout.session", livemode: false, mode: "payment", status: "open", payment_status: "unpaid", subscription: null, amount_total: 9900, currency: "usd", payment_intent: null, client_reference_id: data.get("client_reference_id"), metadata, url: `${origin}/checkout/${id}`, success_url: data.get("success_url")!, cancel_url: data.get("cancel_url")! } as Stripe.Checkout.Session & { success_url: string; cancel_url: string };
        sessions.set(id, session); idempotency.set(key, { body, id }); return json(session);
      }
      if (url.pathname.startsWith("/v1/checkout/sessions/")) {
        const session = sessions.get(url.pathname.split("/").at(-1)!);
        return session ? json(session) : json({ error: { message: "Unknown session" } }, 404);
      }
      if (url.pathname.startsWith("/checkout/")) {
        const session = sessions.get(url.pathname.split("/").at(-1)!);
        if (!session) throw new Error("Unknown checkout");
        if (request.method === "POST") {
          session.status = "complete"; session.payment_status = "paid"; session.payment_intent = `pi_${session.id.slice(8)}`;
          const event = { id: `evt_${session.id}`, object: "event", type: "checkout.session.completed", livemode: false, data: { object: session } };
          const payload = JSON.stringify(event);
          const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret, timestamp: Math.floor(Date.now() / 1000), scheme: "v1", signature: "", cryptoProvider: Stripe.createNodeCryptoProvider() });
          const delivered = await fetch(`${appOrigin}/api/ai-integrity/checkout/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": signature }, body: payload });
          if (!delivered.ok) throw new Error(`Webhook delivery failed: ${delivered.status}`);
          response.writeHead(303, { Location: session.success_url }); response.end(); return;
        }
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Local checkout simulation</title><body style="background:#141516;color:white;font:16px sans-serif;padding:40px"><h1>Local Stripe test simulation</h1><p>USD 99 once. No subscription. No real payment. This is not hosted by Stripe.</p><form method="post"><button style="padding:16px">Simulate paid test purchase</button></form><p><a style="color:#43b39b" href="${session.cancel_url}">Cancel simulation</a></p></body></html>`); return;
      }
      json({ error: "Unknown simulation endpoint" }, 404);
    } catch { response.writeHead(500); response.end("Local simulation failed."); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Simulation address unavailable");
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, sessions, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}
