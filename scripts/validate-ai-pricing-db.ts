import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import Stripe from "stripe";
import { prisma } from "../db/prisma";
import { AI_SCAN_OFFER } from "../domain/ai-integrity/scan-offer";
import { COMMERCIAL_RELEASE, SCAN_LIVE_OFFER_VERSION, LEGACY_MONITOR_OFFER, MONITOR_OFFER } from "../domain/ai-integrity/commercial-offers";
import { createAiScanCheckout, processAiScanWebhook, fulfillAiScanSession, hasAiScanPreparationAccess, aiScanCheckoutDriver } from "../services/ai-integrity/purchase";
import { aiConnectedScanOrderWhere } from "../services/ai-integrity/experience";
import { reconcileMonitorSubscription } from "../services/ai-integrity/monitor-billing";
import { monitorPaid, stateKey } from "../services/ai-integrity/recurring-access";

const db = new URL(process.env.DATABASE_URL!);
if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(db.pathname)) throw new Error("Use the disposable DB harness.");
Object.assign(process.env, { NODE_ENV: "production", VERCEL_ENV: "production", NEXTAUTH_URL: "https://fixture.example.invalid", REVORY_AI_COMMERCIAL_ENABLED: "true", REVORY_AI_COMMERCIAL_RELEASE: COMMERCIAL_RELEASE, REVORY_AI_COMMERCIAL_DATABASE: db.pathname.slice(1), REVORY_AI_COMMERCIAL_SECURITY_REVIEWED: "true", REVORY_AI_RECURRING_MONITOR: "true", REVORY_AI_CUSTOMER_SOURCES: "true", REVORY_AI_CONNECTED_REPORTS: "true", REVORY_AI_SAAS_SYNTHETIC_ONLY: "false", REVORY_AI_MONITOR_BILLING_MODE: "live", REVORY_AI_CUSTOMER_STRIPE_MODE: "live", REVORY_AI_CONNECTION_ACTIVE_KEY: "fixture", REVORY_AI_CONNECTION_KEYRING: JSON.stringify({ fixture: randomBytes(32).toString("base64") }), REVORY_AI_SCAN_ENABLED: "true", REVORY_AI_SCAN_STRIPE_KEY: "rk_live_fixture_only", REVORY_AI_SCAN_PRICE_ID: "price_scan_fixture", REVORY_AI_SCAN_WEBHOOK_SECRET: "whsec_fixture_only", REVORY_AI_MONITOR_PRICE_ID: "price_monitor_199_fixture", REVORY_AI_MONITOR_LEGACY_PRICE_IDS: "price_monitor_399_fixture" });
try {
  const user = await prisma.user.create({ data: { email: "pricing-" + randomUUID() + "@example.invalid" } });
  const ws = await prisma.workspace.create({ data: { name: "Pricing fixture only", slug: "pricing-" + randomUUID(), ownerUserId: user.id } });
  const foreign = await prisma.workspace.create({ data: { name: "Other fixture", slug: "pricing-other-" + randomUUID(), ownerUserId: user.id } });
  assert.equal(aiScanCheckoutDriver(), "stripe-live");
  assert.equal(await hasAiScanPreparationAccess(ws.id), false);
  const simulated = await prisma.aiIntegrityScanOrder.create({ data: { workspaceId: ws.id, actorUserId: user.id, requestKey: randomUUID(), offerVersion: AI_SCAN_OFFER.version, amountMinor: 9900, currency: "usd", checkoutDriver: "stripe-test", status: "PAID" } });
  await prisma.aiIntegrityScanGrant.create({ data: { workspaceId: ws.id, orderId: simulated.id } });
  assert.equal(await hasAiScanPreparationAccess(ws.id), false, "Test capacity cannot authorize production data.");
  let created = 0;
  let checkout: Stripe.Checkout.Session;
  const sdk = { prices: { retrieve: async () => ({ id: "price_scan_fixture", active: true, livemode: true, unit_amount: 9900, currency: "usd", recurring: null, metadata: { revory_offer: SCAN_LIVE_OFFER_VERSION } }) }, checkout: { sessions: { create: async (params: Parameters<Stripe["checkout"]["sessions"]["create"]>[0]) => {
    created++;assert.equal(params?.mode, "payment");assert.equal(params?.subscription_data, undefined);assert.ok(params?.success_url?.startsWith("https://fixture.example.invalid/start?"));
    checkout = { id: "cs_live_fixture", url: "https://checkout.stripe.com/c/pay/fixture", livemode: true, mode: "payment", status: "open", payment_status: "unpaid", subscription: null, amount_total: 9900, currency: "usd", metadata: params?.metadata, client_reference_id: params?.client_reference_id, payment_intent: "pi_fixture" } as Stripe.Checkout.Session;
    return checkout;
  }, retrieve: async () => checkout } } } as unknown as Stripe;
  const request = { workspaceId: ws.id, actorUserId: user.id, email: user.email, requestKey: randomUUID() };
  const purchase = await createAiScanCheckout(request, sdk);
  await createAiScanCheckout(request, sdk);assert.equal(created, 1);
  await assert.rejects(() => fulfillAiScanSession(checkout!), /contract/);
  const paid = { ...checkout!, status: "complete", payment_status: "paid" } as Stripe.Checkout.Session;
  await assert.rejects(() => fulfillAiScanSession({ ...paid, livemode: false }), /contract/);
  await assert.rejects(() => fulfillAiScanSession(paid, foreign.id), /workspace/);
  const event = { id: "evt_live_fixture", type: "checkout.session.completed", livemode: true, data: { object: paid } } as Stripe.Event;
  const payload = JSON.stringify(event), signing = new Stripe("rk_live_fixture_only");
  const timestamp = Math.floor(Date.now()/1000);
  const header = `t=${timestamp},v1=${createHmac("sha256", process.env.REVORY_AI_SCAN_WEBHOOK_SECRET!).update(timestamp + "." + payload).digest("hex")}`;
  const verified = signing.webhooks.constructEvent(payload, header, process.env.REVORY_AI_SCAN_WEBHOOK_SECRET!);
  await processAiScanWebhook(verified, payload);await processAiScanWebhook(verified, payload);
  assert.equal(await prisma.aiIntegrityScanGrant.count({ where: { orderId: purchase.orderId } }), 1);
  assert.equal(await hasAiScanPreparationAccess(ws.id), true);
  assert.equal(await prisma.aiIntegrityScanOrder.count({ where: { workspaceId: ws.id, ...aiConnectedScanOrderWhere() } }), 1);
  const refund = { id: "evt_refund_fixture", type: "charge.refunded", livemode: true, data: { object: { livemode: true, payment_intent: "pi_fixture", amount_refunded: 9900 } } } as unknown as Stripe.Event;
  await processAiScanWebhook(refund, JSON.stringify(refund));
  assert.equal(await hasAiScanPreparationAccess(ws.id), false);
  await assert.rejects(() => fulfillAiScanSession(paid), /Refunded/);
  await assert.rejects(() => prisma.aiIntegrityScanOrder.create({ data: { workspaceId: ws.id, actorUserId: user.id, requestKey: randomUUID(), offerVersion: SCAN_LIVE_OFFER_VERSION, amountMinor: 19900, currency: "usd", checkoutDriver: "stripe-live" } }));
  // The same reconciliation implementation accepts only explicitly retained
  // legacy price IDs, without modifying a Stripe subscription or its price.
  const legacyCheckout = await prisma.aiIntegrityMonitorState.create({ data: { workspaceId: foreign.id, kind: "CHECKOUT", key: "legacy", status: "COMPLETED", dataJson: { actorUserId: user.id, offer: LEGACY_MONITOR_OFFER.version } } });
  const end = Math.floor(Date.now()/1000)+86400;
  const sub = { id: "sub_legacy_fixture", metadata: { workspaceId: foreign.id, actorUserId: user.id, monitorCheckoutId: legacyCheckout.id, revory_offer: LEGACY_MONITOR_OFFER.version }, livemode: true, customer: "cus_legacy_fixture", status: "active", pause_collection: null, cancel_at_period_end: false, items: { data: [{ quantity: 1, current_period_end: end, price: { id: "price_monitor_399_fixture", unit_amount: 39900, currency: "usd", recurring: { interval: "month", interval_count: 1 }, metadata: { revory_offer: LEGACY_MONITOR_OFFER.version } } }] }, latest_invoice: { status: "paid", amount_paid: 39900, currency: "usd", lines: { data: [{ amount: 39900, period: { end }, pricing: { price_details: { price: "price_monitor_399_fixture" } } }] } } };
  const monitorSdk = { subscriptions: { retrieve: async () => sub } } as unknown as Stripe;
  await reconcileMonitorSubscription(foreign.id, sub.id, monitorSdk);assert.equal(await monitorPaid(prisma, foreign.id), true);
  assert.equal(((await prisma.aiIntegrityMonitorState.findUniqueOrThrow({ where: stateKey(foreign.id, "SUBSCRIPTION") })).dataJson as { amountMinor: number }).amountMinor, 39900);
  delete process.env.REVORY_AI_MONITOR_LEGACY_PRICE_IDS;
  await reconcileMonitorSubscription(foreign.id, sub.id, monitorSdk);assert.equal(await monitorPaid(prisma, foreign.id), false);
  assert.equal(MONITOR_OFFER.amountMinor, 19900);
  console.log("PASS pricing: live-mode fixture Checkout/verified signature, one grant, replay, unpaid/test/foreign rejection, refund revocation, database USD99 constraint and explicit legacy USD399 access. No external payment.");
} finally { await prisma.$disconnect(); }
