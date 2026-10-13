import assert from "node:assert/strict";
import { AI_OPENAI_SOURCE_MODE, AI_OPENAI_SOURCE_VERSION, readAiConnectedSource, type AiSourceRead } from "../domain/ai-integrity/connected-sources";
import { createOpenAiReadTransport } from "../services/ai-integrity/openai-http";

const secret = "sk-admin-fixture-secret";
const organizationId = "org-fixture_123";
const start = "2026-08-01T00:00:00.000Z", end = "2026-08-02T00:00:00.000Z";
const base = { workspaceId: "ws_source_test", provider: "OPENAI" as const, accountId: organizationId, windowStart: start, windowEnd: end, asOf: "2026-09-01T00:00:00.000Z", lagHours: 24 };
const empty = { object: "page", has_more: false, next_page: null, data: [] };
const requests: { url: string; method: string; authorization: string; organization: string }[] = [];
let rateLimited = true;
const fetcher: typeof fetch = async (url, init) => {
  const target = new URL(String(url));
  requests.push({ url: target.toString(), method: String(init?.method), authorization: new Headers(init?.headers).get("Authorization") ?? "", organization: new Headers(init?.headers).get("OpenAI-Organization") ?? "" });
  if (rateLimited) { rateLimited = false; return new Response("rate limited", { status: 429, headers: { "retry-after": "0" } }); }
  return new Response(JSON.stringify(empty), { status: 200, headers: { "content-type": "application/json" } });
};
const transport = createOpenAiReadTransport(secret, organizationId, fetcher, async () => {});
const noActivity = await readAiConnectedSource(base, transport, async () => {}, { mode: AI_OPENAI_SOURCE_MODE, version: AI_OPENAI_SOURCE_VERSION });
assert.equal(noActivity.activity, "NO_REPORTED_ROWS");
assert.ok(noActivity.channels.every((channel) => channel.rowCount === 0 && channel.batch === null));
assert.equal(requests.length, 3);
assert.ok(requests.every((request) => request.method === "GET" && request.authorization === `Bearer ${secret}` && request.organization === organizationId && request.url.startsWith("https://api.openai.com/v1/organization/")));
assert.ok(!JSON.stringify(noActivity).includes(secret));
await assert.rejects(() => transport({ method: "GET", origin: "https://api.stripe.com", path: "/v1/invoices", query: {} }), /Only OpenAI/);
const failTransport = createOpenAiReadTransport(secret, organizationId, async () => new Response("forbidden", { status: 403 }), async () => {});
await assert.rejects(() => failTransport({ method: "GET", origin: "https://api.openai.com", path: "/v1/organization/costs", query: { start_time: "1" } }), /HTTP 403/);

let page = 0;
const paged = await readAiConnectedSource(base, async (read: AiSourceRead) => {
  if (read.path.endsWith("costs")) return empty;
  page++;
  if (page === 1) return { object: "page", has_more: true, next_page: "page_abc=", data: [{ object: "bucket", start_time: Date.parse(start) / 1000, end_time: Date.parse(end) / 1000, results: [{ object: "organization.usage.completions.result", project_id: "proj_fixture", model: "gpt-fixture", input_tokens: 100, input_cached_tokens: 40, output_tokens: 20, num_model_requests: 1 }] }] };
  assert.equal(read.query.page, "page_abc=");
  return empty;
}, async () => {}, { mode: AI_OPENAI_SOURCE_MODE, version: AI_OPENAI_SOURCE_VERSION });
assert.equal(paged.activity, "REPORTED_ROWS");
assert.equal(paged.channels.find((channel) => channel.channel === "openai-usage")?.rowCount, 2);
assert.equal(paged.channels.find((channel) => channel.channel === "openai-costs")?.rowCount, 0);
assert.equal(paged.channels.find((channel) => channel.channel === "openai-usage")?.batch?.sourceSystem, "openai-usage-api");
assert.ok(!JSON.stringify(paged).includes(secret));
console.log("Sprint 11 controlled source PASS: real-mode provenance, empty account semantics, bounded 429 retry, 403 fail closed, OpenAI padded cursor, no cached-token double count or credential export.");
