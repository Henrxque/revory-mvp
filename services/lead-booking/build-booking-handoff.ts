import "server-only";

import { CommunicationChannel } from "@prisma/client";

import { formatLeadBookingMainOffer } from "@/services/lead-booking/main-offer-labels";

type BuildBookingHandoffInput = {
  bookingPath: CommunicationChannel | null;
  clientEmail: string | null;
  clientName: string | null;
  clientPhone: string | null;
  mainOfferKey: string | null;
  workspaceName: string;
};

type BookingHandoff = {
  href: string;
  label: string;
  note: string;
};

function getLeadFirstName(name: string | null) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return "there";
  }

  return trimmedName.split(/\s+/)[0] ?? "there";
}

function toMailtoHref(input: {
  clientEmail: string;
  clientName: string | null;
  mainOfferLabel: string;
  workspaceName: string;
}) {
  const subject = `${input.workspaceName}: ${input.mainOfferLabel} booking path`;
  const body = [
    `Hi ${getLeadFirstName(input.clientName)},`,
    "",
    `Here is the next step for your ${input.mainOfferLabel} booking path.`,
    "",
    `${input.workspaceName}`,
  ].join("\n");

  return `mailto:${encodeURIComponent(input.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function toSmsHref(input: {
  clientName: string | null;
  clientPhone: string;
  mainOfferLabel: string;
  workspaceName: string;
}) {
  const body = `Hi ${getLeadFirstName(input.clientName)}, here is the next step for your ${input.mainOfferLabel} booking path from ${input.workspaceName}.`;

  return `sms:${encodeURIComponent(input.clientPhone)}?body=${encodeURIComponent(body)}`;
}

export function buildBookingHandoff(input: BuildBookingHandoffInput): BookingHandoff | null {
  const mainOfferLabel = formatLeadBookingMainOffer(input.mainOfferKey);

  if (input.bookingPath === CommunicationChannel.EMAIL && input.clientEmail) {
    return {
      href: toMailtoHref({
        clientEmail: input.clientEmail,
        clientName: input.clientName,
        mainOfferLabel,
        workspaceName: input.workspaceName,
      }),
      label: "Open email booking path",
      note: "Opens the current booking path in email.",
    };
  }

  if (input.bookingPath === CommunicationChannel.SMS && input.clientPhone) {
    return {
      href: toSmsHref({
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        mainOfferLabel,
        workspaceName: input.workspaceName,
      }),
      label: "Open SMS booking path",
      note: "Opens the current booking path in SMS.",
    };
  }

  return null;
}
