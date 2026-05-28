import type { OnboardingStepKey } from "@/services/onboarding/wizard-steps";
import type { RevoryDecisionSupportRead } from "@/types/decision-support";
import type { RevoryIntentClassification } from "@/types/intent-classification";

function shouldApplyClassification(
  classification: RevoryIntentClassification | null,
): classification is RevoryIntentClassification {
  return classification !== null && classification.confidenceBand !== "low";
}

export function applyActivationIntentClassification(
  read: RevoryDecisionSupportRead,
  stepKey: OnboardingStepKey,
  classification: RevoryIntentClassification | null,
): RevoryDecisionSupportRead {
  if (!shouldApplyClassification(classification)) {
    return read;
  }

  const nextBestAction = (() => {
    switch (classification.intent) {
      case "LOCK_MAIN_OFFER":
        return "Keep one main offer locked before expanding anything else.";
      case "CHOOSE_LEAD_ENTRY":
        return "Choose one data entry path now so appointment evidence can stay short and clear.";
      case "LOCK_BOOKING_PATH":
        return "Lock one booking path so REVORY can identify blocked booking risk with less ambiguity.";
      case "SET_VALUE_PER_BOOKING":
        return "Set one estimated value so revenue at risk can read cleanly once evidence is visible.";
      case "COMPLETE_ACTIVATION":
        return "Finish activation, then move straight into appointment evidence.";
      case "START_BOOKED_PROOF":
        return "Activate REVORY, then add appointment evidence before leaning on the leak read.";
      default:
        return read.nextBestAction;
    }
  })();

  const detectedObjection = (() => {
    switch (classification.objection) {
      case "MULTI_OFFER_RISK":
        return "More than one offer story would blur which risks matter first.";
      case "LEAD_ENTRY_MISSING":
        return "REVORY still needs one clear data entry path before evidence can read cleanly.";
      case "BOOKING_PATH_MISSING":
        return "The booking path is still too open to read blocked risk cleanly.";
      case "VALUE_PER_BOOKING_MISSING":
        return "Revenue at risk still lacks one clear estimated value anchor.";
      case "PROOF_NOT_VISIBLE":
        return "Activation is ready, but appointment evidence still needs to become visible next.";
      default:
        return read.detectedObjection;
    }
  })();

  const recommendedPath = (() => {
    switch (stepKey) {
      case "template":
        return "One main offer -> data entry -> one booking path";
      case "source":
        return "Choose data entry -> appointment evidence -> leak read";
      case "channel":
        return "Clinic data -> one booking path -> blocked risk read";
      case "deal_value":
        return "Configured estimated value -> appointment evidence -> leak read";
      case "activation":
        return classification.intent === "START_BOOKED_PROOF"
          ? "Activation complete -> appointment evidence -> leak read"
          : read.recommendedPath;
      default:
        return read.recommendedPath;
    }
  })();

  return {
    ...read,
    detectedObjection,
    nextBestAction,
    recommendedPath,
  };
}

export function applyDashboardIntentClassification(
  read: RevoryDecisionSupportRead,
  classification: RevoryIntentClassification | null,
): RevoryDecisionSupportRead {
  if (!shouldApplyClassification(classification)) {
    return read;
  }

  const nextBestAction = (() => {
    switch (classification.intent) {
      case "START_BOOKED_PROOF":
        return "Open Source Inputs and add appointments before asking the revenue risk read to carry the story.";
      case "REVIEW_BOOKED_PROOF":
        return "Review appointment evidence first so revenue risk and visible outcomes stay aligned.";
      case "REFRESH_BOOKED_PROOF":
        return "Refresh appointment evidence so the revenue risk read stays current and credible.";
      case "ADD_LEAD_BASE_SUPPORT":
        return "Add client context only as support after appointment evidence is already visible.";
      case "OPEN_REVENUE_VIEW":
        return "Keep the revenue risk read short and supported by the appointment evidence already in view.";
      default:
        return read.nextBestAction;
    }
  })();

  const detectedObjection = (() => {
    switch (classification.objection) {
      case "PROOF_NOT_VISIBLE":
        return "Revenue risk still feels premature because appointment evidence is not visible yet.";
      case "PROOF_SOURCE_NEEDS_REVIEW":
        return "The appointment source is present, but the outcome layer still needs review.";
      case "LEAD_BASE_ONLY":
        return "Client context alone cannot carry the revenue risk read.";
      case "THIN_BOOKING_CALENDAR":
        return "The revenue read is visible, but the upcoming booking layer is still thin.";
      case "SUPPORT_SHOULD_STAY_SECONDARY":
        return "Client context should stay behind appointment evidence, not in front of it.";
      default:
        return read.detectedObjection;
    }
  })();

  const recommendedPath = (() => {
    switch (classification.intent) {
      case "START_BOOKED_PROOF":
        return "Source Inputs -> appointment evidence -> revenue risk read";
      case "REVIEW_BOOKED_PROOF":
        return "Review appointment evidence -> clean evidence -> revenue risk read";
      case "REFRESH_BOOKED_PROOF":
        return "Refresh appointment evidence -> keep revenue risk aligned";
      case "ADD_LEAD_BASE_SUPPORT":
        return "Appointment evidence -> client context -> revenue risk context";
      default:
        return read.recommendedPath;
    }
  })();

  return {
    ...read,
    detectedObjection,
    nextBestAction,
    recommendedPath,
  };
}

export type ImportsHeroDecision = {
  heroCtaLabel: string;
  heroSummary: string;
  heroTitle: string;
  nextMoveHeadline: string;
  nextMoveNote: string;
};

export function applyImportsIntentClassification(
  fallback: ImportsHeroDecision,
  classification: RevoryIntentClassification | null,
): ImportsHeroDecision {
  if (!shouldApplyClassification(classification)) {
    return fallback;
  }

  switch (classification.intent) {
    case "START_BOOKED_PROOF":
      return {
        heroCtaLabel: "Start source inputs",
        heroSummary: "Appointment evidence comes first. Client context follows later.",
        heroTitle: "Upload clinic data for revenue leak detection.",
        nextMoveHeadline: "Start source inputs",
        nextMoveNote: "Upload appointments first so the revenue risk read can open on visible outcomes.",
      };
    case "REVIEW_BOOKED_PROOF":
      return {
        heroCtaLabel: "Review appointment evidence",
        heroSummary: "The appointment source is in, but outcomes still need a clean pass.",
        heroTitle: "Review appointment evidence.",
        nextMoveHeadline: "Review appointment evidence",
        nextMoveNote: "Clean the appointments pass before asking the revenue risk read to carry the story.",
      };
    case "OPEN_REVENUE_VIEW":
      return {
        heroCtaLabel: "Open Revenue Read",
        heroSummary: "Appointment evidence is live. Client context stays secondary.",
        heroTitle: "Appointment evidence is live.",
        nextMoveHeadline: "Open Revenue Read",
        nextMoveNote: "Revenue risk is ready because appointment evidence is already visible.",
      };
    case "REFRESH_BOOKED_PROOF":
      return {
        heroCtaLabel: "Open Revenue Read",
        heroSummary: "Appointment evidence is live, but it should stay fresh behind the revenue risk read.",
        heroTitle: "Keep appointment evidence fresh.",
        nextMoveHeadline: "Refresh appointment evidence",
        nextMoveNote: "Update appointment data when statuses, dates or estimated value change so the read stays credible.",
      };
    case "ADD_LEAD_BASE_SUPPORT":
      return {
        heroCtaLabel: "Open Revenue Read",
        heroSummary: "Appointment evidence is already carrying the read. Client context can join as support.",
        heroTitle: "Client context stays secondary.",
        nextMoveHeadline: "Add client context",
        nextMoveNote: "Bring client context in only as support once appointment evidence is already visible.",
      };
    default:
      return fallback;
  }
}
