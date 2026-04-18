import "server-only";

import type { DailyBookingBriefRead } from "@/services/briefs/get-daily-booking-brief-read";
import type { DashboardOverview } from "@/services/dashboard/get-dashboard-overview";

type SummaryTone = "accent" | "future" | "neutral" | "real";

export type ExecutiveProofSummaryRead = {
  copyText: string;
  freshness: {
    label: string;
    note: string;
    tone: SummaryTone;
  };
  headline: string;
  periodLabel: string;
  safeguard: {
    coreReadLabel: string;
    headline: string;
    note: string;
    supportLabel: string;
    tone: SummaryTone;
  };
  signals: Array<{
    isPrimary?: boolean;
    label: string;
    note: string;
    tone: SummaryTone;
    value: string;
  }>;
  summary: string;
  workspaceName: string;
};

function formatCompactCurrency(value: number | null) {
  if (value === null) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatPeriodLabel() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function buildExecutiveFrame(overview: DashboardOverview) {
  const hasBookedProofVisible = overview.bookedAppointments > 0;
  const hasRecentProof =
    overview.recentMomentum.status === "ready" && overview.recentMomentum.bookedAppointments > 0;
  const hasStableSupport = overview.commercialSafeguard.status === "stable";

  if (hasBookedProofVisible && hasRecentProof && hasStableSupport) {
    return {
      headline: "Current revenue proof is visible and defensible.",
      summary:
        "Booked revenue is visible in the current read, with recent proof and support context kept short enough for internal review or pricing conversations.",
    };
  }

  if (hasBookedProofVisible) {
    return {
      headline: "Current revenue proof is visible, but still thin.",
      summary:
        "Booked revenue is already visible, but recent proof or support is still building. Use this summary as a narrow snapshot, not as broad performance reporting.",
    };
  }

  return {
    headline: "Current revenue proof is not ready yet.",
    summary:
      "Booked proof still needs to be visible before this summary should be used for stronger internal or commercial justification.",
  };
}

function buildRecentProofSignal(overview: DashboardOverview) {
  if (overview.recentMomentum.status === "degraded") {
    return {
      label: "Recent proof",
      note: "Recent continuity is temporarily limited in this read.",
      tone: "neutral" as const,
      value: "Limited",
    };
  }

  if (overview.recentMomentum.estimatedRevenue !== null) {
    return {
      label: "Recent proof",
      note: overview.recentMomentum.windowLabel,
      tone:
        overview.recentMomentum.bookedAppointments > 0 ? ("real" as const) : ("neutral" as const),
      value: formatCompactCurrency(overview.recentMomentum.estimatedRevenue),
    };
  }

  return {
    label: "Recent proof",
    note: overview.recentMomentum.windowLabel,
    tone:
      overview.recentMomentum.bookedAppointments > 0 ? ("neutral" as const) : ("future" as const),
    value:
      overview.recentMomentum.bookedAppointments > 0
        ? `${overview.recentMomentum.bookedAppointments} booked`
        : "Pending",
  };
}

export function getExecutiveProofSummaryRead(input: {
  dailyBriefRead: DailyBookingBriefRead;
  overview: DashboardOverview;
  workspaceName: string;
}): ExecutiveProofSummaryRead {
  const { dailyBriefRead, overview, workspaceName } = input;
  const frame = buildExecutiveFrame(overview);
  const revenueNow =
    overview.executiveRead.tiles.find((tile) => tile.label === "Revenue now")?.value ?? "Pending";
  const bookedProofVisible = overview.bookedAppointments > 0;
  const bookedProofSignal = {
    label: "Booked proof",
    note: bookedProofVisible
      ? "Booked appointments already visible in this workspace."
      : "Booked proof still needs support before this read is stronger.",
    tone: bookedProofVisible ? ("real" as const) : ("future" as const),
    value: bookedProofVisible ? `${overview.bookedAppointments} booked` : "Pending",
  };
  const recentProofSignal = buildRecentProofSignal(overview);
  const safeguardTone =
    overview.commercialSafeguard.status === "stable"
      ? ("real" as const)
      : ("neutral" as const);
  const copyLines = [
    `${workspaceName} - Executive proof summary (${formatPeriodLabel()})`,
    `Revenue in current read: ${revenueNow}`,
    `Booked proof visible: ${bookedProofSignal.value}`,
    `${recentProofSignal.label}: ${recentProofSignal.value}`,
    `Support status: ${overview.commercialSafeguard.supportLabel}`,
    `Freshness: ${dailyBriefRead.freshness.label}`,
  ];

  return {
    copyText: copyLines.join("\n"),
    freshness: dailyBriefRead.freshness,
    headline: frame.headline,
    periodLabel: formatPeriodLabel(),
    safeguard: {
      coreReadLabel: overview.commercialSafeguard.coreReadLabel,
      headline: overview.commercialSafeguard.headline,
      note: overview.commercialSafeguard.summary,
      supportLabel: overview.commercialSafeguard.supportLabel,
      tone: safeguardTone,
    },
    signals: [
      {
        isPrimary: true,
        label: "Revenue now",
        note: "Visible booked revenue in the current workspace read.",
        tone: bookedProofVisible ? ("real" as const) : ("future" as const),
        value: revenueNow,
      },
      bookedProofSignal,
      recentProofSignal,
    ],
    summary: frame.summary,
    workspaceName,
  };
}
