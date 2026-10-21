import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { getAiCustomerSourceArtifact, isAiCustomerSourcesEnabled, listAiCustomerSources, registerAiCustomerSource, revokeAiCustomerSource, syncAiCustomerSource } from "../services/ai-integrity/customer-sources";
import { buildWorkspaceExport } from "../services/data-portability/workspace-export";
import type { AiSourceRead } from "../domain/ai-integrity/connected-sources";

if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL ?? "").pathname)) throw new Error("Use the disposable database harness.");
process.env.REVORY_AI_SAAS_PREVIEW = "true";
process.env.REVORY_AI_CUSTOMER_SOURCES = "true";
process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY = "false";
delete process.env.VERCEL_ENV;
process.env.REVORY_AI_CONNECTION_ACTIVE_KEY = "fixture";
const keyring = JSON.stringify({ fixture: randomBytes(32).toString("base64") });
process.env.REVORY_AI_CONNECTION_KEYRING = keyring;
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) + "T00:00:00.000Z";
const start = day(3), end = day(2), suffix = randomUUID();
const secret = `sk-admin-${randomBytes(20).toString("hex")}`;
const input = { provider: "OPENAI", accountId: "org-fixture_123", secret, windowStart: start, windowEnd: end, consentConfirmed: true };
const empty = { object: "page", data: [], has_more: false, next_page: null };
let reads = 0;
const nonempty = async (read: AiSourceRead) => {
  reads++;
  const results = read.path.endsWith("costs")
    ? [{ object: "organization.costs.result", project_id: "proj_fixture", amount: { value: 1.25, currency: "usd" } }]
    : [{ object: "organization.usage.completions.result", project_id: "proj_fixture", model: "gpt-fixture", input_tokens: 100, output_tokens: 20 }];
  return { ...empty, data: [{ object: "bucket", start_time: Date.parse(start) / 1000, end_time: Date.parse(end) / 1000, results }] };
};
try {
  const user = await prisma.user.create({ data: { email: `sources-${suffix}@example.invalid` } });
  const stranger = await prisma.user.create({ data: { email: `stranger-${suffix}@example.invalid` } });
  const ws = await prisma.workspace.create({ data: { name: "Source connector test", slug: `sources-${suffix}`, ownerUserId: user.id } });
  const other = await prisma.workspace.create({ data: { name: "Other company", slug: `other-${suffix}`, ownerUserId: stranger.id } });
  await assert.rejects(() => registerAiCustomerSource(ws.id, user.id, input), /confirmed test purchase/);
  const order = await prisma.aiIntegrityScanOrder.create({ data: { workspaceId: ws.id, actorUserId: user.id, requestKey: randomUUID(), offerVersion: "fixture-only", amountMinor: 0, currency: "usd", status: "SYNTHETIC_PREVIEW", checkoutDriver: "synthetic-preview" } });
  const grant = await prisma.aiIntegrityScanGrant.create({ data: { workspaceId: ws.id, orderId: order.id } });
  await assert.rejects(() => registerAiCustomerSource(ws.id, user.id, input), /confirmed test purchase/);
  await prisma.aiIntegrityScanOrder.update({ where: { id: order.id }, data: { status: "PAID", amountMinor: 9900, paidAt: new Date(), checkoutDriver: "simulation" } });
  await assert.rejects(() => registerAiCustomerSource(ws.id, user.id, input), /confirmed test purchase/);
  await prisma.aiIntegrityScanOrder.update({ where: { id: order.id }, data: { status: "PAID", amountMinor: 9900, paidAt: new Date(), checkoutDriver: "stripe-test" } });
  await assert.rejects(() => registerAiCustomerSource(ws.id, stranger.id, input), /owner/);
  await assert.rejects(() => registerAiCustomerSource(ws.id, user.id, { ...input, url: "https://example.invalid" }), /Invalid connection fields/);
  await assert.rejects(() => registerAiCustomerSource(ws.id, user.id, { ...input, consentConfirmed: false }), /confirm/);
  const connection = await registerAiCustomerSource(ws.id, user.id, input);
  const envelope = await prisma.aiIntegritySourceCredential.findUniqueOrThrow({ where: { connectionId: connection.id } });
  assert.ok(!JSON.stringify(envelope).includes(secret));
  await assert.rejects(() => prisma.aiIntegritySourceCredential.update({ where: { id: envelope.id }, data: { workspaceId: other.id } }));
  assert.ok(!JSON.stringify(await listAiCustomerSources(ws.id, user.id)).includes(envelope.ciphertext));
  const request = { connectionId: connection.id, requestKey: randomUUID() };
  const first = await syncAiCustomerSource(ws.id, user.id, request, nonempty);
  assert.equal(reads, 2);
  const artifact = await getAiCustomerSourceArtifact(ws.id, user.id, first.syncId);
  assert.ok(JSON.stringify(artifact).includes("REPORTED_ROWS"));
  assert.ok(JSON.stringify(artifact).includes("1.25"));
  assert.equal((await syncAiCustomerSource(ws.id, user.id, request, nonempty)).replayed, true);
  assert.equal(reads, 2);
  assert.equal(await getAiCustomerSourceArtifact(other.id, stranger.id, first.syncId), null);
  await assert.rejects(() => syncAiCustomerSource(other.id, stranger.id, { ...request, requestKey: randomUUID() }, nonempty), /missing|revoked/);
  await assert.rejects(() => revokeAiCustomerSource(other.id, stranger.id, { connectionId: connection.id }), /unavailable/);
  const exported = JSON.stringify(await buildWorkspaceExport(ws.id));
  const audit = JSON.stringify(await prisma.workspaceAuditEvent.findMany({ where: { workspaceId: ws.id } }));
  for (const text of [exported, audit]) for (const value of [secret, envelope.ciphertext, envelope.authTag, keyring]) assert.ok(!text.includes(value));
  assert.equal(await prisma.aiIntegrityImportBatch.count({ where: { workspaceId: ws.id } }), 0, "Artifacts are not yet scan inputs");
  assert.equal((await prisma.aiIntegrityScanGrant.findUniqueOrThrow({ where: { id: grant.id } })).consumedAt, null);

  // One connection can only have one active read, and revocation during HTTP
  // must prevent the response from advancing coverage or saving evidence.
  const changed = await registerAiCustomerSource(ws.id, user.id, input);
  await assert.rejects(() => syncAiCustomerSource(ws.id, user.id, request, nonempty), /reused/);
  let release!: () => void, entered!: () => void;
  const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const ongoing = syncAiCustomerSource(ws.id, user.id, { connectionId: changed.id, requestKey: randomUUID() }, async () => { entered(); await blocked; return empty; });
  const failed = assert.rejects(ongoing, /did not complete/);
  await enteredPromise;
  await assert.rejects(() => syncAiCustomerSource(ws.id, user.id, { connectionId: changed.id, requestKey: randomUUID() }, nonempty), /Another source read/);
  delete process.env.REVORY_AI_CONNECTION_KEYRING;
  await revokeAiCustomerSource(ws.id, user.id, { connectionId: changed.id });
  assert.equal(await prisma.aiIntegritySourceCredential.count({ where: { connectionId: changed.id } }), 0, "Disconnect works even when decryption keys are unavailable");
  release(); await failed;
  assert.equal((await prisma.aiIntegritySourceConnection.findUniqueOrThrow({ where: { id: changed.id } })).completeThrough, null);
  process.env.REVORY_AI_CONNECTION_KEYRING = keyring;

  // A replaced lease must not allow an old response (or old error handler)
  // to complete/fail the replacement attempt with the same sync ID.
  const renewed = await registerAiCustomerSource(ws.id, user.id, input);
  const staleKey = randomUUID();
  let releaseStale!: () => void, enteredStale!: () => void;
  const staleEntered = new Promise<void>((resolve) => { enteredStale = resolve; });
  const staleBlock = new Promise<void>((resolve) => { releaseStale = resolve; });
  const stale = syncAiCustomerSource(ws.id, user.id, { connectionId: renewed.id, requestKey: staleKey }, async () => { enteredStale(); await staleBlock; return empty; });
  const staleFailed = assert.rejects(stale, /did not complete/);
  await staleEntered;
  const staleSync = await prisma.aiIntegritySourceSync.findUniqueOrThrow({ where: { workspaceId_requestKey: { workspaceId: ws.id, requestKey: staleKey } } });
  await prisma.aiIntegritySourceSync.update({ where: { id: staleSync.id }, data: { createdAt: new Date(Date.now() - 16 * 60000) } });
  const replacement = await syncAiCustomerSource(ws.id, user.id, { connectionId: renewed.id, requestKey: staleKey }, nonempty);
  releaseStale(); await staleFailed;
  assert.equal((await prisma.aiIntegritySourceSync.findUniqueOrThrow({ where: { id: replacement.syncId } })).status, "COMPLETED");

  // Payment revoked while reading: no completed artifact or coverage.
  const paidConnection = await registerAiCustomerSource(ws.id, user.id, input);
  await assert.rejects(() => syncAiCustomerSource(ws.id, user.id, { connectionId: paidConnection.id, requestKey: randomUUID() }, async () => { await prisma.aiIntegrityScanGrant.update({ where: { id: grant.id }, data: { status: "REVOKED" } }); return empty; }), /did not complete/);
  assert.equal((await prisma.aiIntegritySourceConnection.findUniqueOrThrow({ where: { id: paidConnection.id } })).completeThrough, null);
  await prisma.aiIntegrityScanGrant.update({ where: { id: grant.id }, data: { status: "ACTIVE" } });
  await assert.rejects(() => registerAiCustomerSource(ws.id, user.id, { ...input, provider: "STRIPE", accountId: "acct_fixture", secret: `rk_live_${randomBytes(20).toString("hex")}` }), /restricted Stripe test/);
  const stripe = await registerAiCustomerSource(ws.id, user.id, { ...input, provider: "STRIPE", accountId: "acct_fixture", secret: `rk_test_${randomBytes(20).toString("hex")}` });
  const stripeRead = await syncAiCustomerSource(ws.id, user.id, { connectionId: stripe.id, requestKey: randomUUID() }, async () => ({ object: "list", has_more: false, data: [{ id: "in_fixture", object: "invoice", livemode: false, status: "paid", created: Date.parse(start) / 1000, amount_paid: 9900, currency: "usd", customer: "cus_fixture" }] }));
  assert.ok(JSON.stringify(await getAiCustomerSourceArtifact(ws.id, user.id, stripeRead.syncId)).includes("in_fixture"));
  await prisma.aiIntegritySourceSync.update({ where: { id: first.syncId }, data: { artifactHash: "0".repeat(64) } });
  await assert.rejects(() => getAiCustomerSourceArtifact(ws.id, user.id, first.syncId), /integrity/);
  process.env.VERCEL_ENV = "preview"; assert.equal(isAiCustomerSourcesEnabled(), false); delete process.env.VERCEL_ENV;
  const previousNodeEnv = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" }); assert.equal(isAiCustomerSourcesEnabled(), false);
  if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: previousNodeEnv });
  process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY = "true"; assert.equal(isAiCustomerSourcesEnabled(), false);
  process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY = "false";
  process.env.REVORY_AI_CUSTOMER_SOURCES = "false";
  await assert.rejects(() => listAiCustomerSources(ws.id, user.id), /unavailable/);
  process.env.REVORY_AI_CUSTOMER_SOURCES = "true";
  await prisma.workspace.delete({ where: { id: ws.id } });
  assert.equal(await prisma.aiIntegritySourceCredential.count(), 0, "Workspace deletion cascades encrypted credentials");
  console.log("Customer source DB PASS: additive migration, paid gate, owner/workspace isolation, encrypted storage, secret-free export/audit, nonempty Stripe/OpenAI evidence, replay, concurrent reads, revocation, lease replacement, refund and integrity checks.");
} finally { await prisma.$disconnect(); }
