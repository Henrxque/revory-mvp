import "server-only";
import { isAiCommercialRuntimeEnabled } from "./commercial-runtime";
import { monitorPaid, monitorRunAuthorized } from "./recurring-access";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { readAiConnectedSource, validateAiSourceWindow, type AiSourceProvider, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";
import { aiDigest } from "@/domain/ai-integrity/reconciliation";
import { aiConnectedScanOrderWhere, isAiIntegrityExperienceEnabled } from "./experience";
import { isSourceCredentialStorageConfigured, openSourceCredential, sealSourceCredential } from "./credential-vault";
import { createOpenAiReadTransport } from "./openai-http";
import { createStripeSourceTransport, verifyStripeSourceIdentity } from "./stripe-source-http";

export const AI_CUSTOMER_SOURCE_MODE = "CUSTOMER_API_PREVIEW";
// Request-time suggestion only, never an assertion of provider completeness.
// Compute on the server and pass one stable value to the client form.
export function getAiCustomerSourceSuggestedPeriod(asOf = new Date()) {
  const utcDayAgo = (days: number) => new Date(asOf.valueOf() - days * 86400000).toISOString().slice(0, 10);
  return { start: utcDayAgo(8), end: utcDayAgo(1) };
}
const VERSION = "customer-source-consent/v1";
const PURPOSE = "Read the authorized closed period for source integrity; no automatic scan, payment or customer attribution.";
const ID = /^[A-Za-z0-9_-]{1,160}$/;

export function isAiCustomerSourcesEnabled() {
  return (isAiCommercialRuntimeEnabled() || (process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV))
    && isAiIntegrityExperienceEnabled() && process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY !== "true"
    && process.env.REVORY_AI_CUSTOMER_SOURCES === "true";
}
function enabled() { if (!isAiCustomerSourcesEnabled()) throw new Error("Customer connection preview is unavailable."); }
function storageReady() { if (!isSourceCredentialStorageConfigured()) throw new Error("Source credential storage is unavailable."); }
function fields(raw: unknown, names: string[]) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((name) => !names.includes(name))) throw new Error("Invalid connection fields.");
  return raw as Record<string, unknown>;
}
function identity(value: unknown) { if (typeof value !== "string" || !ID.test(value)) throw new Error("Invalid connection identity."); return value; }
function windowValue(value: unknown) { if (typeof value !== "string") throw new Error("Choose a closed UTC period."); return value; }

async function access(workspaceId: string, actorUserId: string) {
  enabled();
  const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, ownerUserId: actorUserId }, select: { id: true } });
  if (!workspace) throw new Error("Only the workspace owner can manage these connections.");
}
async function paidAccess(tx: Prisma.TransactionClient, workspaceId: string) {
  const grant = await tx.aiIntegrityScanGrant.findFirst({ where: { workspaceId, status: "ACTIVE", consumedAt: null, order: aiConnectedScanOrderWhere() }, select: { id: true } });
  if (!grant && !await monitorPaid(tx, workspaceId)) throw new Error("A confirmed scan purchase is required before reading source data.");
}
async function lockOwner(tx: Prisma.TransactionClient, workspaceId: string, actorUserId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM workspaces WHERE id = ${workspaceId} AND "ownerUserId" = ${actorUserId} FOR UPDATE`;
  if (rows.length !== 1) throw new Error("Workspace ownership changed.");
}

// Public metadata only. Neither a credential envelope nor raw provider errors
// are returned by any connection endpoint or list operation.
const publicConnection = {
  id: true, provider: true, status: true, generation: true, organizationId: true,
  consentStart: true, consentEnd: true, completeThrough: true, updatedAt: true,
  syncs: { orderBy: { createdAt: "desc" as const }, take: 10, select: { id: true, generation: true, status: true, windowStart: true, windowEnd: true, createdAt: true, promotions: { select: { batchId: true } } } },
} as const;

export async function listAiCustomerSources(workspaceId: string, actorUserId: string) {
  await access(workspaceId, actorUserId);
  const connections = await prisma.aiIntegritySourceConnection.findMany({ where: { workspaceId, mode: AI_CUSTOMER_SOURCE_MODE }, orderBy: { provider: "asc" }, select: publicConnection });
  const ids = connections.flatMap((connection) => connection.syncs.map((sync) => sync.id));
  // Extract only the activity marker in PostgreSQL; never load full artifacts
  // into the page or return their potentially large bodies as list metadata.
  const markers = ids.length ? await prisma.$queryRaw<Array<{ id: string; activity: string | null }>>`SELECT id, "artifactJson"->>'activity' AS activity FROM ai_integrity_source_syncs WHERE "workspaceId" = ${workspaceId} AND id IN (${Prisma.join(ids)})` : [];
  return connections.map((connection) => ({ ...connection, syncs: connection.syncs.map((sync) => ({ ...sync, activity: markers.find((marker) => marker.id === sync.id)?.activity ?? null })) }));
}

export async function registerAiCustomerSource(workspaceId: string, actorUserId: string, raw: unknown) {
  await access(workspaceId, actorUserId);
  storageReady();
  const input = fields(raw, ["provider", "accountId", "secret", "windowStart", "windowEnd", "consentConfirmed"]);
  if (!["STRIPE", "OPENAI"].includes(String(input.provider)) || input.consentConfirmed !== true) throw new Error("Choose a source and confirm its read-only consent.");
  const provider = input.provider as AiSourceProvider, accountId = identity(input.accountId);
  const start = windowValue(input.windowStart), end = windowValue(input.windowEnd);
  validateAiSourceWindow(start, end, new Date().toISOString(), 24);
  const secret = input.secret;
  // Local preview accepts Stripe test credentials. Commercial activation binds
  // the restricted key mode and verifies the account before source reads.
  if (typeof secret !== "string" || (provider === "STRIPE" ? !new RegExp("^rk_" + (isAiCommercialRuntimeEnabled() ? process.env.REVORY_AI_CUSTOMER_STRIPE_MODE : "test") + "_[A-Za-z0-9]{12,480}$").test(secret) || !/^acct_[A-Za-z0-9]+$/.test(accountId) : !/^sk-[A-Za-z0-9_-]{12,480}$/.test(secret) || !/^org-[A-Za-z0-9_-]{3,100}$/.test(accountId))) throw new Error("Use a restricted Stripe test key or the authorized OpenAI administrative credential.");
  await paidAccess(prisma, workspaceId);
  if (provider === "STRIPE" && isAiCommercialRuntimeEnabled()) await verifyStripeSourceIdentity(secret, accountId);
  return prisma.$transaction(async (tx) => {
    await lockOwner(tx, workspaceId, actorUserId);
    await paidAccess(tx, workspaceId);
    enabled();
    const old = await tx.aiIntegritySourceConnection.findUnique({ where: { workspaceId_provider_mode: { workspaceId, provider, mode: AI_CUSTOMER_SOURCE_MODE } } });
    const connectionId = old?.id ?? randomUUID(), generation = (old?.generation ?? 0) + 1;
    const envelope = sealSourceCredential(secret, { workspaceId, connectionId, provider, generation });
    const data = { status: "ACTIVE", generation, organizationId: accountId, projectScope: "ALL_PROJECTS", consentPurpose: PURPOSE, consentVersion: VERSION, consentedBy: actorUserId, consentedAt: new Date(), consentStart: new Date(start), consentEnd: new Date(end), revokedAt: null, coverageStart: null, completeThrough: null };
    if (old) {
      await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${connectionId} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
      await tx.aiIntegritySourceConnection.update({ where: { id: connectionId }, data });
    } else await tx.aiIntegritySourceConnection.create({ data: { id: connectionId, workspaceId, provider, mode: AI_CUSTOMER_SOURCE_MODE, ...data } });
    await tx.aiIntegritySourceCredential.upsert({ where: { connectionId }, create: { workspaceId, connectionId, ...envelope }, update: envelope });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_CUSTOMER_SOURCE_REGISTERED", metadataJson: { connectionId, provider, generation, consentVersion: VERSION, windowStart: start, windowEnd: end } } });
    return tx.aiIntegritySourceConnection.findUniqueOrThrow({ where: { id: connectionId }, select: publicConnection });
  });
}

export async function revokeAiCustomerSource(workspaceId: string, actorUserId: string, raw: unknown) {
  await access(workspaceId, actorUserId);
  const id = identity(fields(raw, ["connectionId"]).connectionId);
  return prisma.$transaction(async (tx) => {
    await lockOwner(tx, workspaceId, actorUserId);
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const old = await tx.aiIntegritySourceConnection.findFirst({ where: { id, workspaceId, mode: AI_CUSTOMER_SOURCE_MODE } });
    if (!old) throw new Error("Connection is unavailable in this workspace.");
    await tx.aiIntegritySourceCredential.deleteMany({ where: { workspaceId, connectionId: id } });
    if (old.status !== "REVOKED") {
      await tx.aiIntegritySourceConnection.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date(), generation: { increment: 1 } } });
      await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_CUSTOMER_SOURCE_REVOKED", metadataJson: { connectionId: id, provider: old.provider } } });
    }
    return { id, status: "REVOKED" };
  });
}

export async function syncAiCustomerSource(workspaceId: string, actorUserId: string, raw: unknown, injectedTransport?: AiSourceTransport, monitorRunId?: string, monitorLeaseToken?: string) {
  await access(workspaceId, actorUserId);
  if (monitorRunId && !monitorLeaseToken) throw new Error("Monitoring lease is required.");
  storageReady();
  const input = fields(raw, ["connectionId", "requestKey"]), id = identity(input.connectionId), requestKey = identity(input.requestKey);
  if (requestKey.length < 16 || requestKey.length > 80) throw new Error("Invalid source read request key.");
  const reservation = await prisma.$transaction(async (tx) => {
    await lockOwner(tx, workspaceId, actorUserId);
    await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const connection = await tx.aiIntegritySourceConnection.findFirst({ where: { id, workspaceId, mode: AI_CUSTOMER_SOURCE_MODE, status: "ACTIVE" }, include: { credential: true } });
    if (!connection?.credential || !connection.consentStart || !connection.consentEnd || !connection.organizationId) throw new Error("Connection is missing or revoked.");
    await paidAccess(tx, workspaceId); enabled();
    if (monitorRunId) {
      const authorized = await monitorRunAuthorized(tx, workspaceId, monitorRunId, actorUserId, monitorLeaseToken);
      if (!authorized.config.connections.some(c => c.id === id && c.generation === connection.generation)) throw new Error("Source is outside recurring consent.");
      connection.consentStart = new Date(authorized.data.start);
      connection.consentEnd = new Date(authorized.data.end);
    }
    const payloadHash = aiDigest({ workspaceId, connectionId: id, requestKey, generation: connection.generation, start: connection.consentStart.toISOString(), end: connection.consentEnd.toISOString(), version: VERSION });
    const previous = await tx.aiIntegritySourceSync.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey } } });
    if (previous && previous.payloadHash !== payloadHash) throw new Error("Read request key was reused with different consent.");
    if (previous?.status === "COMPLETED") return { replayed: true as const, syncId: previous.id };
    if (previous?.status === "IN_PROGRESS" && previous.createdAt.valueOf() >= Date.now() - 15 * 60000) throw new Error("This source read is already in progress.");
    await tx.aiIntegritySourceSync.updateMany({ where: { workspaceId, connectionId: id, status: "IN_PROGRESS", createdAt: { lt: new Date(Date.now() - 15 * 60000) } }, data: { status: "FAILED" } });
    if (await tx.aiIntegritySourceSync.count({ where: { workspaceId, connectionId: id, status: "IN_PROGRESS" } })) throw new Error("Another source read is in progress.");
    if (!monitorRunId && !previous && await tx.aiIntegritySourceSync.count({ where: { workspaceId, connectionId: id } }) >= 50) throw new Error("Source history limit reached.");
    const sync = previous ? await tx.aiIntegritySourceSync.update({ where: { id: previous.id }, data: { status: "IN_PROGRESS", createdAt: new Date(), artifactJson: Prisma.DbNull, artifactHash: null } }) : await tx.aiIntegritySourceSync.create({ data: { workspaceId, connectionId: id, generation: connection.generation, requestKey, payloadHash, status: "IN_PROGRESS", windowStart: connection.consentStart, windowEnd: connection.consentEnd, effectiveStart: connection.consentStart } });
    return { replayed: false as const, syncId: sync.id, startedAt: sync.createdAt, connection };
  });
  if (reservation.replayed) return { syncId: reservation.syncId, status: "COMPLETED", replayed: true };
  const { connection } = reservation;
  const deadline = Date.now() + 45000;
  try {
    const provider = connection.provider as AiSourceProvider;
    const secret = openSourceCredential(connection.credential!, { workspaceId, connectionId: id, provider, generation: connection.generation });
    const transport = injectedTransport ?? (provider === "OPENAI" ? createOpenAiReadTransport(secret, connection.organizationId!) : createStripeSourceTransport(secret));
    const checkActive = async () => {
      if (Date.now() >= deadline) throw new Error("Source read time limit reached.");
      await access(workspaceId, actorUserId);
      await paidAccess(prisma, workspaceId);
      if (monitorRunId) await prisma.$transaction(tx => monitorRunAuthorized(tx, workspaceId, monitorRunId, actorUserId, monitorLeaseToken));
      const current = await prisma.aiIntegritySourceConnection.findFirst({ where: { id, workspaceId, mode: AI_CUSTOMER_SOURCE_MODE, status: "ACTIVE", generation: connection.generation, credential: { isNot: null } }, select: { id: true } });
      const lease = await prisma.aiIntegritySourceSync.findFirst({ where: { id: reservation.syncId, workspaceId, status: "IN_PROGRESS", createdAt: reservation.startedAt }, select: { id: true } });
      if (!current || !lease) throw new Error("Connection or source read changed during the read.");
    };
    await checkActive();
    if (provider === "STRIPE" && isAiCommercialRuntimeEnabled()) await verifyStripeSourceIdentity(secret, connection.organizationId!);
    await checkActive();
    const asOf = new Date().toISOString();
    const artifact = await readAiConnectedSource({ workspaceId, provider, accountId: connection.organizationId!, windowStart: connection.consentStart!.toISOString(), windowEnd: connection.consentEnd!.toISOString(), asOf, lagHours: 24 }, transport, checkActive, { mode: AI_CUSTOMER_SOURCE_MODE, version: "customer-source-api/v1", stripeLiveMode: provider === "STRIPE" && secret.startsWith("rk_live_"), accountIdentityVerified: provider === "STRIPE" && isAiCommercialRuntimeEnabled() });
    if (Buffer.byteLength(JSON.stringify(artifact)) > 8 * 1024 * 1024) throw new Error("Source artifact exceeds the configured limit.");
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, workspaceId, actorUserId);
      await tx.$queryRaw`SELECT id FROM ai_integrity_source_connections WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
      await paidAccess(tx, workspaceId); enabled();
      if (monitorRunId) await monitorRunAuthorized(tx, workspaceId, monitorRunId, actorUserId, monitorLeaseToken);
      const current = await tx.aiIntegritySourceConnection.findFirst({ where: { id, workspaceId, mode: AI_CUSTOMER_SOURCE_MODE, status: "ACTIVE", generation: connection.generation, credential: { isNot: null } } });
      const pending = await tx.aiIntegritySourceSync.findFirst({ where: { id: reservation.syncId, workspaceId, generation: connection.generation, status: "IN_PROGRESS", createdAt: reservation.startedAt } });
      if (!current || !pending) throw new Error("Connection or source read changed before commit.");
      await tx.aiIntegritySourceSync.update({ where: { id: pending.id }, data: { status: "COMPLETED", artifactJson: artifact as unknown as Prisma.InputJsonValue, artifactHash: aiDigest(artifact) } });
      await tx.aiIntegritySourceConnection.update({ where: { id }, data: { coverageStart: connection.consentStart, completeThrough: connection.consentEnd } });
      await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_CUSTOMER_SOURCE_READ", metadataJson: { connectionId: id, provider, syncId: pending.id, generation: connection.generation, activity: artifact.activity } } });
    });
    return { syncId: reservation.syncId, status: "COMPLETED", replayed: false };
  } catch {
    await prisma.aiIntegritySourceSync.updateMany({ where: { id: reservation.syncId, workspaceId, status: "IN_PROGRESS", generation: connection.generation, createdAt: reservation.startedAt }, data: { status: "FAILED" } });
    throw new Error("The source read did not complete. Check permissions, consent and source availability. No coverage was advanced.");
  }
}

export async function getAiCustomerSourceArtifact(workspaceId: string, actorUserId: string, syncId: string) {
  await access(workspaceId, actorUserId);
  const sync = await prisma.aiIntegritySourceSync.findFirst({ where: { id: identity(syncId), workspaceId, status: "COMPLETED", connection: { mode: AI_CUSTOMER_SOURCE_MODE } }, select: { artifactJson: true, artifactHash: true } });
  if (!sync?.artifactJson) return null;
  if (aiDigest(sync.artifactJson) !== sync.artifactHash) throw new Error("Source artifact integrity check failed.");
  return sync.artifactJson;
}
