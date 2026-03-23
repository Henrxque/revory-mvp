import { AppointmentStatus } from "@prisma/client";

import { buildReviewRequestEligibilityClassification } from "@/services/review-request/build-review-request-eligibility-classification";

const now = new Date("2026-03-22T12:00:00.000Z");

const appointments = [
  {
    client: {
      email: "review@example.com",
      firstName: "Ashley",
      fullName: "Ashley Monroe",
      id: "client-1",
      lastName: "Monroe",
    },
    completedAt: new Date("2026-03-21T16:00:00.000Z"),
    estimatedRevenue: 320,
    id: "appointment-eligible",
    providerName: "Dr. Cole",
    scheduledAt: new Date("2026-03-21T15:00:00.000Z"),
    serviceName: "Hydrafacial",
    status: AppointmentStatus.COMPLETED,
  },
  {
    client: {
      email: null,
      firstName: "Bianca",
      fullName: "Bianca Vega",
      id: "client-2",
      lastName: "Vega",
    },
    completedAt: new Date("2026-03-20T10:00:00.000Z"),
    estimatedRevenue: 180,
    id: "appointment-blocked-email",
    providerName: "Nurse Anne",
    scheduledAt: new Date("2026-03-20T09:00:00.000Z"),
    serviceName: "Botox consultation",
    status: AppointmentStatus.COMPLETED,
  },
  {
    client: {
      email: "outside-window@example.com",
      firstName: "Celia",
      fullName: "Celia Frost",
      id: "client-3",
      lastName: "Frost",
    },
    completedAt: new Date("2026-03-10T10:00:00.000Z"),
    estimatedRevenue: 400,
    id: "appointment-old",
    providerName: "Dr. Vale",
    scheduledAt: new Date("2026-03-10T09:00:00.000Z"),
    serviceName: "Laser package",
    status: AppointmentStatus.COMPLETED,
  },
];

const withDestination = buildReviewRequestEligibilityClassification(
  appointments,
  "https://g.page/r/test-reviews",
  now,
);

const withoutDestination = buildReviewRequestEligibilityClassification(
  appointments,
  null,
  now,
);

console.log(
  JSON.stringify(
    {
      withDestination: {
        blockedMissingEmailCount: withDestination.blockedMissingEmailCount,
        blockedMissingReviewsUrlCount: withDestination.blockedMissingReviewsUrlCount,
        eligibleCount: withDestination.eligibleCount,
        itemStates: withDestination.items.map((item) => ({
          appointmentId: item.appointmentId,
          state: item.reviewEligibilityState,
        })),
        totalCompletedAppointmentsInWindow:
          withDestination.totalCompletedAppointmentsInWindow,
      },
      withoutDestination: {
        blockedMissingEmailCount: withoutDestination.blockedMissingEmailCount,
        blockedMissingReviewsUrlCount:
          withoutDestination.blockedMissingReviewsUrlCount,
        eligibleCount: withoutDestination.eligibleCount,
        itemStates: withoutDestination.items.map((item) => ({
          appointmentId: item.appointmentId,
          state: item.reviewEligibilityState,
        })),
        totalCompletedAppointmentsInWindow:
          withoutDestination.totalCompletedAppointmentsInWindow,
      },
    },
    null,
    2,
  ),
);
