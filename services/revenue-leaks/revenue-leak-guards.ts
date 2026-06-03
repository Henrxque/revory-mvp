import type { RevenueLeakType } from "@prisma/client";

import { getRevenueLeakCategory } from "@/services/revenue-leaks/revenue-leak-category";

export function isFinancialRevenueLeak(leakType: RevenueLeakType) {
  return getRevenueLeakCategory(leakType) === "FINANCIAL_LEAK";
}

export function canContributeToEstimatedRevenueAtRisk(
  leakType: RevenueLeakType,
) {
  return isFinancialRevenueLeak(leakType);
}
