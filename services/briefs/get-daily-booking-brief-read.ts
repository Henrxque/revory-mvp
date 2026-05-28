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
  freshness: {
    label: string;
    note: string;
    tone: BriefTone;
  };
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

const FRESH_THRESHOLD_MS = 1000 * 60 * 60 * 48;
const STALE_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7;

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

function formatSourceStateLabel(hasVisibleSource: boolean, hasSource: boolean) {
  if (hasVisibleSource) {
    return "Visible";
  }

  return hasSource ? "Review" : "Pending";
}

function getFreshnessTone(ageMs: number) {
  if (ageMs <= FRESH_THRESHOLD_MS) {
    return "real" as const;
  }

  if (ageMs < STALE_THRESHOLD_MS) {
    return "neutral" as const;
  }

  return "future" as const;
}

function buildDailyReadFreshness(input: {
  appointmentsImportedAt: Date | null;
  appointmentsVisible: boolean;
  clientsImportedAt: Date | null;
  clientsVisible: boolean;
  hasBookedProofVisible: boolean;
}) {
  const now = Date.now();

  if (!input.appointmentsVisible || !input.appointmentsImportedAt) {
    return {
      label: "Data pending",
      note: "Upload appointment data to start detecting revenue at risk.",
      tone: "future" as const,
    };
  }

  const appointmentsAgeMs = now - input.appointmentsImportedAt.getTime();
  const appointmentsTone = getFreshnessTone(appointmentsAgeMs);

  if (input.hasBookedProofVisible && input.clientsVisible && input.clientsImportedAt) {
    const clientsAgeMs = now - input.clientsImportedAt.getTime();

    if (clientsAgeMs >= STALE_THRESHOLD_MS) {
      return {
        label: "Support may be stale",
        note: `Client support was refreshed ${formatRelativeDate(input.clientsImportedAt)}. Refresh it if today's revenue risk read feels behind.`,
        tone: "future" as const,
      };
    }
  }

  if (appointmentsAgeMs >= STALE_THRESHOLD_MS) {
    return {
      label: "Data may be stale",
      note: "Your appointment data may be outdated. Upload a fresh file to keep your revenue risk read current.",
      tone: "future" as const,
    };
  }

  if (appointmentsTone === "neutral") {
    return {
      label: "Read holding",
      note: `Appointment data was refreshed ${formatRelativeDate(input.appointmentsImportedAt)}. Still usable, but no longer fresh.`,
      tone: "neutral" as const,
    };
  }

  return {
    label: "Read fresh",
    note: `Appointment data was refreshed ${formatRelativeDate(input.appointmentsImportedAt)} and is fresh enough to guide today's read.`,
    tone: "real" as const,
  };
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
      note: `The current booking path was opened ${formatRelativeDate(input.handoffOpenedAt)}.`,
      timestamp: input.handoffOpenedAt.getTime(),
      tone: "accent",
    });
  }

  if (input.appointmentsImportedAt) {
    changes.push({
      note: `Appointment data was refreshed ${formatRelativeDate(input.appointmentsImportedAt)}.`,
      timestamp: input.appointmentsImportedAt.getTime(),
      tone: "real",
    });
  }

  if (input.clientsImportedAt) {
    changes.push({
      note: `Client support was refreshed ${formatRelativeDate(input.clientsImportedAt)}.`,
      timestamp: input.clientsImportedAt.getTime(),
      tone: "neutral",
    });
  }

  if (changes.length === 0) {
    return {
      note: "No recent clinic data change is visible yet.",
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
      ? "Open with appointment evidence review."
      : "Upload appointment data to start detecting revenue at risk.",
    nextMove: hasAppointmentsSignal
      ? {
          href: "/app/imports#booking-inputs-flow",
          label: "Review appointment evidence",
          note: "The appointments lane is already in. Keep today's read evidence-first before anything wider.",
        }
      : {
          href: "/app/imports#booking-inputs-flow",
          label: "Upload appointment data",
          note: "REVORY needs appointment status and scheduled date to detect stronger revenue risks.",
        },
    signals: [
      {
        label: "Appointment evidence",
        note: hasAppointmentsSignal ? "Lane visible" : "Still missing",
        tone: "future" as const,
        value: formatSourceStateLabel(hasAppointmentsSignal, hasAppointmentsSignal),
      },
      {
        label: "Client support",
        note: input.clientsSourceVisible ? "Secondary lane visible" : "Optional until evidence is clean",
        tone: "neutral" as const,
        value: formatSourceStateLabel(input.clientsSourceVisible, input.clientsSourceVisible),
      },
      {
        label: "Revenue read",
        note: input.hasBookedProofVisible ? "Can open next" : "Opens after evidence",
        tone: input.hasBookedProofVisible ? ("real" as const) : ("future" as const),
        value: input.hasBookedProofVisible ? "Ready" : "Pending",
      },
    ],
    summary: hasAppointmentsSignal
      ? "REVORY keeps the day anchored on appointment evidence so the revenue risk read stays honest before operational booking risks become the next layer."
      : "REVORY uses structured appointment and booking data to identify no-show risk, unrecovered cancellations, blocked booking opportunities and stale data signals.",
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
        label: "Review operational risks",
        note: "Use the short read where REVORY already has a clear path to inspect today.",
      }
    : hasBlocked
      ? {
          href: "/app/imports#booking-assistance-flow",
          label: "Review blocked risks",
          note: "Keep today on the blockers still preventing the current path from opening.",
        }
      : hasHandoffs
        ? {
            href: "/app/imports#booking-assistance-flow",
            label: "Refresh risk read",
            note: "The current path was opened recently. Recheck the active read before widening the day.",
          }
        : {
            href: "/app/dashboard#revenue-view",
            label: "Open revenue read",
            note: "Appointment evidence is visible. Keep the day short until a stronger operational risk appears.",
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
        label: "Ready risks",
        note: "Can inspect now",
        tone: hasReady ? ("real" as const) : ("neutral" as const),
        value: String(input.ready),
      },
      {
        label: "Blocked risks",
        note: "Needs a fix",
        tone: hasBlocked ? ("future" as const) : ("neutral" as const),
        value: String(input.blocked),
      },
      {
        label: "Paths opened",
        note: "Action signal",
        tone: hasHandoffs ? ("accent" as const) : ("neutral" as const),
        value: String(input.handoffsOpened),
      },
    ],
    summary: hasReady
      ? "REVORY starts the day with the operational booking risks that are already actionable, keeps blockers visible, and avoids widening into a heavier operating surface."
      : hasBlocked
        ? "REVORY keeps the first minute on explicit blockers and the next bounded move instead of drifting into pipeline management."
        : "REVORY keeps the first minute short: check the current revenue read, then move only if an operational risk needs attention.",
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
  const freshness = buildDailyReadFreshness({
    appointmentsImportedAt: uploadSources.appointments?.lastImportedAt ?? null,
    appointmentsVisible: appointmentsSourceVisible,
    clientsImportedAt: uploadSources.clients?.lastImportedAt ?? null,
    clientsVisible: clientsSourceVisible,
    hasBookedProofVisible,
  });

  if (!activationSetup.isCompleted || !hasBookedProofVisible) {
    return {
      ...buildProofFirstBrief({
        appointmentsSourceVisible,
        clientsSourceVisible,
        hasBookedProofVisible,
      }),
      freshness,
      recentChange,
    };
  }

  return {
    ...buildBookingLiveBrief({
      blocked: leadIntakeRead.summary.blocked,
      handoffsOpened: leadIntakeRead.summary.handoffsOpened,
      ready: leadIntakeRead.summary.ready,
    }),
    freshness,
    recentChange,
  };
});
