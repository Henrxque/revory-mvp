import {
  buildBlockedOperationalState,
  buildNotEligibleOperationalState,
  buildOperationalCategoryReadiness,
  buildOperationalStateSummary,
  buildPreparedOperationalState,
  buildReadyOperationalState,
} from "@/services/operations/build-operational-state";

const classifiedOnly = buildNotEligibleOperationalState();
const eligibleButBlocked = buildBlockedOperationalState(["missing_patient_email"]);
const notReadyDueToMissingData = buildBlockedOperationalState(["insufficient_data"]);
const readyForOutreach = buildReadyOperationalState();
const alreadyPrepared = buildPreparedOperationalState();

const confirmationSummary = buildOperationalStateSummary({
  classifiedItemsCount: 2,
  states: [eligibleButBlocked, alreadyPrepared],
  totalBaselineCount: 2,
});

const reminderSummary = buildOperationalStateSummary({
  classifiedItemsCount: 2,
  states: [readyForOutreach, alreadyPrepared],
  totalBaselineCount: 2,
});

const recoverySummary = buildOperationalStateSummary({
  classifiedItemsCount: 1,
  states: [notReadyDueToMissingData],
  totalBaselineCount: 1,
});

const reviewSummary = buildOperationalStateSummary({
  classifiedItemsCount: 1,
  states: [classifiedOnly],
  totalBaselineCount: 2,
});

const confirmationReadiness = buildOperationalCategoryReadiness({
  category: "confirmation",
  reasonCodes: ["missing_patient_email"],
  stateSummary: confirmationSummary,
});

const reminderReadiness = buildOperationalCategoryReadiness({
  category: "reminder",
  stateSummary: reminderSummary,
});

const recoveryReadiness = buildOperationalCategoryReadiness({
  category: "recovery",
  reasonCodes: ["insufficient_data"],
  stateSummary: recoverySummary,
});

const reviewReadiness = buildOperationalCategoryReadiness({
  category: "review_request",
  reasonCodes: ["not_eligible"],
  stateSummary: reviewSummary,
});

console.log(
  JSON.stringify(
    {
      cases: {
        already_prepared: {
          actionState: alreadyPrepared.actionState,
          primaryState: alreadyPrepared.primaryState,
          readinessState: alreadyPrepared.readinessState,
          stage: alreadyPrepared.stage,
        },
        classified_not_eligible: {
          actionState: classifiedOnly.actionState,
          eligibilityState: classifiedOnly.eligibilityState,
          primaryState: classifiedOnly.primaryState,
          readinessState: classifiedOnly.readinessState,
          reasonCodes: classifiedOnly.reasonCodes,
          stage: classifiedOnly.stage,
        },
        eligible_but_blocked: {
          actionState: eligibleButBlocked.actionState,
          eligibilityState: eligibleButBlocked.eligibilityState,
          primaryState: eligibleButBlocked.primaryState,
          readinessState: eligibleButBlocked.readinessState,
          reasonCodes: eligibleButBlocked.reasonCodes,
          stage: eligibleButBlocked.stage,
        },
        missing_data_blocked: {
          actionState: notReadyDueToMissingData.actionState,
          primaryState: notReadyDueToMissingData.primaryState,
          reasonCodes: notReadyDueToMissingData.reasonCodes,
          stage: notReadyDueToMissingData.stage,
        },
        ready_for_outreach: {
          actionState: readyForOutreach.actionState,
          primaryState: readyForOutreach.primaryState,
          readinessState: readyForOutreach.readinessState,
          stage: readyForOutreach.stage,
        },
      },
      categoryReadiness: {
        confirmation: confirmationReadiness,
        recovery: recoveryReadiness,
        reminder: reminderReadiness,
        review_request: reviewReadiness,
      },
      summaries: {
        confirmation: confirmationSummary,
        recovery: recoverySummary,
        reminder: reminderSummary,
        review_request: reviewSummary,
      },
    },
    null,
    2,
  ),
);
