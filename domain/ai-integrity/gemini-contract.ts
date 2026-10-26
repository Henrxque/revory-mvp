import { canonicalAiJson } from "./contracts";
export type GeminiScope = { platform: "developer" | "vertex"; projectId: string; queryProjectId: string; billingTable: string; location: string };
export const GOOGLE_QUERY_BYTE_LIMIT = "104857600";
export const GEMINI_OUTPUT_METRIC = "generativelanguage.googleapis.com/generate_content_usage_output_token_count";
export const VERTEX_TOKEN_METRIC = "aiplatform.googleapis.com/publisher/online_serving/token_count";
export function googleProjectId(value: unknown): value is string { return typeof value === "string" && /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(value); }
export function validateGeminiScope(scope: GeminiScope) {
  if (!["developer", "vertex"].includes(scope.platform) || !googleProjectId(scope.projectId) || !googleProjectId(scope.queryProjectId)
    || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]\.[A-Za-z_][A-Za-z0-9_]{0,127}\.[A-Za-z_][A-Za-z0-9_]{0,255}$/.test(scope.billingTable)
    || !/^(US|EU|[a-z]+-[a-z]+\d)$/.test(scope.location)) throw new Error("Choose a Google project, platform, billing export table and location.");
}
export function geminiBillingSql(scope: GeminiScope) {
  validateGeminiScope(scope);
  // Identifier interpolation is limited to a validated fully-qualified table.
  // Values are named parameters. This query cannot write customer data.
  return `SELECT FORMAT_TIMESTAMP('%Y-%m-%dT00:00:00.000Z', TIMESTAMP_TRUNC(usage_start_time, DAY, 'UTC')) AS window_start,
project.id AS project_id, currency,
CAST(SUM(CAST(cost AS BIGNUMERIC)) AS STRING) AS cost_amount,
CAST(SUM(IFNULL((SELECT SUM(CAST(c.amount AS BIGNUMERIC)) FROM UNNEST(credits) c), 0)) AS STRING) AS credit_amount,
CAST(COUNTIF(cost_type != 'regular') AS STRING) AS adjustment_count
FROM \`${scope.billingTable}\`
WHERE usage_start_time >= @window_start AND usage_start_time < @window_end
AND usage_end_time <= @window_end
AND project.id = @project_id AND service.description = @service
${scope.platform === "vertex" ? "AND LOWER(sku.description) LIKE '%gemini%'" : ""}
GROUP BY window_start, project_id, currency ORDER BY window_start, project_id, currency`;
}
export function geminiBillingBody(scope: GeminiScope, start: string, end: string, requestId: string) {
  return { query: geminiBillingSql(scope), useLegacySql: false, parameterMode: "NAMED", maxResults: 1000, timeoutMs: 8000,
    maximumBytesBilled: GOOGLE_QUERY_BYTE_LIMIT, useQueryCache: true, location: scope.location, requestId,
    queryParameters: [["window_start", "TIMESTAMP", start], ["window_end", "TIMESTAMP", end], ["project_id", "STRING", scope.projectId], ["service", "STRING", scope.platform === "developer" ? "Gemini API" : "Vertex AI"]].map(([name,type,value])=>({ name, parameterType: { type }, parameterValue: { value } })) };
}
export function assertGeminiBillingBody(body: unknown, scope: GeminiScope) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid bounded billing query.");
  const raw = body as ReturnType<typeof geminiBillingBody>;
  const values = raw.queryParameters;
  if (!Array.isArray(values) || values.length !== 4 || !/^[a-f0-9-]{36}$/.test(raw.requestId)) throw new Error("Invalid billing query parameters.");
  const start = values[0]?.parameterValue?.value, end = values[1]?.parameterValue?.value;
  if (typeof start !== "string" || typeof end !== "string" || !/^\d{4}-\d\d-\d\dT00:00:00\.000Z$/.test(start) || !/^\d{4}-\d\d-\d\dT00:00:00\.000Z$/.test(end)
    || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || new Date(start).toISOString() !== start || new Date(end).toISOString() !== end || Date.parse(start) >= Date.parse(end) || Date.parse(end) - Date.parse(start) > 31 * 86400000
    || canonicalAiJson(raw) !== canonicalAiJson(geminiBillingBody(scope,start,end,raw.requestId))) throw new Error("Only the fixed, project-bound, capped read query is supported.");
}
