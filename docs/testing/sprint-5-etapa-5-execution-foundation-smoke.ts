import { buildOperationalSurface } from "@/services/operations/build-operational-surface";
import {
  buildBlockedOperationalState,
  buildOperationalStateSummary,
  buildPreparedOperationalState,
  buildReadyOperationalState,
} from "@/services/operations/build-operational-state";

const now = new Date("2026-03-27T18:00:00.000Z");

const confirmationReadyState = buildReadyOperationalState();
const confirmationBlockedState = buildBlockedOperationalState(["missing_patient_email"]);
const reviewReadyState = buildReadyOperationalState();
const reviewBlockedState = buildBlockedOperationalState(["missing_patient_email"]);

const surface = await buildOperationalSurface({
  atRisk: {
    atRiskCount: 0,
    attentionNowCount: 0,
    blockedContactCount: 0,
    generatedAt: now,
    items: [],
    policy: {
      confirmationWindowHours: 48,
      immediateWindowHours: 6,
      reminderWindowHours: 24,
    },
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: 0,
      states: [],
      totalBaselineCount: 0,
    }),
    tightWindowCount: 0,
    totalFutureScheduledAppointments: 0,
    watchlistCount: 0,
  },
  confirmation: {
    blockedMissingEmailCount: 1,
    channel: "EMAIL",
    generatedAt: now,
    items: [
      {
        appointmentId: "confirmation-blocked",
        clientEmail: null,
        clientId: "client-confirmation-blocked",
        clientName: "Blocked Confirmation",
        confirmationState: "blocked_missing_email",
        estimatedRevenue: 190,
        hoursUntilAppointment: 18,
        operationalState: confirmationBlockedState,
        providerName: "Dr. Maia",
        reasonCode: "inside_confirmation_window_missing_email",
        requiresAttention: true,
        scheduledAt: new Date("2026-03-28T12:00:00.000Z"),
        serviceName: "Hydrafacial",
        status: "SCHEDULED",
      },
      {
        appointmentId: "confirmation-ready",
        clientEmail: "ready.confirmation@example.com",
        clientId: "client-confirmation-ready",
        clientName: "Ready Confirmation",
        confirmationState: "ready_for_confirmation",
        estimatedRevenue: 210,
        hoursUntilAppointment: 22,
        operationalState: confirmationReadyState,
        providerName: "Dr. Maia",
        reasonCode: "inside_confirmation_window",
        requiresAttention: true,
        scheduledAt: new Date("2026-03-28T16:00:00.000Z"),
        serviceName: "Laser Facial",
        status: "SCHEDULED",
      },
      {
        appointmentId: "confirmation-later",
        clientEmail: "later.confirmation@example.com",
        clientId: "client-confirmation-later",
        clientName: "Later Confirmation",
        confirmationState: "scheduled_later",
        estimatedRevenue: 240,
        hoursUntilAppointment: 72,
        operationalState: buildPreparedOperationalState(),
        providerName: "Dr. Maia",
        reasonCode: "outside_confirmation_window",
        requiresAttention: false,
        scheduledAt: new Date("2026-03-30T18:00:00.000Z"),
        serviceName: "Consultation",
        status: "SCHEDULED",
      },
    ],
    needsAttentionCount: 2,
    readyForConfirmationCount: 1,
    scheduledLaterCount: 1,
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: 3,
      states: [
        confirmationBlockedState,
        confirmationReadyState,
        buildPreparedOperationalState(),
      ],
      totalBaselineCount: 3,
    }),
    totalFutureScheduledAppointments: 3,
    windowEndsAt: new Date("2026-03-29T18:00:00.000Z"),
    windowHours: 48,
  },
  hasAppointmentBase: true,
  recovery: {
    blockedMissingEmailCount: 0,
    canceledOpportunityCount: 1,
    channel: "EMAIL",
    generatedAt: now,
    items: [
      {
        appointmentId: "recovery-ready",
        clientEmail: "recovery.ready@example.com",
        clientId: "client-recovery-ready",
        clientName: "Ready Recovery",
        disruptionDate: new Date("2026-03-26T15:00:00.000Z"),
        estimatedRevenue: 300,
        operationalState: buildReadyOperationalState(),
        providerName: "Dr. Maia",
        reasons: [
          {
            code: "canceled_without_rebooking",
            description: "Canceled without rebooking.",
            label: "Canceled without rebooking",
          },
        ],
        recoveryState: "ready_for_recovery",
        serviceName: "Botox",
        status: "CANCELED",
      },
    ],
    noShowOpportunityCount: 0,
    opportunityCount: 1,
    readyForRecoveryCount: 1,
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: 1,
      states: [buildReadyOperationalState()],
      totalBaselineCount: 1,
    }),
    totalDisruptedAppointmentsInWindow: 1,
    windowDays: 14,
    windowEndsAt: new Date("2026-04-10T18:00:00.000Z"),
    windowStartsAt: new Date("2026-03-13T18:00:00.000Z"),
  },
  reminder: {
    blockedMissingEmailCount: 0,
    channel: "EMAIL",
    generatedAt: now,
    items: [
      {
        appointmentId: "reminder-ready",
        clientEmail: "reminder.ready@example.com",
        clientId: "client-reminder-ready",
        clientName: "Ready Reminder",
        estimatedRevenue: 120,
        hoursUntilAppointment: 8,
        operationalState: buildReadyOperationalState(),
        providerName: "Dr. Maia",
        reasonCode: "inside_reminder_window",
        reminderState: "ready_for_reminder",
        requiresAttention: true,
        scheduledAt: new Date("2026-03-28T02:00:00.000Z"),
        serviceName: "Skin Booster",
        status: "SCHEDULED",
      },
    ],
    needsAttentionCount: 1,
    readyForReminderCount: 1,
    scheduledLaterCount: 0,
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: 1,
      states: [buildReadyOperationalState()],
      totalBaselineCount: 1,
    }),
    totalFutureScheduledAppointments: 1,
    windowEndsAt: new Date("2026-03-28T18:00:00.000Z"),
    windowHours: 24,
  },
  reviewRequest: {
    blockedMissingEmailCount: 1,
    blockedMissingReviewsUrlCount: 0,
    channel: "EMAIL",
    eligibleCount: 1,
    generatedAt: now,
    items: [
      {
        appointmentId: "review-blocked",
        clientEmail: null,
        clientId: "client-review-blocked",
        clientName: "Blocked Review",
        completedAt: new Date("2026-03-27T17:00:00.000Z"),
        estimatedRevenue: 160,
        googleReviewsUrl: "https://g.page/revory-reviews",
        operationalState: reviewBlockedState,
        providerName: "Dr. Maia",
        reasons: [
          {
            code: "completed_recently",
            description: "Completed recently.",
            label: "Completed recently",
          },
          {
            code: "blocked_missing_email",
            description: "Missing patient email.",
            label: "Review request blocked by missing email",
          },
        ],
        reviewEligibilityState: "blocked_missing_email",
        serviceName: "Glow Peel",
        status: "COMPLETED",
      },
      {
        appointmentId: "review-ready",
        clientEmail: "review.ready@example.com",
        clientId: "client-review-ready",
        clientName: "Ready Review",
        completedAt: new Date("2026-03-27T16:00:00.000Z"),
        estimatedRevenue: 180,
        googleReviewsUrl: "https://g.page/revory-reviews",
        operationalState: reviewReadyState,
        providerName: "Dr. Maia",
        reasons: [
          {
            code: "completed_recently",
            description: "Completed recently.",
            label: "Completed recently",
          },
        ],
        reviewEligibilityState: "eligible_for_review_request",
        serviceName: "Collagen Boost",
        status: "COMPLETED",
      },
    ],
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: 2,
      states: [reviewBlockedState, reviewReadyState],
      totalBaselineCount: 2,
    }),
    totalCompletedAppointmentsInWindow: 2,
    windowDays: 7,
    windowEndsAt: now,
    windowStartsAt: new Date("2026-03-20T18:00:00.000Z"),
  },
});

const confirmationCard = surface.categoryCards.find((card) => card.key === "confirmation");
const reviewCard = surface.categoryCards.find((card) => card.key === "review_request");
const confirmationTemplate = surface.templatePreviews.find(
  (preview) => preview.key === "confirmation",
);
const reviewTemplate = surface.templatePreviews.find(
  (preview) => preview.key === "review_request",
);

if (!confirmationCard || !reviewCard || !confirmationTemplate || !reviewTemplate) {
  throw new Error("Sprint 5 execution foundation smoke could not find the expected dashboard structures.");
}

if (confirmationCard.readinessLabel !== "Actionable, with blockers") {
  throw new Error(
    `Expected confirmation card to expose actionable readiness with blockers, received "${confirmationCard.readinessLabel}".`,
  );
}

if (confirmationCard.blockedReason !== "Missing patient email") {
  throw new Error(
    `Expected confirmation card blocked reason to stay visible, received "${confirmationCard.blockedReason}".`,
  );
}

if (reviewCard.readinessLabel !== "Actionable, with blockers") {
  throw new Error(
    `Expected review card to expose actionable readiness with blockers, received "${reviewCard.readinessLabel}".`,
  );
}

if (reviewCard.blockedReason !== "Missing patient email") {
  throw new Error(
    `Expected review card blocked reason to stay visible, received "${reviewCard.blockedReason}".`,
  );
}

if (confirmationTemplate.outreachStateLabel !== "Prepared base, with blockers") {
  throw new Error(
    `Expected confirmation template to expose mixed readiness, received "${confirmationTemplate.outreachStateLabel}".`,
  );
}

if (confirmationTemplate.blockedReason !== "Missing patient email") {
  throw new Error(
    `Expected confirmation template blocked reason to stay visible, received "${confirmationTemplate.blockedReason}".`,
  );
}

if (!confirmationTemplate.body.includes("Hi Ready,")) {
  throw new Error(
    "Expected confirmation template preview to use the actionable appointment as the current example source.",
  );
}

if (reviewTemplate.outreachStateLabel !== "Prepared base, with blockers") {
  throw new Error(
    `Expected review template to expose mixed readiness, received "${reviewTemplate.outreachStateLabel}".`,
  );
}

if (reviewTemplate.blockedReason !== "Missing patient email") {
  throw new Error(
    `Expected review template blocked reason to stay visible, received "${reviewTemplate.blockedReason}".`,
  );
}

if (!reviewTemplate.body.includes("Hi Ready,")) {
  throw new Error(
    "Expected review template preview to use the actionable visit as the current example source.",
  );
}

console.log(
  JSON.stringify(
    {
      confirmationCard: {
        blockedReason: confirmationCard.blockedReason,
        count: confirmationCard.count,
        nextAction: confirmationCard.nextAction,
        readinessLabel: confirmationCard.readinessLabel,
      },
      confirmationTemplate: {
        blockedReason: confirmationTemplate.blockedReason,
        bodyPreview: confirmationTemplate.body.split("\n").slice(0, 2),
        outreachStateLabel: confirmationTemplate.outreachStateLabel,
      },
      reviewCard: {
        blockedReason: reviewCard.blockedReason,
        count: reviewCard.count,
        nextAction: reviewCard.nextAction,
        readinessLabel: reviewCard.readinessLabel,
      },
      reviewTemplate: {
        blockedReason: reviewTemplate.blockedReason,
        bodyPreview: reviewTemplate.body.split("\n").slice(0, 2),
        outreachStateLabel: reviewTemplate.outreachStateLabel,
      },
    },
    null,
    2,
  ),
);
