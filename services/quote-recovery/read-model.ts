import "server-only";

import { prisma } from "@/db/prisma";
import { getCanonicalDataQualityDetail } from "@/services/canonical-intake/data-quality-detail";

export type QuoteRecoveryReadFilter = "ACTIVE" | "FINANCIAL" | "OPERATIONAL" | "HIGH_PRIORITY" | "RESOLVED" | "DISMISSED";

export async function getQuoteRecoveryRead(workspaceId: string, filter: QuoteRecoveryReadFilter = "ACTIVE") {
  const [findings, latestImport, dataQualityDetail, workspace] = await Promise.all([
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
    getCanonicalDataQualityDetail(workspaceId),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { defaultCurrency: true } }),
  ]);
  const allCounts = await prisma.quoteRecoveryFinding.groupBy({ by: ["status"], where: { workspaceId }, _count: { _all: true } });
  const activeFindings = findings.filter((finding) => finding.status === "OPEN" || finding.status === "ACKNOWLEDGED");
  const financialCurrencies = new Set(
    activeFindings
      .filter((finding) => finding.valueBasis === "ESTIMATED" && finding.valueCents !== null)
      .map((finding) => finding.currency),
  );
  const hasMixedCurrencies = financialCurrencies.size > 1;
  const reportingCurrency = [...financialCurrencies][0] ?? workspace?.defaultCurrency ?? "USD";
  const estimatedValueCents = hasMixedCurrencies
    ? null
    : activeFindings.reduce((sum, finding) => sum + (finding.valueBasis === "ESTIMATED" ? finding.valueCents ?? 0 : 0), 0);
  const financialCount = activeFindings.filter((finding) => finding.valueCents !== null && finding.valueBasis === "ESTIMATED").length;
  const operationalCount = activeFindings.filter((finding) => finding.valueBasis === "OPERATIONAL").length;
  const counts = Object.fromEntries(allCounts.map((row) => [row.status, row._count._all]));
  return {
    findings,
    summary: { activeCount: (counts.OPEN ?? 0) + (counts.ACKNOWLEDGED ?? 0), resolvedCount: counts.RESOLVED ?? 0, dismissedCount: counts.DISMISSED ?? 0, estimatedValueCents, financialCount, operationalCount, hasMixedCurrencies, reportingCurrency },
    dataQuality: {
      eligibility: dataQualityDetail.eligibility,
      hasImport: Boolean(latestImport),
      importedAt: latestImport?.committedAt,
      issues: dataQualityDetail.issues,
      linkCoverage: dataQualityDetail.linkCoverage,
      recordCount: dataQualityDetail.recordCount,
    },
  };
}

export async function getQuoteRecoveryFindingDetail(workspaceId: string, id: string) {
  return prisma.quoteRecoveryFinding.findFirst({ where: { id, workspaceId } });
}
