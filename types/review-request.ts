import type { AppointmentStatus } from "@prisma/client";

export const revoryReviewRequestChannel = "EMAIL" as const;
// Initial MVP policy only. This is a simple post-visit eligibility window, not a reputation ops cadence.
export const revoryReviewEligibilityWindowDays = 7 as const;

export type RevoryReviewRequestEligibilityState =
  | "eligible_for_review_request"
  | "blocked_missing_email"
  | "blocked_missing_reviews_url";

export type RevoryReviewRequestEligibilityReasonCode =
  | "completed_recently"
  | "blocked_missing_email"
  | "blocked_missing_reviews_url";

export type RevoryReviewRequestEligibilityReason = {
  code: RevoryReviewRequestEligibilityReasonCode;
  description: string;
  label: string;
};

export type RevoryReviewRequestEligibilityItem = {
  appointmentId: string;
  clientEmail: string | null;
  clientId: string;
  clientName: string;
  completedAt: Date;
  estimatedRevenue: number | null;
  googleReviewsUrl: string | null;
  providerName: string | null;
  reasons: RevoryReviewRequestEligibilityReason[];
  reviewEligibilityState: RevoryReviewRequestEligibilityState;
  serviceName: string | null;
  status: AppointmentStatus;
};

export type RevoryReviewRequestEligibilityClassification = {
  blockedMissingEmailCount: number;
  blockedMissingReviewsUrlCount: number;
  channel: typeof revoryReviewRequestChannel;
  eligibleCount: number;
  generatedAt: Date;
  items: RevoryReviewRequestEligibilityItem[];
  totalCompletedAppointmentsInWindow: number;
  windowDays: number;
  windowEndsAt: Date;
  windowStartsAt: Date;
};
