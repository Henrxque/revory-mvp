export const revoryIntentCodes = [
  "LOCK_MAIN_OFFER",
  "CHOOSE_LEAD_ENTRY",
  "LOCK_BOOKING_PATH",
  "SET_VALUE_PER_BOOKING",
  "COMPLETE_ACTIVATION",
  "START_BOOKED_PROOF",
  "REVIEW_BOOKED_PROOF",
  "OPEN_REVENUE_VIEW",
  "REFRESH_BOOKED_PROOF",
  "ADD_LEAD_BASE_SUPPORT",
] as const;

export const revoryObjectionCodes = [
  "NO_ACTIVE_BLOCKER",
  "MULTI_OFFER_RISK",
  "LEAD_ENTRY_MISSING",
  "BOOKING_PATH_MISSING",
  "VALUE_PER_BOOKING_MISSING",
  "PROOF_NOT_VISIBLE",
  "PROOF_SOURCE_NEEDS_REVIEW",
  "LEAD_BASE_ONLY",
  "SUPPORT_SHOULD_STAY_SECONDARY",
  "THIN_BOOKING_CALENDAR",
] as const;

export const revoryConfidenceBands = ["low", "medium", "high"] as const;

export type RevoryIntentCode = (typeof revoryIntentCodes)[number];
export type RevoryObjectionCode = (typeof revoryObjectionCodes)[number];
export type RevoryConfidenceBand = (typeof revoryConfidenceBands)[number];

export type RevoryIntentClassification = {
  confidenceBand: RevoryConfidenceBand;
  intent: RevoryIntentCode;
  objection: RevoryObjectionCode;
  rationale: string;
};
