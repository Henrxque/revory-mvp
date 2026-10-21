// Configuration only: no customer, checkout, subscription, invoice or charge writes.
export const MONITOR_STRIPE_PREPARATION = Object.freeze({
  accountId: 'acct_1Ttu8IRiSOuAN93T',
  offer: 'revory-monitor-399/v1',
  managedBy: 'revory-catalog-preparation/v1',
  origin: 'https://revory.app',
  events: [
    'checkout.session.completed', 'customer.subscription.created',
    'customer.subscription.updated', 'customer.subscription.deleted',
    'customer.subscription.paused', 'customer.subscription.resumed',
    'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required',
    'charge.refunded', 'charge.dispute.created', 'radar.early_fraud_warning.created',
  ],
});

function requireCondition(value, message) { if (!value) throw new Error(message); }
async function allPages(list) {
  const rows = []; let starting_after;
  for (let page = 0; page < 10; page++) {
    const result = await list({ limit: 100, ...(starting_after ? { starting_after } : {}) });
    rows.push(...result.data);
    if (!result.has_more) return rows;
    starting_after = result.data.at(-1)?.id;
    requireCondition(starting_after, 'Catalog pagination is incomplete.');
  }
  throw new Error('Catalog inventory exceeded its preparation bound.');
}

export async function prepareMonitorStripeCatalog({ stripe, mode, saved = {}, checkpoint }) {
  requireCondition(['test', 'live'].includes(mode), 'Choose an explicit Stripe mode.');
  requireCondition(typeof checkpoint === 'function', 'An encrypted checkpoint writer is required.');
  const plan = MONITOR_STRIPE_PREPARATION;
  const live = mode === 'live';
  const account = await stripe.accounts.retrieve();
  requireCondition(account.id === plan.accountId, 'Wrong Stripe account: no resources were changed.');
  requireCondition(!live || (account.charges_enabled && account.payouts_enabled), 'The live account is not enabled.');
  const state = { ...saved };
  const metadata = { revory_offer: plan.offer, revory_managed_by: plan.managedBy };
  const idempotency = resource => ({ idempotencyKey: `${plan.managedBy}/${account.id}/${mode}/${resource}` });
  const owned = resource => resource.metadata?.revory_offer === plan.offer && resource.metadata?.revory_managed_by === plan.managedBy;
  const scope = resource => requireCondition(owned(resource) && resource.livemode === live, 'Resource mode or ownership does not match this preparation.');
  const save = async () => checkpoint({ ...state });

  // Inspect every collection before the first mutation; fail closed on ambiguous ownership.
  const collections = await Promise.all([
    allPages(p => stripe.products.list(p)), allPages(p => stripe.prices.list(p)),
    allPages(p => stripe.billingPortal.configurations.list(p)), allPages(p => stripe.webhookEndpoints.list(p)),
  ]);
  const names = ['product', 'price', 'portal', 'webhook'];
  const found = Object.fromEntries(collections.map((rows, i) => {
    const offerRows = rows.filter(x => x.metadata?.revory_offer === plan.offer);
    requireCondition(!live || offerRows.every(owned), 'A Monitor resource already exists outside this preparation; review it before proceeding.');
    const matches = offerRows.filter(owned);
    requireCondition(matches.length <= 1, 'More than one managed Monitor resource exists; review before proceeding.');
    const resource = matches[0];
    if (state[`${names[i]}Id`]) requireCondition(resource?.id === state[`${names[i]}Id`], 'The encrypted checkpoint and Stripe catalog disagree.');
    return [names[i], resource];
  }));
  let product = found.product, price = found.price, portal = found.portal, webhook = found.webhook;
  for (const resource of [product, price, portal, webhook].filter(Boolean)) scope(resource);
  requireCondition(!product?.active && !price?.active && (!portal?.active || state.pendingResource === 'portal'), 'A prepared offer was activated separately; preparation will not modify it.');

  if (!product) product = await stripe.products.create({ name: 'REVORY Monitor', active: false, metadata }, idempotency('product'));
  scope(product); state.productId = product.id; await save();
  if (price) requireCondition(price.unit_amount === 39900 && price.currency === 'usd' && price.product === product.id && price.recurring?.interval === 'month' && price.recurring?.interval_count === 1 && price.recurring?.usage_type === 'licensed', 'The prepared Price contract changed.');
  else price = await stripe.prices.create({ product: product.id, active: false, unit_amount: 39900, currency: 'usd', recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' }, metadata }, idempotency('price'));
  scope(price); state.priceId = price.id; await save();

  if (!portal) {
    state.pendingResource = 'portal'; await save();
    portal = await stripe.billingPortal.configurations.create({
      name: 'REVORY Monitor', business_profile: { headline: 'REVORY Monitor', privacy_policy_url: plan.origin + '/privacy', terms_of_service_url: plan.origin + '/terms' },
      default_return_url: plan.origin + '/app/ai-integrity/monitoring', login_page: { enabled: false },
      features: { subscription_cancel: { enabled: true, mode: 'at_period_end' }, payment_method_update: { enabled: true }, invoice_history: { enabled: true }, subscription_update: { enabled: false } }, metadata,
    }, idempotency('portal'));
    // Stripe creates portal configurations active; disable this one immediately.
    state.portalId = portal.id;
    try { portal = await stripe.billingPortal.configurations.update(portal.id, { active: false }, idempotency('portal-disable')); }
    finally { await save(); }
  } else if (portal.active && state.pendingResource === 'portal') {
    portal = await stripe.billingPortal.configurations.update(portal.id, { active: false }, idempotency('portal-disable'));
  }
  scope(portal); state.portalId = portal.id;
  requireCondition(!portal.active && portal.features.subscription_cancel.enabled && portal.features.subscription_cancel.mode === 'at_period_end' && portal.features.payment_method_update.enabled && !portal.features.subscription_update.enabled && !portal.login_page?.enabled, 'The prepared portal contract changed.');
  delete state.pendingResource; await save();

  if (!webhook) {
    // The API has no disabled-at-creation parameter. Disable immediately; there
    // is no active Monitor price or checkout to produce a new Monitor purchase.
    webhook = await stripe.webhookEndpoints.create({ url: plan.origin + '/api/ai-integrity/recurring/webhook', connect: false, api_version: stripe.getApiField('version'), enabled_events: [...plan.events], description: 'REVORY Monitor — staged, enable only after release verification', metadata }, idempotency('webhook'));
    state.webhookId = webhook.id; state.webhookSecret = webhook.secret;
    try { webhook = await stripe.webhookEndpoints.update(webhook.id, { disabled: true }, idempotency('webhook-disable')); }
    finally { await save(); }
  } else if (webhook.status !== 'disabled') {
    // Resume an interrupted create/disable pair, never enable an existing endpoint.
    webhook = await stripe.webhookEndpoints.update(webhook.id, { disabled: true }, idempotency('webhook-disable'));
  }
  scope(webhook); state.webhookId = webhook.id;
  requireCondition(webhook.status === 'disabled' && webhook.api_version === stripe.getApiField('version') && webhook.url === plan.origin + '/api/ai-integrity/recurring/webhook' && [...webhook.enabled_events].sort().join() === [...plan.events].sort().join(), 'The prepared webhook contract changed.');
  requireCondition(/^whsec_/.test(state.webhookSecret ?? ''), 'Signing secret is unavailable: review the existing disabled endpoint before continuing.');
  await save();
  return { mode, accountId: account.id, offer: plan.offer, productId: product.id, priceId: price.id, amountMinor: 39900, currency: 'usd', interval: 'month', portalId: portal.id, webhookId: webhook.id, webhookApiVersion: webhook.api_version, eventCount: plan.events.length, productActive: product.active, priceActive: price.active, portalActive: portal.active, webhookStatus: webhook.status, livePayments: 0, applicationPublished: false };
}
