import type { RevenueLeakType } from "@prisma/client";

import { assertNeverRevenueLeakType } from "@/services/revenue-leaks/revenue-leak-types";

export type RevenueLeakTypeLabel = {
  label: string;
  shortLabel: string;
  description: string;
};

export function getRevenueLeakTypeLabel(
  leakType: RevenueLeakType,
): RevenueLeakTypeLabel {
  switch (leakType) {
    case "NO_SHOW_REVENUE":
      return {
        description:
          "Appointment revenue appears at risk because the appointment is marked as a no-show.",
        label: "No-show revenue risk",
        shortLabel: "No-show risk",
      };
    case "CANCELED_NOT_RECOVERED":
      return {
        description:
          "Canceled appointment value appears unrecovered in the imported appointment evidence.",
        label: "Unrecovered cancellation risk",
        shortLabel: "Cancellation risk",
      };
    case "STALE_BOOKED_PROOF":
      return {
        description:
          "The revenue read may be outdated because appointment evidence has not been refreshed recently.",
        label: "Stale appointment evidence",
        shortLabel: "Stale evidence",
      };
    case "MISSING_CONTACT":
      return {
        description:
          "A booking opportunity is blocked because usable contact evidence is missing.",
        label: "Missing contact risk",
        shortLabel: "Missing contact",
      };
    case "BOOKING_PATH_BLOCKED":
      return {
        description:
          "A booking opportunity is blocked because the current booking path is incomplete.",
        label: "Blocked booking path risk",
        shortLabel: "Blocked path",
      };
    default:
      return assertNeverRevenueLeakType(leakType);
  }
}
