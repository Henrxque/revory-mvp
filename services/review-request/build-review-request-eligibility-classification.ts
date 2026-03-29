import { AppointmentStatus } from "@prisma/client";

import {
  revoryReviewEligibilityWindowDays,
  revoryReviewRequestChannel,
  type RevoryReviewRequestEligibilityClassification,
  type RevoryReviewRequestEligibilityItem,
  type RevoryReviewRequestEligibilityReason,
} from "@/types/review-request";
import {
  buildBlockedOperationalState,
  buildOperationalStateSummary,
  buildReadyOperationalState,
} from "@/services/operations/build-operational-state";
import { getUsableEmail } from "@/services/operations/get-usable-email";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ReviewRequestEligibilityAppointmentRecord = {
  client: {
    email: string | null;
    firstName: string | null;
    fullName: string | null;
    id: string;
    lastName: string | null;
  };
  completedAt: Date | null;
  estimatedRevenue: number | null;
  id: string;
  providerName: string | null;
  scheduledAt: Date;
  serviceName: string | null;
  status: AppointmentStatus;
};

function resolveClientName(
  client: ReviewRequestEligibilityAppointmentRecord["client"],
) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const composedName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || "Client pending";
}

function normalizeGoogleReviewsUrl(value: string | null) {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function resolveCompletionTimestamp(
  appointment: ReviewRequestEligibilityAppointmentRecord,
) {
  return appointment.completedAt ?? appointment.scheduledAt;
}

function buildBaseReason(): RevoryReviewRequestEligibilityReason {
  return {
    code: "completed_recently",
    description:
      "The appointment was completed recently enough to qualify for a simple post-visit feedback request in the MVP.",
    label: "Completed recently",
  };
}

function buildEligibilityItem(
  appointment: ReviewRequestEligibilityAppointmentRecord,
  googleReviewsUrl: string | null,
): RevoryReviewRequestEligibilityItem | null {
  if (appointment.status !== AppointmentStatus.COMPLETED) {
    return null;
  }

  const clientEmail = getUsableEmail(appointment.client.email);
  const normalizedGoogleReviewsUrl = normalizeGoogleReviewsUrl(googleReviewsUrl);
  const completedAt = resolveCompletionTimestamp(appointment);
  const reasons: RevoryReviewRequestEligibilityReason[] = [buildBaseReason()];

  if (!clientEmail) {
    reasons.push({
      code: "blocked_missing_email",
      description:
        "REVORY identified the post-visit feedback opportunity, but there is no usable email for the client in the current MVP.",
      label: "Feedback request blocked by missing email",
    });
  }

  if (!normalizedGoogleReviewsUrl) {
    reasons.push({
      code: "blocked_missing_reviews_url",
      description:
        "REVORY identified the post-visit feedback opportunity, but the workspace has no Google feedback link configured yet.",
      label: "Feedback request blocked by missing feedback destination",
    });
  }

  return {
    appointmentId: appointment.id,
    clientEmail,
    clientId: appointment.client.id,
    clientName: resolveClientName(appointment.client),
    completedAt,
    estimatedRevenue: appointment.estimatedRevenue,
    googleReviewsUrl: normalizedGoogleReviewsUrl,
    operationalState: !clientEmail
      ? buildBlockedOperationalState(["missing_patient_email"])
      : !normalizedGoogleReviewsUrl
        ? buildBlockedOperationalState(["missing_reviews_destination"])
        : buildReadyOperationalState(),
    providerName: appointment.providerName,
    reasons,
    reviewEligibilityState: !clientEmail
      ? "blocked_missing_email"
      : !normalizedGoogleReviewsUrl
        ? "blocked_missing_reviews_url"
        : "eligible_for_review_request",
    serviceName: appointment.serviceName,
    status: appointment.status,
  };
}

export function buildReviewRequestEligibilityClassification(
  appointments: ReviewRequestEligibilityAppointmentRecord[],
  googleReviewsUrl: string | null,
  now = new Date(),
): RevoryReviewRequestEligibilityClassification {
  const windowStartsAt = new Date(
    now.getTime() - revoryReviewEligibilityWindowDays * DAY_IN_MS,
  );
  const windowEndsAt = now;

  const recentCompletedAppointments = appointments.filter((appointment) => {
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      return false;
    }

    const completedAt = resolveCompletionTimestamp(appointment).getTime();

    return (
      completedAt >= windowStartsAt.getTime() &&
      completedAt <= windowEndsAt.getTime()
    );
  });

  const items = recentCompletedAppointments
    .map((appointment) => buildEligibilityItem(appointment, googleReviewsUrl))
    .filter((item): item is RevoryReviewRequestEligibilityItem => item !== null)
    .sort((left, right) => right.completedAt.getTime() - left.completedAt.getTime());

  return {
    blockedMissingEmailCount: items.filter((item) =>
      item.reasons.some((reason) => reason.code === "blocked_missing_email"),
    ).length,
    blockedMissingReviewsUrlCount: items.filter((item) =>
      item.reasons.some((reason) => reason.code === "blocked_missing_reviews_url"),
    ).length,
    channel: revoryReviewRequestChannel,
    eligibleCount: items.filter(
      (item) => item.reviewEligibilityState === "eligible_for_review_request",
    ).length,
    generatedAt: now,
    items,
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: items.length,
      states: items.map((item) => item.operationalState),
      totalBaselineCount: recentCompletedAppointments.length,
    }),
    totalCompletedAppointmentsInWindow: recentCompletedAppointments.length,
    windowDays: revoryReviewEligibilityWindowDays,
    windowEndsAt,
    windowStartsAt,
  };
}
