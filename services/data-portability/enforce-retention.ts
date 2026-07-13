import "server-only";

import { prisma } from "@/db/prisma";

export async function enforceWorkspaceRetention(
  workspaceId: string,
  now = new Date(),
) {
  const settings = await prisma.workspaceDataSettings.upsert({ where: { workspaceId }, create: { workspaceId, retentionDays: 365 }, update: {} });
  const cutoff = new Date(now.getTime() - settings.retentionDays * 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const [findings, realizationFindings, runs, snapshots, sessions, evidenceEvents] = await Promise.all([
      tx.quoteRecoveryFinding.deleteMany({
        where: { workspaceId, updatedAt: { lt: cutoff } },
      }),
      tx.revenueRealizationFinding.deleteMany({
        where: { workspaceId, updatedAt: { lt: cutoff } },
      }),
      tx.quoteRecoveryAnalysisRun.deleteMany({
        where: { workspaceId, createdAt: { lt: cutoff } },
      }),
      tx.revenueIntelligenceSnapshot.deleteMany({
        where: { workspaceId, createdAt: { lt: cutoff } },
      }),
      tx.canonicalImportSession.deleteMany({
        where: { workspaceId, createdAt: { lt: cutoff } },
      }),
      tx.revoryEvidenceEvent.deleteMany({ where: { workspaceId, observedAt: { lt: cutoff } } }),
    ]);
    const deletedCount = findings.count + realizationFindings.count + runs.count + snapshots.count + sessions.count + evidenceEvents.count;
    if (deletedCount > 0) {
      await tx.workspaceAuditEvent.create({
        data: {
          action: "RETENTION_ENFORCED",
          metadataJson: {
            cutoff: cutoff.toISOString(),
            deletedFindings: findings.count,
            deletedImportSessions: sessions.count,
            deletedRealizationFindings: realizationFindings.count,
            deletedRuns: runs.count,
            deletedSnapshots: snapshots.count,
            deletedEvidenceEvents: evidenceEvents.count,
            retentionDays: settings.retentionDays,
          },
          workspaceId,
        },
      });
    }
    return {
      deletedFindings: findings.count,
      deletedImportSessions: sessions.count,
      deletedRealizationFindings: realizationFindings.count,
      deletedRuns: runs.count,
      deletedSnapshots: snapshots.count,
      deletedEvidenceEvents: evidenceEvents.count,
      skipped: false,
    };
  });
}
