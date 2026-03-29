import type {
  RevoryOperationalActionState,
  RevoryOperationalCategory,
  RevoryOperationalCategoryReadiness,
  RevoryOperationalEligibilityState,
  RevoryOperationalReasonCode,
  RevoryOperationalStage,
  RevoryOperationalState,
  RevoryOperationalStateSummary,
} from "@/types/operational-state";

type BuildOperationalStateSummaryInput = {
  classifiedItemsCount: number;
  states: RevoryOperationalState[];
  totalBaselineCount?: number;
};

type BuildOperationalCategoryReadinessInput = {
  category: RevoryOperationalCategory;
  reasonCodes?: RevoryOperationalReasonCode[];
  stateSummary: RevoryOperationalStateSummary;
};

function resolveOperationalStage(
  actionState: RevoryOperationalActionState,
  eligibilityState: RevoryOperationalEligibilityState,
): RevoryOperationalStage {
  if (actionState === "blocked") {
    return "blocked";
  }

  if (actionState === "prepared") {
    return "prepared";
  }

  if (actionState === "ready_for_action") {
    return "ready";
  }

  return eligibilityState === "eligible" ? "eligible" : "classified";
}

function resolveOperationalReasonCodes(
  reasonCodes: RevoryOperationalReasonCode[],
  eligibilityState: RevoryOperationalEligibilityState,
): RevoryOperationalReasonCode[] {
  if (eligibilityState === "not_eligible" && !reasonCodes.includes("not_eligible")) {
    return [...reasonCodes, "not_eligible"];
  }

  return reasonCodes;
}

function buildOperationalState(
  actionState: RevoryOperationalActionState,
  eligibilityState: RevoryOperationalEligibilityState,
  reasonCodes: RevoryOperationalReasonCode[] = [],
): RevoryOperationalState {
  const resolvedReasonCodes = resolveOperationalReasonCodes(reasonCodes, eligibilityState);
  const stage = resolveOperationalStage(actionState, eligibilityState);
  const readinessState =
    actionState === "blocked"
      ? "blocked"
      : actionState === "prepared"
        ? "prepared"
        : actionState === "ready_for_action"
          ? "ready"
          : "not_ready";
  const eventType =
    stage === "blocked"
      ? "execution_blocked"
      : stage === "prepared"
        ? "prepared_for_outreach"
        : stage === "ready"
          ? "ready_for_action"
          : stage === "eligible"
            ? "eligibility_confirmed"
            : "signal_detected";
  const primaryState =
    stage === "blocked"
      ? "blocked"
      : stage === "prepared"
        ? "prepared"
        : stage === "ready"
          ? "ready"
          : "not_eligible";

  return {
    actionState,
    blockedReasonCodes: resolvedReasonCodes,
    eligibilityState,
    eventType,
    isBlocked: readinessState === "blocked",
    isClassified: true,
    isEligible: eligibilityState === "eligible",
    isPrepared: readinessState === "prepared",
    isReadyForAction: readinessState === "ready",
    primaryState,
    readinessState,
    reasonCodes: resolvedReasonCodes,
    signalState: "classified",
    stage,
  };
}

function dedupeReasonCodes(reasonCodes: RevoryOperationalReasonCode[]) {
  return [...new Set(reasonCodes)];
}

export function buildBlockedOperationalState(
  reasonCodes: RevoryOperationalReasonCode[],
): RevoryOperationalState {
  return buildOperationalState("blocked", "eligible", reasonCodes);
}

export function buildNotEligibleOperationalState(
  reasonCode: RevoryOperationalReasonCode = "not_eligible",
): RevoryOperationalState {
  return buildOperationalState("not_applicable", "not_eligible", [reasonCode]);
}

export function buildPreparedOperationalState(
  reasonCodes: RevoryOperationalReasonCode[] = [],
): RevoryOperationalState {
  return buildOperationalState("prepared", "eligible", reasonCodes);
}

export function buildReadyOperationalState(
  reasonCodes: RevoryOperationalReasonCode[] = [],
): RevoryOperationalState {
  return buildOperationalState("ready_for_action", "eligible", reasonCodes);
}

export function buildOperationalStateSummary({
  classifiedItemsCount,
  states,
  totalBaselineCount,
}: BuildOperationalStateSummaryInput): RevoryOperationalStateSummary {
  const baselineCount = totalBaselineCount ?? classifiedItemsCount;
  const notEligibleCount = Math.max(baselineCount - classifiedItemsCount, 0);

  return {
    blockedCount: states.filter((state) => state.isBlocked).length,
    classifiedCount: classifiedItemsCount,
    eligibleCount: states.filter((state) => state.isEligible).length,
    notEligibleCount,
    preparedCount: states.filter((state) => state.isPrepared).length,
    readyForActionCount: states.filter((state) => state.isReadyForAction).length,
  };
}

export function buildOperationalCategoryReadiness({
  category,
  reasonCodes = [],
  stateSummary,
}: BuildOperationalCategoryReadinessInput): RevoryOperationalCategoryReadiness {
  const stage: RevoryOperationalStage =
    stateSummary.readyForActionCount > 0
      ? "ready"
      : stateSummary.blockedCount > 0
        ? "blocked"
        : stateSummary.preparedCount > 0
          ? "prepared"
          : stateSummary.eligibleCount > 0
            ? "eligible"
            : "classified";

  return {
    blockedCount: stateSummary.blockedCount,
    category,
    classifiedCount: stateSummary.classifiedCount,
    eligibleCount: stateSummary.eligibleCount,
    notEligibleCount: stateSummary.notEligibleCount,
    preparedCount: stateSummary.preparedCount,
    primaryReasonCodes: dedupeReasonCodes(reasonCodes),
    readyCount: stateSummary.readyForActionCount,
    stage,
  };
}

export function formatOperationalReasonLabel(reasonCode: RevoryOperationalReasonCode) {
  switch (reasonCode) {
    case "insufficient_data":
      return "Insufficient data";
    case "missing_patient_email":
      return "Missing patient email";
    case "missing_reviews_destination":
      return "Missing feedback destination";
    case "not_eligible":
      return "Not eligible";
    case "template_unavailable":
      return "Template unavailable";
  }
}

export function isEligibleButBlocked(state: RevoryOperationalState) {
  return state.eligibilityState === "eligible" && state.readinessState === "blocked";
}

export function isPreparedForOutreach(state: RevoryOperationalState) {
  return state.eligibilityState === "eligible" && state.readinessState === "prepared";
}

export function isReadyForOutreach(state: RevoryOperationalState) {
  return state.eligibilityState === "eligible" && state.readinessState === "ready";
}
