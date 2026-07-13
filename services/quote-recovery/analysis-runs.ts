import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

export type AnalysisRunCapacityReservation = {
  entitlementId: string;
  offerKey: "QUOTE_RECOVERY_AUDIT" | "STARTER" | "GROWTH" | "PRO";
};

export async function reserveQuoteRecoveryAnalysisRunCapacity(workspaceId: string): Promise<AnalysisRunCapacityReservation | null> {
  const entitlements = await prisma.workspaceEntitlement.findMany({
    where: { workspaceId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
  });
  const rank = { PRO: 4, GROWTH: 3, STARTER: 2, QUOTE_RECOVERY_AUDIT: 1 } as const;
  const entitlement = entitlements.sort((left, right) => rank[right.offerKey] - rank[left.offerKey])[0] ?? null;
  if (!entitlement) return null;
  if (entitlement.maxAnalysisRuns !== null) {
    const consumed = await prisma.workspaceEntitlement.updateMany({
      where: { id: entitlement.id, analysisRunsUsed: { lt: entitlement.maxAnalysisRuns } },
      data: { analysisRunsUsed: { increment: 1 } },
    });
    if (consumed.count !== 1) throw new Error("This one-time audit entitlement has already been consumed.");
  } else {
    await prisma.workspaceEntitlement.update({ where: { id: entitlement.id }, data: { analysisRunsUsed: { increment: 1 } } });
  }
  return { entitlementId: entitlement.id, offerKey: entitlement.offerKey };
}

export async function releaseQuoteRecoveryAnalysisRunCapacity(reservation: AnalysisRunCapacityReservation | null) {
  if (!reservation) return;
  await prisma.workspaceEntitlement.updateMany({
    where: { id: reservation.entitlementId, analysisRunsUsed: { gt: 0 } },
    data: { analysisRunsUsed: { decrement: 1 } },
  });
}

export async function createQuoteRecoveryAnalysisRun(
  workspaceId: string,
  reservedCapacity?: AnalysisRunCapacityReservation | null,
  importSessionId?: string,
) {
  const [currentRead, latest, existingRuns, entitlements] = await Promise.all([
    importSessionId ? Promise.resolve(null) : getQuoteRecoveryRead(workspaceId),
    importSessionId
      ? prisma.canonicalImportSession.findFirst({ where: { id: importSessionId, workspaceId, status: "COMMITTED" } })
      : prisma.canonicalImportSession.findFirst({ where: { workspaceId, status: "COMMITTED" }, orderBy: { committedAt: "desc" } }),
    prisma.quoteRecoveryAnalysisRun.count({ where: { workspaceId } }),
    prisma.workspaceEntitlement.findMany({ where: { workspaceId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] } }),
  ]);
  if (importSessionId && !latest) throw new Error("The requested committed import session was not found in this workspace.");
  if (importSessionId && (!latest?.quoteRecoverySnapshotJson || !latest.quoteRecoveryDataQualitySnapshotJson)) {
    throw new Error("The requested import predates immutable analysis snapshots and cannot be repaired without misattributing current workspace data.");
  }
  const findings: unknown[] = importSessionId
    ? Array.isArray(latest?.quoteRecoverySnapshotJson) ? latest.quoteRecoverySnapshotJson : []
    : currentRead?.findings ?? [];
  const dataQuality = importSessionId
    ? latest?.quoteRecoveryDataQualitySnapshotJson as Prisma.JsonObject
    : currentRead?.dataQuality ?? {};
  const activeCount = findings.length;
  const estimatedValueCents = findings.reduce<number>((sum, finding) => {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) return sum;
    const candidate = finding as { valueBasis?: unknown; valueCents?: unknown };
    return candidate.valueBasis === "ESTIMATED" && typeof candidate.valueCents === "number"
      ? sum + candidate.valueCents
      : sum;
  }, 0);
  const rank = { PRO: 4, GROWTH: 3, STARTER: 2, QUOTE_RECOVERY_AUDIT: 1 } as const;
  const entitlement = entitlements.sort((left, right) => rank[right.offerKey] - rank[left.offerKey])[0] ?? null;
  const ownsReservation = reservedCapacity === undefined;
  const reservation = ownsReservation
    ? await reserveQuoteRecoveryAnalysisRunCapacity(workspaceId)
    : reservedCapacity;
  if (reservation && entitlement && reservation.entitlementId !== entitlement.id) {
    await releaseQuoteRecoveryAnalysisRunCapacity(reservation);
    throw new Error("The reserved analysis capacity does not match the active entitlement.");
  }
  const now = new Date();
  if (latest) {
    const existing = await prisma.quoteRecoveryAnalysisRun.findUnique({ where: { importSessionId: latest.id } });
    if (existing) return existing;
  }
  try {
    return await prisma.$transaction(async (tx) => {
    const run = latest
      ? await tx.quoteRecoveryAnalysisRun.upsert({
          where: { importSessionId: latest.id },
          create: { workspaceId, importSessionId: latest.id, findingSnapshotJson: findings as Prisma.InputJsonValue, activeCount, estimatedValueCents, dataQualityJson: dataQuality as Prisma.InputJsonValue },
          update: {},
        })
      : await tx.quoteRecoveryAnalysisRun.create({ data: { workspaceId, findingSnapshotJson: findings as Prisma.InputJsonValue, activeCount, estimatedValueCents, dataQualityJson: dataQuality as Prisma.InputJsonValue } });
    if (latest?.committedAt && existingRuns === 0) await tx.revoryEvidenceEvent.upsert({
      where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: "system:first-value" } },
      create: { workspaceId, metric: "FIRST_VALUE_SECONDS", source: "SYSTEM", offerKey: entitlement?.offerKey, integerValue: Math.max(0, Math.round((now.valueOf() - latest.committedAt.valueOf()) / 1000)), idempotencyKey: "system:first-value", relatedEntityId: run.id },
      update: {},
    });
    if (existingRuns >= 1) await tx.revoryEvidenceEvent.upsert({
      where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: `system:second-read:${run.id}` } },
      create: { workspaceId, metric: "SECOND_READ", source: "SYSTEM", offerKey: entitlement?.offerKey ?? "STARTER", booleanValue: true, idempotencyKey: `system:second-read:${run.id}`, relatedEntityId: run.id },
      update: {},
    });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, action: "QUOTE_RECOVERY_ANALYSIS_RUN_CREATED", metadataJson: { runId: run.id, activeCount, importSessionId: latest?.id ?? null } } });
    return run;
    });
  } catch (error) {
    if (ownsReservation) await releaseQuoteRecoveryAnalysisRunCapacity(reservation);
    throw error;
  }
}
export async function completeQuoteRecoveryAnalysisRun(workspaceId: string, id: string) { return prisma.quoteRecoveryAnalysisRun.updateMany({ where: { id, workspaceId }, data: { status: "COMPLETED", completedAt: new Date() } }); }
export async function getQuoteRecoveryAnalysisHistory(workspaceId: string) { return prisma.quoteRecoveryAnalysisRun.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 12 }); }
