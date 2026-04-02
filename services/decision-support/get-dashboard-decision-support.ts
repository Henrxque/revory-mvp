import "server-only";

import { applyDashboardIntentClassification } from "@/services/decision-support/apply-intent-classification";
import { applyDecisionSupportPatch, toDecisionSupportPatch } from "@/services/decision-support/apply-decision-support-patch";
import { buildDashboardDecisionSupport } from "@/services/decision-support/build-dashboard-decision-support";
import type { DashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import { requestBoundedDecisionSupportPatch } from "@/services/llm/request-bounded-decision-support-patch";
import { requestBoundedIntentClassification } from "@/services/llm/request-bounded-intent-classification";
import type { RevoryDecisionSupportRead } from "@/types/decision-support";
import type { RevoryIntentCode, RevoryObjectionCode } from "@/types/intent-classification";

type GetDashboardDecisionSupportInput = {
  bookingPathLabel: string;
  dealValueLabel: string;
  mainOfferLabel: string;
  overview: DashboardOverview;
};

export async function getDashboardDecisionSupport({
  bookingPathLabel,
  dealValueLabel,
  mainOfferLabel,
  overview,
}: GetDashboardDecisionSupportInput): Promise<RevoryDecisionSupportRead> {
  const fallbackRead = buildDashboardDecisionSupport({
    bookingPathLabel,
    dealValueLabel,
    mainOfferLabel,
    overview,
  });
  const allowedIntents: readonly RevoryIntentCode[] =
    overview.bookedAppointments === 0
      ? overview.bookedProofSource
        ? ["REVIEW_BOOKED_PROOF", "START_BOOKED_PROOF"]
        : ["START_BOOKED_PROOF"]
      : overview.upcomingAppointments === 0
        ? ["REFRESH_BOOKED_PROOF", "ADD_LEAD_BASE_SUPPORT"]
        : ["REFRESH_BOOKED_PROOF", "OPEN_REVENUE_VIEW", "ADD_LEAD_BASE_SUPPORT"];
  const allowedObjections: readonly RevoryObjectionCode[] =
    overview.bookedAppointments === 0
      ? overview.leadBaseSource
        ? ["PROOF_NOT_VISIBLE", "LEAD_BASE_ONLY", "PROOF_SOURCE_NEEDS_REVIEW"]
        : ["PROOF_NOT_VISIBLE", "PROOF_SOURCE_NEEDS_REVIEW"]
      : overview.upcomingAppointments === 0
        ? ["THIN_BOOKING_CALENDAR", "SUPPORT_SHOULD_STAY_SECONDARY", "NO_ACTIVE_BLOCKER"]
        : ["NO_ACTIVE_BLOCKER", "SUPPORT_SHOULD_STAY_SECONDARY"];
  const classification = await requestBoundedIntentClassification({
    allowedIntents,
    allowedObjections,
    context: {
      bookedAppointments: overview.bookedAppointments,
      bookingPathLabel,
      canceledAppointments: overview.canceledAppointments,
      dealValueLabel,
      estimatedImportedRevenue: overview.estimatedImportedRevenue,
      hasBookedProofSource: overview.bookedProofSource !== null,
      leadBaseVisible: overview.leadBaseSource !== null,
      mainOfferLabel,
      upcomingAppointments: overview.upcomingAppointments,
    },
    useCase: "dashboard",
  });
  const classifiedRead = applyDashboardIntentClassification(
    fallbackRead,
    classification,
  );
  const patch = await requestBoundedDecisionSupportPatch({
    context: {
      bookedAppointments: overview.bookedAppointments,
      bookingPathLabel,
      canceledAppointments: overview.canceledAppointments,
      classification,
      currentRecommendation: toDecisionSupportPatch(classifiedRead),
      dealValueLabel,
      estimatedImportedRevenue: overview.estimatedImportedRevenue,
      hasBookedProofSource: overview.bookedProofSource !== null,
      leadBaseVisible: overview.leadBaseSource !== null,
      mainOfferLabel,
      upcomingAppointments: overview.upcomingAppointments,
    },
    fallback: toDecisionSupportPatch(classifiedRead),
    prompt:
      "Write a compact REVORY Seller revenue guidance patch. Keep every field to one short sentence. Stay revenue-first, proof-backed, and commercially honest. Respect the provided intent classification and objection classification when they are present. Never imply revenue that is not supported by booked proof or the configured value per booking. Never mention AI, prompts, hidden fallback systems, or analytics expansion. Keep the advice to one next move only.",
    useCase: "dashboard",
  });

  return applyDecisionSupportPatch(classifiedRead, patch);
}
