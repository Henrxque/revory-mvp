import type { RevenueLeakConfidence, RevenueLeakType } from "@prisma/client";

import type { RevenueLeakValueBasis } from "@/services/revenue-leaks/leak-estimation";
import { assertNeverRevenueLeakType } from "@/services/revenue-leaks/revenue-leak-types";

export function calculateLeakConfidence(input: {
  hasLiveSource?: boolean;
  hasRequiredEvidence?: boolean;
  leakType: RevenueLeakType;
  replacementBookingEvidenceFound?: boolean;
  staleAgeDays?: number | null;
  valueBasis?: RevenueLeakValueBasis;
}): RevenueLeakConfidence {
  if (input.hasRequiredEvidence === false) {
    return "LOW";
  }

  switch (input.leakType) {
    case "NO_SHOW_REVENUE":
      if (input.valueBasis === "APPOINTMENT_ESTIMATED_REVENUE") {
        return "HIGH";
      }

      if (input.valueBasis === "AVERAGE_DEAL_VALUE") {
        return "MEDIUM";
      }

      return "LOW";
    case "CANCELED_NOT_RECOVERED":
      if (input.replacementBookingEvidenceFound) {
        return "LOW";
      }

      if (input.valueBasis === "APPOINTMENT_ESTIMATED_REVENUE") {
        return "HIGH";
      }

      if (input.valueBasis === "AVERAGE_DEAL_VALUE") {
        return "MEDIUM";
      }

      return "LOW";
    case "MISSING_CONTACT":
    case "BOOKING_PATH_BLOCKED":
      return "HIGH";
    case "STALE_BOOKED_PROOF":
      if (input.hasLiveSource === false) {
        return "LOW";
      }

      if (typeof input.staleAgeDays === "number" && input.staleAgeDays >= 7) {
        return "HIGH";
      }

      return "MEDIUM";
    default:
      return assertNeverRevenueLeakType(input.leakType);
  }
}
