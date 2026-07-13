import "server-only";

import { prisma } from "@/db/prisma";

export async function buildWorkspaceExport(workspaceId: string) {
  const [
    workspace,
    imports,
    records,
    mappings,
    quoteRecoveryFindings,
    revenueRealizationFindings,
    quoteRecoveryRuns,
    intelligenceSnapshots,
    entitlements,
    settings,
    digest,
    auditEvents,
  ] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, slug: true, status: true, createdAt: true, updatedAt: true } }),
    prisma.canonicalImportSession.findMany({ where: { workspaceId } }),
    prisma.canonicalRecord.findMany({ where: { workspaceId } }),
    prisma.savedCanonicalMapping.findMany({ where: { workspaceId } }),
    prisma.quoteRecoveryFinding.findMany({ where: { workspaceId } }),
    prisma.revenueRealizationFinding.findMany({ where: { workspaceId } }),
    prisma.quoteRecoveryAnalysisRun.findMany({ where: { workspaceId } }),
    prisma.revenueIntelligenceSnapshot.findMany({ where: { workspaceId } }),
    prisma.workspaceEntitlement.findMany({ where: { workspaceId }, select: { offerKey: true, status: true, startsAt: true, endsAt: true } }),
    prisma.workspaceDataSettings.findUnique({ where: { workspaceId } }),
    prisma.quoteRecoveryDigestPreference.findUnique({ where: { workspaceId } }),
    prisma.workspaceAuditEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!workspace) throw new Error("Workspace not found.");
  return {
    auditEvents,
    digest,
    entitlements,
    exportedAt: new Date().toISOString(),
    imports,
    intelligenceSnapshots,
    mappings,
    quoteRecoveryFindings,
    quoteRecoveryRuns,
    records,
    revenueRealizationFindings,
    schemaVersion: 2,
    settings,
    workspace,
  };
}
