import "server-only";

import { cache } from "react";
import type { ActivationSetup } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from "@/services/imports/get-csv-upload-sources";
import { getLeadIntakeRoutingRead } from "@/services/lead-booking/get-lead-intake-routing-read";
import { getBookedProofRead } from "@/services/proof/get-booked-proof-read";

type BriefTone = "accent" | "future" | "neutral" | "real";

export type DailyBookingBriefRead = {
  headline: string;
  nextMove: {
    href: string;
    label: string;
    note: string;
  };
  recentChange: {
    note: string;
    tone: BriefTone;
  };
  signals: Array<{
    label: string;
    note: string;
    tone: BriefTone;
    value: string;
  }>;
  summary: string;
  tone: BriefTone;
};

function formatRelativeDate(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const minuteMs = 1000 * 60;
  const hourMs = minuteMs * 60;
  const dayMs = hourMs * 24;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.round(diffMs / minuteMs));
    return `${minutes}m ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.round(diffMs / hourMs));
    return `${hours}h ago`;
  }

  if (diffMs < dayMs * 7) {
    const days = Math.max(1, Math.round(diffMs / dayMs));
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(value);
}

function formatSourceStateLabel(hasLiveSource: boolean, hasSource: boolean) {
  if (hasLiveSource) {
    return "Live";
  }

  return hasSource ? "Review" : "Pending";
}

function getMostRecentChange(input: {
  appointmentsImportedAt: Date | null;
  clientsImportedAt: Date | null;
  handoffOpenedAt: Date | null;
}) {
  type RecentChangeCandidate = {
    note: string;
    timestamp: number;
    tone: BriefTone;
  };
  const changes: RecentChangeCandidate[] = [];

  if (input.handoffOpenedAt) {
    changes.push({
      note: `Current booking path was opened ${formatRelativeDate(input.handoffOpenedAt)}.`,
      timestamp: input.handoffOpenedAt.getTime(),
      tone: "accent",
    });
  }

  if (input.appointmentsImportedAt) {
    changes.push({
      note: `Booked proof was refreshed ${formatRelativeDate(input.appointmentsImportedAt)}.`,
      timestamp: input.appointmentsImportedAt.getTime(),
      tone: "real",
    });
  }

  if (input.clientsImportedAt) {
    changes.push({
      note: `Lead support was refreshed ${formatRelativeDate(input.clientsImportedAt)}.`,
      timestamp: input.clientsImportedAt.getTime(),
      tone: "neutral",
    });
  }

  if (changes.length === 0) {
    return {
      note: "No recent booking signal is visible yet.",
      tone: "neutral" as const,
    };
  }

  return [...changes].sort((left, right) => right.timestamp - left.timestamp)[0];
}

function buildProofFirstBrief(input: {
  appointmentsSourceVisible: boolean;
  clientsSourceVisible: boolean;
  hasBookedProofVisible: boolean;
}) {
  const hasAppointmentsSignal = input.appointmentsSourceVisible;

  return {
    headline: hasAppointmentsSignal
      ? "Open with booked proof review."
      : "Open with booked proof first.",
    nextMove: hasAppointmentsSignal
      ? {
          href: "/app/imports#booking-inputs-flow",
          label: "Review booked proof",
          note: "The appointments lane is already in. Keep today on booked proof before anything wider.",
        }
      : {
          href: "/app/imports#booking-inputs-flow",
          label: "Start booked proof",
          note: "Booked proof still sets the first useful read of the day in Seller.",
        },
    signals: [
      {
        label: "Booked proof",
        note: hasAppointmentsSignal ? "Lane visible" : "Still missing",
        tone: hasAppointmentsSignal ? ("future" as const) : ("future" as const),
        value: formatSourceStateLabel(hasAppointmentsSignal, hasAppointmentsSignal),
      },
      {
        label: "Lead support",
        note: input.clientsSourceVisible ? "Secondary lane visible" : "Optional until proof is clean",
        tone: input.clientsSourceVisible ? ("neutral" as const) : ("neutral" as const),
        value: formatSourceStateLabel(input.clientsSourceVisible, input.clientsSourceVisible),
      },
      {
        label: "Revenue view",
        note: input.hasBookedProofVisible ? "Can open now" : "Opens after proof",
        tone: input.hasBookedProofVisible ? ("real" as const) : ("future" as const),
        value: input.hasBookedProofVisible ? "Ready" : "Pending",
      },
    ],
    summary: hasAppointmentsSignal
      ? "Seller keeps the day anchored on booked proof so revenue can stay honest before booking assistance becomes the daily booking read."
      : "Seller still starts with booked proof. Until that lane is visible, the daily brief should stay narrow and proof-first.",
    tone: "future" as const,
  };
}

function buildBookingLiveBrief(input: {
  blocked: number;
  handoffsOpened: number;
  ready: number;
}) {
  const hasReady = input.ready > 0;
  const hasBlocked = input.blocked > 0;
  const hasHandoffs = input.handoffsOpened > 0;

  const nextMove = hasReady
    ? {
        href: "/app/imports#booking-assistance-flow",
        label: "Open booking assistance",
        note: "Use the short booking read where Seller already has a clear path to move today.",
      }
    : hasBlocked
      ? {
          href: "/app/imports#booking-assistance-flow",
          label: "Review blocked reads",
          note: "Keep today on the blockers that are still preventing the current path from opening.",
        }
      : hasHandoffs
        ? {
            href: "/app/imports#booking-assistance-flow",
            label: "Refresh booking reads",
            note: "Seller already opened the current path recently. Recheck the active booking read before widening the day.",
          }
        : {
            href: "/app/dashboard#revenue-view",
            label: "Open revenue view",
            note: "Booked proof is live. Keep the day short until a stronger booking move appears.",
          };

  return {
    headline: hasReady
      ? "Open with what can move now."
      : hasBlocked
        ? "Open with the blockers that matter."
        : "Open with a short booking read.",
    nextMove,
    signals: [
      {
        label: "Ready now",
        note: "Can open path",
        tone: hasReady ? ("real" as const) : ("neutral" as const),
        value: String(input.ready),
      },
      {
        label: "Blocked now",
        note: "Needs a fix",
        tone: hasBlocked ? ("future" as const) : ("neutral" as const),
        value: String(input.blocked),
      },
      {
        label: "Handoffs opened",
        note: "Seller signal",
        tone: hasHandoffs ? ("accent" as const) : ("neutral" as const),
        value: String(input.handoffsOpened),
      },
    ],
    summary: hasReady
      ? "Seller starts the day with the booking reads that are already actionable, keeps blockers visible, and avoids widening into a heavier operating surface."
      : hasBlocked
        ? "Seller keeps the first minute on explicit blockers and the next bounded move instead of drifting into pipeline management."
        : "Seller keeps the first minute short: check the current booking read, then move back to revenue once nothing active needs a push.",
    tone: hasReady ? ("real" as const) : hasBlocked ? ("future" as const) : ("neutral" as const),
  };
}

export const getDailyBookingBriefRead = cache(async (
  workspaceId: string,
  activationSetup: Pick<ActivationSetup, "isCompleted">,
): Promise<DailyBookingBriefRead> => {
  const [bookedProofRead, leadIntakeRead, uploadSources, latestOpenedHandoff] = await Promise.all([
    getBookedProofRead(workspaceId),
    getLeadIntakeRoutingRead(workspaceId),
    getCsvUploadSources(workspaceId),
    prisma.leadBookingOpportunity.findFirst({
      orderBy: {
        handoffOpenedAt: "desc",
      },
      select: {
        handoffOpenedAt: true,
      },
      where: {
        handoffOpenedAt: {
          not: null,
        },
        workspaceId,
      },
    }),
  ]);

  const appointmentsSourceVisible = hasLiveCsvUploadSource(uploadSources.appointments);
  const clientsSourceVisible = hasLiveCsvUploadSource(uploadSources.clients);
  const hasBookedProofVisible = bookedProofRead.hasBookedProofVisible;
  const recentChange = getMostRecentChange({
    appointmentsImportedAt: uploadSources.appointments?.lastImportedAt ?? null,
    clientsImportedAt: uploadSources.clients?.lastImportedAt ?? null,
    handoffOpenedAt: latestOpenedHandoff?.handoffOpenedAt ?? null,
  });

  if (!activationSetup.isCompleted || !hasBookedProofVisible) {
    return {
      ...buildProofFirstBrief({
        appointmentsSourceVisible,
        clientsSourceVisible,
        hasBookedProofVisible,
      }),
      recentChange,
    };
  }

  return {
    ...buildBookingLiveBrief({
      blocked: leadIntakeRead.summary.blocked,
      handoffsOpened: leadIntakeRead.summary.handoffsOpened,
      ready: leadIntakeRead.summary.ready,
    }),
    recentChange,
  };
});
