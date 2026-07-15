import "server-only";

import { prisma } from "@/db/prisma";
import { summarizeQuoteRecoveryFinancialExposure } from "@/domain/revory/quote-recovery-financial-summary";
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
  const financialSummary = summarizeQuoteRecoveryFinancialExposure(
    activeFindings,
    workspace?.defaultCurrency ?? "USD",
  );
  const operationalCount = activeFindings.filter((finding) => finding.valueBasis === "OPERATIONAL").length;
  const counts = Object.fromEntries(allCounts.map((row) => [row.status, row._count._all]));
  return {
    findings,
    summary: {
      activeCount: (counts.OPEN ?? 0) + (counts.ACKNOWLEDGED ?? 0),
      dismissedCount: counts.DISMISSED ?? 0,
      estimatedValueCents: financialSummary.estimatedValueCents,
      financialCount: financialSummary.financialCount,
      hasConflictingEstimateValues: financialSummary.hasConflictingEstimateValues,
      hasMixedCurrencies: financialSummary.hasMixedCurrencies,
      operationalCount,
      reportingCurrency: financialSummary.reportingCurrency,
      resolvedCount: counts.RESOLVED ?? 0,
    },
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
