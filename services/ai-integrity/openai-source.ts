import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { aiDigest } from "@/domain/ai-integrity/reconciliation";
import { AI_OPENAI_SOURCE_MODE, AI_OPENAI_SOURCE_VERSION, aiSourceIncrementalStart, readAiConnectedSource, validateAiSourceWindow, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";
import { createOpenAiReadTransport } from "./openai-http";

const PURPOSE = "Read OpenAI organization completions usage and costs for REVORY integrity review; no customer attribution or scan is inferred.";
const SOURCES = "completions-usage,costs";
const KEY = /^[A-Za-z0-9_-]{16,80}$/;
const ID = /^[A-Za-z0-9_-]{1,80}$/;

function configuration() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV || process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY === "true" || process.env.REVORY_AI_SAAS_PREVIEW !== "true" || process.env.REVORY_AI_OPENAI_CONTROLLED_READ !== "true") throw new Error("Controlled OpenAI reads are unavailable.");
  const workspaceId = process.env.REVORY_AI_OPENAI_WORKSPACE_ID ?? "";
  const organizationId = process.env.REVORY_AI_OPENAI_ORG_ID ?? "";
  const adminKey = process.env.REVORY_AI_OPENAI_ADMIN_KEY ?? "";
  if (!ID.test(workspaceId) || !/^org-[A-Za-z0-9_-]{3,100}$/.test(organizationId) || !adminKey.startsWith("sk-") || /\s/.test(adminKey) || adminKey === process.env.OPENAI_API_KEY) throw new Error("Controlled OpenAI credentials are unavailable.");
  return { workspaceId, organizationId, adminKey };
}

export function isOpenAiControlledSourceEnabled(workspaceId?: string) {
  try { const config = configuration(); return !workspaceId || config.workspaceId === workspaceId; }
  catch { return false; }
}

function assertWorkspace(workspaceId: string) {
  const config = configuration();
  if (config.workspaceId !== workspaceId) throw new Error("OpenAI source is unavailable for this workspace.");
  return config;
}

function fields(raw: unknown, allowed: string[]) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !allowed.includes(key))) throw new Error("Unsupported OpenAI source fields.");
  return raw as Record<string, unknown>;
}

function dateString(value: unknown) { if (typeof value !== "string") throw new Error("A UTC period is required."); return value; }
function connectionId(value: unknown) { if (typeof value !== "string" || !ID.test(value)) throw new Error("Invalid source connection."); return value; }

export async function consentOpenAiSource(workspaceId: string, actorUserId: string, raw: unknown) {
  const config = assertWorkspace(workspaceId);
  const input = fields(raw, ["organizationId", "windowStart", "windowEnd", "consentConfirmed"]);
  const windowStart = dateString(input.windowStart), windowEnd = dateString(input.windowEnd);
  validateAiSourceWindow(windowStart, windowEnd, new Date().toISOString(), 24);
  if (input.organizationId !== config.organizationId || input.consentConfirmed !== true) throw new Error("Confirm the organization, sources, purpose and closed period.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;
    const old = await tx.aiIntegritySourceConnection.findUnique({ where: { workspaceId_provider_mode: { workspaceId, provider: "OPENAI", mode: AI_OPENAI_SOURCE_MODE } } });
    if (old?.status === "ACTIVE") {
      if (old.organizationId !== config.organizationId || old.consentStart?.toISOString() !== windowStart || old.consentEnd?.toISOString() !== windowEnd) throw new Error("Revoke the current consent before changing its scope.");
      return old;
    }
    const data = { status: "ACTIVE", revokedAt: null, consentedBy: actorUserId, consentedAt: new Date(), consentVersion: AI_OPENAI_SOURCE_VERSION, organizationId: config.organizationId, projectScope: "ALL_PROJECTS", consentPurpose: PURPOSE, consentStart: new Date(windowStart), consentEnd: new Date(windowEnd), coverageStart: null, completeThrough: null };
    const connection = old ? await tx.aiIntegritySourceConnection.update({ where: { id: old.id }, data: { ...data, generation: { increment: 1 } } }) : await tx.aiIntegritySourceConnection.create({ data: { workspaceId, provider: "OPENAI", mode: AI_OPENAI_SOURCE_MODE, ...data } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_OPENAI_SOURCE_CONSENTED", metadataJson: { connectionId: connection.id, organizationId: config.organizationId, sources: SOURCES, projectScope: "ALL_PROJECTS", windowStart, windowEnd, generation: connection.generation, version: AI_OPENAI_SOURCE_VERSION } } });
    return connection;
  });
}

export async function revokeOpenAiSource(workspaceId: string, actorUserId: string, raw: unknown) {
  assertWorkspace(workspaceId);
  const id = connectionId(fields(raw, ["connectionId"]).connectionId);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const connection = await tx.aiIntegritySourceConnection.findFirst({ where: { workspaceId, id, mode: AI_OPENAI_SOURCE_MODE } });
    if (!connection) throw new Error("OpenAI source connection is unavailable.");
    if (connection.status === "REVOKED") return connection;
    const revoked = await tx.aiIntegritySourceConnection.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_OPENAI_SOURCE_REVOKED", metadataJson: { connectionId: id, organizationId: connection.organizationId, generation: connection.generation } } });
    return revoked;
  });
}

export async function syncOpenAiSource(workspaceId: string, actorUserId: string, raw: unknown, injectedTransport?: AiSourceTransport) {
  const config = assertWorkspace(workspaceId);
  const input = fields(raw, ["connectionId", "requestKey", "windowStart", "windowEnd"]);
  const id = connectionId(input.connectionId), requestKey = input.requestKey;
  const windowStart = dateString(input.windowStart), windowEnd = dateString(input.windowEnd);
  if (typeof requestKey !== "string" || !KEY.test(requestKey)) throw new Error("Invalid read request key.");
  const asOf = new Date().toISOString();
  validateAiSourceWindow(windowStart, windowEnd, asOf, 24);
  const reservation = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    // A killed process cannot hold the source slot indefinitely. Its late result
    // will be rejected at commit because this status is no longer IN_PROGRESS.
    await tx.aiIntegritySourceSync.updateMany({ where: { workspaceId, connectionId: id, status: "IN_PROGRESS", createdAt: { lt: new Date(Date.now() - 15 * 60000) } }, data: { status: "FAILED" } });
    const connection = await tx.aiIntegritySourceConnection.findFirst({ where: { workspaceId, id, mode: AI_OPENAI_SOURCE_MODE, status: "ACTIVE" } });
    if (!connection || connection.organizationId !== config.organizationId || !connection.consentStart || !connection.consentEnd) throw new Error("OpenAI consent is missing or revoked.");
    if (windowStart < connection.consentStart.toISOString() || windowEnd > connection.consentEnd.toISOString()) throw new Error("Read period exceeds the consented window.");
    const payloadHash = aiDigest({ workspaceId, id, generation: connection.generation, requestKey, windowStart, windowEnd, version: AI_OPENAI_SOURCE_VERSION });
    const previous = await tx.aiIntegritySourceSync.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey } } });
    if (previous) {
      if (previous.payloadHash !== payloadHash || previous.connectionId !== id) throw new Error("Read request key was reused with different content or consent.");
      if (["COMPLETED", "SKIPPED"].includes(previous.status)) return { sync: previous, replayed: true, effectiveStart: null, generation: connection.generation };
      if (previous.status !== "FAILED") throw new Error("This read is already in progress; retry later or use a new request key after an interrupted process.");
    }
    if (!previous && await tx.aiIntegritySourceSync.count({ where: { workspaceId, connectionId: id } }) >= 50) throw new Error("OpenAI source history limit reached.");
    if (await tx.aiIntegritySourceSync.count({ where: { workspaceId, connectionId: id, status: "IN_PROGRESS" } }) > 0) throw new Error("Another OpenAI read is already in progress.");
    const effectiveStart = aiSourceIncrementalStart(windowStart, windowEnd, connection.coverageStart?.toISOString() ?? null, connection.completeThrough?.toISOString() ?? null);
    const status = effectiveStart ? "IN_PROGRESS" : "SKIPPED";
    const sync = previous ? await tx.aiIntegritySourceSync.update({ where: { id: previous.id }, data: { status, effectiveStart: effectiveStart ? new Date(effectiveStart) : null, artifactJson: Prisma.JsonNull, artifactHash: null } }) : await tx.aiIntegritySourceSync.create({ data: { workspaceId, connectionId: id, generation: connection.generation, requestKey, payloadHash, status, windowStart: new Date(windowStart), windowEnd: new Date(windowEnd), effectiveStart: effectiveStart ? new Date(effectiveStart) : null } });
    if (status === "SKIPPED") await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_OPENAI_SOURCE_READ_SKIPPED", metadataJson: { connectionId: id, syncId: sync.id, generation: connection.generation } } });
    return { sync, replayed: false, effectiveStart, generation: connection.generation };
  });
  if (reservation.replayed || !reservation.effectiveStart) return { sync: reservation.sync, replayed: reservation.replayed };
  const checkActive = async () => {
    assertWorkspace(workspaceId);
    const current = await prisma.aiIntegritySourceConnection.findFirst({ where: { workspaceId, id, mode: AI_OPENAI_SOURCE_MODE }, select: { status: true, generation: true } });
    if (current?.status !== "ACTIVE" || current.generation !== reservation.generation) throw new Error("OpenAI source consent was revoked or changed during the read.");
  };
  try {
    const artifact = await readAiConnectedSource({ workspaceId, provider: "OPENAI", accountId: config.organizationId, windowStart: reservation.effectiveStart, windowEnd, asOf, lagHours: 24 }, injectedTransport ?? createOpenAiReadTransport(config.adminKey, config.organizationId), checkActive, { mode: AI_OPENAI_SOURCE_MODE, version: AI_OPENAI_SOURCE_VERSION });
    if (JSON.stringify(artifact).length > 8 * 1024 * 1024) throw new Error("OpenAI source artifact exceeds the limit.");
    const sync = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
      const current = await tx.aiIntegritySourceConnection.findFirst({ where: { workspaceId, id, mode: AI_OPENAI_SOURCE_MODE } });
      if (current?.status !== "ACTIVE" || current.generation !== reservation.generation) throw new Error("OpenAI source consent was revoked or changed during the read.");
      const pending = await tx.aiIntegritySourceSync.findFirst({ where: { workspaceId, id: reservation.sync.id, status: "IN_PROGRESS" } });
      if (!pending || aiSourceIncrementalStart(windowStart, windowEnd, current.coverageStart?.toISOString() ?? null, current.completeThrough?.toISOString() ?? null) !== reservation.effectiveStart) throw new Error("OpenAI source checkpoint changed during the read.");
      const completed = await tx.aiIntegritySourceSync.update({ where: { id: pending.id }, data: { status: "COMPLETED", artifactJson: artifact as unknown as Prisma.InputJsonValue, artifactHash: aiDigest(artifact) } });
      await tx.aiIntegritySourceConnection.update({ where: { id }, data: { coverageStart: current.coverageStart ?? new Date(reservation.effectiveStart!), completeThrough: new Date(windowEnd) } });
      await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_OPENAI_SOURCE_READ", metadataJson: { connectionId: id, syncId: completed.id, generation: current.generation, activity: artifact.activity, windowStart: reservation.effectiveStart!, windowEnd } } });
      return completed;
    });
    return { sync, replayed: false };
  } catch (error) {
    await prisma.aiIntegritySourceSync.updateMany({ where: { workspaceId, id: reservation.sync.id, status: "IN_PROGRESS" }, data: { status: "FAILED" } });
    throw error;
  }
}

export async function listOpenAiSources(workspaceId: string) {
  if (!isOpenAiControlledSourceEnabled(workspaceId)) return [];
  return prisma.aiIntegritySourceConnection.findMany({ where: { workspaceId, provider: "OPENAI", mode: AI_OPENAI_SOURCE_MODE }, include: { syncs: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, windowStart: true, windowEnd: true, effectiveStart: true, createdAt: true, artifactJson: true } } } });
}

export async function getOpenAiSourceArtifact(workspaceId: string, syncId: string) {
  if (!isOpenAiControlledSourceEnabled(workspaceId)) return null;
  const sync = await prisma.aiIntegritySourceSync.findFirst({ where: { workspaceId, id: syncId, status: "COMPLETED", connection: { mode: AI_OPENAI_SOURCE_MODE } } });
  if (!sync?.artifactJson || aiDigest(sync.artifactJson) !== sync.artifactHash) throw new Error("OpenAI source artifact is missing or failed integrity verification.");
  return sync.artifactJson;
}
