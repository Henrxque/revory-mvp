import { aiDigest } from "./reconciliation";
import { prepareAiIntegrityBatch, type AiIntegrityBatchInput, type AiProviderBucketInput } from "./contracts";
import type { AiSourceChannel } from "./connected-sources";
export type ProviderReadContext = { workspaceId: string; accountId: string; windowStart: string; windowEnd: string; asOf: string; lagHours: number };
export function sourceObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid provider response."); return value as Record<string, unknown>;
}
export function exactQuantity(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid provider token quantity."); return String(value);
}
export function sourceIdentity(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > 160 || !/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(value)) throw new Error("Invalid provider identity."); return value;
}
export function sourceWindow(start: unknown, end: unknown, context: ProviderReadContext) {
  if (typeof start !== "string" || typeof end !== "string" || !/(Z|[+-]\d\d:\d\d)$/.test(start) || !/(Z|[+-]\d\d:\d\d)$/.test(end)) throw new Error("Explicit provider time boundaries required.");
  const a = Date.parse(start), b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b || a < Date.parse(context.windowStart) || b > Date.parse(context.windowEnd)) throw new Error("Provider bucket is outside the authorized period.");
  return { windowStart: new Date(a).toISOString(), windowEnd: new Date(b).toISOString() };
}
export function providerRow(context: ProviderReadContext, provider: string, identity: unknown, fields: Omit<AiProviderBucketInput, "workspaceId" | "externalId" | "sourceRowNumber" | "sourcePayload" | "provenance" | "provider" | "organizationId" | "reportedAt">): AiProviderBucketInput {
  const externalId = `${provider}_${aiDigest(identity)}`;
  return { ...fields, workspaceId: context.workspaceId, externalId, sourceRowNumber: 1, sourcePayload: { identity, ...fields }, provenance: { accountId: context.accountId, source: provider }, provider, organizationId: context.accountId, reportedAt: context.asOf };
}
export function providerChannel(context: ProviderReadContext, channel: AiSourceChannel["channel"], rows: AiProviderBucketInput[], limits: string, version: string): AiSourceChannel {
  if (rows.length > 10000 || new Set(rows.map(row => row.externalId)).size !== rows.length) throw new Error("Duplicate or excessive provider evidence.");
  rows.sort((a,b) => a.externalId.localeCompare(b.externalId));
  const batch: AiIntegrityBatchInput | null = rows.length ? { workspaceId: context.workspaceId, sourceKind: "PROVIDER_REPORT", sourceSystem: channel, fileName: channel + ".json", fileSha256: aiDigest(rows), mappingSha256: aiDigest(version), windowStart: context.windowStart, windowEnd: context.windowEnd, sourceTimezone: "UTC", dataQuality: { mode: "CUSTOMER_API_PREVIEW", scope: limits, connectorVersion: version, paginationComplete: true, lagHours: context.lagHours, fetchedAt: context.asOf, customerAttribution: "REQUIRES_EXPLICIT_MAPPING" }, records: rows.map((row,index) => ({ ...row, sourceRowNumber: index + 1 })) } : null;
  if (batch) prepareAiIntegrityBatch(batch);
  return { channel, rowCount: rows.length, batch, scope: limits };
}
export function providerArtifact(context: ProviderReadContext, provider: "ANTHROPIC" | "GEMINI", channels: AiSourceChannel[], version: string) {
  return { mode: "CUSTOMER_API_PREVIEW", connectorVersion: version, provider, accountIdentityVerified: true, organizationId: context.accountId, windowStart: context.windowStart, windowEnd: context.windowEnd, fetchedAt: context.asOf, paginationComplete: true, activity: channels.some(channel => channel.rowCount) ? "REPORTED_ROWS" : "NO_REPORTED_ROWS", channels };
}
