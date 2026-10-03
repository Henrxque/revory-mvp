import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { AI_MONITOR_MODE, AI_MONITOR_VERSION, compareAiIntegrityPeriods, type AiMonitorArtifact } from "@/domain/ai-integrity/monitoring";
import { aiDigest, reconcileAiIntegrity, type AiScanInput } from "@/domain/ai-integrity/reconciliation";
import { isAiIntegrityExperienceEnabled } from "./experience";

export function isAiMonitorRehearsalEnabled() {
  return isAiIntegrityExperienceEnabled() && process.env.REVORY_AI_MONITOR_REHEARSAL === "true";
}
function enabled() { if (!isAiMonitorRehearsalEnabled()) throw new Error("Monitoring rehearsal unavailable."); }
function fields(raw: unknown, allowed: string[]) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !allowed.includes(key))) throw new Error("Unsupported monitoring fields.");
  return raw as Record<string, unknown>;
}
function identifier(raw: unknown) {
  if (typeof raw !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw)) throw new Error("Invalid report or alert ID.");
  return raw;
}
function inputOf(snapshot: { workspaceId: string; ruleVersion: string; windowStart: Date; windowEnd: Date; idempotencyKey: string; inputManifestJson: Prisma.JsonValue }) {
  const manifest = snapshot.inputManifestJson as unknown as { format: string; syntheticDataConfirmed: boolean; input: AiScanInput; resultHash: string };
  if (manifest.format !== "revory-ai-integrity-evidence/v1" || manifest.syntheticDataConfirmed !== true
    || manifest.input?.workspaceId !== snapshot.workspaceId || manifest.input.ruleVersion !== snapshot.ruleVersion
    || aiDigest(manifest) !== snapshot.idempotencyKey) throw new Error("Synthetic snapshot evidence failed integrity check.");
  return manifest;
}
export async function compareAiMonitorReports(workspaceId: string, actorUserId: string, raw: unknown) {
  enabled();
  const data = fields(raw, ["baselineSnapshotId", "currentSnapshotId", "requestKey", "syntheticDataConfirmed"]);
  const baselineSnapshotId = identifier(data.baselineSnapshotId), currentSnapshotId = identifier(data.currentSnapshotId);
  if (baselineSnapshotId === currentSnapshotId || data.syntheticDataConfirmed !== true || typeof data.requestKey !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(data.requestKey)) throw new Error("Confirm two distinct synthetic reports.");
  const requestKey = data.requestKey, payloadHash = aiDigest({ workspaceId, actorUserId, baselineSnapshotId, currentSnapshotId, version: AI_MONITOR_VERSION });
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;
    const replay = await tx.aiIntegrityMonitorComparison.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey } } });
    if (replay) {
      if (replay.payloadHash !== payloadHash) throw new Error("Monitoring request key reused with different content.");
      if (aiDigest(replay.artifactJson) !== replay.artifactHash) throw new Error("Monitoring artifact integrity check failed.");
      return { comparison: replay, replayed: true };
    }
    const pair = await tx.aiIntegrityMonitorComparison.findUnique({ where: { workspaceId_baselineSnapshotId_currentSnapshotId_monitorVersion: { workspaceId, baselineSnapshotId, currentSnapshotId, monitorVersion: AI_MONITOR_VERSION } } });
    if (pair) {
      if (aiDigest(pair.artifactJson) !== pair.artifactHash) throw new Error("Monitoring artifact integrity check failed.");
      return { comparison: pair, replayed: true };
    }
    if (await tx.aiIntegrityMonitorComparison.count({ where: { workspaceId } }) >= 100) throw new Error("Monitoring rehearsal history limit reached.");
    const snapshots = await tx.aiIntegritySnapshot.findMany({ where: { workspaceId, id: { in: [baselineSnapshotId, currentSnapshotId] } } });
    const baseline = snapshots.find((s) => s.id === baselineSnapshotId), current = snapshots.find((s) => s.id === currentSnapshotId);
    if (!baseline || !current) throw new Error("Reports unavailable in this workspace.");
    const a = inputOf(baseline), b = inputOf(current), artifact = compareAiIntegrityPeriods(a.input, b.input);
    // Replayed engine results must match the immutable snapshot's original result hashes.
    if (aiDigest(reconcileAiIntegrity(a.input)) !== a.resultHash || aiDigest(reconcileAiIntegrity(b.input)) !== b.resultHash
      || artifact.baselineWindow.start !== baseline.windowStart.toISOString() || artifact.baselineWindow.end !== baseline.windowEnd.toISOString()
      || artifact.currentWindow.start !== current.windowStart.toISOString() || artifact.currentWindow.end !== current.windowEnd.toISOString()) throw new Error("Report reproduction failed integrity check.");
    if (Buffer.byteLength(JSON.stringify(artifact), "utf8") > 4 * 1024 * 1024) throw new Error("Monitoring artifact exceeds limit.");
    const comparison = await tx.aiIntegrityMonitorComparison.create({ data: { workspaceId, baselineSnapshotId, currentSnapshotId, actorUserId, requestKey, payloadHash,
      mode: AI_MONITOR_MODE, monitorVersion: AI_MONITOR_VERSION, artifactJson: artifact as unknown as Prisma.InputJsonValue, artifactHash: aiDigest(artifact) } });
    if (artifact.alerts.length) await tx.aiIntegrityMonitorAlert.createMany({ data: artifact.alerts.map((alert) => ({ workspaceId, comparisonId: comparison.id, signalKey: alert.key, kind: alert.kind })) });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_MONITOR_REHEARSAL_COMPARED", metadataJson: { comparisonId: comparison.id, mode: AI_MONITOR_MODE, alertCount: artifact.alerts.length } } });
    return { comparison, replayed: false };
  }, { timeout: 30000 });
}
export async function acknowledgeAiMonitorAlert(workspaceId: string, actorUserId: string, raw: unknown) {
  enabled(); const id = identifier(fields(raw, ["alertId"]).alertId);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ai_integrity_monitor_alerts WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const alert = await tx.aiIntegrityMonitorAlert.findFirst({ where: { id, workspaceId, comparison: { mode: AI_MONITOR_MODE } } });
    if (!alert) throw new Error("Alert unavailable in this workspace.");
    if (alert.status === "ACKNOWLEDGED") return alert;
    const saved = await tx.aiIntegrityMonitorAlert.update({ where: { id }, data: { status: "ACKNOWLEDGED", acknowledgedBy: actorUserId, acknowledgedAt: new Date() } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_MONITOR_REHEARSAL_ALERT_ACKNOWLEDGED", metadataJson: { alertId: id, comparisonId: alert.comparisonId, mode: AI_MONITOR_MODE } } });
    return saved;
  });
}
export async function getAiMonitorArtifact(workspaceId: string, id: string) {
  if (!isAiMonitorRehearsalEnabled()) return null;
  const comparison = await prisma.aiIntegrityMonitorComparison.findFirst({ where: { workspaceId, id, mode: AI_MONITOR_MODE } });
  if (!comparison) return null;
  if (aiDigest(comparison.artifactJson) !== comparison.artifactHash) throw new Error("Monitoring artifact integrity check failed.");
  return { comparison, artifact: comparison.artifactJson as unknown as AiMonitorArtifact };
}
