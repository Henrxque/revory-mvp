import "server-only";

import {
  CommunicationChannel,
  LeadBookingOpportunityStatus,
} from "@prisma/client";

export type LeadBookingBlockedReason =
  | "ineligible_for_handoff"
  | "missing_booking_path"
  | "missing_contact"
  | "missing_main_offer";

export type LeadBookingNextActionCode =
  | "align_handoff_contact"
  | "capture_contact"
  | "set_booking_path"
  | "set_main_offer"
  | "show_email_booking_path"
  | "show_sms_booking_path";

type LeadBookingOpportunityEvaluationInput = {
  bookingPath: CommunicationChannel | null;
  email: string | null;
  hasFutureBooking: boolean;
  mainOfferKey: string | null;
  phone: string | null;
};

type LeadBookingOpportunityEvaluation = {
  blockingReason: LeadBookingBlockedReason | null;
  nextAction: LeadBookingNextActionCode | null;
  readinessLabel: string;
  readinessNote: string;
  resolvedAt: Date | null;
  status: LeadBookingOpportunityStatus;
};

function resolveHandoffEligibility(input: {
  bookingPath: CommunicationChannel;
  email: string | null;
  phone: string | null;
}) {
  if (input.bookingPath === CommunicationChannel.EMAIL) {
    return Boolean(input.email);
  }

  return Boolean(input.phone);
}

export function evaluateLeadBookingOpportunity(
  input: LeadBookingOpportunityEvaluationInput,
): LeadBookingOpportunityEvaluation {
  if (input.hasFutureBooking) {
    return {
      blockingReason: null,
      nextAction: null,
      readinessLabel: "Already booked",
      readinessNote:
        "A future booking is already visible, so this opportunity leaves the active booking-assist layer.",
      resolvedAt: new Date(),
      status: LeadBookingOpportunityStatus.BOOKED,
    };
  }

  if (!input.mainOfferKey) {
    return {
      blockingReason: "missing_main_offer",
      nextAction: "set_main_offer",
      readinessLabel: "Blocked by main offer",
      readinessNote:
        "Seller still needs one main offer locked before this lead can move through a narrow booking path.",
      resolvedAt: null,
      status: LeadBookingOpportunityStatus.BLOCKED,
    };
  }

  if (!input.bookingPath) {
    return {
      blockingReason: "missing_booking_path",
      nextAction: "set_booking_path",
      readinessLabel: "Blocked by booking path",
      readinessNote:
        "The workspace still needs one booking path before this lead can move toward booking.",
      resolvedAt: null,
      status: LeadBookingOpportunityStatus.BLOCKED,
    };
  }

  if (!input.email && !input.phone) {
    return {
      blockingReason: "missing_contact",
      nextAction: "capture_contact",
      readinessLabel: "Blocked by contact",
      readinessNote:
        "This lead still needs a usable contact identity before Seller can show the next booking step.",
      resolvedAt: null,
      status: LeadBookingOpportunityStatus.BLOCKED,
    };
  }

  if (
    !resolveHandoffEligibility({
      bookingPath: input.bookingPath,
      email: input.email,
      phone: input.phone,
    })
  ) {
    return {
      blockingReason: "ineligible_for_handoff",
      nextAction: "align_handoff_contact",
      readinessLabel: "Blocked by handoff fit",
      readinessNote:
        input.bookingPath === CommunicationChannel.EMAIL
          ? "The workspace routes through email, but this lead still does not have an email path available."
          : "The workspace routes through SMS, but this lead still does not have an SMS path available.",
      resolvedAt: null,
      status: LeadBookingOpportunityStatus.BLOCKED,
    };
  }

  return {
    blockingReason: null,
      nextAction:
      input.bookingPath === CommunicationChannel.EMAIL
        ? "show_email_booking_path"
        : "show_sms_booking_path",
    readinessLabel: "Ready for booking path",
    readinessNote:
      input.bookingPath === CommunicationChannel.EMAIL
        ? "The lead has enough identity and routing context for the email booking path to open."
        : "The lead has enough identity and routing context for the SMS booking path to open.",
    resolvedAt: null,
    status: LeadBookingOpportunityStatus.READY,
  };
}

export function formatLeadBookingBlockedReason(value: string | null) {
  switch (value) {
    case "missing_contact":
      return "Missing contact";
    case "missing_main_offer":
      return "Missing main offer";
    case "missing_booking_path":
      return "Missing booking path";
    case "ineligible_for_handoff":
      return "Handoff not eligible";
    default:
      return null;
  }
}

export function formatLeadBookingNextAction(value: string | null) {
  switch (value) {
    case "capture_contact":
      return "Add contact identity";
    case "set_main_offer":
      return "Lock main offer";
    case "set_booking_path":
      return "Lock booking path";
    case "align_handoff_contact":
      return "Align contact to booking path";
    case "show_email_booking_path":
      return "Show email booking path";
    case "show_sms_booking_path":
      return "Show SMS booking path";
    default:
      return null;
  }
}
