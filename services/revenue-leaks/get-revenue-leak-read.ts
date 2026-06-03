import "server-only";

import { cache } from "react";
import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakStatus,
  RevenueLeakType,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getRevenueLeakCategory } from "@/services/revenue-leaks/revenue-leak-category";
import { canContributeToEstimatedRevenueAtRisk } from "@/services/revenue-leaks/revenue-leak-guards";
import { getRevenueLeakTypeLabel } from "@/services/revenue-leaks/revenue-leak-labels";
import type { RevenueLeakCategory } from "@/types/revenue-leak";

export type RevenueLeakReadState =
  | "DATA_STALE"
  | "EMPTY"
  | "HAS_REVENUE_AT_RISK"
  | "NO_FINANCIAL_LEAKS"
  | "THIN_DATA";

export type RevenueLeakReadItem = {
  category: RevenueLeakCategory;
  confidence: RevenueLeakConfidence;
  currency: string;
  detectedAt: Date;
  estimatedValueCents: number | null;
  estimatedValueLabel: string;
  fingerprint: string;
  id: string;
  label: string;
  leakType: RevenueLeakType;
  reason: string;
  recommendedAction: string;
  severity: RevenueLeakSeverity;
  shortLabel: string;
  status: RevenueLeakStatus;
};

export type RevenueLeakSummaryBucket<T extends string> = {
  counts: Record<T, number>;
  dominant: T | null;
  label: string;
};

export type RevenueLeakDataFreshnessSummary = {
  hasStaleDataRisk: boolean;
  label: string;
  lastDetectedAt: Date | null;
  note: string;
  staleRiskCount: number;
  topStaleRisk: RevenueLeakReadItem | null;
};

export type RevenueLeakRead = {
  activeDataQualityRiskCount: number;
  activeFinancialLeakCount: number;
  activeLeakCount: number;
  activeOperationalRiskCount: number;
  confidenceSummary: RevenueLeakSummaryBucket<RevenueLeakConfidence>;
  dataFreshnessSummary: RevenueLeakDataFreshnessSummary;
  estimatedRevenueAtRiskCents: number | null;
  estimatedRevenueAtRiskLabel: string;
  lastDetectedAt: Date | null;
  recommendedAction: string;
  severitySummary: RevenueLeakSummaryBucket<RevenueLeakSeverity>;
  state: RevenueLeakReadState;
  topDataQualityRisk: RevenueLeakReadItem | null;
  topFinancialLeak: RevenueLeakReadItem | null;
  topLeak: RevenueLeakReadItem | null;
  topLeaks: RevenueLeakReadItem[];
  topOperationalRisk: RevenueLeakReadItem | null;
};

const ACTIVE_REVENUE_LEAK_STATUSES = ["OPEN", "ACKNOWLEDGED"] as const satisfies
  readonly RevenueLeakStatus[];
const TOP_LEAK_LIMIT = 5;

const confidenceRank: Record<RevenueLeakConfidence, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const severityRank: Record<RevenueLeakSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const getRevenueLeakReadForWorkspace = cache(async (
  workspaceId: string,
): Promise<RevenueLeakRead> => {
  const rows = await prisma.revenueLeak.findMany({
    orderBy: [
      {
        severity: "desc",
      },
      {
        confidence: "desc",
      },
      {
        detectedAt: "desc",
      },
    ],
    select: {
      confidence: true,
      currency: true,
      detectedAt: true,
      estimatedValueCents: true,
      fingerprint: true,
      id: true,
      leakType: true,
      reason: true,
      recommendedAction: true,
      severity: true,
      status: true,
    },
    where: {
      status: {
        in: [...ACTIVE_REVENUE_LEAK_STATUSES],
      },
      workspaceId,
    },
  });
  const activeLeaks = rows.map((row): RevenueLeakReadItem => {
    const label = getRevenueLeakTypeLabel(row.leakType);

    return {
      category: getRevenueLeakCategory(row.leakType),
      confidence: row.confidence,
      currency: row.currency,
      detectedAt: row.detectedAt,
      estimatedValueCents: row.estimatedValueCents,
      estimatedValueLabel: formatRevenueLeakMoney(row.estimatedValueCents),
      fingerprint: row.fingerprint,
      id: row.id,
      label: label.label,
      leakType: row.leakType,
      reason: row.reason,
      recommendedAction: row.recommendedAction,
      severity: row.severity,
      shortLabel: label.shortLabel,
      status: row.status,
    };
  });
  const financialLeaks = activeLeaks.filter(
    (leak) => leak.category === "FINANCIAL_LEAK",
  );
  const operationalRisks = activeLeaks.filter(
    (leak) => leak.category === "OPERATIONAL_RISK",
  );
  const dataQualityRisks = activeLeaks.filter(
    (leak) => leak.category === "DATA_QUALITY_RISK",
  );
  const staleDataRisks = activeLeaks.filter(
    (leak) => leak.leakType === "STALE_BOOKED_PROOF",
  );
  const estimatedRevenueAtRiskCents = financialLeaks.reduce<number | null>(
    (sum, leak) => {
      if (
        !canContributeToEstimatedRevenueAtRisk(leak.leakType) ||
        leak.estimatedValueCents === null
      ) {
        return sum;
      }

      return (sum ?? 0) + leak.estimatedValueCents;
    },
    null,
  );
  const sortedLeaks = [...activeLeaks].sort(compareRevenueLeakReadItems);
  const topLeak = sortedLeaks[0] ?? null;
  const topFinancialLeak = [...financialLeaks].sort(compareRevenueLeakReadItems)[0] ?? null;
  const topOperationalRisk = [...operationalRisks].sort(compareRevenueLeakReadItems)[0] ?? null;
  const topDataQualityRisk = [...dataQualityRisks].sort(compareRevenueLeakReadItems)[0] ?? null;

  return {
    activeDataQualityRiskCount: dataQualityRisks.length,
    activeFinancialLeakCount: financialLeaks.length,
    activeLeakCount: activeLeaks.length,
    activeOperationalRiskCount: operationalRisks.length,
    confidenceSummary: buildConfidenceSummary(activeLeaks),
    dataFreshnessSummary: buildDataFreshnessSummary(staleDataRisks),
    estimatedRevenueAtRiskCents,
    estimatedRevenueAtRiskLabel: formatRevenueLeakMoney(estimatedRevenueAtRiskCents),
    lastDetectedAt: sortedLeaks[0]?.detectedAt ?? null,
    recommendedAction: buildRecommendedAction({
      activeLeakCount: activeLeaks.length,
      estimatedRevenueAtRiskCents,
      hasStaleDataRisk: staleDataRisks.length > 0,
      topFinancialLeak,
      topLeak,
    }),
    severitySummary: buildSeveritySummary(activeLeaks),
    state: buildRevenueLeakReadState({
      activeFinancialLeakCount: financialLeaks.length,
      activeLeakCount: activeLeaks.length,
      estimatedRevenueAtRiskCents,
      hasStaleDataRisk: staleDataRisks.length > 0,
    }),
    topDataQualityRisk,
    topFinancialLeak,
    topLeak,
    topLeaks: sortedLeaks.slice(0, TOP_LEAK_LIMIT),
    topOperationalRisk,
  };
});

function buildRevenueLeakReadState(input: {
  activeFinancialLeakCount: number;
  activeLeakCount: number;
  estimatedRevenueAtRiskCents: number | null;
  hasStaleDataRisk: boolean;
}): RevenueLeakReadState {
  if (input.activeLeakCount === 0) {
    return "EMPTY";
  }

  if (input.estimatedRevenueAtRiskCents !== null && input.estimatedRevenueAtRiskCents > 0) {
    return "HAS_REVENUE_AT_RISK";
  }

  if (input.activeFinancialLeakCount > 0) {
    return "THIN_DATA";
  }

  if (input.hasStaleDataRisk) {
    return "DATA_STALE";
  }

  return "NO_FINANCIAL_LEAKS";
}

function buildConfidenceSummary(
  leaks: RevenueLeakReadItem[],
): RevenueLeakSummaryBucket<RevenueLeakConfidence> {
  const counts: Record<RevenueLeakConfidence, number> = {
    HIGH: 0,
    LOW: 0,
    MEDIUM: 0,
  };

  for (const leak of leaks) {
    counts[leak.confidence] += 1;
  }

  const dominant = pickDominant(counts, confidenceRank);

  return {
    counts,
    dominant,
    label: dominant ? `${dominant.toLowerCase()} confidence` : "No active confidence read",
  };
}

function buildSeveritySummary(
  leaks: RevenueLeakReadItem[],
): RevenueLeakSummaryBucket<RevenueLeakSeverity> {
  const counts: Record<RevenueLeakSeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    LOW: 0,
    MEDIUM: 0,
  };

  for (const leak of leaks) {
    counts[leak.severity] += 1;
  }

  const dominant = pickDominant(counts, severityRank);

  return {
    counts,
    dominant,
    label: dominant ? `${dominant.toLowerCase()} severity` : "No active severity read",
  };
}

function buildDataFreshnessSummary(
  staleDataRisks: RevenueLeakReadItem[],
): RevenueLeakDataFreshnessSummary {
  const sortedStaleRisks = [...staleDataRisks].sort(compareRevenueLeakReadItems);
  const topStaleRisk = sortedStaleRisks[0] ?? null;

  if (!topStaleRisk) {
    return {
      hasStaleDataRisk: false,
      label: "Freshness not flagged",
      lastDetectedAt: null,
      note: "No active stale appointment evidence risk is visible in persisted leak rows.",
      staleRiskCount: 0,
      topStaleRisk: null,
    };
  }

  return {
    hasStaleDataRisk: true,
    label: "Data may be stale",
    lastDetectedAt: topStaleRisk.detectedAt,
    note: topStaleRisk.recommendedAction,
    staleRiskCount: staleDataRisks.length,
    topStaleRisk,
  };
}

function buildRecommendedAction(input: {
  activeLeakCount: number;
  estimatedRevenueAtRiskCents: number | null;
  hasStaleDataRisk: boolean;
  topFinancialLeak: RevenueLeakReadItem | null;
  topLeak: RevenueLeakReadItem | null;
}) {
  if (input.activeLeakCount === 0) {
    return "Refresh the leak read after new appointment data is uploaded.";
  }

  if (input.estimatedRevenueAtRiskCents !== null && input.topFinancialLeak) {
    return input.topFinancialLeak.recommendedAction;
  }

  if (input.topFinancialLeak) {
    return "Improve appointment value evidence or average deal value before using this read for estimated revenue at risk.";
  }

  if (input.hasStaleDataRisk) {
    return "Upload a fresh appointment file before using the read for stronger revenue-risk decisions.";
  }

  return input.topLeak?.recommendedAction ??
    "Review the highest-priority operational risk before widening the workflow.";
}

function compareRevenueLeakReadItems(
  left: RevenueLeakReadItem,
  right: RevenueLeakReadItem,
) {
  const severityDelta = severityRank[right.severity] - severityRank[left.severity];

  if (severityDelta !== 0) {
    return severityDelta;
  }

  const confidenceDelta =
    confidenceRank[right.confidence] - confidenceRank[left.confidence];

  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const valueDelta =
    (right.estimatedValueCents ?? 0) - (left.estimatedValueCents ?? 0);

  if (valueDelta !== 0) {
    return valueDelta;
  }

  return right.detectedAt.getTime() - left.detectedAt.getTime();
}

function pickDominant<T extends string>(
  counts: Record<T, number>,
  rank: Record<T, number>,
): T | null {
  const entries = Object.entries(counts) as Array<[T, number]>;
  const activeEntries = entries.filter(([, count]) => count > 0);

  if (activeEntries.length === 0) {
    return null;
  }

  return activeEntries.sort(([leftKey, leftCount], [rightKey, rightCount]) => {
    if (rightCount !== leftCount) {
      return rightCount - leftCount;
    }

    return rank[rightKey] - rank[leftKey];
  })[0][0];
}

function formatRevenueLeakMoney(valueCents: number | null) {
  if (valueCents === null) {
    return "Value pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valueCents / 100);
}
