import assert from "node:assert/strict";
import { readAiConnectedSource, assertAiSourceRead, aiSourceIncrementalStart, aiSourceSemanticRows, exportAiSourceCsv, validateAiSourceWindow, type AiSourceRead, type AiSourceTransport } from "../domain/ai-integrity/connected-sources";
import { aiSourceFixtureTransport } from "../services/ai-integrity/source-fixtures";
import { buildAiIntakePlan, reviewAiIntakeFile } from "../services/ai-integrity/intake";

const base = { workspaceId: "ws_rehearsal", accountId: "org_rehearsal", windowStart: "2026-08-01T00:00:00.000Z", windowEnd: "2026-08-02T00:00:00.000Z", asOf: "2026-09-01T00:00:00.000Z", lagHours: 24 };
for (const provider of ["STRIPE", "OPENAI"] as const) {
  const requests: AiSourceRead[] = [];
  const transport: AiSourceTransport = async (request) => { requests.push(request); return aiSourceFixtureTransport(request); };
  const artifact = await readAiConnectedSource({ ...base, provider }, transport);
  assert.equal(artifact.mode, "SYNTHETIC_REHEARSAL");
  assert.equal(requests.length, provider === "STRIPE" ? 2 : 4);
  assert.ok(requests.every((request) => request.method === "GET" && !JSON.stringify(request).includes("Authorization")));
  for (const channel of artifact.channels) {
    assert.ok(channel.batch);
    const file = { fileName: `${channel.channel}.csv`, bytes: new TextEncoder().encode(exportAiSourceCsv(channel.batch)) };
    const review = await reviewAiIntakeFile(file, channel.batch.sourceKind);
    const mapping = Object.fromEntries(review.headers.map((header) => [header, header]));
    const plan = await buildAiIntakePlan(file, { workspaceId: base.workspaceId, sourceKind: channel.batch.sourceKind, sourceSystem: channel.batch.sourceSystem, windowStart: base.windowStart, windowEnd: base.windowEnd, sourceTimezone: "UTC" }, mapping);
    assert.equal(plan.rejectedCount, 0, JSON.stringify(plan.issues)); assert.ok(plan.batch);
    assert.deepEqual(aiSourceSemanticRows(plan.batch), aiSourceSemanticRows(channel.batch), `CSV parity: ${channel.channel}`);
    assert.ok(!JSON.stringify(channel.batch).includes("excluded@example.invalid"), "Minimize invoice fields");
    if (channel.channel === "openai-usage") {
      const rows = channel.batch.sourceKind === "PROVIDER_REPORT" ? channel.batch.records : [];
      assert.equal(rows.filter((row) => row.usageUnit === "input_tokens").reduce((sum, row) => sum + Number(row.usageQuantity), 0), 2000, "Cached tokens are already included");
      assert.ok(rows.every((row) => row.costAmount === undefined && row.costBasis === "UNAVAILABLE"));
    }
    if (channel.channel === "openai-costs") assert.ok(channel.batch.sourceKind === "PROVIDER_REPORT" && channel.batch.records.every((row) => row.model === null && !row.usageQuantity));
  }
}
assert.throws(() => assertAiSourceRead({ method: "POST" as "GET", origin: "https://api.stripe.com", path: "/v1/invoices", query: {} }), /allowlisted/);
assert.throws(() => assertAiSourceRead({ method: "GET", origin: "https://attacker.invalid" as "https://api.stripe.com", path: "/v1/invoices", query: {} }), /allowlisted/);
assert.throws(() => assertAiSourceRead({ method: "GET", origin: "https://api.stripe.com", path: "/v1/refunds", query: {} }), /allowlisted/);
assert.throws(() => assertAiSourceRead({ method: "GET", origin: "https://api.stripe.com", path: "/v1/invoices", query: { api_key: "not_a_key" } }), /parameters/);
assert.throws(() => validateAiSourceWindow(base.windowStart, base.windowEnd, base.windowEnd, 24), /closed/);
assert.throws(() => validateAiSourceWindow("2026-08-01T01:00:00.000Z", base.windowEnd, base.asOf, 24), /boundaries/);
assert.equal(aiSourceIncrementalStart(base.windowStart, base.windowEnd, base.windowStart, base.windowEnd), null);
assert.equal(aiSourceIncrementalStart(base.windowStart, "2026-08-03T00:00:00.000Z", base.windowStart, base.windowEnd), base.windowEnd);
assert.throws(() => aiSourceIncrementalStart("2026-08-03T00:00:00.000Z", "2026-08-04T00:00:00.000Z", base.windowStart, base.windowEnd), /gap/);
assert.throws(() => aiSourceIncrementalStart("2026-07-31T00:00:00.000Z", base.windowEnd, base.windowStart, base.windowEnd), /earlier/);
const repeated: AiSourceTransport = async (request) => ({ ...(await aiSourceFixtureTransport(request) as object), has_more: true, next_page: "repeated" });
await assert.rejects(() => readAiConnectedSource({ ...base, provider: "OPENAI" }, repeated), /advance/);
await assert.rejects(() => readAiConnectedSource({ ...base, provider: "OPENAI" }, async (request) => { if (request.query.page) throw new Error("Provider rate limited"); return aiSourceFixtureTransport(request); }), /rate limited/);
await assert.rejects(() => readAiConnectedSource({ ...base, provider: "OPENAI" }, aiSourceFixtureTransport, async () => { throw new Error("Revoked"); }), /Revoked/);
await assert.rejects(() => readAiConnectedSource({ ...base, provider: "STRIPE" }, async (request) => { const response = await aiSourceFixtureTransport(request) as { data: Record<string, unknown>[] }; response.data[0].livemode = true; return response; }), /synthetic/);
await assert.rejects(() => readAiConnectedSource({ ...base, provider: "OPENAI" }, async (request) => { const response = await aiSourceFixtureTransport(request) as { data: unknown[] }; return { ...response, data: [...response.data, ...response.data] }; }), /Duplicate/);
await assert.rejects(() => readAiConnectedSource({ ...base, provider: "OPENAI" }, async () => ({ object: "page", data: [{ object: "bucket", start_time: 0, end_time: 86400, results: [] }], has_more: false })), /clipped/);
console.log("Sprint 7 contracts PASS: read allowlist, pagination/failure/revocation, closed contiguous windows, minimized invoice context, no cached-token double counting, separate reported cost/usage, duplicate rejection and CSV equivalence for all three channels.");
