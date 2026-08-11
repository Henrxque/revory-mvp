import assert from "node:assert/strict";
import fs from "node:fs";

import { currentPublicOfferJourney, revoryCommercialOfferContracts } from "../domain/revory/commercial-offers";

const read = (file: string) => fs.readFileSync(file, "utf8");
const checkout = read("src/app/api/billing/checkout/route.ts");
const webhook = read("src/app/api/billing/webhook/route.ts");
const portal = read("src/app/api/billing/portal/route.ts");
const entitlements = read("services/billing/entitlements.ts");

assert.deepEqual(currentPublicOfferJourney, ["QUOTE_RECOVERY_AUDIT", "STARTER", "GROWTH"]);
assert.deepEqual(
  currentPublicOfferJourney.map((key) => ({
    amount: revoryCommercialOfferContracts[key].amountCents,
    interval: revoryCommercialOfferContracts[key].interval,
    mode: revoryCommercialOfferContracts[key].mode,
  })),
  [
    { amount: 39900, interval: null, mode: "payment" },
    { amount: 39900, interval: "month", mode: "subscription" },
    { amount: 59900, interval: "month", mode: "subscription" },
  ],
);
assert.ok(checkout.includes("export async function POST") && checkout.includes("export async function GET") && checkout.includes("status: 405"), "Checkout must be POST-only.");
assert.ok(checkout.includes("revoryStripePriceMatchesContract") && checkout.includes("mode: offer.mode"), "Checkout must verify the Stripe price against the canonical offer before session creation.");
assert.ok(checkout.includes('offer.mode === "subscription"') && checkout.includes("subscription_data"), "Subscription metadata must only be attached to recurring offers.");
assert.ok(checkout.includes("idempotencyKey") && checkout.includes("prior.id") && checkout.includes("reused: true"), "Checkout session creation/reuse must be idempotent.");
for (const event of ["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]) {
  assert.ok(webhook.includes(event), `Webhook does not handle ${event}.`);
}
assert.ok(webhook.includes("stripeWebhookEvent") && webhook.includes("payloadHash") && webhook.includes("skipDuplicates: true"), "Webhook replay protection ledger is missing.");
assert.ok(entitlements.includes('offer.mode === "payment"') && entitlements.includes("subscription"), "One-time and recurring entitlement paths must remain distinct.");
assert.ok(portal.includes("export async function POST") && portal.includes("billingPortal.sessions.create"), "Billing portal session creation is missing.");
assert.ok(portal.includes("export async function GET") && portal.includes("status: 405"), "Billing portal must reject GET mutations.");

console.log("Current local billing, webhook, entitlement and portal contract: PASS");
