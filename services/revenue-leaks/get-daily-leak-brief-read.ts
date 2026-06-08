import "server-only";

import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
} from "@prisma/client";

import {
  getRevenueLeakListForWorkspace,
  type RevenueLeakListItem,
} from "@/services/revenue-leaks/get-revenue-leak-list";
import { getRevenueLeakReadForWorkspace } from "@/services/revenue-leaks/get-revenue-leak-read";

export type DailyLeakBriefState =
  | "DATA_STALE"
  | "EMPTY"
  | "HAS_FINANCIAL_LEAK"
  | "OPERATIONAL_ONLY"
  | "THIN_DATA";

export type DailyLeakBriefTone = "accent" | "future" | "neutral" | "real";

export type DailyLeakBriefSignal = {
  label: string;
  note: string;
  tone: DailyLeakBriefTone;
  value: string;
};

export type DailyLeakBriefPrimaryLeak = {
  categoryLabel: string;
  confidence: RevenueLeakConfidence;
  confidenceLabel: string;
  detailHref: string;
  evidenceSummary: string;
  estimatedValueCents: number | null;
  estimatedValueLabel: string;
  id: string;
  label: string;
  note: string;
  recommendedAction: string;
  severity: RevenueLeakSeverity;
  severityLabel: string;
};

export type DailyLeakBriefRead = {
  confidenceSeverityLabel: string;
  detailHref: string;
  estimatedValueCents: number | null;
  estimatedValueLabel: string | null;
  freshness: {
    label: string;
    note: string;
    tone: DailyLeakBriefTone;
  };
  headline: string;
  honestyNote: string;
  primaryLeak: DailyLeakBriefPrimaryLeak | null;
  primarySignal: DailyLeakBriefSignal;
  recommendedAction: string;
  signals: DailyLeakBriefSignal[];
  state: DailyLeakBriefState;
  stateLabel: string;
  summary: string;
  tone: DailyLeakBriefTone;
};

const DETAIL_HREF = "/app/revenue-leaks";

export async function getDailyLeakBriefRead(
  workspaceId: string,
): Promise<DailyLeakBriefRead> {
  const [dashboardRead, listRead] = await Promise.all([
    getRevenueLeakReadForWorkspace(workspaceId),
    getRevenueLeakListForWorkspace({
      filter: "ALL_ACTIVE",
      limit: 5,
      workspaceId,
    }),
  ]);
  const primaryLeak = pickPrimaryLeak(listRead.items);
  const state = buildDailyLeakBriefState({
    activeLeakCount: dashboardRead.activeLeakCount,
    estimatedRevenueAtRiskCents: dashboardRead.estimatedRevenueAtRiskCents,
    hasDataStaleRisk: dashboardRead.dataFreshnessSummary.hasStaleDataRisk,
    hasFinancialLeaks: dashboardRead.activeFinancialLeakCount > 0,
    hasOperationalRisks: dashboardRead.activeOperationalRiskCount > 0,
  });
  const estimatedValueCents =
    state === "HAS_FINANCIAL_LEAK"
      ? dashboardRead.estimatedRevenueAtRiskCents
      : null;
  const estimatedValueLabel =
    estimatedValueCents !== null ? dashboardRead.estimatedRevenueAtRiskLabel : null;

  return {
    confidenceSeverityLabel: buildConfidenceSeverityLabel({
      confidence: dashboardRead.confidenceSummary.dominant,
      severity: dashboardRead.severitySummary.dominant,
    }),
    detailHref: DETAIL_HREF,
    estimatedValueCents,
    estimatedValueLabel,
    freshness: {
      label: dashboardRead.dataFreshnessSummary.label,
      note: dashboardRead.dataFreshnessSummary.note,
      tone: dashboardRead.dataFreshnessSummary.hasStaleDataRisk
        ? "future"
        : "real",
    },
    headline: buildHeadline(state),
    honestyNote:
      "Estimated revenue at risk is not confirmed accounting loss. Operational and data-quality risks are kept separate from financial value.",
    primaryLeak: primaryLeak ? mapPrimaryLeak(primaryLeak) : null,
    primarySignal: buildPrimarySignal({
      activeLeakCount: dashboardRead.activeLeakCount,
      activeOperationalRiskCount: dashboardRead.activeOperationalRiskCount,
      estimatedValueLabel,
      state,
    }),
    recommendedAction: primaryLeak?.recommendedAction ?? dashboardRead.recommendedAction,
    signals: buildSignals({
      activeDataQualityRiskCount: dashboardRead.activeDataQualityRiskCount,
      activeFinancialLeakCount: dashboardRead.activeFinancialLeakCount,
      activeLeakCount: dashboardRead.activeLeakCount,
      activeOperationalRiskCount: dashboardRead.activeOperationalRiskCount,
      confidenceSeverityLabel: buildConfidenceSeverityLabel({
        confidence: dashboardRead.confidenceSummary.dominant,
        severity: dashboardRead.severitySummary.dominant,
      }),
      hasStaleDataRisk: dashboardRead.dataFreshnessSummary.hasStaleDataRisk,
    }),
    state,
    stateLabel: getStateLabel(state),
    summary: buildSummary({
      activeLeakCount: dashboardRead.activeLeakCount,
      activeOperationalRiskCount: dashboardRead.activeOperationalRiskCount,
      state,
    }),
    tone: getStateTone(state),
  };
}

function buildDailyLeakBriefState(input: {
  activeLeakCount: number;
  estimatedRevenueAtRiskCents: number | null;
  hasDataStaleRisk: boolean;
  hasFinancialLeaks: boolean;
  hasOperationalRisks: boolean;
}): DailyLeakBriefState {
  if (input.activeLeakCount === 0) {
    return "EMPTY";
  }

  if (
    input.estimatedRevenueAtRiskCents !== null &&
    input.estimatedRevenueAtRiskCents > 0
  ) {
    return "HAS_FINANCIAL_LEAK";
  }

  if (input.hasFinancialLeaks) {
    return "THIN_DATA";
  }

  if (input.hasDataStaleRisk) {
    return "DATA_STALE";
  }

  if (input.hasOperationalRisks) {
    return "OPERATIONAL_ONLY";
  }

  return "OPERATIONAL_ONLY";
}

function pickPrimaryLeak(items: RevenueLeakListItem[]) {
  const financialWithValue = items.find(
    (item) =>
      item.category === "FINANCIAL_LEAK" &&
      item.estimatedValueIsCounted &&
      item.estimatedValueCents !== null,
  );

  if (financialWithValue) {
    return financialWithValue;
  }

  const financialWithoutValue = items.find(
    (item) => item.category === "FINANCIAL_LEAK",
  );

  if (financialWithoutValue) {
    return financialWithoutValue;
  }

  const staleData = items.find((item) => item.leakType === "STALE_BOOKED_PROOF");

  if (staleData) {
    return staleData;
  }

  return items.find((item) => item.category === "OPERATIONAL_RISK") ?? null;
}

function mapPrimaryLeak(item: RevenueLeakListItem): DailyLeakBriefPrimaryLeak {
  return {
    categoryLabel: item.categoryLabel,
    confidence: item.confidence,
    confidenceLabel: item.confidenceLabel,
    detailHref: DETAIL_HREF,
    evidenceSummary: item.evidenceSummary.summary,
    estimatedValueCents:
      item.category === "FINANCIAL_LEAK" ? item.estimatedValueCents : null,
    estimatedValueLabel:
      item.category === "FINANCIAL_LEAK"
        ? item.estimatedValueLabel
        : "Not counted as revenue at risk",
    id: item.id,
    label: item.typeLabel,
    note: item.reason,
    recommendedAction: item.recommendedAction,
    severity: item.severity,
    severityLabel: item.severityLabel,
  };
}

function buildPrimarySignal(input: {
  activeLeakCount: number;
  activeOperationalRiskCount: number;
  estimatedValueLabel: string | null;
  state: DailyLeakBriefState;
}): DailyLeakBriefSignal {
  switch (input.state) {
    case "HAS_FINANCIAL_LEAK":
      return {
        label: "Estimated value",
        note: "Financial leak evidence only; not confirmed accounting loss.",
        tone: "accent",
        value: input.estimatedValueLabel ?? "Value pending",
      };
    case "THIN_DATA":
      return {
        label: "Financial signals",
        note: "Value needs stronger appointment evidence before commercial use.",
        tone: "future",
        value: String(input.activeLeakCount),
      };
    case "DATA_STALE":
      return {
        label: "Data freshness",
        note: "Refresh appointment evidence before relying on the read.",
        tone: "future",
        value: "Stale",
      };
    case "OPERATIONAL_ONLY":
      return {
        label: "Operational risks",
        note: "May block revenue, but not counted as financial loss.",
        tone: "neutral",
        value: String(input.activeOperationalRiskCount),
      };
    case "EMPTY":
      return {
        label: "Active signals",
        note: "Run the leak read after importing clinic data.",
        tone: "real",
        value: "0",
      };
  }
}

function buildSignals(input: {
  activeDataQualityRiskCount: number;
  activeFinancialLeakCount: number;
  activeLeakCount: number;
  activeOperationalRiskCount: number;
  confidenceSeverityLabel: string;
  hasStaleDataRisk: boolean;
}): DailyLeakBriefSignal[] {
  return [
    {
      label: "Active signals",
      note: "Open or acknowledged persisted leak evidence.",
      tone: input.activeLeakCount > 0 ? "accent" : "real",
      value: String(input.activeLeakCount),
    },
    {
      label: "Financial / operational",
      note: "Operational risks stay separate from estimated value.",
      tone: input.activeFinancialLeakCount > 0 ? "accent" : "neutral",
      value: `${input.activeFinancialLeakCount} / ${input.activeOperationalRiskCount}`,
    },
    {
      label: "Confidence / severity",
      note: input.hasStaleDataRisk
        ? `${input.activeDataQualityRiskCount} data-quality risk visible.`
        : "Based on active persisted leak evidence.",
      tone: input.hasStaleDataRisk ? "future" : "neutral",
      value: input.confidenceSeverityLabel,
    },
  ];
}

function buildHeadline(state: DailyLeakBriefState) {
  switch (state) {
    case "HAS_FINANCIAL_LEAK":
      return "Start with the revenue risk already visible.";
    case "THIN_DATA":
      return "Start with leak evidence, but treat value as thin.";
    case "DATA_STALE":
      return "Start by refreshing stale appointment evidence.";
    case "OPERATIONAL_ONLY":
      return "Start with operational risks before assigning financial value.";
    case "EMPTY":
      return "Start by running the leak read after clinic data is uploaded.";
  }
}

function buildSummary(input: {
  activeLeakCount: number;
  activeOperationalRiskCount: number;
  state: DailyLeakBriefState;
}) {
  switch (input.state) {
    case "HAS_FINANCIAL_LEAK":
      return `${input.activeLeakCount} active signals are visible. REVORY only counts financial leak evidence toward estimated revenue at risk.`;
    case "THIN_DATA":
      return "Financial leak evidence exists, but the value read needs stronger appointment value or setup context before it should be used commercially.";
    case "DATA_STALE":
      return "The current read is limited by stale appointment evidence. Refresh clinic data before treating the brief as current.";
    case "OPERATIONAL_ONLY":
      return `${input.activeOperationalRiskCount} operational risks are visible. They may block revenue, but they are not counted as confirmed financial loss.`;
    case "EMPTY":
      return "No active persisted leak signals are visible yet. REVORY needs imported clinic data and a fresh leak read.";
  }
}

function getStateLabel(state: DailyLeakBriefState) {
  switch (state) {
    case "HAS_FINANCIAL_LEAK":
      return "Risk visible";
    case "THIN_DATA":
      return "Thin value";
    case "DATA_STALE":
      return "Data stale";
    case "OPERATIONAL_ONLY":
      return "Operational";
    case "EMPTY":
      return "No active signals";
  }
}

function getStateTone(state: DailyLeakBriefState): DailyLeakBriefTone {
  switch (state) {
    case "HAS_FINANCIAL_LEAK":
      return "accent";
    case "THIN_DATA":
    case "DATA_STALE":
      return "future";
    case "OPERATIONAL_ONLY":
      return "neutral";
    case "EMPTY":
      return "real";
  }
}

function buildConfidenceSeverityLabel(input: {
  confidence: RevenueLeakConfidence | null;
  severity: RevenueLeakSeverity | null;
}) {
  return `${input.confidence ?? "Pending"} / ${input.severity ?? "Pending"}`;
}
