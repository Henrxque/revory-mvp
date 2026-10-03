import { createHash } from "node:crypto";
import { canonicalAiJson, prepareAiIntegrityBatch, type AiIntegrityBatchInput, type AiProviderBucketInput, type AiRevenueInput } from "./contracts";

export const AI_SOURCE_MODE = "SYNTHETIC_REHEARSAL";
export const AI_SOURCE_VERSION = "connected-sources/rehearsal-v1";
export const AI_SOURCE_PROVIDERS = ["STRIPE", "OPENAI"] as const;
export type AiSourceProvider = typeof AI_SOURCE_PROVIDERS[number];
export type AiSourceRead = { method: "GET"; origin: "https://api.stripe.com" | "https://api.openai.com"; path: string; query: Record<string, string | string[]> };
// There is deliberately no HTTP/credential implementation in this rehearsal.
export type AiSourceTransport = (read: AiSourceRead) => Promise<unknown>;
export type AiSourceChannel = { channel: "stripe-invoices" | "openai-usage" | "openai-costs"; batch: AiIntegrityBatchInput | null; rowCount: number };

const digest = (value: unknown) => createHash("sha256").update(canonicalAiJson(value)).digest("hex");
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid source response.");
  return value as Record<string, unknown>;
}
function id(value: unknown, nullable = false): string | null {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value)) throw new Error("Invalid source identity.");
  return value;
}
function integer(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error("Invalid source quantity or timestamp.");
  return Number(value);
}
function iso(seconds: unknown) { return new Date(integer(seconds) * 1000).toISOString(); }
function utcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(value) || new Date(value).toISOString() !== value) throw new Error("Use UTC day boundaries.");
  return new Date(value).valueOf() / 1000;
}
export function validateAiSourceWindow(start: string, end: string, asOf: string, lagHours: number) {
  const from = utcDay(start), until = utcDay(end), observed = new Date(asOf).valueOf();
  if (!Number.isFinite(observed) || !Number.isInteger(lagHours) || lagHours < 0 || lagHours > 720 || until <= from || until - from > 31 * 86400 || until * 1000 + lagHours * 3600000 > observed) throw new Error("Read a closed window of up to 31 days after its declared lag.");
  return { start: from, end: until };
}
export function aiSourceIncrementalStart(start: string, end: string, coverageStart: string | null, completeThrough: string | null) {
  utcDay(start); utcDay(end);
  if (!completeThrough) return start;
  utcDay(completeThrough);
  if (!coverageStart || start < coverageStart || start > completeThrough) throw new Error("Incremental reads cannot omit a gap or claim earlier coverage.");
  return end <= completeThrough ? null : completeThrough;
}
export function assertAiSourceRead(read: AiSourceRead) {
  const expected = read.path === "/v1/invoices" ? "https://api.stripe.com" : ["/v1/organization/usage/completions", "/v1/organization/costs"].includes(read.path) ? "https://api.openai.com" : null;
  if (read.method !== "GET" || read.origin !== expected) throw new Error("Only the allowlisted read endpoints are supported.");
  const keys = read.path === "/v1/invoices" ? ["created[gte]", "created[lt]", "limit", "starting_after"] : ["start_time", "end_time", "bucket_width", "group_by", "limit", "page"];
  if (Object.keys(read.query).some((key) => !keys.includes(key))) throw new Error("Unsupported read parameters.");
}
async function pages(read: AiSourceRead, transport: AiSourceTransport, checkActive: () => Promise<void>) {
  const collected: Record<string, unknown>[] = [], cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    await checkActive();
    const query = { ...read.query, ...(cursor ? { [read.path === "/v1/invoices" ? "starting_after" : "page"]: cursor } : {}) };
    const request = { ...read, query }; assertAiSourceRead(request);
    const result = object(await transport(request));
    if (result.object !== (read.path === "/v1/invoices" ? "list" : "page") || !Array.isArray(result.data) || typeof result.has_more !== "boolean") throw new Error("Invalid paginated source response.");
    if (result.data.length > 1000 || collected.length + result.data.length > 10000) throw new Error("Source response exceeds the row limit.");
    collected.push(...result.data.map(object));
    if (!result.has_more) { await checkActive(); return collected; }
    cursor = read.path === "/v1/invoices" ? id(result.data.at(-1)?.id) : id(result.next_page);
    if (!cursor || cursors.has(cursor)) throw new Error("Source pagination did not advance.");
    cursors.add(cursor);
  }
  throw new Error("Source response exceeds the page limit; no checkpoint was advanced.");
}

export async function readAiConnectedSource(input: { workspaceId: string; provider: AiSourceProvider; accountId: string; windowStart: string; windowEnd: string; asOf: string; lagHours: number }, transport: AiSourceTransport, checkActive: () => Promise<void> = async () => {}) {
  if (!AI_SOURCE_PROVIDERS.includes(input.provider)) throw new Error("Unsupported source provider.");
  id(input.accountId); id(input.workspaceId);
  const period = validateAiSourceWindow(input.windowStart, input.windowEnd, input.asOf, input.lagHours);
  const channels: AiSourceChannel[] = [];
  const make = (channel: AiSourceChannel["channel"], rows: AiRevenueInput[] | AiProviderBucketInput[]) => {
    rows.sort((a, b) => a.externalId.localeCompare(b.externalId));
    const batch = rows.length ? { workspaceId: input.workspaceId, sourceSystem: `${channel}-rehearsal`, fileName: `${channel}.json`, fileSha256: digest(rows), mappingSha256: digest({ channel, version: AI_SOURCE_VERSION }), sourceTimezone: "UTC", windowStart: input.windowStart, windowEnd: input.windowEnd,
      dataQuality: { mode: AI_SOURCE_MODE, connectorVersion: AI_SOURCE_VERSION, paginationComplete: true, scope: channel === "stripe-invoices" ? "invoice creation context; not net collected revenue" : channel === "openai-usage" ? "completions only; separate input/output tokens" : "reported cost by project; no model/customer allocation", customerAttribution: "REQUIRES_EXPLICIT_MAPPING", lagHours: input.lagHours, fetchedAt: input.asOf },
      sourceKind: channel === "stripe-invoices" ? "STRIPE_REVENUE" : "PROVIDER_REPORT", records: rows.map((row, index) => ({ ...row, sourceRowNumber: index + 1 })) } as AiIntegrityBatchInput : null;
    if (batch) prepareAiIntegrityBatch(batch);
    channels.push({ channel, batch, rowCount: rows.length });
  };
  const common = (externalId: string, payload: Record<string, unknown>) => ({ workspaceId: input.workspaceId, externalId, sourceVersion: AI_SOURCE_VERSION, sourceRowNumber: 1, sourcePayload: payload, provenance: { mode: AI_SOURCE_MODE, accountId: input.accountId, connectorVersion: AI_SOURCE_VERSION } });
  if (input.provider === "STRIPE") {
    const invoices = await pages({ method: "GET", origin: "https://api.stripe.com", path: "/v1/invoices", query: { "created[gte]": String(period.start), "created[lt]": String(period.end), limit: "100" } }, transport, checkActive);
    const rows = invoices.map((invoice): AiRevenueInput => {
      const externalId = id(invoice.id)!;
      if (invoice.object !== "invoice" || invoice.livemode !== false || !["draft", "open", "paid", "uncollectible", "void"].includes(String(invoice.status))) throw new Error("Rehearsal expects synthetic test invoice context.");
      const created = integer(invoice.created); if (created < period.start || created >= period.end) throw new Error("Invoice is outside the requested creation window.");
      const currency = String(invoice.currency).toUpperCase();
      const exponent = ({ USD: 2, EUR: 2, GBP: 2, BRL: 2, CAD: 2, AUD: 2, JPY: 0, KWD: 3 } as Record<string, number>)[currency];
      if (exponent === undefined) throw new Error("Currency exponent requires an explicit supported currency contract.");
      const amount = integer(invoice.amount_paid), customer = typeof invoice.customer === "string" ? id(invoice.customer) : invoice.customer == null ? null : id(object(invoice.customer).id);
      const payload = { id: externalId, object: "invoice", created, status: invoice.status, amount_paid: amount, currency: invoice.currency, customer, livemode: false };
      return { ...common(externalId, payload), eventKind: "invoice", status: String(invoice.status).toUpperCase(), occurredAt: iso(created), stripeInvoiceId: externalId, stripeCustomerExternalId: customer, amountMinor: String(amount), currency, currencyExponent: exponent };
    });
    make("stripe-invoices", rows);
  } else {
    const query = { start_time: String(period.start), end_time: String(period.end), bucket_width: "1d", limit: "31" };
    const usage = await pages({ method: "GET", origin: "https://api.openai.com", path: "/v1/organization/usage/completions", query: { ...query, group_by: ["project_id", "model"] } }, transport, checkActive);
    const costs = await pages({ method: "GET", origin: "https://api.openai.com", path: "/v1/organization/costs", query: { ...query, group_by: ["project_id"] } }, transport, checkActive);
    const rows = (buckets: Record<string, unknown>[], channel: "openai-usage" | "openai-costs"): AiProviderBucketInput[] => {
      let expanded = 0;
      return buckets.flatMap((bucket) => {
      const start = integer(bucket.start_time), end = integer(bucket.end_time);
      if (bucket.object !== "bucket" || start < period.start || end > period.end || end - start !== 86400 || start % 86400 !== 0 || !Array.isArray(bucket.results) || bucket.results.length > 1000) throw new Error("Invalid or clipped daily provider bucket.");
      expanded += bucket.results.length * (channel === "openai-usage" ? 2 : 1);
      if (expanded > 10000) throw new Error("Expanded provider rows exceed the limit.");
      return bucket.results.map(object).flatMap((result): AiProviderBucketInput[] => {
        const projectId = id(result.project_id, true), model = channel === "openai-usage" ? id(result.model, true) : null;
        if (result.object !== (channel === "openai-usage" ? "organization.usage.completions.result" : "organization.costs.result")) throw new Error("Unexpected provider result kind.");
        const base = { provider: "openai", organizationId: input.accountId, projectId, model, windowStart: iso(start), windowEnd: iso(end), reportedAt: input.asOf };
        if (channel === "openai-usage") return (["input_tokens", "output_tokens"] as const).map((unit) => {
          // input_tokens already includes cached tokens; never add cached subcomponents again.
          const quantity = String(integer(result[unit]));
          const externalId = `usage_${digest({ account: input.accountId, start, end, projectId, model, unit })}`;
          return { ...common(externalId, { projectId, model, start, end, unit, quantity }), ...base, usageQuantity: quantity, usageUnit: unit, costBasis: "UNAVAILABLE" as const };
        });
        const amount = object(result.amount);
        if (typeof amount.value !== "number" || !Number.isFinite(amount.value) || !/^-?\d{1,18}(\.\d{1,12})?$/.test(String(amount.value)) || typeof amount.currency !== "string" || !/^[a-z]{3}$/.test(amount.currency)) throw new Error("Provider cost cannot be represented exactly by the current decimal contract.");
        const externalId = `cost_${digest({ account: input.accountId, start, end, projectId })}`;
        return [{ ...common(externalId, { projectId, start, end, amount: { value: String(amount.value), currency: amount.currency } }), ...base, costAmount: String(amount.value), costCurrency: amount.currency.toUpperCase(), costBasis: "REPORTED" as const }];
      });
      });
    };
    make("openai-usage", rows(usage, "openai-usage")); make("openai-costs", rows(costs, "openai-costs"));
  }
  await checkActive();
  return { mode: AI_SOURCE_MODE, connectorVersion: AI_SOURCE_VERSION, provider: input.provider, windowStart: input.windowStart, windowEnd: input.windowEnd, fetchedAt: input.asOf, paginationComplete: true, channels };
}

export function aiSourceSemanticRows(batch: AiIntegrityBatchInput) {
  return batch.records.map((row) => Object.fromEntries(Object.entries(row).filter(([key, value]) => !["workspaceId", "sourceRowNumber", "sourcePayload", "provenance"].includes(key) && value !== null && value !== undefined))).sort((a, b) => String(a.externalId).localeCompare(String(b.externalId)));
}
export function exportAiSourceCsv(batch: AiIntegrityBatchInput) {
  const rows = aiSourceSemanticRows(batch), headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.map(cell).join(","), ...rows.map((row) => headers.map((header) => cell(row[header])).join(","))].join("\n") + "\n";
}
