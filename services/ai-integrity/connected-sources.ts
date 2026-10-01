import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { aiDigest } from "@/domain/ai-integrity/reconciliation";
import { AI_SOURCE_MODE, AI_SOURCE_VERSION, AI_SOURCE_PROVIDERS, aiSourceIncrementalStart, readAiConnectedSource, validateAiSourceWindow, type AiSourceProvider, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";
import { isAiIntegrityExperienceEnabled } from "./experience";
import { aiSourceFixtureTransport } from "./source-fixtures";

export function isAiSourceRehearsalEnabled() { return isAiIntegrityExperienceEnabled() && process.env.REVORY_AI_SOURCE_REHEARSAL === "true"; }
function enabled() { if (!isAiSourceRehearsalEnabled()) throw new Error("Source rehearsal is unavailable."); }
function body(raw: unknown, keys: string[]) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !keys.includes(key))) throw new Error("Unsupported source rehearsal fields.");
  return raw as Record<string, unknown>;
}
function sourceId(value: unknown) { if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new Error("Invalid source connection."); return value; }
async function audit(tx: Prisma.TransactionClient, workspaceId: string, actorUserId: string, action: string, metadataJson: Prisma.InputJsonObject) {
  await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action, metadataJson } });
}
export async function consentAiSourceRehearsal(workspaceId: string, actorUserId: string, raw: unknown) {
  enabled(); const input = body(raw, ["provider", "syntheticConsentConfirmed"]);
  const provider = input.provider as AiSourceProvider;
  if (!AI_SOURCE_PROVIDERS.includes(provider) || input.syntheticConsentConfirmed !== true) throw new Error("Confirm the synthetic source rehearsal.");
  return prisma.$transaction(async (tx) => {
    // Workspace lock serializes initial create/reactivation; source lock also orders concurrent revocation.
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE "workspaceId" = ${workspaceId} AND provider = ${provider} FOR UPDATE`;
    const old = await tx.aiIntegritySourceConnection.findUnique({ where: { workspaceId_provider_mode: { workspaceId, provider, mode: AI_SOURCE_MODE } } });
    if (old?.status === "ACTIVE") return old;
    const connection = old ? await tx.aiIntegritySourceConnection.update({ where: { id: old.id }, data: { status: "ACTIVE", revokedAt: null, generation: { increment: 1 }, coverageStart: null, completeThrough: null, consentedBy: actorUserId, consentedAt: new Date(), consentVersion: AI_SOURCE_VERSION } })
      : await tx.aiIntegritySourceConnection.create({ data: { workspaceId, provider, mode: AI_SOURCE_MODE, consentVersion: AI_SOURCE_VERSION, consentedBy: actorUserId } });
    await audit(tx, workspaceId, actorUserId, "AI_SOURCE_REHEARSAL_CONSENTED", { connectionId: connection.id, provider, mode: AI_SOURCE_MODE, generation: connection.generation });
    return connection;
  });
}
export async function revokeAiSourceRehearsal(workspaceId: string, actorUserId: string, raw: unknown) {
  enabled(); const id = sourceId(body(raw, ["connectionId"]).connectionId);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const connection = await tx.aiIntegritySourceConnection.findFirst({ where: { id, workspaceId, mode: AI_SOURCE_MODE } });
    if (!connection) throw new Error("Source connection is unavailable.");
    if (connection.status === "REVOKED") return connection;
    const revoked = await tx.aiIntegritySourceConnection.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
    await audit(tx, workspaceId, actorUserId, "AI_SOURCE_REHEARSAL_REVOKED", { connectionId: id, provider: connection.provider, mode: AI_SOURCE_MODE });
    return revoked;
  });
}
export async function syncAiSourceRehearsal(workspaceId: string, actorUserId: string, raw: unknown, transport: AiSourceTransport = aiSourceFixtureTransport) {
  enabled(); const input = body(raw, ["connectionId", "requestKey", "windowStart", "windowEnd", "lagHours"]), id = sourceId(input.connectionId);
  if (typeof input.requestKey !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestKey) || typeof input.windowStart !== "string" || typeof input.windowEnd !== "string" || typeof input.lagHours !== "number") throw new Error("Invalid read window or request key.");
  const { requestKey, windowStart, windowEnd, lagHours } = input as { requestKey: string; windowStart: string; windowEnd: string; lagHours: number };
  const asOf = new Date().toISOString(); validateAiSourceWindow(windowStart, windowEnd, asOf, lagHours);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const connection = await tx.aiIntegritySourceConnection.findFirst({ where: { id, workspaceId, status: "ACTIVE", mode: AI_SOURCE_MODE } });
    if (!connection) throw new Error("Source consent is missing or revoked.");
    const payloadHash = aiDigest({ workspaceId, actorUserId, id, generation: connection.generation, requestKey, windowStart, windowEnd, lagHours, version: AI_SOURCE_VERSION });
    const existing = await tx.aiIntegritySourceSync.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey } } });
    if (existing) { if (existing.payloadHash !== payloadHash) throw new Error("Read request key was reused with different content or consent."); return { sync: existing, replayed: true }; }
    if (await tx.aiIntegritySourceSync.count({ where: { workspaceId, connectionId: id } }) >= 50) throw new Error("Source rehearsal history limit reached.");
    const effectiveStart = aiSourceIncrementalStart(windowStart, windowEnd, connection.coverageStart?.toISOString() ?? null, connection.completeThrough?.toISOString() ?? null);
    const artifact = effectiveStart ? await readAiConnectedSource({ workspaceId, provider: connection.provider as AiSourceProvider, accountId: connection.provider === "STRIPE" ? "acct_rehearsal" : "org_rehearsal", windowStart: effectiveStart, windowEnd, asOf, lagHours }, transport, async () => { enabled(); }) : null;
    if (artifact && JSON.stringify(artifact).length > 8 * 1024 * 1024) throw new Error("Source artifact exceeds the limit.");
    const sync = await tx.aiIntegritySourceSync.create({ data: { workspaceId, connectionId: id, generation: connection.generation, requestKey, payloadHash, status: artifact ? "COMPLETED" : "SKIPPED", windowStart: new Date(windowStart), windowEnd: new Date(windowEnd), effectiveStart: effectiveStart ? new Date(effectiveStart) : null,
      ...(artifact ? { artifactJson: artifact as unknown as Prisma.InputJsonValue, artifactHash: aiDigest(artifact) } : {}) } });
    if (artifact) await tx.aiIntegritySourceConnection.update({ where: { id }, data: { coverageStart: connection.coverageStart ?? new Date(effectiveStart!), completeThrough: new Date(windowEnd) } });
    await audit(tx, workspaceId, actorUserId, "AI_SOURCE_REHEARSAL_READ", { connectionId: id, syncId: sync.id, status: sync.status, mode: AI_SOURCE_MODE });
    return { sync, replayed: false };
  }, { timeout: 15000 });
}
export async function listAiSourceRehearsals(workspaceId: string) {
  if (!isAiSourceRehearsalEnabled()) return [];
  return prisma.aiIntegritySourceConnection.findMany({ where: { workspaceId, mode: AI_SOURCE_MODE }, orderBy: { provider: "asc" }, include: { syncs: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, windowStart: true, windowEnd: true, effectiveStart: true, createdAt: true, generation: true } } } });
}
export async function getAiSourceArtifact(workspaceId: string, syncId: string) {
  if (!isAiSourceRehearsalEnabled()) return null;
  const sync = await prisma.aiIntegritySourceSync.findFirst({ where: { workspaceId, id: syncId, status: "COMPLETED", connection: { mode: AI_SOURCE_MODE } } });
  if (!sync?.artifactJson) return null;
  if (aiDigest(sync.artifactJson) !== sync.artifactHash) throw new Error("Source artifact integrity check failed.");
  return sync.artifactJson;
}
