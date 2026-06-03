import type { RevenueLeakType } from "@prisma/client";

import { assertNeverRevenueLeakType } from "@/services/revenue-leaks/revenue-leak-types";

export function buildRevenueLeakFingerprint(input: {
  appointmentId?: string | null;
  dataSourceId?: string | null;
  leakType: RevenueLeakType;
  leadBookingOpportunityId?: string | null;
  workspaceId: string;
}) {
  const workspaceId = input.workspaceId.trim();

  if (!workspaceId) {
    return null;
  }

  switch (input.leakType) {
    case "NO_SHOW_REVENUE":
      return buildScopedFingerprint(
        "no_show_revenue",
        workspaceId,
        input.appointmentId,
      );
    case "CANCELED_NOT_RECOVERED":
      return buildScopedFingerprint(
        "canceled_not_recovered",
        workspaceId,
        input.appointmentId,
      );
    case "MISSING_CONTACT":
      return buildScopedFingerprint(
        "missing_contact",
        workspaceId,
        input.leadBookingOpportunityId,
      );
    case "BOOKING_PATH_BLOCKED":
      return buildScopedFingerprint(
        "booking_path_blocked",
        workspaceId,
        input.leadBookingOpportunityId,
      );
    case "STALE_BOOKED_PROOF":
      return buildScopedFingerprint(
        "stale_booked_proof",
        workspaceId,
        input.dataSourceId,
      );
    default:
      return assertNeverRevenueLeakType(input.leakType);
  }
}

function buildScopedFingerprint(
  prefix: string,
  workspaceId: string,
  scopedId: string | null | undefined,
) {
  const normalizedScopedId = scopedId?.trim();

  if (!normalizedScopedId) {
    return null;
  }

  return `${prefix}:${workspaceId}:${normalizedScopedId}`;
}
