export type RevoryLeadSuggestedMessageStatus =
  | "BLOCKED"
  | "BOOKED"
  | "CLOSED"
  | "OPEN"
  | "READY";

export type RevoryLeadSuggestedMessageBlockedReason =
  | "ineligible_for_handoff"
  | "missing_booking_path"
  | "missing_contact"
  | "missing_main_offer"
  | null;

export type RevoryLeadSuggestedMessageBookingPath = "EMAIL" | "SMS" | null;

export type RevoryLeadSuggestedMessageEligibilityReason =
  | "blocked_by_booking_path"
  | "blocked_by_contact"
  | "blocked_by_handoff_fit"
  | "blocked_by_main_offer"
  | "closed"
  | "not_ready"
  | "ready"
  | "resolved_as_booked";

export type RevoryLeadSuggestedMessageInput = {
  blockedReason: RevoryLeadSuggestedMessageBlockedReason;
  bookingPath: RevoryLeadSuggestedMessageBookingPath;
  clientFirstName: string | null;
  clientName: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  intakeLabel: string | null;
  mainOfferLabel: string;
  sellerVoiceLabel: string;
  status: RevoryLeadSuggestedMessageStatus;
  workspaceName: string;
};

export type RevoryLeadSuggestedMessage = {
  message: string;
  source: "fallback" | "llm";
};

export type RevoryLeadSuggestedMessageResult = {
  bookingPath: Exclude<RevoryLeadSuggestedMessageBookingPath, null> | null;
  eligibilityReason: RevoryLeadSuggestedMessageEligibilityReason;
  surfaceLabel: string | null;
  suggestedMessage: RevoryLeadSuggestedMessage | null;
};
