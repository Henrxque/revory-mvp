import "server-only";
import { monitorPaid } from "./recurring-access";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { AI_SCAN_OFFER, aiScanPriceMatches, assertAiScanPaidSession, buildAiScanCheckout } from "@/domain/ai-integrity/scan-offer";
import { CHECKOUT_LEGAL_VERSIONS } from "@/content/revory-legal";
import { aiScanEligibleOrderWhere, isAiIntegrityExperienceEnabled, isAiIntegrityRemoteSyntheticPreviewEnabled } from "./experience";
import { isAiCommercialRuntimeEnabled, monitorLiveMode } from "./commercial-runtime";
import { SCAN_LIVE_OFFER_VERSION } from "@/domain/ai-integrity/commercial-offers";

export type AiScanCheckoutDriver = "stripe-live" | "stripe-test" | "simulation" | "unavailable";
export function aiScanBillingConfiguration() {
  const commercial = isAiCommercialRuntimeEnabled();
  return commercial ? { key: process.env.REVORY_AI_SCAN_STRIPE_KEY ?? "", priceId: process.env.REVORY_AI_SCAN_PRICE_ID ?? "", webhookSecret: process.env.REVORY_AI_SCAN_WEBHOOK_SECRET ?? "", offerVersion: SCAN_LIVE_OFFER_VERSION }
    : { key: process.env.REVORY_AI_SCAN_TEST_SECRET_KEY ?? "", priceId: process.env.REVORY_AI_SCAN_TEST_PRICE_ID ?? "", webhookSecret: process.env.REVORY_AI_SCAN_TEST_WEBHOOK_SECRET ?? "", offerVersion: AI_SCAN_OFFER.version };
}
export function aiScanCheckoutDriver(): AiScanCheckoutDriver {
  if (!isAiIntegrityExperienceEnabled() || isAiIntegrityRemoteSyntheticPreviewEnabled()) return "unavailable";
  const config = aiScanBillingConfiguration();
  if (!new RegExp("^[sr]k_" + (monitorLiveMode() ? "live" : "test") + "_").test(config.key) || !config.priceId.startsWith("price_") || !config.webhookSecret.startsWith("whsec_")) return "unavailable";
  if (isAiCommercialRuntimeEnabled()) return process.env.REVORY_AI_SCAN_ENABLED === "true" ? monitorLiveMode() ? "stripe-live" : "stripe-test" : "unavailable";
  const simulation = process.env.REVORY_AI_SCAN_TEST_API_ORIGIN;
  if (simulation) {
    try { const url = new URL(simulation); if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return "unavailable"; }
    catch { return "unavailable"; }
    return "simulation";
  }
  return "stripe-test";
}

export function aiScanStripeClient() {
  const driver = aiScanCheckoutDriver();
  if (driver === "unavailable") throw new Error("Scan checkout is unavailable.");
  const origin = driver === "simulation" ? new URL(process.env.REVORY_AI_SCAN_TEST_API_ORIGIN!) : null;
  return new Stripe(aiScanBillingConfiguration().key, { maxNetworkRetries: 1, timeout: 10000,
    ...(origin ? { host: origin.hostname, port: Number(origin.port), protocol: "http" } : {}) });
}

export async function hasAiScanPreparationAccess(workspaceId: string) {
  if (!isAiIntegrityExperienceEnabled()) return true;
  if (await monitorPaid(prisma, workspaceId)) return true;
  return Boolean(await prisma.aiIntegrityScanGrant.findFirst({ where: { workspaceId, status: "ACTIVE", consumedAt: null, order: aiScanEligibleOrderWhere() }, select: { id: true } }));
}
export async function requireAiScanPreparationAccess(workspaceId: string) {
  if (!(await hasAiScanPreparationAccess(workspaceId))) throw new Error("Purchase a scan before preparing new evidence.");
}

export async function createAiScanCheckout(input: { workspaceId: string; actorUserId: string; email: string; requestKey: string }, stripe = aiScanStripeClient()) {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestKey)) throw new Error("A valid checkout request key is required.");
  const driver = aiScanCheckoutDriver();
  if (driver === "unavailable") throw new Error("Scan checkout is not configured for this environment.");
  const config = aiScanBillingConfiguration(), priceId = config.priceId;
  if (Object.entries(process.env).some(([key, value]) => key.startsWith("STRIPE") && key.includes("PRICE") && value?.split(/[,;\s]+/).includes(priceId))) throw new Error("The AI scan requires a separate price; historical prices are protected.");
  const price = await stripe.prices.retrieve(priceId);
  if (!aiScanPriceMatches(price, driver === "stripe-live") || (isAiCommercialRuntimeEnabled() && price.metadata.revory_offer !== config.offerVersion)) throw new Error("Scan price does not match the USD 99 one-time offer.");
  if (!await prisma.workspace.findFirst({ where: { id: input.workspaceId, ownerUserId: input.actorUserId }, select: { id: true } })) throw new Error("Only the workspace owner can purchase a scan.");
  const appUrl = new URL(isAiCommercialRuntimeEnabled() ? process.env.NEXTAUTH_URL! : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  if (isAiCommercialRuntimeEnabled() ? appUrl.protocol !== "https:" : !["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname)) throw new Error("Invalid scan checkout return origin.");
  const order = await prisma.aiIntegrityScanOrder.upsert({ where: { workspaceId_requestKey: { workspaceId: input.workspaceId, requestKey: input.requestKey } },
    create: { workspaceId: input.workspaceId, actorUserId: input.actorUserId, requestKey: input.requestKey,
      offerVersion: config.offerVersion, amountMinor: AI_SCAN_OFFER.amountMinor, currency: AI_SCAN_OFFER.currency, checkoutDriver: driver }, update: {} });
  if (order.status !== "PENDING") throw new Error("This purchase is already processed. Open your workspace or begin a new checkout.");
  if (order.checkoutDriver !== driver || order.offerVersion !== config.offerVersion) throw new Error("Checkout environment changed. Begin a new checkout.");
  if (order.actorUserId !== input.actorUserId) throw new Error("Begin a checkout with your own request key.");
  if (order.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if (existing.status === "open" && existing.url) {
      assertCheckoutDestination(existing, driver);
      if (existing.metadata?.aiScanOrderId !== order.id || existing.metadata.workspaceId !== order.workspaceId) throw new Error("Checkout metadata changed.");
      return { orderId: order.id, url: existing.url, driver };
    }
    throw new Error("Checkout is no longer open. Refresh its status or begin a new checkout.");
  }
  const suffix = [...createHash("sha256").update(order.id).digest().subarray(0, 8)].map((value) => String.fromCharCode(97 + value % 26)).join("");
  const session = await stripe.checkout.sessions.create(buildAiScanCheckout({ orderId: order.id, workspaceId: input.workspaceId,
    priceId, email: input.email, appUrl: appUrl.origin, offerVersion: config.offerVersion, integrationIdentifier: `revory_ai_scan_${suffix}` }), { idempotencyKey: `revory-ai-scan:${order.id}` });
  assertCheckoutDestination(session, driver);
  await prisma.$transaction([
    prisma.aiIntegrityScanOrder.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id, checkoutUrl: session.url } }),
    prisma.legalAcceptance.create({ data: { userId: input.actorUserId, workspaceId: input.workspaceId, event: "CHECKOUT_STARTED",
      documentVersionsJson: CHECKOUT_LEGAL_VERSIONS, contextJson: { aiScanOrderId: order.id, checkoutDriver: driver, offer: config.offerVersion, amountMinor: AI_SCAN_OFFER.amountMinor, currency: "usd", cadence: "one-time", testMode: driver !== "stripe-live" } } }),
  ]);
  return { orderId: order.id, url: session.url!, driver };
}

function assertCheckoutDestination(session: Stripe.Checkout.Session, driver: Exclude<AiScanCheckoutDriver, "unavailable">) {
  if (session.livemode !== (driver === "stripe-live") || session.mode !== "payment" || session.subscription || !session.url) throw new Error("Unsafe scan checkout session.");
  const url = new URL(session.url);
  if (driver !== "simulation" ? url.protocol !== "https:" || url.hostname !== "checkout.stripe.com"
    : url.origin !== new URL(process.env.REVORY_AI_SCAN_TEST_API_ORIGIN!).origin) throw new Error("Unexpected checkout destination.");
}

async function fulfillInTransaction(tx: Prisma.TransactionClient, session: Stripe.Checkout.Session, expectedWorkspaceId?: string) {
  const orderId = session.metadata?.aiScanOrderId;
  if (!orderId) throw new Error("Scan order metadata missing.");
    await tx.$queryRaw`SELECT id FROM ai_integrity_scan_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.aiIntegrityScanOrder.findUnique({ where: { id: orderId } });
    if (!order || (expectedWorkspaceId && order.workspaceId !== expectedWorkspaceId)) throw new Error("Order is unavailable in this workspace.");
    if (monitorLiveMode() ? order.checkoutDriver !== "stripe-live" || order.offerVersion !== SCAN_LIVE_OFFER_VERSION : order.checkoutDriver === "stripe-live" || ![AI_SCAN_OFFER.version, SCAN_LIVE_OFFER_VERSION].includes(order.offerVersion)) throw new Error("Purchase environment mismatch.");
    assertAiScanPaidSession(session, order, { livemode: monitorLiveMode(), offerVersion: order.offerVersion });
    if (order.status === "REFUNDED" || await tx.aiIntegrityScanGrant.findFirst({ where: { orderId: order.id, status: "REVOKED" }, select: { id: true } })) throw new Error("Refunded or blocked purchase cannot be activated.");
    const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntent?.startsWith("pi_")) throw new Error("Paid checkout needs a payment intent reference.");
    await tx.aiIntegrityScanOrder.update({ where: { id: order.id }, data: { status: "PAID", paidAt: order.paidAt ?? new Date(), stripePaymentIntentId: paymentIntent } });
    const grant = await tx.aiIntegrityScanGrant.upsert({ where: { orderId: order.id }, create: { workspaceId: order.workspaceId, orderId: order.id }, update: {} });
    if (order.status !== "PAID") await tx.workspaceAuditEvent.create({ data: { workspaceId: order.workspaceId, actorUserId: order.actorUserId,
      action: monitorLiveMode() ? "AI_SCAN_PURCHASE_CONFIRMED" : "AI_SCAN_TEST_PURCHASE_CONFIRMED", metadataJson: { orderId: order.id, driver: order.checkoutDriver, grantId: grant.id } } });
    return grant;
}

export async function fulfillAiScanSession(session: Stripe.Checkout.Session, expectedWorkspaceId?: string) {
  return prisma.$transaction((tx) => fulfillInTransaction(tx, session, expectedWorkspaceId));
}

export async function refreshAiScanOrder(workspaceId: string, orderId: string) {
  const order = await prisma.aiIntegrityScanOrder.findFirst({ where: { workspaceId, id: orderId } });
  if (!order) throw new Error("Order is unavailable in this workspace.");
  if (order.status === "PENDING" && order.stripeCheckoutSessionId) {
    const session = await aiScanStripeClient().checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if (session.livemode !== monitorLiveMode() || (order.checkoutDriver === "stripe-live") !== monitorLiveMode()) throw new Error("Purchase environment mismatch.");
    if (session.payment_status === "paid" && session.status === "complete") await fulfillAiScanSession(session, workspaceId);
    else if (session.status === "expired") await prisma.aiIntegrityScanOrder.updateMany({ where: { id: order.id, workspaceId, status: "PENDING" }, data: { status: "EXPIRED" } });
  }
  return prisma.aiIntegrityScanOrder.findFirstOrThrow({ where: { workspaceId, id: orderId }, include: { grant: true } });
}

export async function processAiScanWebhook(event: Stripe.Event, payload: string) {
  if (event.livemode !== monitorLiveMode()) throw new Error("Scan event environment mismatch.");
  const eventKey = `ai-scan:${event.id}`, payloadHash = createHash("sha256").update(payload).digest("hex");
  return prisma.$transaction(async (tx) => {
  // Serialize the event receipt and fulfillment in one transaction, including conflicting replays.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventKey}, 0))`;
  const existing = await tx.stripeWebhookEvent.findUnique({ where: { id: eventKey } });
  if (existing && existing.payloadHash !== payloadHash) throw new Error("Webhook payload changed for the same event ID.");
  if (existing?.status === "PROCESSED") return { replayed: true };
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.offerKey !== AI_SCAN_OFFER.key) return { replayed: false, ignored: true };
    if (session.payment_status === "paid") {
      const orderId = session.metadata?.aiScanOrderId;
      if (orderId) await tx.$queryRaw`SELECT id FROM ai_integrity_scan_orders WHERE id = ${orderId} FOR UPDATE`;
      const order = orderId ? await tx.aiIntegrityScanOrder.findUnique({ where: { id: orderId } }) : null;
      if (order?.status === "REFUNDED") assertAiScanPaidSession(session, order, { livemode: monitorLiveMode(), offerVersion: order.offerVersion });
      else await fulfillInTransaction(tx, session);
    }
  } else if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    await tx.aiIntegrityScanOrder.updateMany({ where: { stripeCheckoutSessionId: session.id, status: "PENDING" },
      data: { status: event.type.endsWith("expired") ? "EXPIRED" : "FAILED" } });
  } else if (["charge.refunded", "charge.dispute.created", "radar.early_fraud_warning.created"].includes(event.type)) {
    const object = event.data.object as unknown as { charge?: string | Stripe.Charge };
    const charge = event.type === "charge.refunded" ? event.data.object as Stripe.Charge : typeof object.charge === "string" ? await aiScanStripeClient().charges.retrieve(object.charge) : object.charge;
    if (!charge || charge.livemode !== undefined && charge.livemode !== monitorLiveMode()) throw new Error("Scan risk event environment mismatch.");
    const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (paymentIntent && (event.type !== "charge.refunded" || charge.amount_refunded > 0)) {
      const order = await tx.aiIntegrityScanOrder.findUnique({ where: { stripePaymentIntentId: paymentIntent } });
      // A refund delivered before completion must retry instead of silently granting a later payment.
      if (!order) {
        if (isAiCommercialRuntimeEnabled() && charge.metadata?.offerKey !== AI_SCAN_OFFER.key) return { replayed: false, ignored: true };
        throw new Error("Refund has no recorded payment yet; retry after checkout fulfillment.");
      }
      if ((order.checkoutDriver === "stripe-live") !== monitorLiveMode()) throw new Error("Scan purchase environment mismatch.");
      await tx.$queryRaw`SELECT id FROM ai_integrity_scan_orders WHERE id = ${order.id} FOR UPDATE`;
      await tx.aiIntegrityScanGrant.updateMany({ where: { orderId: order.id }, data: { status: "REVOKED" } });
      await tx.aiIntegrityScanOrder.update({ where: { id: order.id }, data: { status: event.type === "charge.refunded" ? "REFUNDED" : "FAILED" } });
    }
  }
  await tx.stripeWebhookEvent.upsert({ where: { id: eventKey }, create: { id: eventKey, type: event.type, payloadHash, status: "PROCESSED", processedAt: new Date() },
    update: { status: "PROCESSED", processedAt: new Date() } });
  return { replayed: false };
  }, { timeout: 15000 });
}
