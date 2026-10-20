import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { aiDigest, aiDecimal, reconcileAiIntegrity, type AiScanInput } from "@/domain/ai-integrity/reconciliation";
import { compareAiIntegrityPeriods, initialAiMonitorSignals } from "@/domain/ai-integrity/monitoring";
import type { AiIntegrityBatchInput } from "@/domain/ai-integrity/contracts";
import type { AiSourceTransport } from "@/domain/ai-integrity/connected-sources";
import { assertMonitorOwner, monitorPaid, monitorRunAuthorized, recurringEnabled, RECURRING_MODE, stateKey, type MonitorRun, type MonitorSchedule } from "./recurring-access";
import { syncAiCustomerSource } from "./customer-sources";
import { createAiIdentityMapping } from "./identity";
import { promoteAiCustomerSource } from "./promote-source";
import { persistConnectedLedger } from "./connected-ledger";
import { runAiIntegrityScan } from "./scan";
import { sendTransactionalEmail, escapeEmailHtml } from "@/services/email/transactional-email";
import { hasCurrentAccountLegalAcceptance } from "@/services/legal/acceptance";

const DAY = 86400000;
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const utc = (v: string) => { if (!/^\d{4}-\d\d-\d\dT00:00:00\.000Z$/.test(v) || !Number.isFinite(Date.parse(v))) throw new Error("Choose a UTC midnight boundary."); return new Date(v); };
async function audit(tx: Prisma.TransactionClient, workspaceId: string, actorUserId: string, action: string, metadata: object) {
  await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action, metadataJson: json(metadata) } });
}
async function owner(workspaceId: string, actorUserId: string, tx: Prisma.TransactionClient) {
  await assertMonitorOwner(workspaceId, actorUserId, tx);
  if (!await monitorPaid(tx, workspaceId)) throw new Error("A verified paid monitoring subscription is required.");
}
async function confirmedProjectLinks(tx: Prisma.TransactionClient, workspaceId: string) {
    const mappings = await tx.aiIntegrityMapping.findMany({ where: { workspaceId, kind: "PROVIDER_PROJECT", status: "CONFIRMED", confirmationMethod: "EXCLUSIVE_PROJECT_VERIFIED" }, orderBy: { validFrom: "desc" }, distinct: ["externalId"], take: 201 });
    if (mappings.length > 200) throw new Error("Review your project/customer links before enabling recurring monitoring.");
    const seen = new Set<string>();
    const projectLinks: MonitorSchedule["projectLinks"] = [];
    for (const mapping of mappings) {
      if (seen.has(mapping.externalId)) continue;
      seen.add(mapping.externalId);
      const provenance = mapping.provenanceJson as { rawExternalId?: string; provider?: string; organizationId?: string | null };
      if (provenance.rawExternalId && provenance.provider) projectLinks.push({ mappingId: mapping.id, projectId: provenance.rawExternalId, customerId: mapping.internalCustomerExternalId, provider: provenance.provider, organizationId: provenance.organizationId ?? null });
    }
    return projectLinks;
}
export async function configureMonitor(workspaceId: string, actorUserId: string, input: {
  start: string; periodDays: number; lagHours: number; consentUntil: string; emailEnabled: boolean;
  consentConfirmed: boolean; scopeReviewed: boolean; minimumUsageDelta?: string;
}) {
  const start = utc(input.start), until = utc(input.consentUntil);
  if (![1, 7].includes(input.periodDays) || !Number.isInteger(input.lagHours) || input.lagHours < 24 || input.lagHours > 168
    || input.consentConfirmed !== true || input.scopeReviewed !== true || typeof input.emailEnabled !== "boolean"
    || start.valueOf() < Date.now() - 31 * DAY || until <= start || until.valueOf() > Date.now() + 90 * DAY) throw new Error("Review the closed periods, lag and consent (maximum 90 days).");
  const minimumUsageDelta = input.minimumUsageDelta ?? "1";
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(minimumUsageDelta) || aiDecimal(minimumUsageDelta) <= BigInt(0)) throw new Error("Choose a positive usage alert threshold.");
  return prisma.$transaction(async tx => {
    await owner(workspaceId, actorUserId, tx);
    const existing = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "SCHEDULE") });
    if (existing) throw new Error("Pause the existing schedule. Renew consent using its next period to preserve history.");
    const connections = await tx.aiIntegritySourceConnection.findMany({ where: { workspaceId, mode: "CUSTOMER_API_PREVIEW", status: "ACTIVE", credential: { isNot: null } }, select: { id: true, generation: true, provider: true } });
    if (connections.length !== 2 || !connections.some(c => c.provider === "STRIPE") || !connections.some(c => c.provider === "OPENAI")) throw new Error("Connect both Stripe and OpenAI first.");
    const projectLinks = await confirmedProjectLinks(tx, workspaceId);
    const config: MonitorSchedule = { projectLinks, actorUserId, nextStart: start.toISOString(), periodDays: input.periodDays, lagHours: input.lagHours, consentUntil: until.toISOString(), emailEnabled: input.emailEnabled, minimumUsageDelta, connections: connections.map(({ id, generation }) => ({ id, generation })) };
    const schedule = await tx.aiIntegrityMonitorState.create({ data: { workspaceId, kind: "SCHEDULE", key: "primary", status: "ACTIVE", dataJson: json(config) } });
    await audit(tx, workspaceId, actorUserId, "AI_RECURRING_CONSENT_GRANTED", { scheduleId: schedule.id, ...config, policy: "recurring-consent/v1", scope: "Stripe invoices created in period; OpenAI completions Usage/Costs. Paginated scope is not account-wide completeness. Existing mapping validity is unchanged." });
    return { id: schedule.id };
  });
}
export async function changeMonitorStatus(workspaceId: string, actorUserId: string, status: "PAUSED" | "ACTIVE", consentUntil?: string, emailEnabled?: boolean) {
  return prisma.$transaction(async tx => {
    await assertMonitorOwner(workspaceId, actorUserId, tx);
    const current = await tx.aiIntegrityMonitorState.findUniqueOrThrow({ where: stateKey(workspaceId, "SCHEDULE") });
    const config = current.dataJson as unknown as MonitorSchedule;
    if (status === "ACTIVE") {
      if (!await monitorPaid(tx, workspaceId)) throw new Error("A paid subscription is required.");
      if (consentUntil) {
        const until = utc(consentUntil);
        if (until <= utc(config.nextStart) || until.valueOf() > Date.now() + 90 * DAY) throw new Error("Invalid recurring consent expiry.");
        config.consentUntil = until.toISOString();
      }
      const connections = await tx.aiIntegritySourceConnection.findMany({ where: { workspaceId, mode: "CUSTOMER_API_PREVIEW", status: "ACTIVE", credential: { isNot: null } }, select: { id: true, generation: true } });
      if (connections.length !== 2) throw new Error("Reconnect the authorized sources first.");
      config.connections = connections;
      config.projectLinks = await confirmedProjectLinks(tx, workspaceId);
    }
    if (typeof emailEnabled === "boolean") config.emailEnabled = emailEnabled;
    await tx.aiIntegrityMonitorState.update({ where: { id: current.id }, data: { status, dataJson: json(config), revision: { increment: 1 } } });
    if (status === "ACTIVE") await tx.aiIntegrityMonitorState.updateMany({ where: { workspaceId, kind: "RUN", key: config.nextStart, status: { in: ["RETRY", "NEEDS_ATTENTION"] } }, data: { status: "READY", attempts: 0, availableAt: new Date(), leaseToken: null, leaseUntil: null } });
    await audit(tx, workspaceId, actorUserId, "AI_RECURRING_CONSENT_CHANGED", { status, consentUntil: config.consentUntil, emailEnabled: config.emailEnabled });
  });
}
export async function rotateLedgerToken(workspaceId: string, actorUserId: string, revoke = false) {
  const secret = randomBytes(32).toString("hex");
  await prisma.$transaction(async tx => {
    await assertMonitorOwner(workspaceId, actorUserId, tx);
    if (!revoke && !await monitorPaid(tx, workspaceId)) throw new Error("A paid subscription is required.");
    await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "LEDGER_TOKEN"), create: { workspaceId, kind: "LEDGER_TOKEN", key: "primary", status: revoke ? "REVOKED" : "ACTIVE", dataJson: { hash: createHash("sha256").update(secret).digest("hex"), actorUserId } }, update: { status: revoke ? "REVOKED" : "ACTIVE", dataJson: { hash: createHash("sha256").update(secret).digest("hex"), actorUserId }, revision: { increment: 1 } } });
    await audit(tx, workspaceId, actorUserId, "AI_RECURRING_LEDGER_TOKEN_CHANGED", { revoked: revoke });
  });
  return revoke ? null : secret;
}
export async function authenticateLedgerToken(workspaceId: string, secret: string, tx: Prisma.TransactionClient = prisma) {
  if (!recurringEnabled() || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Unauthorized.");
  const row = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "LEDGER_TOKEN") });
  const data = row?.dataJson as { hash?: string; actorUserId?: string } | undefined;
  if (row?.status !== "ACTIVE" || !data?.hash || !/^[a-f0-9]{64}$/.test(data.hash) || !timingSafeEqual(Buffer.from(data.hash, "hex"), createHash("sha256").update(secret).digest())) throw new Error("Unauthorized.");
  return data.actorUserId!;
}
export async function submitMonitorLedger(workspaceId: string, actorUserId: string, input: { batchId: string; exportedAt: string; completeThrough: string }, existingTx?: Prisma.TransactionClient) {
  const execute = async (tx: Prisma.TransactionClient) => {
    await owner(workspaceId, actorUserId, tx);
    const schedule = await tx.aiIntegrityMonitorState.findUniqueOrThrow({ where: stateKey(workspaceId, "SCHEDULE") });
    const config = schedule.dataJson as unknown as MonitorSchedule;
    if (schedule.status !== "ACTIVE") throw new Error("Resume recurring consent first.");
    const batch = await tx.aiIntegrityImportBatch.findFirst({ where: { id: input.batchId, workspaceId, sourceKind: "INTERNAL_LEDGER" } });
    const quality = batch?.dataQualityJson as { mode?: string; rejectedRows?: number } | undefined;
    if (!batch || quality?.mode !== "AUTHORIZED_LEDGER_PREVIEW" || Number(quality.rejectedRows ?? 0) > 0 || batch.rowCount === 0) throw new Error("Choose a reviewed, nonempty authorized ledger without excluded rows.");
    const start = batch.windowStart.toISOString(), end = batch.windowEnd.toISOString();
    const replay = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "RUN", start) });
    if (replay && ["RUNNING", "COMPLETED"].includes(replay.status)) {
      const data = replay.dataJson as unknown as MonitorRun;
      if (data.ledgerBatchId === batch.id && data.exportedAt === new Date(input.exportedAt).toISOString() && data.completeThrough === new Date(input.completeThrough).toISOString()) return { runId: replay.id };
      throw new Error("This period already has different committed evidence.");
    }
    if (batch.sourceTimezone !== "UTC" || batch.windowEnd.valueOf() - batch.windowStart.valueOf() !== config.periodDays * DAY || start !== config.nextStart || end > config.consentUntil) throw new Error("Ledger must match the next authorized UTC period.");
    const exported = new Date(input.exportedAt), complete = new Date(input.completeThrough);
    if (!Number.isFinite(exported.valueOf()) || !Number.isFinite(complete.valueOf()) || exported > new Date()
      || exported.valueOf() < batch.windowEnd.valueOf() + config.lagHours * 3600000 || complete < batch.windowEnd || complete > exported) throw new Error("Confirm ledger completeness and export after the consolidation lag.");
    const key = start, previous = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "RUN", key) });
    if (previous?.status === "RUNNING" || previous?.status === "COMPLETED") throw new Error("The period is already running or completed.");
    const old = previous?.dataJson as unknown as MonitorRun | undefined;
    const run: MonitorRun = { ...old, scheduleId: schedule.id, start, end, ledgerBatchId: batch.id, exportedAt: exported.toISOString(), completeThrough: complete.toISOString() };
    const saved = await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "RUN", key), create: { workspaceId, kind: "RUN", key, status: "READY", dataJson: json(run) }, update: { status: "READY", dataJson: json(run), availableAt: new Date(), attempts: 0, revision: { increment: 1 } } });
    await audit(tx, workspaceId, actorUserId, "AI_RECURRING_LEDGER_SUBMITTED", { runId: saved.id, batchId: batch.id, start, end });
    return { runId: saved.id };
  };
  return existingTx ? execute(existingTx) : prisma.$transaction(execute);
}
export type MonitorLedgerSubmission = { batch: AiIntegrityBatchInput; exportedAt: string; completeThrough: string } | {
  sourceSystem: string; windowStart: string; windowEnd: string; exportedAt: string; completeThrough: string;
  records: Array<{ externalId: string; occurredAt: string; quantity: string; unit: string; provider?: string; providerProjectId?: string; internalCustomerExternalId?: string; model?: string; providerRequestId?: string; creditsDelta?: string }>;
};
export async function ingestMonitorLedger(workspaceId: string, secret: string, input: MonitorLedgerSubmission) {
  const actorUserId = await authenticateLedgerToken(workspaceId, secret);
  if (!await hasCurrentAccountLegalAcceptance(actorUserId)) throw new Error("Review current account terms.");
  if (!input || typeof input !== "object") throw new Error("Invalid ledger.");
  const batch: AiIntegrityBatchInput = "batch" in input ? input.batch : {
    workspaceId, sourceKind: "INTERNAL_LEDGER", sourceSystem: input.sourceSystem,
    fileName: "internal-ledger-api.json", fileSha256: aiDigest(input.records),
    mappingSha256: aiDigest("recurring-ledger-api/v1"), sourceTimezone: "UTC",
    windowStart: input.windowStart, windowEnd: input.windowEnd, dataQuality: { rejectedRows: 0, apiVersion: "recurring-ledger-api/v1" },
    records: input.records.map((record, index) => {
      const fields = ["externalId", "occurredAt", "quantity", "unit", "provider", "providerProjectId", "internalCustomerExternalId", "model", "providerRequestId", "creditsDelta"];
      if (!record || Object.keys(record).some(key => !fields.includes(key))) throw new Error("Unsupported ledger fields.");
      return { ...record, workspaceId, sourceRowNumber: index + 1, sourcePayload: { ...record }, provenance: { channel: "client-ledger-api/v1" } };
    }),
  };
  if (batch.workspaceId !== workspaceId || batch.sourceKind !== "INTERNAL_LEDGER" || batch.records.length > 10000) throw new Error("Invalid ledger scope.");
  // Authentication is repeated before association: rotation while parsing cannot
  // authorize a new job. The intake contract validates IDs, units and provenance.
  return prisma.$transaction(async tx => {
    await assertMonitorOwner(workspaceId, actorUserId, tx);
    await authenticateLedgerToken(workspaceId, secret, tx);
    const result = await persistConnectedLedger(batch, actorUserId, true, tx);
    return submitMonitorLedger(workspaceId, actorUserId, { batchId: result.batch.id, exportedAt: input.exportedAt, completeThrough: input.completeThrough }, tx);
  }, { timeout: 120000 });
}
async function notify(workspaceId: string, key: string, kind: string) {
  return prisma.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "NOTICE", key), create: { workspaceId, kind: "NOTICE", key, status: "PENDING", dataJson: { kind } }, update: {} });
}
export async function skipMonitorPeriod(workspaceId: string, actorUserId: string, input: { runId: string; note: string }) {
  if (typeof input.note !== "string" || !input.note.trim() || input.note.length > 1000) throw new Error("Explain why this period cannot be compared.");
  await prisma.$transaction(async tx => {
    await owner(workspaceId, actorUserId, tx);
    const run = await tx.aiIntegrityMonitorState.findFirst({ where: { id: input.runId, workspaceId, kind: "RUN" } });
    if (!run || !["READY", "RETRY", "NEEDS_ATTENTION", "WAITING_LEDGER"].includes(run.status)) throw new Error("This period cannot be skipped.");
    const data = run.dataJson as unknown as MonitorRun;
    const schedule = await tx.aiIntegrityMonitorState.findFirstOrThrow({ where: { id: data.scheduleId, workspaceId, kind: "SCHEDULE", status: "ACTIVE" } });
    const config = schedule.dataJson as unknown as MonitorSchedule;
    if (config.nextStart !== data.start) throw new Error("The next period changed.");
    await tx.aiIntegrityMonitorState.update({ where: { id: run.id }, data: { status: "LIMITED", leaseToken: null, leaseUntil: null, dataJson: json({ ...data, errorCode: "PERIOD_SKIPPED_BY_OWNER" }) } });
    await tx.aiIntegrityMonitorState.update({ where: { id: schedule.id }, data: { dataJson: json({ ...config, nextStart: data.end }), revision: { increment: 1 } } });
    await audit(tx, workspaceId, actorUserId, "AI_RECURRING_PERIOD_SKIPPED", { runId: run.id, note: input.note.trim(), start: data.start, end: data.end, claim: "EVIDENCE_MISSING_NOT_ZERO" });
  });
}
export async function executeMonitorRun(runId: string, transport?: (provider: string) => AiSourceTransport) {
  const candidate = await prisma.aiIntegrityMonitorState.findFirst({ where: { id: runId, kind: "RUN" } });
  if (!candidate) return { status: "UNAVAILABLE" };
  const candidateData = candidate.dataJson as unknown as MonitorRun;
  const candidateSchedule = await prisma.aiIntegrityMonitorState.findFirst({ where: { id: candidateData.scheduleId, workspaceId: candidate.workspaceId, kind: "SCHEDULE" } });
  if (candidateSchedule?.status !== "ACTIVE") return { status: "PAUSED" };
  if (!await monitorPaid(prisma, candidate.workspaceId)) return { status: "PAYMENT_REQUIRED" };
  const leaseToken = randomUUID();
  const claimed = await prisma.aiIntegrityMonitorState.updateMany({ where: { id: runId, kind: "RUN", attempts: { lt: 5 }, status: { in: ["READY", "RETRY", "RUNNING"] }, availableAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { status: "RUNNING", leaseToken, leaseUntil: new Date(Date.now() + 10 * 60000), attempts: { increment: 1 } } });
  if (!claimed.count) return { status: "BUSY" };
  const row = await prisma.aiIntegrityMonitorState.findUniqueOrThrow({ where: { id: runId } }), workspaceId = row.workspaceId;
  const data = row.dataJson as unknown as MonitorRun;
  const schedule = await prisma.aiIntegrityMonitorState.findFirstOrThrow({ where: { id: data.scheduleId, workspaceId, kind: "SCHEDULE" } });
  const config = schedule.dataJson as unknown as MonitorSchedule;
  try {
    await prisma.$transaction(tx => monitorRunAuthorized(tx, workspaceId, runId, config.actorUserId, leaseToken));
    if (!await hasCurrentAccountLegalAcceptance(config.actorUserId)) throw new Error("Current terms required.");
    if (Date.parse(data.end) + config.lagHours * 3600000 > Date.now() || !data.ledgerBatchId) throw new Error("Ledger or consolidation lag not ready.");
    let providerBatchId: string | undefined;
    const batchIds = [data.ledgerBatchId], sourceReviews = [{ batchId: data.ledgerBatchId, exportedAt: data.exportedAt!, completeThrough: data.completeThrough! }];
    for (const source of config.connections) {
      const connection = await prisma.aiIntegritySourceConnection.findFirstOrThrow({ where: { id: source.id, workspaceId } });
      const read = await syncAiCustomerSource(workspaceId, config.actorUserId, { connectionId: source.id, requestKey: aiDigest([runId, source.id, source.generation]).slice(0, 64) }, transport?.(connection.provider), runId, leaseToken);
      const evidence = await prisma.aiIntegritySourceSync.findFirstOrThrow({ where: { id: read.syncId, workspaceId } });
      if ((evidence.artifactJson as { activity?: string })?.activity === "NO_REPORTED_ROWS") {
        await prisma.$transaction(async tx => {
          const authorized = await monitorRunAuthorized(tx, workspaceId, runId, config.actorUserId, leaseToken);
          await tx.aiIntegrityMonitorState.update({ where: { id: runId }, data: { status: "LIMITED", leaseToken: null, leaseUntil: null, dataJson: json({ ...data, errorCode: "SOURCE_NO_REPORTED_ROWS", sourceSyncId: read.syncId }) } });
          await tx.aiIntegrityMonitorState.update({ where: { id: schedule.id }, data: { dataJson: json({ ...authorized.config, nextStart: data.end }), revision: { increment: 1 } } });
          await audit(tx, workspaceId, config.actorUserId, "AI_RECURRING_PERIOD_LIMITED", { runId, syncId: read.syncId, reason: "SOURCE_NO_REPORTED_ROWS", claim: "NOT_ZERO_ACTIVITY_OR_RESOLUTION" });
          if (authorized.config.emailEnabled) await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "NOTICE", runId), create: { workspaceId, kind: "NOTICE", key: runId, status: "PENDING", dataJson: { kind: "COMPARISON_LIMITED" } }, update: {} });
        });
        return { status: "LIMITED" };
      }
      const prepared = await promoteAiCustomerSource(workspaceId, config.actorUserId, read.syncId);
      const sync = await prisma.aiIntegritySourceSync.findFirstOrThrow({ where: { id: read.syncId, workspaceId } });
      batchIds.push(prepared.batchId);
      if (connection.provider === "OPENAI") providerBatchId = prepared.batchId;
      const artifact = sync.artifactJson as { fetchedAt?: string };
      sourceReviews.push({ batchId: prepared.batchId, exportedAt: artifact.fetchedAt!, completeThrough: data.end });
    }
    // Explicit recurring consent reuses reviewed identities, never their old
    // temporal validity. Each new period is corroborated by the current ledger.
    for (const link of config.projectLinks ?? []) {
      const original = await prisma.aiIntegrityMapping.findFirst({ where: { id: link.mappingId, workspaceId, status: "CONFIRMED" } });
      if (!original || !providerBatchId) continue;
      const existing = await prisma.aiIntegrityMapping.findFirst({ where: { workspaceId, kind: "PROVIDER_PROJECT", externalId: original.externalId, validFrom: new Date(data.start), validUntil: new Date(data.end) } });
      if (existing) continue;
      const observed = await prisma.aiIntegrityUsageRecord.count({ where: { workspaceId, importBatchId: data.ledgerBatchId, internalCustomerExternalId: link.customerId, providerProjectId: link.projectId, provider: { equals: link.provider, mode: "insensitive" } } });
      const bucket = await prisma.aiIntegrityProviderBucket.count({ where: { workspaceId, importBatchId: providerBatchId, projectId: link.projectId, organizationId: link.organizationId, provider: { equals: link.provider, mode: "insensitive" } } });
      if (!observed || !bucket) continue;
      await createAiIdentityMapping({ workspaceId, actorUserId: config.actorUserId, kind: "PROVIDER_PROJECT", externalId: link.projectId, internalCustomerExternalId: link.customerId, sourceBatchId: providerBatchId, ledgerBatchId: data.ledgerBatchId, provider: link.provider, organizationId: link.organizationId ?? undefined, validFrom: data.start, validUntil: data.end, exclusiveProjectConfirmed: true });
    }
    // Freeze analysis time before creating the immutable report, including retries.
    const saved = await prisma.aiIntegrityMonitorState.findUniqueOrThrow({ where: { id: runId } });
    const savedData = saved.dataJson as unknown as MonitorRun & { analysisAt?: string };
    const analysisAt = savedData.analysisAt ?? new Date().toISOString();
    await prisma.aiIntegrityMonitorState.updateMany({ where: { id: runId, leaseToken }, data: { dataJson: json({ ...data, analysisAt }) } });
    const scan = await runAiIntegrityScan({ workspaceId, actorUserId: config.actorUserId, batchIds, sourceReviews, asOf: analysisAt, lagHours: config.lagHours, syntheticDataConfirmed: false, connectedReportAuthorized: true, monitorRunId: runId, monitorLeaseToken: leaseToken });
    await prisma.$transaction(async tx => {
      const authorized = await monitorRunAuthorized(tx, workspaceId, runId, config.actorUserId, leaseToken);
      if (authorized.run.leaseToken !== leaseToken) throw new Error("Monitoring lease changed.");
      const prior = await tx.aiIntegrityMonitorState.findMany({ where: { workspaceId, kind: "RUN", status: "COMPLETED" }, orderBy: { key: "desc" }, take: 1 });
      let comparisonId: string | undefined;
      if (prior.length) {
        const priorData = prior[0].dataJson as unknown as MonitorRun;
        const pair = await tx.aiIntegritySnapshot.findMany({ where: { workspaceId, id: { in: [priorData.snapshotId!, scan.snapshotId] } } });
        const before = pair.find(s => s.id === priorData.snapshotId), current = pair.find(s => s.id === scan.snapshotId);
        if (!before || !current) throw new Error("Comparison evidence unavailable.");
        const manifests = [before, current].map(s => {
          const manifest = s.inputManifestJson as unknown as { format: string; input: AiScanInput; resultHash: string; connectedReportAuthorized?: boolean };
          if (manifest.format !== "revory-ai-integrity-evidence/v1" || manifest.input.workspaceId !== workspaceId || manifest.input.ruleVersion !== s.ruleVersion || aiDigest(manifest) !== s.idempotencyKey || manifest.connectedReportAuthorized !== true || aiDigest(reconcileAiIntegrity(manifest.input)) !== manifest.resultHash) throw new Error("Snapshot integrity failed.");
          return manifest;
        });
        const artifact = compareAiIntegrityPeriods(manifests[0].input, manifests[1].input, true);
        const comparison = await tx.aiIntegrityMonitorComparison.upsert({ where: { workspaceId_requestKey: { workspaceId, requestKey: runId } }, create: { workspaceId, baselineSnapshotId: before.id, currentSnapshotId: current.id, actorUserId: config.actorUserId, requestKey: runId, payloadHash: aiDigest([before.id, current.id]), mode: RECURRING_MODE, monitorVersion: artifact.monitorVersion, artifactHash: aiDigest(artifact), artifactJson: json(artifact) }, update: {} });
        comparisonId = comparison.id;
        for (const movement of artifact.movements) {
          const where = stateKey(workspaceId, "INVESTIGATION", movement.key);
          const existing = await tx.aiIntegrityMonitorState.findUnique({ where });
          const old = existing?.dataJson as Record<string, unknown> | undefined;
          const status = movement.movement === "RESOLVED" && existing?.status === "VERIFYING" ? "NO_LONGER_OBSERVED"
            : movement.movement === "NEW" || (movement.movement === "PERSISTENT" && existing?.status === "NO_LONGER_OBSERVED") ? "OPEN" : existing?.status ?? "OPEN";
          const evidence = { ...old, signal: movement, comparisonId, snapshotId: current.id };
          await tx.aiIntegrityMonitorState.upsert({ where, create: { workspaceId, kind: "INVESTIGATION", key: movement.key, status, dataJson: json(evidence) }, update: { status, dataJson: json(evidence), revision: { increment: 1 } } });
        }
        const noteworthy = artifact.movements.some(m => m.movement === "RESOLVED" || ["NEW", "PERSISTENT"].includes(m.movement) && m.current !== null
          && (m.kind === "UNATTRIBUTED_PROVIDER_SPEND" || (aiDecimal(m.current) < BigInt(0) ? -aiDecimal(m.current) : aiDecimal(m.current)) >= aiDecimal(config.minimumUsageDelta))
          && (m.movement === "NEW" || m.change !== "0"));
        if (config.emailEnabled && (noteworthy || !artifact.comparable)) await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "NOTICE", runId), create: { workspaceId, kind: "NOTICE", key: runId, status: "PENDING", dataJson: { kind: artifact.comparable ? "DIFFERENCES_CHANGED" : "COMPARISON_LIMITED" } }, update: {} });
      } else {
        const current = await tx.aiIntegritySnapshot.findFirstOrThrow({ where: { id: scan.snapshotId, workspaceId } });
        const manifest = current.inputManifestJson as unknown as { input: AiScanInput };
        for (const signal of initialAiMonitorSignals(manifest.input)) await tx.aiIntegrityMonitorState.upsert({ where: stateKey(workspaceId, "INVESTIGATION", signal.key), create: { workspaceId, kind: "INVESTIGATION", key: signal.key, status: "OPEN", dataJson: json({ signal, snapshotId: current.id, comparisonId: "" }) }, update: {} });
      }
      const nextStart = data.end;
      await tx.aiIntegrityMonitorState.update({ where: { id: schedule.id }, data: { dataJson: json({ ...authorized.config, nextStart }), revision: { increment: 1 } } });
      await tx.aiIntegrityMonitorState.update({ where: { id: runId }, data: { status: "COMPLETED", leaseToken: null, leaseUntil: null, dataJson: json({ ...data, analysisAt, snapshotId: scan.snapshotId, comparisonId }) } });
      await audit(tx, workspaceId, config.actorUserId, "AI_RECURRING_PERIOD_COMPLETED", { runId, snapshotId: scan.snapshotId, comparisonId: comparisonId ?? null });
    }, { timeout: 30000 });
    return { status: "COMPLETED", snapshotId: scan.snapshotId };
  } catch {
    const status = row.attempts >= 5 ? "NEEDS_ATTENTION" : "RETRY";
    await prisma.aiIntegrityMonitorState.updateMany({ where: { id: runId, leaseToken }, data: { status, leaseToken: null, leaseUntil: null, availableAt: new Date(Date.now() + Math.min(60, 5 * 2 ** (row.attempts - 1)) * 60000) } });
    if (config.emailEnabled) await notify(workspaceId, runId + "-failure", "MONITORING_FAILED");
    return { status };
  }
}
export async function dispatchMonitorJobs() {
  if (!recurringEnabled()) return { processed: 0 };
  await prisma.aiIntegrityMonitorState.updateMany({ where: { kind: "RUN", status: "RUNNING", attempts: { gte: 5 }, leaseUntil: { lt: new Date() } }, data: { status: "NEEDS_ATTENTION", leaseToken: null, leaseUntil: null } });
  const schedules = await prisma.aiIntegrityMonitorState.findMany({ where: { kind: "SCHEDULE", status: "ACTIVE" }, orderBy: { updatedAt: "asc" }, take: 100 });
  for (const schedule of schedules) {
    const config = schedule.dataJson as unknown as MonitorSchedule;
    const end = new Date(Date.parse(config.nextStart) + config.periodDays * DAY).toISOString();
    if (Date.parse(end) + config.lagHours * 3600000 > Date.now() || end > config.consentUntil || !await monitorPaid(prisma, schedule.workspaceId)) continue;
    const run = await prisma.aiIntegrityMonitorState.upsert({ where: stateKey(schedule.workspaceId, "RUN", config.nextStart), create: { workspaceId: schedule.workspaceId, kind: "RUN", key: config.nextStart, status: "WAITING_LEDGER", dataJson: { scheduleId: schedule.id, start: config.nextStart, end } }, update: {} });
    if (run.status === "WAITING_LEDGER" && config.emailEnabled) await notify(schedule.workspaceId, run.id + "-ledger", "LEDGER_REQUIRED");
  }
  const due = await prisma.aiIntegrityMonitorState.findMany({ where: { kind: "RUN", attempts: { lt: 5 }, status: { in: ["READY", "RETRY", "RUNNING"] }, availableAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, orderBy: { availableAt: "asc" }, take: 1 });
  const results = [];
  for (const run of due) results.push(await executeMonitorRun(run.id));
  return { processed: results.length, results };
}
export async function investigateMonitorSignal(workspaceId: string, actorUserId: string, input: { id: string; revision: number; status: string; note: string }) {
  if (!["OPEN", "INVESTIGATING", "EXPECTED", "VERIFYING"].includes(input.status) || typeof input.note !== "string" || !input.note.trim() || input.note.length > 2000) throw new Error("Choose a review status and add a note (up to 2000 characters).");
  await prisma.$transaction(async tx => {
    await assertMonitorOwner(workspaceId, actorUserId, tx);
    const updated = await tx.aiIntegrityMonitorState.updateMany({ where: { id: input.id, workspaceId, kind: "INVESTIGATION", revision: input.revision }, data: { status: input.status, revision: { increment: 1 } } });
    if (!updated.count) throw new Error("This investigation changed. Refresh before saving.");
    await audit(tx, workspaceId, actorUserId, "AI_RECURRING_INVESTIGATION_UPDATED", { investigationId: input.id, status: input.status, note: input.note.trim(), revision: input.revision + 1 });
  });
}
export async function deliverMonitorNotices(sender = sendTransactionalEmail) {
  if (!recurringEnabled()) return { sent: 0 };
  const rows = await prisma.aiIntegrityMonitorState.findMany({ where: { kind: "NOTICE", status: { in: ["PENDING", "RETRY"] }, availableAt: { lte: new Date() }, attempts: { lt: 5 } }, take: 3, orderBy: { createdAt: "asc" } });
  let sent = 0;
  for (const row of rows) {
    const payload = row.dataJson as { kind: string; firstAttemptAt?: string };
    if (payload.firstAttemptAt && Date.now() - Date.parse(payload.firstAttemptAt) > 23 * 3600000) {
      await prisma.aiIntegrityMonitorState.updateMany({ where: { id: row.id, status: row.status, revision: row.revision }, data: { status: "NEEDS_ATTENTION" } }); continue;
    }
    const token = randomUUID();
    const claimed = await prisma.aiIntegrityMonitorState.updateMany({ where: { id: row.id, status: row.status, revision: row.revision }, data: { dataJson: { ...payload, firstAttemptAt: payload.firstAttemptAt ?? new Date().toISOString() }, status: "SENDING", leaseToken: token, leaseUntil: new Date(Date.now() + 5 * 60000), attempts: { increment: 1 }, revision: { increment: 1 } } });
    if (!claimed.count) continue;
    const schedule = await prisma.aiIntegrityMonitorState.findUnique({ where: stateKey(row.workspaceId, "SCHEDULE") });
    const config = schedule?.dataJson as unknown as MonitorSchedule | undefined;
    const workspace = await prisma.workspace.findUnique({ where: { id: row.workspaceId }, select: { ownerUserId: true, owner: { select: { email: true } } } });
    if (!config?.emailEnabled || schedule?.status !== "ACTIVE" || workspace?.ownerUserId !== config.actorUserId || !workspace.owner.email || !await monitorPaid(prisma, row.workspaceId)) {
      await prisma.aiIntegrityMonitorState.update({ where: { id: row.id }, data: { status: "CANCELED", leaseToken: null, leaseUntil: null } }); continue;
    }
    const kind = (row.dataJson as { kind: string }).kind;
    const messages: Record<string, string> = { DIFFERENCES_CHANGED: "New or changed differences are ready for review.", COMPARISON_LIMITED: "The latest comparison needs better evidence.", MONITORING_FAILED: "A monitoring period did not complete. Review source access, consent and data readiness.", LEDGER_REQUIRED: "Your next closed period needs its internal usage ledger." };
    const appLink = process.env.NEXTAUTH_URL?.startsWith("https://") ? new URL("/app/ai-integrity/monitoring", process.env.NEXTAUTH_URL).href : "";
    const text = (messages[kind] ?? "Monitoring needs your review.") + " Open REVORY and choose Monitoring. No financial loss or recovery is inferred." + (appLink ? " " + appLink : "");
    let ok = false;
    try { ok = (await sender({ to: workspace.owner.email, subject: "REVORY monitoring update", text, html: "<p>" + escapeEmailHtml(text) + "</p>", idempotencyKey: "revory-monitor/" + row.id })).sent; } catch { /* Retry only within the provider idempotency window. */ }
    await prisma.aiIntegrityMonitorState.updateMany({ where: { id: row.id, leaseToken: token }, data: { status: ok ? "SENT" : row.attempts >= 4 ? "NEEDS_ATTENTION" : "RETRY", leaseToken: null, leaseUntil: null, availableAt: new Date(Date.now() + 3600000) } });
    if (ok) sent++;
  }
  // An ambiguous delivery older than the idempotency window requires manual
  // review; it must never silently create a second email.
  await prisma.aiIntegrityMonitorState.updateMany({ where: { kind: "NOTICE", status: "SENDING", leaseUntil: { lt: new Date() } }, data: { status: "NEEDS_ATTENTION", leaseToken: null, leaseUntil: null } });
  return { sent };
}
