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
        return "Choose one lead entry now so booked proof can stay short and clear.";
      case "LOCK_BOOKING_PATH":
        return "Lock one booking path so Seller can hand off with less ambiguity.";
      case "SET_VALUE_PER_BOOKING":
        return "Set one value per booking so revenue can read cleanly once proof is visible.";
      case "COMPLETE_ACTIVATION":
        return "Finish activation, then move straight into booked proof.";
      case "START_BOOKED_PROOF":
        return "Go live, then add booked proof before leaning on revenue.";
      default:
        return read.nextBestAction;
    }
  })();

  const detectedObjection = (() => {
    switch (classification.objection) {
      case "MULTI_OFFER_RISK":
        return "More than one offer story would blur the first booking motion.";
      case "LEAD_ENTRY_MISSING":
        return "Seller still needs one clear lead entry before proof can read cleanly.";
      case "BOOKING_PATH_MISSING":
        return "The booking handoff is still too open to feel fully launch-ready.";
      case "VALUE_PER_BOOKING_MISSING":
        return "Revenue still lacks one clear value anchor.";
      case "PROOF_NOT_VISIBLE":
        return "Activation is ready, but proof still needs to become visible next.";
      default:
        return read.detectedObjection;
    }
  })();

  const recommendedPath = (() => {
    switch (stepKey) {
      case "template":
        return "One main offer -> lead entry -> one booking path";
      case "source":
        return "Choose lead entry -> booked proof -> revenue view";
      case "channel":
        return "Lead enters -> one booking path -> booked appointment";
      case "deal_value":
        return "Configured value -> visible bookings -> revenue read";
      case "activation":
        return classification.intent === "START_BOOKED_PROOF"
          ? "Activation complete -> booked proof -> revenue view"
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
        return "Open Booking Inputs and add appointments before asking revenue to carry the story.";
      case "REVIEW_BOOKED_PROOF":
        return "Review booked proof first so revenue and visible outcomes stay aligned.";
      case "REFRESH_BOOKED_PROOF":
        return "Refresh booked proof so the revenue read stays current and credible.";
      case "ADD_LEAD_BASE_SUPPORT":
        return "Add lead base only as support after booked proof is already visible.";
      case "OPEN_REVENUE_VIEW":
        return "Keep the revenue read short and supported by the booked proof already in view.";
      default:
        return read.nextBestAction;
    }
  })();

  const detectedObjection = (() => {
    switch (classification.objection) {
      case "PROOF_NOT_VISIBLE":
        return "Revenue still feels premature because booked proof is not visible yet.";
      case "PROOF_SOURCE_NEEDS_REVIEW":
        return "The proof source is present, but the booked outcome layer still needs review.";
      case "LEAD_BASE_ONLY":
        return "Lead base alone cannot carry the booked revenue read.";
      case "THIN_BOOKING_CALENDAR":
        return "The revenue read is visible, but the upcoming booking layer is still thin.";
      case "SUPPORT_SHOULD_STAY_SECONDARY":
        return "Lead-base support should stay behind booked proof, not in front of it.";
      default:
        return read.detectedObjection;
    }
  })();

  const recommendedPath = (() => {
    switch (classification.intent) {
      case "START_BOOKED_PROOF":
        return "Booking Inputs -> booked proof -> revenue view";
      case "REVIEW_BOOKED_PROOF":
        return "Review booked proof -> clean proof -> revenue view";
      case "REFRESH_BOOKED_PROOF":
        return "Refresh booked proof -> keep revenue aligned";
      case "ADD_LEAD_BASE_SUPPORT":
        return "Booked proof -> lead-base support -> revenue context";
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
        heroCtaLabel: "Start booked proof",
        heroSummary: "Booked proof comes first. Lead support follows later.",
        heroTitle: "Start booked proof.",
        nextMoveHeadline: "Start booked proof",
        nextMoveNote: "Upload appointments first so revenue can open on visible outcomes.",
      };
    case "REVIEW_BOOKED_PROOF":
      return {
        heroCtaLabel: "Review booked proof",
        heroSummary: "The proof source is in, but booked outcomes still need a clean pass.",
        heroTitle: "Review booked proof.",
        nextMoveHeadline: "Review booked proof",
        nextMoveNote: "Clean the appointments pass before asking revenue to carry the read.",
      };
    case "OPEN_REVENUE_VIEW":
      return {
        heroCtaLabel: "Open Revenue View",
        heroSummary: "Booked proof is live. Lead support stays secondary.",
        heroTitle: "Booked proof is live.",
        nextMoveHeadline: "Open Revenue View",
        nextMoveNote: "Revenue is ready because booked proof is already visible.",
      };
    case "REFRESH_BOOKED_PROOF":
      return {
        heroCtaLabel: "Open Revenue View",
        heroSummary: "Proof is live, but it should stay fresh behind the revenue read.",
        heroTitle: "Keep booked proof fresh.",
        nextMoveHeadline: "Refresh booked proof",
        nextMoveNote: "Update proof when booked data changes so the commercial read stays credible.",
      };
    case "ADD_LEAD_BASE_SUPPORT":
      return {
        heroCtaLabel: "Open Revenue View",
        heroSummary: "Booked proof is already carrying the read. Lead base can join as support.",
        heroTitle: "Lead base can stay secondary.",
        nextMoveHeadline: "Add lead base",
        nextMoveNote: "Bring lead base in only as support once booked proof is already visible.",
      };
    default:
      return fallback;
  }
}
