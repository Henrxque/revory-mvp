export type RevoryOperationalCategory =
  | "confirmation"
  | "reminder"
  | "recovery"
  | "review_request";

export type RevoryOperationalSignalState = "classified";

export type RevoryOperationalEligibilityState = "eligible" | "not_eligible";

export type RevoryOperationalActionState =
  | "blocked"
  | "not_applicable"
  | "prepared"
  | "ready_for_action";

export type RevoryOperationalReadinessState =
  | "blocked"
  | "not_ready"
  | "prepared"
  | "ready";

export type RevoryOperationalStage =
  | "blocked"
  | "classified"
  | "eligible"
  | "prepared"
  | "ready";

export type RevoryOperationalEventType =
  | "eligibility_confirmed"
  | "execution_blocked"
  | "prepared_for_outreach"
  | "ready_for_action"
  | "signal_detected";

export type RevoryOperationalReasonCode =
  | "insufficient_data"
  | "missing_patient_email"
  | "missing_reviews_destination"
  | "not_eligible"
  | "template_unavailable";

export type RevoryOperationalState = {
  actionState: RevoryOperationalActionState;
  blockedReasonCodes: RevoryOperationalReasonCode[];
  eventType: RevoryOperationalEventType;
  isBlocked: boolean;
  isClassified: true;
  isEligible: boolean;
  isPrepared: boolean;
  isReadyForAction: boolean;
  primaryState: "blocked" | "not_eligible" | "prepared" | "ready";
  readinessState: RevoryOperationalReadinessState;
  reasonCodes: RevoryOperationalReasonCode[];
  signalState: RevoryOperationalSignalState;
  stage: RevoryOperationalStage;
  eligibilityState: RevoryOperationalEligibilityState;
};

export type RevoryOperationalStateSummary = {
  blockedCount: number;
  classifiedCount: number;
  eligibleCount: number;
  notEligibleCount: number;
  preparedCount: number;
  readyForActionCount: number;
};

export type RevoryOperationalCategoryReadiness = {
  blockedCount: number;
  category: RevoryOperationalCategory;
  classifiedCount: number;
  eligibleCount: number;
  notEligibleCount: number;
  preparedCount: number;
  primaryReasonCodes: RevoryOperationalReasonCode[];
  readyCount: number;
  stage: RevoryOperationalStage;
};
