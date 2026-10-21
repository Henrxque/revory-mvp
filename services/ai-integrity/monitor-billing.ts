import "server-only";
import { isAiCommercialRuntimeEnabled, monitorLiveMode } from "./commercial-runtime";
import Stripe from "stripe";
import { createHash } from "node:crypto";
import { prisma } from "@/db/prisma";
import { MONITOR_OFFER, monitorPriceOffer, isKnownMonitorOffer, assertMonitorOwner, recurringEnabled, stateKey, type MonitorSubscription } from "./recurring-access";
import { CHECKOUT_LEGAL_VERSIONS } from "@/content/revory-legal";

export function monitorStripe() {
  if (!recurringEnabled()) throw new Error("Monitoring billing is unavailable.");
  const key = process.env.REVORY_AI_MONITOR_STRIPE_KEY ?? "";
  if (!new RegExp("^[sr]k_" + (monitorLiveMode() ? "live" : "test") + "_").test(key) || !/^price_/.test(process.env.REVORY_AI_MONITOR_PRICE_ID ?? "")
    || !/^whsec_/.test(process.env.REVORY_AI_MONITOR_WEBHOOK_SECRET ?? "")) throw new Error("Configure the dedicated monitoring sandbox offer.");
  return new Stripe(key, { maxNetworkRetries: 1, timeout: 10000 });
}
function origin() {
  const value = new URL(process.env.NEXTAUTH_URL ?? "");
  if (isAiCommercialRuntimeEnabled()) return value.origin;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(value.hostname)) throw new Error("Monitoring sandbox requires its local return origin.");
  return value.origin;
}
export async function createMonitorCheckout(workspaceId: string, actorUserId: string, email: string, requestKey: string, stripe = monitorStripe()) {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestKey)) throw new Error("Invalid checkout request.");
  const priceId = process.env.REVORY_AI_MONITOR_PRICE_ID!;
  if (Object.entries(process.env).some(([name, value]) => name.startsWith("STRIPE") && name.includes("PRICE") && value?.split(/[,;\s]+/).includes(priceId))) throw new Error("Use a dedicated monitoring price; historical offers are protected.");
  const price = await stripe.prices.retrieve(priceId);
  if (!price.active || price.livemode !== monitorLiveMode() || price.unit_amount !== MONITOR_OFFER.amountMinor || price.currency !== MONITOR_OFFER.currency
    || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || price.recurring.usage_type !== "licensed"
    || price.metadata.revory_offer !== MONITOR_OFFER.version) throw new Error("The monthly monitoring price does not match its dedicated offer.");
  return prisma.$transaction(async tx => {
    await assertMonitorOwner(workspaceId, actorUserId, tx);
    const existing = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "SUBSCRIPTION") });
    if (existing && existing.status !== "CANCELED") throw new Error("Review the existing subscription or checkout first.");
    const pending = await tx.aiIntegrityMonitorState.findFirst({ where: { workspaceId, kind: "CHECKOUT", status: "PENDING", availableAt: { gt: new Date() } } });
    const pendingBinding = pending?.dataJson as { actorUserId?: string; offer?: string } | undefined;
    if (pending && (pendingBinding?.actorUserId !== actorUserId || pendingBinding.offer !== MONITOR_OFFER.version)) throw new Error("Review the existing checkout first.");
    // Stripe requires at least 30 minutes remaining at receipt. One hour leaves
    // room for network latency and small differences between server clocks.
    const checkout = pending ?? await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "CHECKOUT", requestKey), create: { workspaceId, kind: "CHECKOUT", key: requestKey, status: "PENDING", availableAt: new Date(Date.now() + 3600000), dataJson: { actorUserId, offer: MONITOR_OFFER.version } }, update: {} });
    if (checkout.availableAt < new Date() || checkout.status !== "PENDING") throw new Error("Begin a new checkout request.");
    const stored = checkout.dataJson as { url?: string };
    if (stored.url?.startsWith("https://checkout.stripe.com/")) return { url: stored.url };
    const metadata = { workspaceId, actorUserId, revory_offer: MONITOR_OFFER.version, monitorCheckoutId: checkout.id, ...CHECKOUT_LEGAL_VERSIONS };
    await tx.legalAcceptance.create({ data: { workspaceId, userId: actorUserId, event: "CHECKOUT_STARTED", documentVersionsJson: CHECKOUT_LEGAL_VERSIONS, contextJson: { offer: MONITOR_OFFER.version, amountMinor: MONITOR_OFFER.amountMinor, currency: "usd", cadence: "monthly", testMode: !monitorLiveMode(), checkoutId: checkout.id } } });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", line_items: [{ price: price.id, quantity: 1 }], customer_email: email,
      client_reference_id: workspaceId, metadata, subscription_data: { metadata },
      success_url: origin() + "/app/ai-integrity/monitoring?checkout=returned", cancel_url: origin() + "/app/ai-integrity/monitoring?checkout=canceled",
      expires_at: Math.floor(checkout.availableAt.valueOf() / 1000), integration_identifier: "revory_monitor_" + createHash("sha256").update(checkout.id).digest("hex").slice(0, 8).replace(/[0-9]/g, "a"),
    }, { idempotencyKey: "revory-monitor/" + checkout.id });
    if (!session.url?.startsWith("https://checkout.stripe.com/")) throw new Error("Stripe checkout did not return a valid URL.");
    await tx.aiIntegrityMonitorState.update({ where: { id: checkout.id }, data: { dataJson: { actorUserId, offer: MONITOR_OFFER.version, sessionId: session.id, url: session.url } } });
    return { url: session.url };
  }, { timeout: 30000 });
}
export async function reconcileMonitorSubscription(workspaceId: string, subscriptionId: string, stripe = monitorStripe()) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
    const metadata = subscription.metadata;
    if (subscription.id !== subscriptionId || !metadata.monitorCheckoutId || !metadata.actorUserId || metadata.workspaceId !== workspaceId || !isKnownMonitorOffer(metadata.revory_offer) || subscription.livemode !== monitorLiveMode()) throw new Error("Subscription scope mismatch.");
    const checkout = await tx.aiIntegrityMonitorState.findFirst({ where: { id: metadata.monitorCheckoutId, workspaceId, kind: "CHECKOUT" } });
    const checkoutBinding = checkout?.dataJson as { actorUserId?: string; offer?: string } | undefined;
    if (!checkout || checkoutBinding?.actorUserId !== metadata.actorUserId || checkoutBinding.offer !== metadata.revory_offer) throw new Error("Subscription checkout is unknown.");
    const saved = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "SUBSCRIPTION") });
    const previous = saved?.dataJson as unknown as MonitorSubscription | undefined;
    if (previous?.subscriptionId && previous.subscriptionId !== subscription.id && saved?.status !== "CANCELED") throw new Error("A different subscription is already associated.");
    const item = subscription.items.data[0], invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const risk = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "BILLING_RISK", customerId) });
    const offer = item ? monitorPriceOffer(item.price.id) : null;
    const validPrice = !!offer && subscription.items.data.length === 1 && item.quantity === 1
      && item.price.unit_amount === offer.amountMinor && item.price.currency === "usd" && item.price.recurring?.interval === "month" && item.price.recurring.interval_count === 1
      && item.price.metadata.revory_offer === offer.version && metadata.revory_offer === offer.version;
    const paidLine = !!item && !!offer && invoice?.lines.data.some(line => line.pricing?.price_details?.price === item?.price.id && line.period.end >= item.current_period_end && line.amount >= offer.amountMinor);
    const paid = validPrice && paidLine && subscription.status === "active" && !subscription.pause_collection && invoice?.status === "paid" && invoice.currency === "usd"
      && !!offer && invoice.amount_paid >= offer.amountMinor && item.current_period_end * 1000 > Date.now() && !risk;
    // The portal can set cancel_at without cancel_at_period_end. Preserve the
    // canonical date and never let cached access extend past cancellation.
    const cancellation = subscription.cancel_at ?? (subscription.cancel_at_period_end ? item?.current_period_end : null);
    const paidThrough = Math.min(item?.current_period_end ?? 0, cancellation ?? Infinity);
    const data: MonitorSubscription = { customerId, subscriptionId, priceId: item?.price.id ?? "", amountMinor: item?.price.unit_amount ?? undefined, offerVersion: metadata.revory_offer, paidThrough: new Date(paidThrough * 1000).toISOString(), verifiedAt: new Date().toISOString(), livemode: monitorLiveMode(), cancelAt: cancellation ? new Date(cancellation * 1000).toISOString() : null, cancelAtPeriodEnd: subscription.cancel_at_period_end || cancellation === item?.current_period_end };
    const status = risk ? "BLOCKED" : paid ? "ACTIVE" : ["canceled", "incomplete_expired"].includes(subscription.status) ? "CANCELED" : subscription.status === "past_due" ? "PAST_DUE" : "INACTIVE";
    await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "SUBSCRIPTION"), create: { workspaceId, kind: "SUBSCRIPTION", key: "primary", status, dataJson: { ...data } }, update: { status, dataJson: { ...data }, revision: { increment: 1 } } });
    await tx.aiIntegrityMonitorState.update({ where: { id: checkout.id }, data: { status: "COMPLETED" } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId: metadata.actorUserId, action: "AI_MONITOR_SUBSCRIPTION_VERIFIED", metadataJson: { subscriptionId, status, paidThrough: data.paidThrough, offer: metadata.revory_offer, testMode: !monitorLiveMode() } } });
    return { status };
  }, { timeout: 30000 });
}
export async function handleMonitorWebhook(raw: string, signature: string, stripe = monitorStripe()) {
  const event = stripe.webhooks.constructEvent(raw, signature, process.env.REVORY_AI_MONITOR_WEBHOOK_SECRET!);
  if (event.livemode !== monitorLiveMode()) throw new Error("Live events are not enabled in this environment.");
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!isKnownMonitorOffer(session.metadata?.revory_offer)) return;
    if (session.mode !== "subscription" || session.client_reference_id !== session.metadata.workspaceId) throw new Error("Invalid checkout.");
    const checkout = await prisma.aiIntegrityMonitorState.findFirst({ where: { id: session.metadata.monitorCheckoutId, workspaceId: session.metadata.workspaceId, kind: "CHECKOUT" } });
    if (!checkout || (checkout.dataJson as { sessionId?: string }).sessionId !== session.id) throw new Error("Checkout binding failed.");
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!id) throw new Error("Subscription unavailable.");
    await reconcileMonitorSubscription(session.metadata.workspaceId, id, stripe);
  } else if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    if (isKnownMonitorOffer(sub.metadata.revory_offer) && sub.metadata.workspaceId) await reconcileMonitorSubscription(sub.metadata.workspaceId, sub.id, stripe);
  } else if (["charge.refunded", "charge.dispute.created", "radar.early_fraud_warning.created"].includes(event.type)) {
    const object = event.data.object as unknown as { customer?: string; charge?: string };
    const charge = object.charge ? await stripe.charges.retrieve(object.charge) : object;
    const customerId = typeof charge.customer === "string" ? charge.customer : undefined;
    if (customerId) {
      const subscriptions = await prisma.aiIntegrityMonitorState.findMany({ where: { kind: "SUBSCRIPTION", dataJson: { path: ["customerId"], equals: customerId } }, take: 2 });
      for (const sub of subscriptions) await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${sub.workspaceId} FOR UPDATE`;
        await tx.aiIntegrityMonitorState.upsert({ where: stateKey(sub.workspaceId, "BILLING_RISK", customerId), create: { workspaceId: sub.workspaceId, kind: "BILLING_RISK", key: customerId, status: "BLOCKED", dataJson: { eventId: event.id, type: event.type } }, update: {} });
        await tx.aiIntegrityMonitorState.update({ where: { id: sub.id }, data: { status: "BLOCKED" } });
      });
    }
  } else if (event.type.startsWith("invoice.")) {
    const invoice = event.data.object as Stripe.Invoice;
    const id = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof id === "string" ? id : id?.id;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (isKnownMonitorOffer(subscription.metadata.revory_offer) && subscription.metadata.workspaceId) await reconcileMonitorSubscription(subscription.metadata.workspaceId, subscriptionId, stripe);
    }
  }
}
export async function monitorPortal(workspaceId: string, actorUserId: string, stripe = monitorStripe()) {
  await prisma.$transaction(tx => assertMonitorOwner(workspaceId, actorUserId, tx));
  const configurationId = process.env.REVORY_AI_MONITOR_PORTAL_CONFIGURATION_ID ?? "";
  if (!/^bpc_/.test(configurationId)) throw new Error("Configure the dedicated monitoring customer portal.");
  const configuration = await stripe.billingPortal.configurations.retrieve(configurationId);
  if (!configuration.active || configuration.livemode !== monitorLiveMode()
    || configuration.metadata?.revory_offer !== MONITOR_OFFER.version
    || !configuration.features.subscription_cancel.enabled || !configuration.features.payment_method_update.enabled
    || configuration.features.subscription_update.enabled) throw new Error("The monitoring customer portal does not match this offer.");
  const sub = await prisma.aiIntegrityMonitorState.findUniqueOrThrow({ where: stateKey(workspaceId, "SUBSCRIPTION") });
  const data = sub.dataJson as unknown as MonitorSubscription;
  if (!data.customerId) throw new Error("No subscription customer is associated.");
  const session = await stripe.billingPortal.sessions.create({ customer: data.customerId, configuration: configuration.id, return_url: origin() + "/app/ai-integrity/monitoring" });
  if (!session.url.startsWith("https://billing.stripe.com/")) throw new Error("Stripe did not return a valid customer portal URL.");
  return { url: session.url };
}
export async function refreshMonitorSubscriptions() {
  if (!recurringEnabled()) return;
  const rows = await prisma.aiIntegrityMonitorState.findMany({ where: { kind: "SUBSCRIPTION", status: { not: "CANCELED" }, updatedAt: { lt: new Date(Date.now() - 3600000) } }, orderBy: { updatedAt: "asc" }, take: 1 });
  for (const row of rows) {
    const data = row.dataJson as unknown as MonitorSubscription;
    try { await reconcileMonitorSubscription(row.workspaceId, data.subscriptionId); }
    catch { console.error(JSON.stringify({ message: "ai_monitor_billing_refresh_failed", workspaceId: row.workspaceId })); }
  }
}
