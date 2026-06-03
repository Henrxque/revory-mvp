import type { RevenueLeakType } from "@prisma/client";

import type { RevenueLeakCategory } from "@/types/revenue-leak";
import { assertNeverRevenueLeakType } from "@/services/revenue-leaks/revenue-leak-types";

export function getRevenueLeakCategory(
  leakType: RevenueLeakType,
): RevenueLeakCategory {
  switch (leakType) {
    case "NO_SHOW_REVENUE":
    case "CANCELED_NOT_RECOVERED":
      return "FINANCIAL_LEAK";
    case "MISSING_CONTACT":
    case "BOOKING_PATH_BLOCKED":
      return "OPERATIONAL_RISK";
    case "STALE_BOOKED_PROOF":
      return "DATA_QUALITY_RISK";
    default:
      return assertNeverRevenueLeakType(leakType);
  }
}
