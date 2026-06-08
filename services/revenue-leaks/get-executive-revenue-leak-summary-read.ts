import "server-only";

import { cache } from "react";
import type {
  Prisma,
  RevenueLeakConfidence,
  RevenueLeakSeverity,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getDailyLeakBriefRead } from "@/services/revenue-leaks/get-daily-leak-brief-read";
import {
  getRevenueLeakListForWorkspace,
  type RevenueLeakListItem,
} from "@/services/revenue-leaks/get-revenue-leak-list";
import { getRevenueLeakReadForWorkspace } from "@/services/revenue-leaks/get-revenue-leak-read";
import { buildRevenueLeakConfidenceCopy } from "@/services/revenue-leaks/revenue-leak-confidence-copy";
import {
  buildRevenueLeakEvidenceSummary,
  type RevenueLeakEvidenceSummary,
} from "@/services/revenue-leaks/revenue-leak-evidence-summary";
import { getRevenueLeakCategory } from "@/services/revenue-leaks/revenue-leak-category";
import { getRevenueLeakTypeLabel } from "@/services/revenue-leaks/revenue-leak-labels";
import type { RevenueLeakCategory } from "@/types/revenue-leak";

export type ExecutiveRevenueLeakSummaryState =
  | "DATA_STALE"
  | "EMPTY"
  | "HAS_REVENUE_AT_RISK"
  | "OPERATIONAL_ONLY"
  | "THIN_DATA";

export type ExecutiveRevenueLeakSummaryTone =
  | "accent"
  | "future"
  | "neutral"
  | "real";

export type ExecutiveRevenueLeakSummaryLeak = {
  category: RevenueLeakCategory;
  categoryLabel: string;
  confidence: RevenueLeakConfidence;
  confidenceExplanation: string;
  confidenceLabel: string;
  detectedAtLabel: string;
  estimatedValueCents: number | null;
  estimatedValueLabel: string;
  evidenceSummary: RevenueLeakEvidenceSummary;
  id: string;
  label: string;
  note: string;
  recommendedAction: string;
  severity: RevenueLeakSeverity;
  severityLabel: string;
  shortLabel: string;
};

export type ExecutiveRevenueLeakSummaryBucket<T extends string> = {
  counts: Record<T, number>;
  dominant: T | null;
  label: string;
  note: string;
};

export type ExecutiveRevenueLeakSummaryDataFreshness = {
  hasStaleDataRisk: boolean;
  label: string;
  note: string;
  staleRiskCount: number;
  tone: ExecutiveRevenueLeakSummaryTone;
};

export type ExecutiveRevenueLeakSummaryPrintSection = {
  note: string;
  rows: Array<{
    label: string;
    note?: string;
    value: string;
  }>;
  title: string;
};

export type ExecutiveRevenueLeakSummaryRead = {
  activeDataQualityRiskCount: number;
  activeFinancialLeakCount: number;
  activeOperationalRiskCount: number;
  confidenceSummary: ExecutiveRevenueLeakSummaryBucket<RevenueLeakConfidence>;
  copyableSummary: string;
  dataFreshnessSummary: ExecutiveRevenueLeakSummaryDataFreshness;
  estimatedRevenueAtRiskCents: number | null;
  estimatedRevenueAtRiskLabel: string;
  generatedAt: Date;
  headline: string;
  honestyNote: string;
  printSections: ExecutiveRevenueLeakSummaryPrintSection[];
  recommendedExecutiveAction: string;
  severitySummary: ExecutiveRevenueLeakSummaryBucket<RevenueLeakSeverity>;
  state: ExecutiveRevenueLeakSummaryState;
  summary: string;
  title: string;
  topDataQualityRisks: ExecutiveRevenueLeakSummaryLeak[];
  topFinancialLeaks: ExecutiveRevenueLeakSummaryLeak[];
  topOperationalRisks: ExecutiveRevenueLeakSummaryLeak[];
  workspaceId: string;
};

const ACTIVE_TOP_LEAK_LIMIT = 15;
const DISPLAY_TOP_LEAK_LIMIT = 3;
const HONESTY_NOTE =
  "Estimated revenue at risk is based on active imported leak evidence, not confirmed accounting loss.";

export const getExecutiveRevenueLeakSummaryRead = cache(async (input: {
  now?: Date;
  workspaceId: string;
}): Promise<ExecutiveRevenueLeakSummaryRead> => {
  const generatedAt = input.now ?? new Date();
  const [dashboardRead, listRead, dailyBriefRead] = await Promise.all([
    getRevenueLeakReadForWorkspace(input.workspaceId),
    getRevenueLeakListForWorkspace({
      filter: "ALL_ACTIVE",
      limit: ACTIVE_TOP_LEAK_LIMIT,
      workspaceId: input.workspaceId,
    }),
    getDailyLeakBriefRead(input.workspaceId),
  ]);
  const evidenceByLeakId = await getEvidenceByLeakId(
    listRead.items.map((item) => item.id),
  );
  const topItems = listRead.items.map((item) =>
    mapExecutiveLeakItem({
      evidenceJson: evidenceByLeakId.get(item.id),
      item,
    }),
  );
  const topFinancialLeaks = topItems
    .filter((item) => item.category === "FINANCIAL_LEAK")
    .slice(0, DISPLAY_TOP_LEAK_LIMIT);
  const topOperationalRisks = topItems
    .filter((item) => item.category === "OPERATIONAL_RISK")
    .slice(0, DISPLAY_TOP_LEAK_LIMIT);
  const topDataQualityRisks = topItems
    .filter((item) => item.category === "DATA_QUALITY_RISK")
    .slice(0, DISPLAY_TOP_LEAK_LIMIT);
  const state = buildExecutiveSummaryState({
    activeFinancialLeakCount: dashboardRead.activeFinancialLeakCount,
    activeLeakCount: dashboardRead.activeLeakCount,
    estimatedRevenueAtRiskCents: dashboardRead.estimatedRevenueAtRiskCents,
    hasStaleDataRisk: dashboardRead.dataFreshnessSummary.hasStaleDataRisk,
  });
  const recommendedExecutiveAction =
    topFinancialLeaks[0]?.recommendedAction ??
    topDataQualityRisks[0]?.recommendedAction ??
    topOperationalRisks[0]?.recommendedAction ??
    dailyBriefRead.recommendedAction ??
    dashboardRead.recommendedAction;
  const read = {
    activeDataQualityRiskCount: dashboardRead.activeDataQualityRiskCount,
    activeFinancialLeakCount: dashboardRead.activeFinancialLeakCount,
    activeOperationalRiskCount: dashboardRead.activeOperationalRiskCount,
    confidenceSummary: buildConfidenceSummary(dashboardRead.confidenceSummary),
    copyableSummary: "",
    dataFreshnessSummary: {
      hasStaleDataRisk: dashboardRead.dataFreshnessSummary.hasStaleDataRisk,
      label: dashboardRead.dataFreshnessSummary.label,
      note: dashboardRead.dataFreshnessSummary.note,
      staleRiskCount: dashboardRead.dataFreshnessSummary.staleRiskCount,
      tone: dashboardRead.dataFreshnessSummary.hasStaleDataRisk
        ? "future"
        : "real",
    },
    estimatedRevenueAtRiskCents: dashboardRead.estimatedRevenueAtRiskCents,
    estimatedRevenueAtRiskLabel: dashboardRead.estimatedRevenueAtRiskLabel,
    generatedAt,
    headline: buildHeadline(state),
    honestyNote: HONESTY_NOTE,
    printSections: [] as ExecutiveRevenueLeakSummaryPrintSection[],
    recommendedExecutiveAction,
    severitySummary: buildSeveritySummary(dashboardRead.severitySummary),
    state,
    summary: buildSummary({
      activeFinancialLeakCount: dashboardRead.activeFinancialLeakCount,
      activeLeakCount: dashboardRead.activeLeakCount,
      activeOperationalRiskCount: dashboardRead.activeOperationalRiskCount,
      estimatedRevenueAtRiskLabel: dashboardRead.estimatedRevenueAtRiskLabel,
      state,
    }),
    title: "Executive Revenue Leak Summary",
    topDataQualityRisks,
    topFinancialLeaks,
    topOperationalRisks,
    workspaceId: input.workspaceId,
  } satisfies Omit<ExecutiveRevenueLeakSummaryRead, "copyableSummary" | "printSections"> & {
    copyableSummary: string;
    printSections: ExecutiveRevenueLeakSummaryPrintSection[];
  };

  return {
    ...read,
    copyableSummary: buildCopyableSummary(read),
    printSections: buildPrintSections(read),
  };
});

async function getEvidenceByLeakId(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, Prisma.JsonValue>();
  }

  const rows = await prisma.revenueLeak.findMany({
    select: {
      evidenceJson: true,
      id: true,
    },
    where: {
      id: {
        in: ids,
      },
    },
  });

  return new Map(rows.map((row) => [row.id, row.evidenceJson]));
}

function mapExecutiveLeakItem(input: {
  evidenceJson: Prisma.JsonValue | undefined;
  item: RevenueLeakListItem;
}): ExecutiveRevenueLeakSummaryLeak {
  const category = getRevenueLeakCategory(input.item.leakType);
  const typeLabel = getRevenueLeakTypeLabel(input.item.leakType);
  const evidenceSummary = buildRevenueLeakEvidenceSummary(
    input.evidenceJson ?? {},
  );
  const confidenceCopy = buildRevenueLeakConfidenceCopy({
    confidence: input.item.confidence,
    evidenceSummary,
  });

  return {
    category,
    categoryLabel: input.item.categoryLabel,
    confidence: input.item.confidence,
    confidenceExplanation: confidenceCopy.explanation,
    confidenceLabel: confidenceCopy.label,
    detectedAtLabel: input.item.detectedAtLabel,
    estimatedValueCents:
      category === "FINANCIAL_LEAK" ? input.item.estimatedValueCents : null,
    estimatedValueLabel:
      category === "FINANCIAL_LEAK"
        ? input.item.estimatedValueLabel
        : "Not counted as revenue at risk",
    evidenceSummary,
    id: input.item.id,
    label: typeLabel.label,
    note: input.item.reason,
    recommendedAction: input.item.recommendedAction,
    severity: input.item.severity,
    severityLabel: input.item.severityLabel,
    shortLabel: typeLabel.shortLabel,
  };
}

function buildExecutiveSummaryState(input: {
  activeFinancialLeakCount: number;
  activeLeakCount: number;
  estimatedRevenueAtRiskCents: number | null;
  hasStaleDataRisk: boolean;
}): ExecutiveRevenueLeakSummaryState {
  if (input.activeLeakCount === 0) {
    return "EMPTY";
  }

  if (
    input.estimatedRevenueAtRiskCents !== null &&
    input.estimatedRevenueAtRiskCents > 0
  ) {
    return "HAS_REVENUE_AT_RISK";
  }

  if (input.activeFinancialLeakCount > 0) {
    return "THIN_DATA";
  }

  if (input.hasStaleDataRisk) {
    return "DATA_STALE";
  }

  return "OPERATIONAL_ONLY";
}

function buildHeadline(state: ExecutiveRevenueLeakSummaryState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "Estimated revenue at risk is visible enough to summarize.";
    case "THIN_DATA":
      return "Financial leak evidence is visible, but value is still thin.";
    case "DATA_STALE":
      return "The executive read should start with data freshness.";
    case "OPERATIONAL_ONLY":
      return "Operational risks are visible, without counted financial value.";
    case "EMPTY":
      return "No active revenue leak signals are visible yet.";
  }
}

function buildSummary(input: {
  activeFinancialLeakCount: number;
  activeLeakCount: number;
  activeOperationalRiskCount: number;
  estimatedRevenueAtRiskLabel: string;
  state: ExecutiveRevenueLeakSummaryState;
}) {
  switch (input.state) {
    case "HAS_REVENUE_AT_RISK":
      return `${input.estimatedRevenueAtRiskLabel} is visible from active financial leak evidence. ${input.activeOperationalRiskCount} operational risks stay separate from the money read.`;
    case "THIN_DATA":
      return `${input.activeFinancialLeakCount} financial leak signals are visible, but value evidence is not strong enough for a counted executive total.`;
    case "DATA_STALE":
      return "A stale data-quality risk is active. Refresh appointment evidence before using this summary for a stronger executive read.";
    case "OPERATIONAL_ONLY":
      return `${input.activeOperationalRiskCount} operational risks are visible. They may block revenue, but they are not counted as financial value.`;
    case "EMPTY":
      return "No active persisted leak evidence is visible. Import clinic data and run the leak read before sharing an executive summary.";
  }
}

function buildConfidenceSummary(
  summary: {
    counts: Record<RevenueLeakConfidence, number>;
    dominant: RevenueLeakConfidence | null;
    label: string;
  },
): ExecutiveRevenueLeakSummaryBucket<RevenueLeakConfidence> {
  return {
    counts: summary.counts,
    dominant: summary.dominant,
    label: summary.label,
    note: summary.dominant
      ? "Dominant confidence across active persisted leak evidence."
      : "No active confidence signal is visible yet.",
  };
}

function buildSeveritySummary(
  summary: {
    counts: Record<RevenueLeakSeverity, number>;
    dominant: RevenueLeakSeverity | null;
    label: string;
  },
): ExecutiveRevenueLeakSummaryBucket<RevenueLeakSeverity> {
  return {
    counts: summary.counts,
    dominant: summary.dominant,
    label: summary.label,
    note: summary.dominant
      ? "Dominant severity across active persisted leak evidence."
      : "No active severity signal is visible yet.",
  };
}

function buildCopyableSummary(
  read: Omit<ExecutiveRevenueLeakSummaryRead, "copyableSummary" | "printSections"> & {
    copyableSummary: string;
    printSections: ExecutiveRevenueLeakSummaryPrintSection[];
  },
) {
  const topFinancialLeak = read.topFinancialLeaks[0];
  const topOperationalRisk = read.topOperationalRisks[0];
  const topDataQualityRisk = read.topDataQualityRisks[0];
  const lines = [
    read.title,
    `Prepared: ${formatDateTime(read.generatedAt)}`,
    `Estimated revenue at risk: ${read.estimatedRevenueAtRiskLabel}`,
    `Active signals: ${read.activeFinancialLeakCount} financial / ${read.activeOperationalRiskCount} operational / ${read.activeDataQualityRiskCount} data-quality`,
    `Confidence / severity: ${read.confidenceSummary.label} / ${read.severitySummary.label}`,
    topFinancialLeak
      ? `Top financial leak: ${topFinancialLeak.label} - ${topFinancialLeak.estimatedValueLabel}`
      : "Top financial leak: none visible",
    topOperationalRisk
      ? `Top operational risk: ${topOperationalRisk.label}`
      : "Top operational risk: none visible",
    topDataQualityRisk
      ? `Top data-quality risk: ${topDataQualityRisk.label}`
      : "Top data-quality risk: none visible",
    `Recommended action: ${read.recommendedExecutiveAction}`,
    read.honestyNote,
  ];

  return lines.join("\n");
}

function buildPrintSections(
  read: Omit<ExecutiveRevenueLeakSummaryRead, "copyableSummary" | "printSections"> & {
    copyableSummary: string;
    printSections: ExecutiveRevenueLeakSummaryPrintSection[];
  },
): ExecutiveRevenueLeakSummaryPrintSection[] {
  return [
    {
      note: read.summary,
      rows: [
        {
          label: "Estimated revenue at risk",
          note: "Financial leak evidence only.",
          value: read.estimatedRevenueAtRiskLabel,
        },
        {
          label: "Active leak signals",
          note: "Financial / operational / data-quality.",
          value: `${read.activeFinancialLeakCount} / ${read.activeOperationalRiskCount} / ${read.activeDataQualityRiskCount}`,
        },
        {
          label: "Confidence / severity",
          value: `${read.confidenceSummary.label} / ${read.severitySummary.label}`,
        },
      ],
      title: "Executive snapshot",
    },
    {
      note: "Only financial leaks can contribute to estimated revenue at risk.",
      rows: buildLeakRows(read.topFinancialLeaks, "No active financial leak visible."),
      title: "Top financial leaks",
    },
    {
      note: "Operational and data-quality risks are evidence for review, not counted financial loss.",
      rows: [
        ...buildLeakRows(read.topOperationalRisks, "No active operational risk visible."),
        ...buildLeakRows(read.topDataQualityRisks, "No active data-quality risk visible."),
      ],
      title: "Operational and data-quality risks",
    },
    {
      note: read.honestyNote,
      rows: [
        {
          label: "Next executive action",
          value: read.recommendedExecutiveAction,
        },
        {
          label: "Freshness",
          note: read.dataFreshnessSummary.note,
          value: read.dataFreshnessSummary.label,
        },
      ],
      title: "Recommended action",
    },
  ];
}

function buildLeakRows(
  leaks: ExecutiveRevenueLeakSummaryLeak[],
  emptyValue: string,
) {
  if (leaks.length === 0) {
    return [
      {
        label: "No active signal",
        value: emptyValue,
      },
    ];
  }

  return leaks.map((leak) => ({
    label: leak.label,
    note: `${leak.severityLabel} / ${leak.confidenceLabel}. ${leak.evidenceSummary.summary}`,
    value: leak.estimatedValueLabel,
  }));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
