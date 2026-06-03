import type { RevenueLeakType } from "@prisma/client";

import { canContributeToEstimatedRevenueAtRisk } from "@/services/revenue-leaks/revenue-leak-guards";

export type RevenueLeakValueBasis =
  | "APPOINTMENT_ESTIMATED_REVENUE"
  | "AVERAGE_DEAL_VALUE"
  | "NO_FINANCIAL_VALUE";

export type RevenueLeakValueEstimate = {
  basis: RevenueLeakValueBasis;
  estimatedValueCents: number | null;
};

export type RevenueLeakMoneyInput =
  | { toString(): string }
  | null
  | number
  | string
  | undefined;

export function decimalMoneyToCents(value: RevenueLeakMoneyInput) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue =
    typeof value === "number" ? value : Number(value.toString());

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  const cents = Math.round(numericValue * 100);

  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

export function estimateLeakValueCents(input: {
  appointmentEstimatedRevenue?: RevenueLeakMoneyInput;
  averageDealValue?: RevenueLeakMoneyInput;
  leakType: RevenueLeakType;
}): RevenueLeakValueEstimate {
  if (!canContributeToEstimatedRevenueAtRisk(input.leakType)) {
    return {
      basis: "NO_FINANCIAL_VALUE",
      estimatedValueCents: null,
    };
  }

  const appointmentValueCents = decimalMoneyToCents(
    input.appointmentEstimatedRevenue,
  );

  if (appointmentValueCents !== null) {
    return {
      basis: "APPOINTMENT_ESTIMATED_REVENUE",
      estimatedValueCents: appointmentValueCents,
    };
  }

  const averageDealValueCents = decimalMoneyToCents(input.averageDealValue);

  if (averageDealValueCents !== null) {
    return {
      basis: "AVERAGE_DEAL_VALUE",
      estimatedValueCents: averageDealValueCents,
    };
  }

  return {
    basis: "NO_FINANCIAL_VALUE",
    estimatedValueCents: null,
  };
}
