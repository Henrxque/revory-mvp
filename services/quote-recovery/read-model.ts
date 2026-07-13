import "server-only";

import { prisma } from "@/db/prisma";

export type QuoteRecoveryReadFilter = "ACTIVE" | "FINANCIAL" | "OPERATIONAL" | "HIGH_PRIORITY" | "RESOLVED" | "DISMISSED";

export async function getQuoteRecoveryRead(workspaceId: string, filter: QuoteRecoveryReadFilter = "ACTIVE") {
  const [findings, latestImport, recordCount] = await Promise.all([
    prisma.quoteRecoveryFinding.findMany({
      where: {
        workspaceId,
        ...(filter === "ACTIVE" ? { status: { in: ["OPEN", "ACKNOWLEDGED"] } } : {}),
        ...(filter === "FINANCIAL" ? { status: { in: ["OPEN", "ACKNOWLEDGED"] }, valueCents: { not: null } } : {}),
        ...(filter === "OPERATIONAL" ? { status: { in: ["OPEN", "ACKNOWLEDGED"] }, valueBasis: "OPERATIONAL" } : {}),
        ...(filter === "HIGH_PRIORITY" ? { status: { in: ["OPEN", "ACKNOWLEDGED"] }, severity: { in: ["HIGH", "CRITICAL"] } } : {}),
        ...(filter === "RESOLVED" ? { status: "RESOLVED" } : {}),
        ...(filter === "DISMISSED" ? { status: "DISMISSED" } : {}),
      },
      orderBy: [{ severity: "desc" }, { valueCents: "desc" }, { detectedAt: "desc" }],
    }),
    prisma.canonicalImportSession.findFirst({ where: { workspaceId, status: "COMMITTED" }, orderBy: { committedAt: "desc" } }),
    prisma.canonicalRecord.count({ where: { workspaceId, isActive: true } }),
  ]);
  const allCounts = await prisma.quoteRecoveryFinding.groupBy({ by: ["status"], where: { workspaceId }, _count: { _all: true } });
  const activeFindings = findings.filter((finding) => finding.status === "OPEN" || finding.status === "ACKNOWLEDGED");
  const estimatedValueCents = activeFindings.reduce((sum, finding) => sum + (finding.valueBasis === "ESTIMATED" ? finding.valueCents ?? 0 : 0), 0);
  const financialCount = activeFindings.filter((finding) => finding.valueCents !== null && finding.valueBasis === "ESTIMATED").length;
  const operationalCount = activeFindings.filter((finding) => finding.valueBasis === "OPERATIONAL").length;
  const counts = Object.fromEntries(allCounts.map((row) => [row.status, row._count._all]));
  const dataQuality = latestImport?.dataQualityJson as { issues?: Array<{ code: string; message: string }>; linkCoverage?: { linked: number; unmatched: number; conflicting: number } } | null;
  const eligibility = latestImport?.eligibilityJson as Record<string, { eligible: boolean; missingFields: string[] }> | null;
  return {
    findings,
    summary: { activeCount: (counts.OPEN ?? 0) + (counts.ACKNOWLEDGED ?? 0), resolvedCount: counts.RESOLVED ?? 0, dismissedCount: counts.DISMISSED ?? 0, estimatedValueCents, financialCount, operationalCount },
    dataQuality: { hasImport: Boolean(latestImport), importedAt: latestImport?.committedAt, recordCount, issues: dataQuality?.issues ?? [], linkCoverage: dataQuality?.linkCoverage ?? { linked: 0, unmatched: 0, conflicting: 0 }, eligibility: eligibility ?? {} },
  };
}

export async function getQuoteRecoveryFindingDetail(workspaceId: string, id: string) {
  return prisma.quoteRecoveryFinding.findFirst({ where: { id, workspaceId } });
}
