import type { DashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import type { RevoryDecisionSupportRead } from "@/types/decision-support";

type BuildDashboardDecisionSupportInput = {
  bookingPathLabel: string;
  dealValueLabel: string;
  mainOfferLabel: string;
  overview: DashboardOverview;
};

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Revenue pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

export function buildDashboardDecisionSupport({
  bookingPathLabel,
  dealValueLabel,
  mainOfferLabel,
  overview,
}: BuildDashboardDecisionSupportInput): RevoryDecisionSupportRead {
  const revenueLabel = formatCurrency(overview.estimatedImportedRevenue);

  if (overview.supportIntegrity.degradedSections.length > 0 && overview.bookedAppointments > 0) {
    return {
      badgeLabel: "Leak guidance",
      detectedObjection:
        "A support layer is temporarily thinner, which can weaken confidence if the workspace starts explaining the failure instead of protecting the core read.",
      eyebrow: "Revenue read",
      fallbackLabel: "If support stays thin",
      fallbackNote:
        "REVORY keeps the dashboard anchored in appointment evidence and the revenue risk read, then points back to one refresh move only.",
      guardrailLabel: "REVORY stays narrow",
      guardrailNote:
        "The safest move stays inside evidence refresh. REVORY does not widen the workflow when support layers are limited.",
      nextBestAction:
        "Refresh appointment evidence and keep the risk read short. Revenue context and appointment evidence are still safe to show while the thinner support layer recovers.",
      recommendedPath: "Revenue risk read -> appointment evidence -> refresh support",
      signals: [
        {
          label: "Core read",
          note: "Revenue context and appointment evidence remain visible.",
          value: revenueLabel,
        },
        {
          label: "Support layer",
          note: "Auxiliary reads are thinner right now.",
          value: `${overview.supportIntegrity.degradedSections.length} limited`,
        },
        {
          label: "Booking path",
          note: "The operational route stays the same.",
          value: bookingPathLabel,
        },
      ],
      summary:
        "Keep the revenue story calm, visible, and backed by one refresh move.",
      title: "The core value read is still intact.",
      tone: "neutral",
    };
  }

  if (overview.bookedAppointments === 0) {
    return {
      badgeLabel: "Leak guidance",
      detectedObjection:
        "Revenue risk still reads like configured potential until appointment evidence is visible.",
      eyebrow: "Revenue read",
      fallbackLabel: "If evidence softens",
      fallbackNote:
        "If appointment evidence is still missing, REVORY keeps revenue risk waiting and points back to Source Inputs.",
      guardrailLabel: "REVORY stays narrow",
      guardrailNote:
        "This recommendation only uses appointment evidence already visible inside the workspace.",
      nextBestAction:
        "Open Source Inputs and add the appointments file first. That is the shortest move from setup to visible leak evidence.",
      recommendedPath: "Source Inputs -> appointment evidence -> revenue risk read",
      signals: [
        {
          label: "Appointment evidence",
          note: "This is still the missing evidence layer.",
          value: "Not visible yet",
        },
        {
          label: "Value per booking",
          note: "The activation baseline is already in place.",
          value: dealValueLabel,
        },
        {
          label: "Booking path",
          note: "The path is already defined before appointment evidence arrives.",
          value: bookingPathLabel,
        },
      ],
      summary:
        "Keep the read simple: appointment evidence first, then let revenue risk lead.",
      title: "Appointment evidence is still the missing link.",
      tone: "future",
    };
  }

  if (overview.upcomingRead.appointments === 0) {
    return {
      badgeLabel: "Leak guidance",
      detectedObjection:
        "Revenue evidence is visible, but a thin upcoming appointment layer can make the workspace feel less current.",
      eyebrow: "Revenue read",
      fallbackLabel: "If evidence softens",
      fallbackNote:
        "If the calendar stays thin, REVORY keeps the next move on refreshing appointment evidence only.",
      guardrailLabel: "REVORY stays narrow",
      guardrailNote:
        "This recommendation stays inside the current evidence layer: revenue context, appointments, and one refresh move.",
      nextBestAction:
        "Refresh appointment visibility so the revenue risk read keeps a live evidence layer underneath it.",
      recommendedPath: "Refresh appointment evidence -> keep revenue risk and calendar aligned",
      signals: [
        {
          label: "Revenue visible",
          note: "This is the current revenue evidence read.",
          value: revenueLabel,
        },
        {
          label: "Appointment evidence",
          note: "Appointment outcomes currently supporting the read above.",
          value: `${overview.bookedAppointments}`,
        },
        {
          label: "Upcoming bookings",
          note: "This is the live calendar layer still visible right now.",
          value: `${overview.upcomingRead.appointments}`,
        },
      ],
      summary:
        "One refresh keeps the revenue read current without adding operational weight.",
      title: "Revenue is visible, but the live calendar is thin.",
      tone: "accent",
    };
  }

  return {
    badgeLabel: "Leak guidance",
    detectedObjection:
      "The main risk now is stale appointment evidence behind the revenue read.",
    eyebrow: "Revenue read",
    fallbackLabel: "If evidence softens",
    fallbackNote:
      "If evidence quality drops, REVORY falls back to the same narrow move: refresh appointment evidence.",
    guardrailLabel: "REVORY stays narrow",
    guardrailNote:
      "The dashboard keeps one recommendation, one path, and one evidence chain.",
    nextBestAction:
      "Keep appointment visibility fresh and keep the read narrow. REVORY is strongest when the read can move from revenue risk to evidence to one next fix.",
    recommendedPath: "Revenue risk -> evidence -> one clear next fix",
    signals: [
      {
        label: "Revenue visible",
        note: "Revenue context currently in view.",
        value: revenueLabel,
      },
      {
        label: "Main offer",
        note: "The commercial story stays anchored in one offer.",
        value: mainOfferLabel,
      },
      {
        label: "Booking path",
        note: "One explicit path keeps the operational risk readable.",
        value: bookingPathLabel,
      },
    ],
    summary:
      "Keep the evidence fresh and the next fix short.",
    title: "The revenue read already feels commercially credible.",
    tone: "real",
  };
}
