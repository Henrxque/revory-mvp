import "server-only";
import { isAiCommercialRuntimeEnabled } from "./commercial-runtime";
import { prisma } from "@/db/prisma";
import { aiDigest } from "@/domain/ai-integrity/reconciliation";
import { prepareAiIntegrityBatch, type AiIntegrityBatchInput } from "@/domain/ai-integrity/contracts";
import type { readAiConnectedSource } from "@/domain/ai-integrity/connected-sources";
import { AI_CUSTOMER_SOURCE_MODE } from "./customer-sources";
import { assertConnectedReportAccess, CONNECTED_REPORT_MODE } from "./connected-report-access";
import { persistAiIntegrityBatch } from "./persist-batch";

type Artifact = Awaited<ReturnType<typeof readAiConnectedSource>>;
export async function promoteAiCustomerSource(workspaceId: string, actorUserId: string, syncId: string) {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(syncId)) throw new Error("Invalid source read.");
  return prisma.$transaction(async (tx) => {
    await assertConnectedReportAccess(tx, workspaceId, actorUserId);
    const sync = await tx.aiIntegritySourceSync.findFirst({ where: { id: syncId, workspaceId, status: "COMPLETED", connection: { mode: AI_CUSTOMER_SOURCE_MODE } }, include: { connection: true } });
    if (!sync?.artifactJson || !sync.artifactHash || aiDigest(sync.artifactJson) !== sync.artifactHash) throw new Error("Complete source evidence with a valid hash is required.");
    const connection = sync.connection;
    if (connection.status !== "ACTIVE" || connection.generation !== sync.generation) throw new Error("This connection was revoked or replaced. Authorize and read it again.");
    const artifact = sync.artifactJson as unknown as Artifact;
    if (isAiCommercialRuntimeEnabled() && connection.provider === "STRIPE" && !artifact.accountIdentityVerified) throw new Error("Read and verify this Stripe source account again.");
    const channelNames = connection.provider === "STRIPE" ? ["stripe-invoices"] : ["openai-usage", "openai-costs"];
    if (artifact.mode !== AI_CUSTOMER_SOURCE_MODE || artifact.provider !== connection.provider || artifact.organizationId !== connection.organizationId || !artifact.paginationComplete
      || artifact.windowStart !== sync.windowStart.toISOString() || artifact.windowEnd !== sync.windowEnd.toISOString()
      || !Array.isArray(artifact.channels) || artifact.channels.length !== channelNames.length
      || channelNames.some((name) => artifact.channels.filter((channel) => channel.channel === name).length !== 1)) throw new Error("Source scope or channel completeness changed.");
    const populated = artifact.channels.filter((channel) => channel.batch !== null);
    if (!populated.length) throw new Error("The source reported no rows. No report input was created; absence of activity does not prove zero spend.");
    for (const channel of artifact.channels) {
      if (channel.batch) {
        if (channel.rowCount !== channel.batch.records.length || channel.batch.workspaceId !== workspaceId || channel.batch.windowStart !== artifact.windowStart || channel.batch.windowEnd !== artifact.windowEnd) throw new Error("Source batch membership changed.");
        prepareAiIntegrityBatch(channel.batch);
      } else if (channel.rowCount !== 0) throw new Error("Source channel is incomplete.");
    }
    const records = populated.flatMap((channel) => channel.batch!.records.map((record) => ({ ...record, provenance: { ...record.provenance, channel: channel.channel, sourceSyncId: sync.id, sourceArtifactHash: sync.artifactHash } })));
    // Stable contents reuse the first complete batch, retaining its original
    // fetched/reported times. A later identical read never fabricates freshness.
    const semantic = records.map((record) => Object.fromEntries(Object.entries(record).filter(([name]) => !["reportedAt", "sourceRowNumber", "provenance"].includes(name))));
    const contentHash = aiDigest({ version: "source-promotion/v1", workspaceId, connectionId: connection.id, generation: sync.generation, provider: artifact.provider, accountId: artifact.organizationId, start: artifact.windowStart, end: artifact.windowEnd, channels: artifact.channels.map((channel) => ({ name: channel.channel, rows: channel.rowCount })), records: semantic });
    const existing = await tx.aiIntegritySourcePromotion.findUnique({ where: { workspaceId_contentHash: { workspaceId, contentHash } }, include: { batch: true } });
    if (existing) return { batchId: existing.batchId, replayed: true };
    const batch = {
      workspaceId, sourceKind: connection.provider === "STRIPE" ? "STRIPE_REVENUE" : "PROVIDER_REPORT",
      sourceSystem: `${connection.provider.toLowerCase()}-connected-${aiDigest(artifact.organizationId).slice(0, 12)}`,
      fileName: connection.provider === "STRIPE" ? "stripe-invoices-api.json" : "openai-usage-costs-api.json",
      fileSha256: contentHash, mappingSha256: aiDigest("source-promotion/v1"), sourceTimezone: "UTC",
      windowStart: artifact.windowStart, windowEnd: artifact.windowEnd,
      dataQuality: { mode: CONNECTED_REPORT_MODE, rejectedRows: 0, sourceEvidence: { syncId: sync.id, artifactHash: sync.artifactHash, connectionId: connection.id, generation: sync.generation, provider: artifact.provider, accountId: artifact.organizationId, accountIdentity: connection.provider === "STRIPE" ? isAiCommercialRuntimeEnabled() ? "ACCOUNT_ENDPOINT_VERIFIED" : "USER_DECLARED_NOT_VERIFIED" : "ORGANIZATION_HEADER", fetchedAt: artifact.fetchedAt, paginationComplete: true, completeness: "PAGINATION_IS_NOT_ACCOUNT_TOTAL_COMPLETENESS", channels: artifact.channels.map((channel) => ({ channel: channel.channel, rowCount: channel.rowCount, limits: channel.batch?.dataQuality.scope ?? "No reported rows; total activity unknown" })) } },
      records: records.map((record, index) => ({ ...record, sourceRowNumber: index + 1 })),
    } as AiIntegrityBatchInput;
    const result = await persistAiIntegrityBatch(batch, actorUserId, tx);
    await tx.aiIntegritySourcePromotion.create({ data: { workspaceId, syncId: sync.id, batchId: result.batch.id, contentHash } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_SOURCE_PREPARED_FOR_REPORT", metadataJson: { syncId: sync.id, batchId: result.batch.id, artifactHash: sync.artifactHash, contentHash } } });
    return { batchId: result.batch.id, replayed: result.replayed };
  }, { maxWait: 10000, timeout: 120000 });
}
