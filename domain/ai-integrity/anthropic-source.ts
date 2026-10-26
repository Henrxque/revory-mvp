import { validateAiSourceWindow, type AiSourceTransport } from "./connected-sources";
import { sourceObject, sourceIdentity, sourceWindow, exactQuantity, providerRow, providerChannel, providerArtifact, type ProviderReadContext } from "./provider-artifact";
import { aiDecimal, aiDecimalString } from "./reconciliation";

export const ANTHROPIC_SOURCE_VERSION = "anthropic-api/v1";
export async function readAnthropicSource(context: ProviderReadContext, transport: AiSourceTransport, checkActive: () => Promise<void>) {
  validateAiSourceWindow(context.windowStart, context.windowEnd, context.asOf, context.lagHours);
  async function pages(cost: boolean) {
    const rows: Record<string, unknown>[] = [], cursors = new Set<string>(); let page: string | null = null;
    for (let count = 0; count < 20; count++) {
      await checkActive();
      const response = sourceObject(await transport({ method: "GET", origin: "https://api.anthropic.com", path: cost ? "/v1/organizations/cost_report" : "/v1/organizations/usage_report/messages", query: { starting_at: context.windowStart, ending_at: context.windowEnd, bucket_width: "1d", limit: "31", "group_by[]": cost ? ["workspace_id"] : ["workspace_id", "model"], ...(page ? { page } : {}) } }));
      if (!Array.isArray(response.data) || typeof response.has_more !== "boolean" || response.data.length > 1000 || rows.length + response.data.length > 10000) throw new Error("Invalid Anthropic report pagination.");
      rows.push(...response.data.map(sourceObject));
      if (!response.has_more) { await checkActive(); return rows; }
      if (typeof response.next_page !== "string" || !/^[A-Za-z0-9_+/=-]{1,512}$/.test(response.next_page) || cursors.has(response.next_page)) throw new Error("Anthropic pagination did not advance.");
      page = response.next_page; cursors.add(page);
    }
    throw new Error("Anthropic page limit reached; evidence is incomplete.");
  }
  const usage = await pages(false), costs = await pages(true);
  const usageRows = usage.flatMap(bucket => {
    const window = sourceWindow(bucket.starting_at, bucket.ending_at, context);
    if (!Array.isArray(bucket.results) || bucket.results.length > 1000) throw new Error("Invalid Anthropic usage results.");
    return bucket.results.flatMap(value => {
      const result = sourceObject(value), projectId = sourceIdentity(result.workspace_id), model = sourceIdentity(result.model);
      const cache = sourceObject(result.cache_creation);
      const quantities: Record<string, unknown> = { input_tokens_uncached: result.uncached_input_tokens, input_tokens_cached: result.cache_read_input_tokens, input_tokens_cache_write_5m: cache.ephemeral_5m_input_tokens, input_tokens_cache_write_1h: cache.ephemeral_1h_input_tokens, output_tokens: result.output_tokens };
      return Object.entries(quantities).map(([unit, value]) => providerRow(context, "anthropic", [context.accountId, window, projectId, model, unit], { ...window, projectId, model, usageQuantity: exactQuantity(value), usageUnit: unit, costBasis: "UNAVAILABLE" }));
    });
  });
  const costRows = costs.flatMap(bucket => {
    const window = sourceWindow(bucket.starting_at, bucket.ending_at, context);
    if (!Array.isArray(bucket.results) || bucket.results.length > 1000) throw new Error("Invalid Anthropic cost results.");
    return bucket.results.map(value => {
      const result = sourceObject(value), projectId = sourceIdentity(result.workspace_id);
      if (typeof result.amount !== "string" || !/^-?\d{1,18}(\.\d{1,10})?$/.test(result.amount) || result.currency !== "USD") throw new Error("Invalid Anthropic cost amount or description.");
      // The API amount is decimal CENTS, not dollars. BigInt arithmetic retains sub-cent precision.
      const amount = aiDecimal(result.amount); if (amount % BigInt(100)) throw new Error("Anthropic cost precision exceeds the evidence contract.");
      return providerRow(context, "anthropic", [context.accountId, window, projectId, "USD"], { ...window, projectId, model: null, costAmount: aiDecimalString(amount / BigInt(100)), costCurrency: "USD", costBasis: "REPORTED" });
    });
  });
  await checkActive();
  return providerArtifact(context, "ANTHROPIC", [providerChannel(context, "anthropic-usage", usageRows, "Messages API only. Uncached input, cache reads, 5m/1h cache writes and output are separate units. Default workspace is null; not a verified customer link.", ANTHROPIC_SOURCE_VERSION), providerChannel(context, "anthropic-costs", costRows, "Reported daily costs by workspace. Priority tier cost is not provided; no allocation of workspace totals to models or customers.", ANTHROPIC_SOURCE_VERSION)], ANTHROPIC_SOURCE_VERSION);
}
