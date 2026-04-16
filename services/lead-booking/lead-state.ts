import "server-only";

import { LeadBookingOpportunityStatus } from "@prisma/client";

export type LeadTrackingState = "BOOKED" | "CLOSED" | "HANDOFF_OPENED" | "NEW";

export function deriveLeadTrackingState(input: {
  handoffOpenedAt: Date | null;
  status: LeadBookingOpportunityStatus;
}): LeadTrackingState {
  if (input.status === LeadBookingOpportunityStatus.CLOSED) {
    return "CLOSED";
  }

  if (input.status === LeadBookingOpportunityStatus.BOOKED) {
    return "BOOKED";
  }

  if (input.handoffOpenedAt) {
    return "HANDOFF_OPENED";
  }

  return "NEW";
}

export function formatLeadTrackingState(value: LeadTrackingState) {
  switch (value) {
    case "HANDOFF_OPENED":
      return "Handoff opened";
    case "BOOKED":
      return "Booked";
    case "CLOSED":
      return "Closed";
    default:
      return "New";
  }
}
