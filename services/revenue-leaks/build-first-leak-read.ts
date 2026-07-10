import type {
  RevenueLeakRead,
  RevenueLeakReadItem,
} from "@/services/revenue-leaks/get-revenue-leak-read";
import type {
  RevoryFirstLeakRead,
  RevoryFirstLeakReadState,
} from "@/types/imports";

export function buildFirstLeakRead(read: RevenueLeakRead): RevoryFirstLeakRead {
  const state = resolveFirstLeakReadState(read);
  const topLeak = resolveTopLeak(read, state);

  return {
    activeDataQualityRiskCount: read.activeDataQualityRiskCount,
    activeFinancialLeakCount: read.activeFinancialLeakCount,
    activeOperationalRiskCount: read.activeOperationalRiskCount,
    ctaHref: getCtaHref(state),
    ctaLabel: getCtaLabel(state),
    estimatedRevenueAtRiskLabel: read.estimatedRevenueAtRiskLabel,
    limitation: getLimitation(state),
    state,
    summary: getSummary(state, topLeak),
    topLeak: topLeak
      ? {
          category: topLeak.category,
          confidence: topLeak.confidence,
          estimatedValueLabel: topLeak.estimatedValueLabel,
          evidence: topLeak.reason,
          label: topLeak.label,
          recommendedAction: topLeak.recommendedAction,
          severity: topLeak.severity,
        }
      : null,
  };
}

function resolveFirstLeakReadState(
  read: RevenueLeakRead,
): RevoryFirstLeakReadState {
  switch (read.state) {
    case "HAS_REVENUE_AT_RISK":
      return "HAS_REVENUE_AT_RISK";
    case "THIN_DATA":
      return "THIN_DATA";
    case "DATA_STALE":
      return "DATA_STALE";
    case "NO_FINANCIAL_LEAKS":
      return read.activeOperationalRiskCount > 0 ? "OPERATIONAL_ONLY" : "EMPTY";
    case "EMPTY":
      return "EMPTY";
  }
}

function resolveTopLeak(
  read: RevenueLeakRead,
  state: RevoryFirstLeakReadState,
) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
    case "THIN_DATA":
      return read.topFinancialLeak ?? read.topLeak;
    case "DATA_STALE":
      return read.topDataQualityRisk ?? read.topLeak;
    case "OPERATIONAL_ONLY":
      return read.topOperationalRisk ?? read.topLeak;
    case "EMPTY":
      return null;
  }
}

function getSummary(
  state: RevoryFirstLeakReadState,
  topLeak: RevenueLeakReadItem | null,
) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return topLeak
        ? `${topLeak.label} is the highest-priority financial leak in the current read.`
        : "REVORY found estimated revenue at risk in the current appointment evidence.";
    case "THIN_DATA":
      return "REVORY found a financial leak, but the current data does not support a reliable value yet.";
    case "DATA_STALE":
      return "Appointment evidence is stale, so the current read should not be used as a current financial conclusion.";
    case "OPERATIONAL_ONLY":
      return topLeak
        ? `${topLeak.label} is the highest-priority operational risk in the current read.`
        : "REVORY found operational risks, but no financial leak supported by the current data.";
    case "EMPTY":
      return "No active leak is visible from the imported evidence yet.";
  }
}

function getLimitation(state: RevoryFirstLeakReadState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "This is an estimate from visible appointment evidence. It does not prove permanent revenue loss or automatic recovery.";
    case "THIN_DATA":
      return "The current data cannot support a reliable dollar estimate. Add appointment revenue or a configured average deal value to strengthen the read.";
    case "DATA_STALE":
      return "The current data cannot support a current revenue-risk conclusion until fresh appointment evidence is uploaded.";
    case "OPERATIONAL_ONLY":
      return "Operational risks can block revenue, but the current data does not prove a financial loss.";
    case "EMPTY":
      return "An empty read does not prove that the clinic has no revenue leaks; it only reflects the evidence currently available.";
  }
}

function getCtaLabel(state: RevoryFirstLeakReadState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
    case "OPERATIONAL_ONLY":
      return "View revenue leaks" as const;
    case "THIN_DATA":
    case "DATA_STALE":
    case "EMPTY":
      return "Improve data quality" as const;
  }
}

function getCtaHref(state: RevoryFirstLeakReadState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
    case "OPERATIONAL_ONLY":
      return "/app/revenue-leaks";
    case "THIN_DATA":
    case "DATA_STALE":
    case "EMPTY":
      return "/app/imports#booking-inputs-flow";
  }
}
