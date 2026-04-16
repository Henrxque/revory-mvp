import "server-only";

import { cache } from "react";
import { LeadBookingOpportunityStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { buildBookingHandoff } from "@/services/lead-booking/build-booking-handoff";
import { generateLeadSuggestedMessage } from "@/services/lead-booking/generate-lead-suggested-message";
import {
  deriveLeadTrackingState,
  formatLeadTrackingState,
} from "@/services/lead-booking/lead-state";
import { formatLeadBookingMainOffer } from "@/services/lead-booking/main-offer-labels";
import {
  evaluateLeadBookingOpportunity,
  formatLeadBookingBlockedReason,
  formatLeadBookingNextAction,
} from "@/services/lead-booking/opportunity-readiness";
import { formatLeadBookingSellerVoice } from "@/services/lead-booking/seller-voice-labels";
import type { RevoryLeadSuggestedMessageBlockedReason } from "@/types/lead-suggested-message";

type LeadIntakeRoutingRead = {
  bookingPathLabel: string;
  mainOfferLabel: string;
  opportunities: Array<{
    blockedReason: string | null;
    clientId: string;
    clientName: string;
    handoffHref: string | null;
    handoffLabel: string | null;
    handoffNote: string | null;
    handoffOpenedAt: string | null;
    id: string;
    intakeLabel: string;
    leadState: "BOOKED" | "CLOSED" | "HANDOFF_OPENED" | "NEW";
    leadStateLabel: string;
    readinessLabel: string;
    readinessNote: string;
    suggestedMessage: string | null;
    suggestedMessageLabel: string | null;
    suggestedMessageSource: "fallback" | "llm" | null;
    nextAction: string | null;
    status: LeadBookingOpportunityStatus;
  }>;
  summary: {
    blocked: number;
    booked: number;
    handoffsOpened: number;
    open: number;
    ready: number;
  };
};

function formatBookingPathLabel(value: string | null | undefined) {
  switch (value) {
    case "EMAIL":
      return "Primary booking path (Email)";
    case "SMS":
      return "Assisted booking path (SMS)";
    default:
      return "Booking path pending";
  }
}

function formatIntakeLabel(input: { intakeSourceName: string | null; intakeSourceType: string | null }) {
  if (input.intakeSourceName?.trim()) {
    return input.intakeSourceName.trim();
  }

  switch (input.intakeSourceType) {
    case "CLIENTS_CSV":
      return "Client export";
    case "MANUAL_IMPORT":
      return "Guided import";
    default:
      return "Lead source";
  }
}

function formatNextAction(value: string | null) {
  return formatLeadBookingNextAction(value);
}

function getClientFirstName(name: string | null) {
  const trimmed = name?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.split(/\s+/)[0] ?? null;
}

function toSuggestedMessageBlockedReason(value: string | null): RevoryLeadSuggestedMessageBlockedReason {
  switch (value) {
    case "missing_contact":
    case "missing_main_offer":
    case "missing_booking_path":
    case "ineligible_for_handoff":
      return value;
    default:
      return null;
  }
}

const getLeadIntakeRoutingReadCached = cache(async (workspaceId: string): Promise<LeadIntakeRoutingRead> => {
  const [activationSetup, workspace, opportunities] = await Promise.all([
    prisma.activationSetup.findUnique({
      where: {
        workspaceId,
      },
    }),
    prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        name: true,
      },
    }),
    prisma.leadBookingOpportunity.findMany({
      include: {
        client: true,
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
      take: 12,
      where: {
        workspaceId,
      },
    }),
  ]);

  const allCounts = await prisma.leadBookingOpportunity.groupBy({
    _count: {
      _all: true,
    },
    by: ["status"],
    where: {
      workspaceId,
    },
  });

  const counts = new Map(allCounts.map((item) => [item.status, item._count._all]));
  const handoffsOpened = await prisma.leadBookingOpportunity.count({
    where: {
      handoffOpenedAt: {
        not: null,
      },
      workspaceId,
    },
  });

  const statusPriority = new Map<LeadBookingOpportunityStatus, number>([
    [LeadBookingOpportunityStatus.READY, 0],
    [LeadBookingOpportunityStatus.BLOCKED, 1],
    [LeadBookingOpportunityStatus.OPEN, 2],
    [LeadBookingOpportunityStatus.BOOKED, 3],
    [LeadBookingOpportunityStatus.CLOSED, 4],
  ]);

  const prioritizedOpportunities = [...opportunities]
    .sort((left, right) => {
      const leftPriority = statusPriority.get(left.status) ?? 99;
      const rightPriority = statusPriority.get(right.status) ?? 99;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .slice(0, 4);

  return {
    bookingPathLabel: formatBookingPathLabel(activationSetup?.primaryChannel),
    mainOfferLabel: formatLeadBookingMainOffer(activationSetup?.selectedTemplate),
    opportunities: await Promise.all(prioritizedOpportunities.map(async (opportunity) => {
      const evaluation = evaluateLeadBookingOpportunity({
        bookingPath: opportunity.bookingPath,
        email: opportunity.client.email,
        hasFutureBooking: opportunity.status === LeadBookingOpportunityStatus.BOOKED,
        mainOfferKey: opportunity.mainOfferKey,
        phone: opportunity.client.phone,
      });
      const handoff = buildBookingHandoff({
        bookingPath: opportunity.bookingPath,
        clientEmail: opportunity.client.email,
        clientName: opportunity.client.fullName,
        clientPhone: opportunity.client.phone,
        mainOfferKey: opportunity.mainOfferKey,
        workspaceName: workspace?.name ?? "REVORY Seller",
      });
      const leadState = deriveLeadTrackingState({
        handoffOpenedAt: opportunity.handoffOpenedAt,
        status: opportunity.status,
      });
      const suggestedMessageResult = await generateLeadSuggestedMessage({
        blockedReason: toSuggestedMessageBlockedReason(opportunity.blockingReason),
        bookingPath: opportunity.bookingPath,
        clientFirstName: getClientFirstName(opportunity.client.fullName),
        clientName: opportunity.client.fullName,
        hasEmail: Boolean(opportunity.client.email),
        hasPhone: Boolean(opportunity.client.phone),
        intakeLabel: formatIntakeLabel(opportunity),
        mainOfferLabel: formatLeadBookingMainOffer(opportunity.mainOfferKey),
        sellerVoiceLabel: formatLeadBookingSellerVoice(activationSetup?.recommendedModeKey),
        status: opportunity.status,
        workspaceName: workspace?.name ?? "REVORY Seller",
      });

      return {
        blockedReason: formatLeadBookingBlockedReason(opportunity.blockingReason),
        clientId: opportunity.clientId,
        clientName: opportunity.client.fullName?.trim() || "Lead pending name",
        handoffHref:
          opportunity.status === LeadBookingOpportunityStatus.READY ? handoff?.href ?? null : null,
        handoffLabel:
          opportunity.status === LeadBookingOpportunityStatus.READY ? handoff?.label ?? null : null,
        handoffNote:
          opportunity.status === LeadBookingOpportunityStatus.READY ? handoff?.note ?? null : null,
        handoffOpenedAt: opportunity.handoffOpenedAt?.toISOString() ?? null,
        id: opportunity.id,
        intakeLabel: formatIntakeLabel(opportunity),
        leadState,
        leadStateLabel: formatLeadTrackingState(leadState),
        nextAction: formatNextAction(opportunity.nextAction),
        readinessLabel: evaluation.readinessLabel,
        readinessNote: evaluation.readinessNote,
        suggestedMessage: suggestedMessageResult.suggestedMessage?.message ?? null,
        suggestedMessageLabel: suggestedMessageResult.surfaceLabel,
        suggestedMessageSource: suggestedMessageResult.suggestedMessage?.source ?? null,
        status: opportunity.status,
      };
    })),
    summary: {
      blocked: counts.get(LeadBookingOpportunityStatus.BLOCKED) ?? 0,
      booked: counts.get(LeadBookingOpportunityStatus.BOOKED) ?? 0,
      handoffsOpened,
      open: counts.get(LeadBookingOpportunityStatus.OPEN) ?? 0,
      ready: counts.get(LeadBookingOpportunityStatus.READY) ?? 0,
    },
  };
});

export async function getLeadIntakeRoutingRead(workspaceId: string) {
  return getLeadIntakeRoutingReadCached(workspaceId);
}
