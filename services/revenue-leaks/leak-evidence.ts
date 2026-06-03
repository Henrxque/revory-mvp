import type { RevenueLeakEvidence } from "@/types/revenue-leak";
import type { RevenueLeakValueBasis } from "@/services/revenue-leaks/leak-estimation";

export function buildRevenueLeakEvidence(input: {
  confidenceReason?: string;
  signals: string[];
  sourceRecordIds?: string[];
  summary: string;
  value?: RevenueLeakEvidence["value"];
}): RevenueLeakEvidence {
  return {
    ...(input.confidenceReason
      ? { confidenceReason: input.confidenceReason }
      : {}),
    ...(input.sourceRecordIds ? { sourceRecordIds: input.sourceRecordIds } : {}),
    signals: input.signals,
    summary: input.summary,
    ...(input.value === undefined ? {} : { value: input.value }),
  };
}

export function formatRevenueLeakValueBasis(valueBasis: RevenueLeakValueBasis) {
  switch (valueBasis) {
    case "APPOINTMENT_ESTIMATED_REVENUE":
      return "appointment_estimated_revenue";
    case "AVERAGE_DEAL_VALUE":
      return "average_deal_value";
    case "NO_FINANCIAL_VALUE":
      return "no_financial_value";
  }
}
