import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the real modules with in-memory boundaries; never load env files or providers.
function load(file, dependencies = {}, env = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = {
    exports: {}, process: { env }, URL, Date, Set,
    console: { log() {}, error() {} },
    require(id) {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`);
      return dependencies[id];
    },
  };
  vm.runInNewContext(outputText, context, { filename: file });
  return context.exports;
}

const contracts = load("domain/revory/commercial-offers.ts");
const audit = "QUOTE_RECOVERY_AUDIT";
function harness(options = {}) {
  const env = { REVORY_PAID_CHECKOUT_ENABLED: "true" };
  for (const [key, offer] of Object.entries(contracts.revoryCommercialOfferContracts)) {
    env[offer.priceEnv] = `price_fixture_${key}`;
  }
  const runtime = {
    isStripeBillingConfigured: () => true,
    isStripeWebhookConfigured: () => options.webhook !== false,
    getStripeAppUrl: () => "https://revory.example",
    getStripeServerClient: () => stripe,
  };
  const offers = load("services/billing/revory-offers.ts", {
    "server-only": {},
    "@/domain/revory/commercial-offers": contracts,
    "@/services/billing/stripe-runtime": runtime,
  }, env);
  const calls = { customers: 0, creates: [], legal: [], subscriptionLists: 0 };
  const price = (key) => ({
    id: env[contracts.revoryCommercialOfferContracts[key].priceEnv],
    active: true, currency: "usd",
    unit_amount: contracts.revoryCommercialOfferContracts[key].amountCents,
    recurring: key === audit ? null : { interval: "month", interval_count: options.intervalCount ?? 1 },
  });
  // Stripe list promises also support asynchronous iteration across pages.
  const list = (data) => Object.assign(Promise.resolve({ data, has_more: false }), {
    async *[Symbol.asyncIterator]() { yield* data; },
  });
  const stripe = {
    prices: { retrieve: async (id) => price(Object.keys(contracts.revoryCommercialOfferContracts).find((key) => env[contracts.revoryCommercialOfferContracts[key].priceEnv] === id)) },
    subscriptions: { list: () => { calls.subscriptionLists++; return list(options.subscriptions ?? []); } },
    checkout: { sessions: {
      list: () => list(options.sessions ?? []),
      create: async (payload, requestOptions) => {
        calls.creates.push({ payload, requestOptions });
        return { id: "cs_new", url: "https://checkout.example/new" };
      },
    } },
  };
  const prisma = {
    workspaceEntitlement: { findFirst: async ({ where }) => (options.history ?? []).find((row) =>
      row.workspaceId === where.workspaceId && where.OR.some((match) =>
        Object.entries(match).every(([key, value]) => row[key] === value))) ?? null },
    legalAcceptance: { create: async (value) => { calls.legal.push(value); return value; } },
    workspaceAuditEvent: { create: async () => ({}) },
    $transaction: async (work) => Promise.all(work),
  };
  const route = load("src/app/api/billing/checkout/route.ts", {
    "next/server": { NextResponse: {
      redirect: (url, init) => ({ status: init.status, url: String(url) }),
      json: (body, init) => ({ body, ...init }),
    } },
    "@/auth": { getAuthSession: async () => ({ user: { id: "u_fixture" } }) },
    "@/services/billing/stripe-sync": { ensureStripeCustomerForWorkspace: async () => { calls.customers++; return "cus_fixture"; } },
    "@/services/billing/stripe-runtime": runtime,
    "@/services/billing/revory-offers": offers,
    "@/services/billing/entitlements": { getWorkspaceEntitlements: async () => options.active ?? [] },
    "@/services/auth/redirects": { buildSignUpRedirectPath: () => "/sign-up" },
    "@/services/auth/sync-user": { syncAuthenticatedUser: async () => ({ id: "u_fixture" }) },
    "@/services/workspaces/get-or-create-workspace": { getOrCreateWorkspace: async () => ({ id: "w_fixture", stripeCustomerId: "cus_fixture" }) },
    "@/db/prisma": { prisma },
    "@/content/revory-legal": { CHECKOUT_LEGAL_VERSIONS: {} },
  });
  return { calls, offers, price, async post(key = audit) {
    const url = `https://revory.example/api/billing/checkout?offer=${key}`;
    return route.POST({ url, nextUrl: new URL(url), headers: new Headers({ origin: "https://revory.example" }) });
  } };
}
function session(key = audit, status = "complete", id = "cs_old") {
  return { id, status, mode: key === audit ? "payment" : "subscription",
    url: `https://checkout.example/${id}`, subscription: key === audit ? null : "sub_old",
    metadata: { workspaceId: "w_fixture", offerKey: key },
    line_items: { data: [{ price: { id: `price_fixture_${key}` } }] } };
}
function historical(key = audit, status = "REVOKED") {
  return { workspaceId: "w_fixture", offerKey: key, status,
    stripeCheckoutSessionId: "cs_old", stripeSubscriptionId: key === audit ? null : "sub_old",
    endsAt: new Date("2020-01-01") };
}

test("missing webhook closes offer readiness and POST before customer creation", async () => {
  const h = harness({ webhook: false });
  assert.equal(h.offers.isRevoryOfferConfigured(audit), false);
  assert.match((await h.post()).url, /billing=unavailable/);
  assert.equal(h.calls.customers, 0);
});
test("current recurring contracts require exactly one month", () => {
  const h = harness();
  for (const key of ["STARTER", "GROWTH"]) {
    assert.equal(h.offers.revoryStripePriceMatchesContract(key, h.price(key)), true);
    for (const interval_count of [undefined, 0, 2, 3, 12]) {
      assert.equal(h.offers.revoryStripePriceMatchesContract(key, { ...h.price(key), recurring: { interval: "month", interval_count } }), false);
    }
    assert.equal(h.offers.revoryStripePriceMatchesContract(key, { ...h.price(key), recurring: { interval: "year", interval_count: 1 } }), false);
  }
  assert.equal(h.offers.revoryStripePriceMatchesContract(audit, h.price(audit)), true);
});
test("wrong interval blocks POST before session creation", async () => {
  const h = harness({ intervalCount: 3 });
  assert.match((await h.post("STARTER")).url, /billing=error/);
  assert.equal(h.calls.creates.length, 0);
});
for (const key of [audit, "STARTER", "GROWTH"]) {
  test(`${key} can be purchased directly without an Audit baseline`, async () => {
    const h = harness();
    assert.equal((await h.post(key)).url, "https://checkout.example/new");
    assert.equal(h.calls.creates[0].payload.mode, key === audit ? "payment" : "subscription");
    assert.equal(Boolean(h.calls.creates[0].payload.subscription_data), key !== audit);
  });
  for (const status of ["REVOKED", "ACTIVE"]) {
    test(`${key} historical ${status} entitlement with expired access allows new purchase`, async () => {
      const h = harness({ sessions: [session(key)], history: [historical(key, status)] });
      assert.equal((await h.post(key)).url, "https://checkout.example/new");
      const firstKey = h.calls.creates[0].requestOptions.idempotencyKey;
      assert.match(firstKey, /cs_old/);
      await h.post(key);
      assert.equal(h.calls.creates[1].requestOptions.idempotencyKey, firstKey);
    });
  }
  test(`${key} completed delivery without entitlement stays processing`, async () => {
    const h = harness({ sessions: [session(key)] });
    assert.match((await h.post(key)).url, /billing=processing/);
    assert.equal(h.calls.creates.length, 0);
  });
}
test("revoked entitlement with no end date allows repurchase", async () => {
  const h = harness({ sessions: [session()], history: [{ ...historical(), endsAt: null }] });
  assert.equal((await h.post()).url, "https://checkout.example/new");
});
test("foreign entitlement cannot resolve this workspace's pending delivery", async () => {
  const h = harness({ sessions: [session()], history: [{ ...historical(), workspaceId: "other" }] });
  assert.match((await h.post()).url, /billing=processing/);
});
test("open current session is reused, including after a historical completed purchase", async () => {
  const h = harness({ sessions: [session(), session(audit, "open", "cs_open")], history: [historical()] });
  assert.equal((await h.post()).url, "https://checkout.example/cs_open");
  assert.equal(h.calls.creates.length, 0);
  assert.equal(h.calls.legal[0].data.contextJson.reused, true);
});
test("pending completed delivery takes priority over an open session", async () => {
  const h = harness({ sessions: [session(audit, "open", "cs_open"), session()] });
  assert.match((await h.post()).url, /billing=processing/);
  assert.equal(h.calls.creates.length, 0);
});
test("active local recurring plan prevents a parallel different plan", async () => {
  const h = harness({ active: [{ offerKey: "STARTER" }] });
  assert.match((await h.post("GROWTH")).url, /manage-subscription/);
  assert.equal(h.calls.customers, 0);
});
for (const status of ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]) {
  test(`remote ${status} subscription blocks new plan despite delayed local entitlement`, async () => {
    const h = harness({ subscriptions: [{ id: "sub_existing", status }] });
    assert.match((await h.post("GROWTH")).url, /manage-subscription/);
    assert.equal(h.calls.creates.length, 0);
  });
}
test("terminal remote subscriptions allow a fresh direct subscription", async () => {
  const h = harness({ subscriptions: [{ status: "canceled" }, { status: "incomplete_expired" }] });
  assert.equal((await h.post("STARTER")).url, "https://checkout.example/new");
});
test("another recurring offer's open checkout prevents a parallel checkout", async () => {
  const h = harness({ sessions: [session("STARTER", "open")] });
  assert.match((await h.post("GROWTH")).url, /billing=processing/);
  assert.equal(h.calls.creates.length, 0);
});
