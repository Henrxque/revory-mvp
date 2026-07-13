import "server-only";

import { prisma } from "@/db/prisma";

export async function enforceWorkspaceRetention(
  workspaceId: string,
  now = new Date(),
) {
  const settings = await prisma.workspaceDataSettings.findUnique({
    where: { workspaceId },
  });
  if (!settings) {
    return { deletedFindings: 0, deletedImportSessions: 0, deletedRealizationFindings: 0, deletedRuns: 0, deletedSnapshots: 0, skipped: true };
  }
  const cutoff = new Date(now.getTime() - settings.retentionDays * 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const [findings, realizationFindings, runs, snapshots, sessions] = await Promise.all([
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
    ]);
    const deletedCount = findings.count + realizationFindings.count + runs.count + snapshots.count + sessions.count;
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
      skipped: false,
    };
  });
}
