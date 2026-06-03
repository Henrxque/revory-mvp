import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakType,
} from "@prisma/client";

import { isFinancialRevenueLeak } from "@/services/revenue-leaks/revenue-leak-guards";
import { assertNeverRevenueLeakType } from "@/services/revenue-leaks/revenue-leak-types";

export function calculateLeakSeverity(input: {
  confidence?: RevenueLeakConfidence;
  estimatedValueCents?: number | null;
  leakType: RevenueLeakType;
}): RevenueLeakSeverity {
  switch (input.leakType) {
    case "NO_SHOW_REVENUE":
    case "CANCELED_NOT_RECOVERED":
      break;
    case "MISSING_CONTACT":
    case "BOOKING_PATH_BLOCKED":
      return "MEDIUM";
    case "STALE_BOOKED_PROOF":
      return "LOW";
    default:
      return assertNeverRevenueLeakType(input.leakType);
  }

  if (!isFinancialRevenueLeak(input.leakType)) {
    return "LOW";
  }

  const valueCents = input.estimatedValueCents;

  if (
    typeof valueCents !== "number" ||
    !Number.isFinite(valueCents) ||
    valueCents <= 0
  ) {
    return "MEDIUM";
  }

  if (valueCents >= 200_000 && input.confidence === "HIGH") {
    return "CRITICAL";
  }

  if (valueCents >= 50_000) {
    return "HIGH";
  }

  if (valueCents >= 15_000) {
    return "MEDIUM";
  }

  return "LOW";
}
