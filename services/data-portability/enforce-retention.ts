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
    const snapshotsWithExpiredInputs = await tx.aiIntegritySnapshotInput.findMany({
      where: { workspaceId, importBatch: { createdAt: { lt: cutoff } } },
      select: { snapshotId: true },
    });
    const expiredSnapshotWhere = { workspaceId, OR: [
      { createdAt: { lt: cutoff } }, { id: { in: snapshotsWithExpiredInputs.map((item) => item.snapshotId) } },
    ] };
    const expiringSnapshotIds = await tx.aiIntegritySnapshot.findMany({ where: expiredSnapshotWhere, select: { id: true } });
    // Retiring an artifact never restores a consumed purchase.
    await tx.aiIntegrityScanGrant.updateMany({ where: { workspaceId, consumedSnapshotId: { in: expiringSnapshotIds.map((s) => s.id) } }, data: { consumedSnapshotId: null } });
    const aiSnapshots = await tx.aiIntegritySnapshot.deleteMany({
      where: { workspaceId, OR: [
        { createdAt: { lt: cutoff } },
        { id: { in: snapshotsWithExpiredInputs.map((item) => item.snapshotId) } },
      ] },
    });
    // Composite snapshot-input FKs prevent deleting evidence still used by a retained snapshot.
    const aiImportBatches = await tx.aiIntegrityImportBatch.deleteMany({ where: { workspaceId, createdAt: { lt: cutoff } } });
    const aiMappings = await tx.aiIntegrityMapping.deleteMany({
      where: { workspaceId, validUntil: { lt: cutoff } },
    });
    const deletedCount = findings.count + realizationFindings.count + runs.count + snapshots.count + sessions.count + evidenceEvents.count + aiSnapshots.count + aiImportBatches.count + aiMappings.count;
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
            deletedAiSnapshots: aiSnapshots.count,
            deletedAiImportBatches: aiImportBatches.count,
            deletedAiMappings: aiMappings.count,
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
      deletedAiSnapshots: aiSnapshots.count,
      deletedAiImportBatches: aiImportBatches.count,
      deletedAiMappings: aiMappings.count,
      skipped: false,
    };
  });
}
