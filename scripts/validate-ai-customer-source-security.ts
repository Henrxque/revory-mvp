import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { isSourceCredentialStorageConfigured, openSourceCredential, sealSourceCredential } from "../services/ai-integrity/credential-vault";
import { createStripeSourceTransport } from "../services/ai-integrity/stripe-source-http";
import type { AiSourceRead } from "../domain/ai-integrity/connected-sources";

const secret = `fixture-only-${randomBytes(20).toString("hex")}`;
const firstKey = randomBytes(32).toString("base64");
process.env.REVORY_AI_CONNECTION_ACTIVE_KEY = "v1";
process.env.REVORY_AI_CONNECTION_KEYRING = JSON.stringify({ v1: firstKey });
assert.equal(isSourceCredentialStorageConfigured(), true);
const scope = { workspaceId: "ws_fixture", connectionId: "conn_fixture", provider: "OPENAI" as const, generation: 1 };
const envelope = sealSourceCredential(secret, scope);
assert.equal(openSourceCredential(envelope, scope), secret);
assert.notEqual(sealSourceCredential(secret, scope).iv, envelope.iv);
assert.ok(!JSON.stringify(envelope).includes(secret));
for (const change of [{ workspaceId: "ws_other" }, { connectionId: "conn_other" }, { provider: "STRIPE" as const }, { generation: 2 }]) {
  assert.throws(() => openSourceCredential(envelope, { ...scope, ...change }), /could not be opened/);
}
for (const field of ["iv", "authTag", "ciphertext"] as const) {
  const bytes = Buffer.from(envelope[field], "base64"); bytes[0] ^= 1;
  assert.throws(() => openSourceCredential({ ...envelope, [field]: bytes.toString("base64") }, scope), /could not be opened/);
}
process.env.REVORY_AI_CONNECTION_ACTIVE_KEY = "v2";
process.env.REVORY_AI_CONNECTION_KEYRING = JSON.stringify({ v1: firstKey, v2: randomBytes(32).toString("base64") });
assert.equal(openSourceCredential(envelope, scope), secret, "Retained old key supports explicit rotation");
assert.equal(sealSourceCredential(secret, scope).keyVersion, "v2");
process.env.REVORY_AI_CONNECTION_KEYRING = JSON.stringify({ v2: "invalid" });
assert.equal(isSourceCredentialStorageConfigured(), false);
assert.throws(() => openSourceCredential(envelope, scope), /could not be opened/);

const stripeKey = `rk_test_${randomBytes(20).toString("hex")}`;
const request: AiSourceRead = { method: "GET", origin: "https://api.stripe.com", path: "/v1/invoices", query: { limit: "100" } };
let reads = 0;
const delays: number[] = [];
const transport = createStripeSourceTransport(stripeKey, async (url, init) => {
  reads++;
  assert.equal(new URL(String(url)).hostname, "api.stripe.com");
  assert.equal(init?.method, "GET"); assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
  assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${stripeKey}`);
  if (reads < 3) return new Response(stripeKey, { status: 429, headers: { "retry-after": "900" } });
  return Response.json({ object: "list", data: [], has_more: false });
}, async (ms) => { delays.push(ms); });
assert.deepEqual(await transport(request), { object: "list", data: [], has_more: false });
assert.equal(reads, 3); assert.deepEqual(delays, [2000, 2000]);
for (const invalid of [{ ...request, method: "POST" }, { ...request, origin: "https://example.invalid" }, { ...request, path: "/v1/customers" }, { ...request, query: { expand: "customer" } }]) {
  await assert.rejects(() => transport(invalid as AiSourceRead), /allowlisted|parameters/);
}
assert.equal(reads, 3, "Invalid transport requests never reach HTTP");
let forbiddenReads = 0;
const forbidden = createStripeSourceTransport(stripeKey, async () => { forbiddenReads++; return new Response(stripeKey, { status: 403 }); });
await assert.rejects(() => forbidden(request), (error: Error) => error.message.includes("403") && !error.message.includes(stripeKey));
assert.equal(forbiddenReads, 1);
const malformed = createStripeSourceTransport(stripeKey, async () => new Response(stripeKey));
await assert.rejects(() => malformed(request), /invalid source data/);
const oversized = createStripeSourceTransport(stripeKey, async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1)));
await assert.rejects(() => oversized(request), /exceeds configured limits/);
let failures = 0;
const network = createStripeSourceTransport(stripeKey, async () => { failures++; throw new Error(stripeKey); }, async () => {});
await assert.rejects(() => network(request), (error: Error) => /bounded network retries/.test(error.message) && !error.message.includes(stripeKey));
assert.equal(failures, 3);
console.log("Customer source security PASS: authenticated scope encryption, tamper rejection, key rotation, bounded GET-only transport, retry/size limits and sanitized errors.");
