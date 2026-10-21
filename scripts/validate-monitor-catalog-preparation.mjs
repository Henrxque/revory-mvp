import assert from 'node:assert/strict';
import { MONITOR_STRIPE_PREPARATION as plan, prepareMonitorStripeCatalog } from './prepare-monitor-stripe-catalog.mjs';

function fixture() {
  let n = 0; const writes = []; const checkpoints = [];
  const data = { product: [], price: [], portal: [], webhook: [] };
  const resource = kind => ({
    list: async () => ({ data: data[kind], has_more: false }),
    create: async p => { writes.push(kind); const row = { ...structuredClone(p), id: `${kind}_${++n}`, livemode: true, ...(kind === 'portal' ? { active: true } : {}), ...(kind === 'webhook' ? { status: 'enabled', secret: 'whsec_fixture_only', api_version: 'fixture-version' } : {}) }; data[kind].push(row); return row; },
    update: async (id, p) => { writes.push(`${kind}-update`); const row = data[kind].find(x => x.id === id); Object.assign(row, p, p.disabled ? { status: 'disabled' } : {}); return row; },
  });
  const stripe = { accounts: { retrieve: async () => ({ id: plan.accountId, charges_enabled: true, payouts_enabled: true }) }, products: resource('product'), prices: resource('price'), billingPortal: { configurations: resource('portal') }, webhookEndpoints: resource('webhook'), getApiField: () => 'fixture-version' };
  return { stripe, data, writes, checkpoints, checkpoint: async x => checkpoints.push(x) };
}

const f = fixture();
const result = await prepareMonitorStripeCatalog({ ...f, mode: 'live' });
assert.equal(result.priceActive, false); assert.equal(result.productActive, false); assert.equal(result.portalActive, false); assert.equal(result.webhookStatus, 'disabled');
assert.equal(result.eventCount, 12); assert.equal(result.livePayments, 0); assert.equal(JSON.stringify(result).includes('whsec_'), false);
const writeCount = f.writes.length;
await prepareMonitorStripeCatalog({ ...f, mode: 'live', saved: f.checkpoints.at(-1) });
assert.equal(f.writes.length, writeCount, 'Rerun must not duplicate or mutate prepared resources.');

const wrong = fixture(); wrong.stripe.accounts.retrieve = async () => ({ id: 'acct_wrong' });
await assert.rejects(prepareMonitorStripeCatalog({ ...wrong, mode: 'live' }), /Wrong Stripe account/); assert.equal(wrong.writes.length, 0);
const legacy = fixture(); legacy.data.product.push({ id: 'legacy', livemode: true, active: true, metadata: { revory_offer: plan.offer } });
await assert.rejects(prepareMonitorStripeCatalog({ ...legacy, mode: 'live' }), /outside this preparation/); assert.equal(legacy.writes.length, 0);
const conflict = fixture(); await assert.rejects(prepareMonitorStripeCatalog({ ...conflict, mode: 'live', saved: { priceId: 'price_other' } }), /checkpoint/); assert.equal(conflict.writes.length, 0);
f.data.price[0].active = true;
await assert.rejects(prepareMonitorStripeCatalog({ ...f, mode: 'live' }), /activated separately/); assert.equal(f.writes.length, writeCount);

const interrupted = fixture(); let failOnce = true; const update = interrupted.stripe.webhookEndpoints.update;
interrupted.stripe.webhookEndpoints.update = async (...args) => { if (failOnce) { failOnce = false; throw Error('temporary transport failure'); } return update(...args); };
await assert.rejects(prepareMonitorStripeCatalog({ ...interrupted, mode: 'live' }), /temporary/);
assert.ok(interrupted.checkpoints.at(-1).webhookSecret, 'Retain secret in encrypted checkpoint after interrupted disable.');
const resumed = await prepareMonitorStripeCatalog({ ...interrupted, mode: 'live', saved: interrupted.checkpoints.at(-1) });
assert.equal(resumed.webhookStatus, 'disabled'); assert.equal(interrupted.data.webhook.length, 1);
const portalFailure = fixture(); let portalFailOnce = true; const portalUpdate = portalFailure.stripe.billingPortal.configurations.update;
portalFailure.stripe.billingPortal.configurations.update = async (...args) => { if (portalFailOnce) { portalFailOnce = false; throw Error('portal transport failure'); } return portalUpdate(...args); };
await assert.rejects(prepareMonitorStripeCatalog({ ...portalFailure, mode: 'live' }), /portal transport/);
const recoveredPortal = await prepareMonitorStripeCatalog({ ...portalFailure, mode: 'live', saved: portalFailure.checkpoints.at(-1) });
assert.equal(recoveredPortal.portalActive, false); assert.equal(portalFailure.data.portal.length, 1);
console.log('PASS: closed catalog, correct account, historical resources, idempotency, activation drift, encrypted checkpoint and interrupted webhook recovery.');
