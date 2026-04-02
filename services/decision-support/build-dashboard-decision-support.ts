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

  if (overview.bookedAppointments === 0) {
    return {
      badgeLabel: "Seller guidance",
      detectedObjection:
        "Revenue still reads like configured potential until booked appointments are visible.",
      eyebrow: "Revenue read",
      fallbackLabel: "If proof softens",
      fallbackNote:
        "If booked proof is still missing, Seller keeps revenue waiting and points back to Booking Inputs.",
      guardrailLabel: "Seller stays narrow",
      guardrailNote:
        "This recommendation only uses proof already visible inside the workspace.",
      nextBestAction:
        "Open Booking Inputs and add the appointments file first. That is the shortest move from setup to visible commercial proof.",
      recommendedPath: "Booking Inputs -> booked proof -> revenue view",
      signals: [
        {
          label: "Booked proof",
          note: "This is still the missing proof layer.",
          value: "Not visible yet",
        },
        {
          label: "Value per booking",
          note: "The activation baseline is already in place.",
          value: dealValueLabel,
        },
        {
          label: "Booking path",
          note: "The handoff is already defined before proof arrives.",
          value: bookingPathLabel,
        },
      ],
      summary:
        "Keep the read simple: booked proof first, then let revenue lead.",
      title: "Booked proof is still the missing link.",
      tone: "future",
    };
  }

  if (overview.upcomingAppointments === 0) {
    return {
      badgeLabel: "Seller guidance",
      detectedObjection:
        "Revenue proof is visible, but a thin booked calendar can make the workspace feel less current in demo.",
      eyebrow: "Revenue read",
      fallbackLabel: "If proof softens",
      fallbackNote:
        "If the calendar stays thin, Seller keeps the next move on refreshing booked proof only.",
      guardrailLabel: "Seller stays narrow",
      guardrailNote:
        "This recommendation stays inside the current proof layer: revenue, booked appointments, and one refresh move.",
      nextBestAction:
        "Refresh booked visibility so the revenue number keeps a live appointment layer underneath it. Seller looks strongest when revenue and upcoming bookings still agree.",
      recommendedPath: "Refresh booked proof -> keep revenue and calendar aligned",
      signals: [
        {
          label: "Revenue visible",
          note: "This is the current booked revenue read.",
          value: revenueLabel,
        },
        {
          label: "Booked appointments",
          note: "Booked outcomes currently supporting the number above.",
          value: `${overview.bookedAppointments}`,
        },
        {
          label: "Upcoming bookings",
          note: "This is the live calendar layer still visible right now.",
          value: `${overview.upcomingAppointments}`,
        },
      ],
      summary:
        "One refresh keeps the revenue read current without adding operational weight.",
      title: "Revenue is visible, but the live calendar is thin.",
      tone: "accent",
    };
  }

  return {
    badgeLabel: "Seller guidance",
    detectedObjection:
      "The main risk now is stale proof behind the revenue number.",
    eyebrow: "Revenue read",
    fallbackLabel: "If proof softens",
    fallbackNote:
      "If proof quality drops, Seller falls back to the same narrow move: refresh booked proof.",
    guardrailLabel: "Seller stays narrow",
    guardrailNote:
      "The dashboard keeps one recommendation, one path, and one proof chain.",
    nextBestAction:
      "Keep booked visibility fresh and keep the read narrow. Seller is strongest when the demo can move from revenue to proof to next move in one short sequence.",
    recommendedPath: "Revenue -> proof -> one clear next move",
    signals: [
      {
        label: "Revenue visible",
        note: "Booked revenue currently in view.",
        value: revenueLabel,
      },
      {
        label: "Main offer",
        note: "The commercial story stays anchored in one offer.",
        value: mainOfferLabel,
      },
      {
        label: "Booking path",
        note: "One explicit handoff keeps the proof believable.",
        value: bookingPathLabel,
      },
    ],
    summary:
      "Keep the proof fresh and the next move short.",
    title: "The revenue read already feels commercially credible.",
    tone: "real",
  };
}
