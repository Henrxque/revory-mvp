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
    return "Awaiting booked proof";
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
      badgeLabel: "Guided recommendation",
      detectedObjection:
        "Revenue still reads as configured potential until booked appointments are visible in the workspace.",
      eyebrow: "Controlled Read",
      nextBestAction:
        "Open Booking Inputs and add the appointments file first. That is the shortest move that turns this page from setup-backed promise into visible commercial proof.",
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
        "The dashboard is the safest place for an executive read, but it should stay honest: one recommendation, one main objection, and only the proof points already available in the product.",
      title: "Booked proof is still the missing link in the revenue story.",
      tone: "future",
    };
  }

  if (overview.upcomingAppointments === 0) {
    return {
      badgeLabel: "Guided recommendation",
      detectedObjection:
        "Revenue proof is visible, but a thin booked calendar can make the workspace feel less current during demo.",
      eyebrow: "Controlled Read",
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
        "The product now has enough proof to justify a short executive recommendation without drifting into analytics or operational triage.",
      title: "Revenue proof is visible, but the live calendar is thin.",
      tone: "accent",
    };
  }

  return {
    badgeLabel: "Guided recommendation",
    detectedObjection:
      "The main risk now is stale proof. If booked visibility ages, the revenue number stops feeling earned as quickly as it became convincing.",
    eyebrow: "Controlled Read",
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
      "This read makes the dashboard feel more intelligent by naming the highest-leverage commercial move, but it stays contained to the proof the workspace already has.",
    title: "The revenue read already has visible proof underneath.",
    tone: "real",
  };
}
