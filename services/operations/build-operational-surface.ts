import type { RevoryAtRiskClassification } from "@/types/at-risk";
import type { RevoryConfirmationClassification } from "@/types/confirmation";
import {
  buildOperationalCategoryReadiness,
  formatOperationalReasonLabel,
} from "@/services/operations/build-operational-state";
import { buildOperationalTemplatePreviews } from "@/services/operations/operational-templates";
import type {
  RevoryOperationalCategory,
  RevoryOperationalCategoryReadiness,
  RevoryOperationalReasonCode,
  RevoryOperationalState,
} from "@/types/operational-state";
import type {
  RevoryOperationalCard,
  RevoryOperationalPriorityItem,
  RevoryOperationalReadinessState,
  RevoryOperationalSurface,
  RevoryOperationalTone,
} from "@/types/operations";
import type { RevoryRecoveryOpportunityClassification } from "@/types/recovery";
import type { RevoryReminderClassification } from "@/types/reminder";
import type { RevoryReviewRequestEligibilityClassification } from "@/types/review-request";

type BuildOperationalSurfaceInput = {
  atRisk: RevoryAtRiskClassification;
  confirmation: RevoryConfirmationClassification;
  hasAppointmentBase: boolean;
  recovery: RevoryRecoveryOpportunityClassification;
  reminder: RevoryReminderClassification;
  reviewRequest: RevoryReviewRequestEligibilityClassification;
};

type CategoryCardInput = {
  blockedCount: number;
  classifiedCount: number;
  count: number;
  description: string;
  emptyLabel: string;
  kindLabel: string;
  key: RevoryOperationalCard["key"];
  nextAction: string;
  readiness: RevoryOperationalCategoryReadiness;
  title: string;
};

function resolveCategoryDisplayCount(
  readiness: RevoryOperationalCategoryReadiness,
  counts: {
    blocked: number;
    detected?: number;
    prepared: number;
    ready: number;
  },
) {
  switch (readiness.stage) {
    case "ready":
      return counts.ready;
    case "blocked":
      return counts.blocked;
    case "prepared":
      return counts.prepared;
    case "eligible":
    case "classified":
      return counts.detected ?? counts.ready;
  }
}

function collectReasonCodes(states: RevoryOperationalState[]) {
  return states.flatMap((state) => state.reasonCodes);
}

function formatBlockedReason(reasonCodes: RevoryOperationalReasonCode[]) {
  const firstReason = reasonCodes[0];

  return firstReason ? formatOperationalReasonLabel(firstReason) : null;
}

function getCategoryTone(
  readiness: RevoryOperationalCategoryReadiness,
  fallback: RevoryOperationalTone = "neutral",
): RevoryOperationalTone {
  if (readiness.readyCount > 0 && readiness.blockedCount > 0) {
    return "future";
  }

  switch (readiness.stage) {
    case "ready":
      return "real";
    case "blocked":
      return "future";
    case "prepared":
      return "neutral";
    case "eligible":
    case "classified":
      return fallback;
  }
}

function getCategoryReadinessLabel(readiness: RevoryOperationalCategoryReadiness) {
  if (readiness.readyCount > 0 && readiness.blockedCount > 0) {
    return "Partially ready";
  }

  switch (readiness.stage) {
    case "ready":
      return "Ready now";
    case "blocked":
      return "Blocked";
    case "prepared":
      return "Prepared";
    case "eligible":
      return "Eligible";
    case "classified":
      return "Detected";
  }
}

function buildCategoryCard({
  blockedCount,
  classifiedCount,
  count,
  description,
  emptyLabel,
  kindLabel,
  key,
  nextAction,
  readiness,
  title,
}: CategoryCardInput): RevoryOperationalCard {
  return {
    blockedCount,
    blockedReason:
      readiness.blockedCount > 0
        ? formatBlockedReason(readiness.primaryReasonCodes)
        : null,
    count,
    description,
    emptyLabel,
    kindLabel,
    key,
    nextAction,
    readinessLabel: getCategoryReadinessLabel(readiness),
    title,
    tone:
      count === 0 && classifiedCount === 0
        ? "neutral"
        : getCategoryTone(readiness, "neutral"),
  };
}

function buildCategoryReadiness(
  category: RevoryOperationalCategory,
  states: RevoryOperationalState[],
  stateSummary: {
    blockedCount: number;
    classifiedCount: number;
    eligibleCount: number;
    notEligibleCount: number;
    preparedCount: number;
    readyForActionCount: number;
  },
) {
  return buildOperationalCategoryReadiness({
    category,
    reasonCodes: collectReasonCodes(states),
    stateSummary,
  });
}

function buildPriorityItemReadiness(state: RevoryOperationalState) {
  const blockedReason = state.isBlocked
    ? formatBlockedReason(state.blockedReasonCodes)
    : null;
  const readinessState: RevoryOperationalReadinessState = state.isBlocked
    ? "blocked"
    : state.isPrepared
      ? "prepared"
      : "ready_now";
  const readinessLabel =
    readinessState === "blocked"
      ? "Blocked"
      : readinessState === "prepared"
        ? "Prepared"
        : "Ready now";
  const stateTone: RevoryOperationalTone =
    readinessState === "blocked"
      ? "future"
      : readinessState === "prepared"
        ? "neutral"
        : "real";

  return {
    blockedReason,
    readinessLabel,
    readinessState,
    stateLabel: readinessLabel,
    stateTone,
  } as const;
}

function getBlockedAppointmentIds(input: BuildOperationalSurfaceInput) {
  const blockedIds = new Set<string>();

  for (const item of input.atRisk.items) {
    if (item.reasons.some((reason) => reason.code.includes("missing_email"))) {
      blockedIds.add(item.appointmentId);
    }
  }

  for (const item of input.recovery.items) {
    if (item.operationalState.isBlocked) {
      blockedIds.add(item.appointmentId);
    }
  }

  for (const item of input.reviewRequest.items) {
    if (item.operationalState.isBlocked) {
      blockedIds.add(item.appointmentId);
    }
  }

  return blockedIds;
}

function buildCategoryCards(
  input: BuildOperationalSurfaceInput,
): RevoryOperationalCard[] {
  const confirmationReadiness = buildCategoryReadiness(
    "confirmation",
    input.confirmation.items.map((item) => item.operationalState),
    input.confirmation.stateSummary,
  );
  const reminderReadiness = buildCategoryReadiness(
    "reminder",
    input.reminder.items.map((item) => item.operationalState),
    input.reminder.stateSummary,
  );
  const recoveryReadiness = buildCategoryReadiness(
    "recovery",
    input.recovery.items.map((item) => item.operationalState),
    input.recovery.stateSummary,
  );
  const reviewReadiness = buildCategoryReadiness(
    "review_request",
    input.reviewRequest.items.map((item) => item.operationalState),
    input.reviewRequest.stateSummary,
  );

  const atRiskPreparedCount = input.atRisk.items.filter(
    (item) => item.operationalState.isPrepared,
  ).length;
  const atRiskReadyCount = input.atRisk.items.filter(
    (item) => item.operationalState.isReadyForAction,
  ).length;

  return [
    {
      blockedCount: input.atRisk.blockedContactCount,
      blockedReason:
        input.atRisk.blockedContactCount > 0
          ? "Missing patient email"
          : null,
      count: input.atRisk.atRiskCount,
      description:
        input.atRisk.atRiskCount > 0
          ? `${input.atRisk.attentionNowCount} need immediate attention and ${input.atRisk.watchlistCount} stay visible as secondary watchlist signals.`
          : "No appointments currently match the active at-risk signals.",
      emptyLabel: "No live items",
      kindLabel: "Priority signal",
      key: "at_risk",
      nextAction:
        input.atRisk.atRiskCount > 0
          ? "Read these signals first. REVORY is surfacing operational urgency, not predictive scoring."
          : "Keep the appointment base fresh so the at-risk layer stays trustworthy.",
      readinessLabel:
        atRiskReadyCount > 0
          ? "Ready now"
          : atRiskPreparedCount > 0
            ? "Prepared"
            : "Detected",
      title: "At-risk appointments",
      tone:
        input.atRisk.attentionNowCount > 0
          ? "accent"
          : input.atRisk.atRiskCount > 0
            ? "future"
            : "neutral",
    },
    buildCategoryCard({
      blockedCount: input.confirmation.blockedMissingEmailCount,
      classifiedCount: input.confirmation.stateSummary.classifiedCount,
      count: resolveCategoryDisplayCount(confirmationReadiness, {
        blocked: input.confirmation.blockedMissingEmailCount,
        detected: input.confirmation.stateSummary.classifiedCount,
        prepared: input.confirmation.scheduledLaterCount,
        ready: input.confirmation.readyForConfirmationCount,
      }),
      description:
        input.confirmation.readyForConfirmationCount > 0 &&
        input.confirmation.blockedMissingEmailCount > 0
          ? `${input.confirmation.readyForConfirmationCount} appointments are already inside the ${input.confirmation.windowHours}h confirmation window, and ${input.confirmation.blockedMissingEmailCount} more are still blocked by missing email.`
          : input.confirmation.readyForConfirmationCount > 0
          ? `${input.confirmation.readyForConfirmationCount} appointments are already inside the ${input.confirmation.windowHours}h confirmation window.`
          : input.confirmation.blockedMissingEmailCount > 0
            ? `${input.confirmation.blockedMissingEmailCount} appointments are eligible for confirmation but still blocked by missing email.`
            : input.confirmation.scheduledLaterCount > 0
              ? `${input.confirmation.scheduledLaterCount} future appointments are already classified, but remain outside the active confirmation window.`
              : "No appointments are currently waiting in the confirmation queue.",
      emptyLabel: "No one in queue",
      kindLabel: "Ready queue",
      key: "confirmation",
      nextAction:
        input.confirmation.readyForConfirmationCount > 0 &&
        input.confirmation.blockedMissingEmailCount > 0
          ? "Use the ready confirmation queue first, then fix the client email path for the blocked confirmations."
          : input.confirmation.readyForConfirmationCount > 0
          ? "Use the confirmation queue first; blocked items stay secondary to the ready path."
          : input.confirmation.blockedMissingEmailCount > 0
            ? "Tighten the client email base so eligible confirmations can move from blocked to ready."
            : "Keep confirmation visible as a narrow email-first queue, not a larger workflow.",
      readiness: confirmationReadiness,
      title: "Confirmation queue",
    }),
    buildCategoryCard({
      blockedCount: input.reminder.blockedMissingEmailCount,
      classifiedCount: input.reminder.stateSummary.classifiedCount,
      count: resolveCategoryDisplayCount(reminderReadiness, {
        blocked: input.reminder.blockedMissingEmailCount,
        detected: input.reminder.stateSummary.classifiedCount,
        prepared: input.reminder.scheduledLaterCount,
        ready: input.reminder.readyForReminderCount,
      }),
      description:
        input.reminder.readyForReminderCount > 0 &&
        input.reminder.blockedMissingEmailCount > 0
          ? `${input.reminder.readyForReminderCount} appointments are already inside the ${input.reminder.windowHours}h reminder window, and ${input.reminder.blockedMissingEmailCount} more are still blocked by missing email.`
          : input.reminder.readyForReminderCount > 0
          ? `${input.reminder.readyForReminderCount} appointments are already inside the ${input.reminder.windowHours}h reminder window.`
          : input.reminder.blockedMissingEmailCount > 0
            ? `${input.reminder.blockedMissingEmailCount} appointments are eligible for reminder but still blocked by missing email.`
            : input.reminder.scheduledLaterCount > 0
              ? `${input.reminder.scheduledLaterCount} future appointments are already classified, but remain outside the active reminder window.`
              : "No appointments are currently waiting in the reminder queue.",
      emptyLabel: "No one in queue",
      kindLabel: "Ready queue",
      key: "reminder",
      nextAction:
        input.reminder.readyForReminderCount > 0 &&
        input.reminder.blockedMissingEmailCount > 0
          ? "Use the ready reminder queue first, then fix the client email path for the blocked reminders."
          : input.reminder.readyForReminderCount > 0
          ? "Use the reminder queue after at-risk and confirmation needs are understood."
          : input.reminder.blockedMissingEmailCount > 0
            ? "Fix the client email path first so reminder readiness can move forward cleanly."
            : "Keep reminder visible as a narrow email-first layer, not as a campaign system.",
      readiness: reminderReadiness,
      title: "Reminder queue",
    }),
    buildCategoryCard({
      blockedCount: input.recovery.blockedMissingEmailCount,
      classifiedCount: input.recovery.stateSummary.classifiedCount,
      count: resolveCategoryDisplayCount(recoveryReadiness, {
        blocked: input.recovery.blockedMissingEmailCount,
        detected: input.recovery.stateSummary.classifiedCount,
        prepared: input.recovery.stateSummary.preparedCount,
        ready: input.recovery.readyForRecoveryCount,
      }),
      description:
        input.recovery.readyForRecoveryCount > 0 &&
        input.recovery.blockedMissingEmailCount > 0
          ? `${input.recovery.opportunityCount} recent disruptions were surfaced; ${input.recovery.readyForRecoveryCount} are already ready and ${input.recovery.blockedMissingEmailCount} stay blocked by missing email.`
          : input.recovery.opportunityCount > 0
            ? `${input.recovery.opportunityCount} recent disruptions were surfaced as initial recovery opportunities, not as a rebooking engine.`
          : "No cancellations or no-shows currently qualify for near-term recovery.",
      emptyLabel: "No open opportunities",
      kindLabel: "Opportunity",
      key: "recovery",
      nextAction:
        input.recovery.readyForRecoveryCount > 0 &&
        input.recovery.blockedMissingEmailCount > 0
          ? "Use the ready recovery paths first, then tighten the email base for the blocked opportunities."
          : input.recovery.readyForRecoveryCount > 0
          ? "Use recovery as a guided follow-up opportunity, not as a call-center flow."
          : input.recovery.blockedMissingEmailCount > 0
            ? "Tighten the email base first; recovery opportunity stays visible but blocked."
            : "Keep recovery narrow and tied to the imported schedule quality.",
      readiness: recoveryReadiness,
      title: "Recovery opportunities",
    }),
    buildCategoryCard({
      blockedCount:
        input.reviewRequest.blockedMissingEmailCount +
        input.reviewRequest.blockedMissingReviewsUrlCount,
      classifiedCount: input.reviewRequest.stateSummary.classifiedCount,
      count: resolveCategoryDisplayCount(reviewReadiness, {
        blocked:
          input.reviewRequest.blockedMissingEmailCount +
          input.reviewRequest.blockedMissingReviewsUrlCount,
        detected: input.reviewRequest.stateSummary.classifiedCount,
        prepared: input.reviewRequest.totalCompletedAppointmentsInWindow,
        ready: input.reviewRequest.eligibleCount,
      }),
      description:
        input.reviewRequest.eligibleCount > 0 &&
        input.reviewRequest.blockedMissingEmailCount +
          input.reviewRequest.blockedMissingReviewsUrlCount >
          0
          ? `${input.reviewRequest.eligibleCount} completed visits are already eligible for the first review-request layer, and ${
              input.reviewRequest.blockedMissingEmailCount +
              input.reviewRequest.blockedMissingReviewsUrlCount
            } more are still blocked by missing email or missing reviews destination.`
          : input.reviewRequest.eligibleCount > 0
          ? `${input.reviewRequest.eligibleCount} completed visits are already eligible for the first review-request layer.`
          : input.reviewRequest.totalCompletedAppointmentsInWindow > 0
            ? "Completed visits were detected, but the current path is still blocked by missing email or missing reviews destination."
            : "No completed visits are currently review-ready in the initial window.",
      emptyLabel: "No eligible visits",
      kindLabel: "Eligibility",
      key: "review_request",
      nextAction:
        input.reviewRequest.eligibleCount > 0 &&
        input.reviewRequest.blockedMissingEmailCount +
          input.reviewRequest.blockedMissingReviewsUrlCount >
          0
          ? "Use the ready review-request path first, then resolve the missing email or reviews destination on the blocked visits."
          : input.reviewRequest.eligibleCount > 0
          ? "Keep reviews in eligibility mode: visible, guided, and still far from a full reputation ops suite."
          : input.reviewRequest.blockedMissingReviewsUrlCount > 0
            ? "Configure the Google Reviews destination before the review path can move from blocked to ready."
            : "Tighten the client email base first so review eligibility can progress cleanly.",
      readiness: reviewReadiness,
      title: "Review-ready visits",
    }),
  ];
}

function buildAtRiskPriorityItems(
  atRisk: RevoryAtRiskClassification,
): RevoryOperationalPriorityItem[] {
  return [...atRisk.items]
    .sort((left, right) => {
      if (left.attentionLevel !== right.attentionLevel) {
        return left.attentionLevel === "attention_now" ? -1 : 1;
      }

      return left.scheduledAt.getTime() - right.scheduledAt.getTime();
    })
    .map((item) => ({
      blockedReason: item.reasons.some((reason) => reason.code.includes("missing_email"))
        ? "Missing patient email"
        : null,
      categoryKey: "at_risk",
      categoryLabel: "At-risk",
      clientName: item.clientName,
      estimatedRevenue: item.estimatedRevenue,
      id: item.appointmentId,
      insight: item.reasons.map((reason) => reason.label).join(" + "),
      nextAction: item.reasons.some((reason) => reason.code.includes("missing_email"))
        ? "Add a patient email so REVORY can support the next operational step."
        : "Keep this appointment visible now and protect the slot before it goes cold.",
      providerName: item.providerName,
      readinessLabel:
        item.attentionLevel === "attention_now" ? "Ready now" : "Prepared",
      readinessState:
        item.attentionLevel === "attention_now" ? "ready_now" : "prepared",
      serviceName: item.serviceName,
      stateLabel:
        item.attentionLevel === "attention_now" ? "Attention now" : "Watchlist",
      stateTone:
        item.attentionLevel === "attention_now" ? "accent" : "future",
      timestamp: item.scheduledAt,
      timestampLabel: "Scheduled",
    }));
}

function buildReminderPriorityItems(
  reminder: RevoryReminderClassification,
  seenAppointmentIds: Set<string>,
): RevoryOperationalPriorityItem[] {
  return reminder.items
    .filter((item) => item.requiresAttention && !seenAppointmentIds.has(item.appointmentId))
    .map((item) => {
      const readiness = buildPriorityItemReadiness(item.operationalState);

      return {
        blockedReason: readiness.blockedReason,
        categoryKey: "reminder",
        categoryLabel: "Reminder",
        clientName: item.clientName,
        estimatedRevenue: item.estimatedRevenue,
        id: item.appointmentId,
        insight:
          item.reminderState === "blocked_missing_email"
            ? "Eligible for reminder, but blocked by missing patient email"
            : "Inside reminder window",
        nextAction:
          item.reminderState === "blocked_missing_email"
            ? "Add a patient email to move this reminder path from blocked to ready."
            : "Keep this appointment visible in the narrow reminder-ready queue.",
        providerName: item.providerName,
        readinessLabel: readiness.readinessLabel,
        readinessState: readiness.readinessState,
        serviceName: item.serviceName,
        stateLabel: readiness.stateLabel,
        stateTone: readiness.stateTone,
        timestamp: item.scheduledAt,
        timestampLabel: "Scheduled",
      };
    });
}

function buildConfirmationPriorityItems(
  confirmation: RevoryConfirmationClassification,
  seenAppointmentIds: Set<string>,
): RevoryOperationalPriorityItem[] {
  return confirmation.items
    .filter((item) => item.requiresAttention && !seenAppointmentIds.has(item.appointmentId))
    .map((item) => {
      const readiness = buildPriorityItemReadiness(item.operationalState);

      return {
        blockedReason: readiness.blockedReason,
        categoryKey: "confirmation",
        categoryLabel: "Confirmation",
        clientName: item.clientName,
        estimatedRevenue: item.estimatedRevenue,
        id: item.appointmentId,
        insight:
          item.confirmationState === "blocked_missing_email"
            ? "Eligible for confirmation, but blocked by missing patient email"
            : "Inside confirmation window",
        nextAction:
          item.confirmationState === "blocked_missing_email"
            ? "Add a patient email to move this confirmation path from blocked to ready."
            : "Keep this appointment visible in the confirmation-ready queue.",
        providerName: item.providerName,
        readinessLabel: readiness.readinessLabel,
        readinessState: readiness.readinessState,
        serviceName: item.serviceName,
        stateLabel: readiness.stateLabel,
        stateTone: readiness.stateTone,
        timestamp: item.scheduledAt,
        timestampLabel: "Scheduled",
      };
    });
}

function buildRecoveryPriorityItems(
  recovery: RevoryRecoveryOpportunityClassification,
): RevoryOperationalPriorityItem[] {
  return recovery.items.map((item) => {
    const readiness = buildPriorityItemReadiness(item.operationalState);

    return {
      blockedReason: readiness.blockedReason,
      categoryKey: "recovery",
      categoryLabel: "Recovery",
      clientName: item.clientName,
      estimatedRevenue: item.estimatedRevenue,
      id: item.appointmentId,
      insight: item.reasons[0]?.label ?? "Recovery opportunity surfaced",
      nextAction:
        item.recoveryState === "blocked_missing_email"
          ? "Add a patient email before REVORY can support recovery here."
          : "Keep this disrupted visit visible for the first recovery outreach layer.",
      providerName: item.providerName,
      readinessLabel: readiness.readinessLabel,
      readinessState: readiness.readinessState,
      serviceName: item.serviceName,
      stateLabel: readiness.stateLabel,
      stateTone: readiness.stateTone,
      timestamp: item.disruptionDate,
      timestampLabel: "Disrupted",
    };
  });
}

function buildReviewPriorityItems(
  reviewRequest: RevoryReviewRequestEligibilityClassification,
): RevoryOperationalPriorityItem[] {
  return reviewRequest.items.map((item) => {
    const readiness = buildPriorityItemReadiness(item.operationalState);

    return {
      blockedReason: readiness.blockedReason,
      categoryKey: "review_request",
      categoryLabel: "Reviews",
      clientName: item.clientName,
      estimatedRevenue: item.estimatedRevenue,
      id: item.appointmentId,
      insight:
        item.reviewEligibilityState === "blocked_missing_reviews_url"
          ? "Eligible for review visibility, but blocked by missing reviews destination"
          : item.reviewEligibilityState === "blocked_missing_email"
            ? "Eligible for review visibility, but blocked by missing patient email"
            : "Completed recently and eligible for a review request",
      nextAction:
        item.reviewEligibilityState === "eligible_for_review_request"
          ? "Keep this visit visible for the first email-first review layer."
          : item.reviewEligibilityState === "blocked_missing_reviews_url"
            ? "Configure the Google Reviews destination before REVORY can support the request."
            : "Add a patient email before REVORY can support the request.",
      providerName: item.providerName,
      readinessLabel: readiness.readinessLabel,
      readinessState: readiness.readinessState,
      serviceName: item.serviceName,
      stateLabel: readiness.stateLabel,
      stateTone: readiness.stateTone,
      timestamp: item.completedAt,
      timestampLabel: "Completed",
    };
  });
}

function buildPriorityItems(
  input: BuildOperationalSurfaceInput,
): RevoryOperationalPriorityItem[] {
  const seenAppointmentIds = new Set<string>();
  const items: RevoryOperationalPriorityItem[] = [];

  const addItems = (nextItems: RevoryOperationalPriorityItem[]) => {
    for (const item of nextItems) {
      if (seenAppointmentIds.has(item.id)) {
        continue;
      }

      seenAppointmentIds.add(item.id);
      items.push(item);
    }
  };

  addItems(buildAtRiskPriorityItems(input.atRisk));
  addItems(buildReminderPriorityItems(input.reminder, seenAppointmentIds));
  addItems(buildConfirmationPriorityItems(input.confirmation, seenAppointmentIds));
  addItems(buildRecoveryPriorityItems(input.recovery));
  addItems(buildReviewPriorityItems(input.reviewRequest));

  return items.slice(0, 4);
}

function buildPrioritySummary(
  input: BuildOperationalSurfaceInput,
  priorityItems: RevoryOperationalPriorityItem[],
  blockedCount: number,
): RevoryOperationalSurface["prioritySummary"] {
  if (!input.hasAppointmentBase) {
    return {
      description:
        "REVORY already knows how to classify confirmation, reminders, at-risk signals, recovery, and review eligibility. This layer turns on as soon as the workspace has appointments to monitor.",
      headline: "Operational visibility starts after the first appointments import.",
      suggestedNextAction:
        "Open Imports and bring in the first appointments CSV so the operational layer has something real to read.",
    };
  }

  if (priorityItems.length === 0) {
    return {
      description:
        "The imported base is live, but no current appointment, disruption, or completed visit needs operational attention right now.",
      headline: "The current schedule looks calm.",
      suggestedNextAction:
        "Keep the imported schedule fresh so REVORY can keep surfacing trustworthy operational signals.",
    };
  }

  if (input.atRisk.attentionNowCount > 0) {
    return {
      description:
        "REVORY has already surfaced a small group of appointments that deserves a closer look now. The short list below follows priority order: at-risk first, then reminder, confirmation, recovery, and review visibility.",
      headline: "A small set of appointments needs attention now.",
      suggestedNextAction:
        blockedCount > 0
          ? "Start with the blocked contact paths, then review the tight-window appointments while there is still time to protect the slot."
          : "Start with the attention-now items first, then move through the remaining ready queues below.",
    };
  }

  if (blockedCount > 0) {
    return {
      description:
        "The main operational friction right now is data readiness. REVORY can already see who would be ready next, but some paths are still blocked by missing email or missing reviews destination.",
      headline: "Signals are live, but some paths are still blocked.",
      suggestedNextAction:
        "Tighten the client contact base first so confirmation, reminders, recovery, and reviews can progress cleanly.",
    };
  }

  return {
    description:
      "The first operational layer is live. REVORY is surfacing who is ready for the next step without turning the product into a CRM, inbox, or workflow builder.",
    headline: "The workspace already has guided operational signals.",
    suggestedNextAction:
      "Use the surfaced queues below to understand what is ready, why it matters, and what REVORY suggests next.",
  };
}

export function buildOperationalSurface(
  input: BuildOperationalSurfaceInput,
): RevoryOperationalSurface {
  const categoryCards = buildCategoryCards(input);
  const priorityItems = buildPriorityItems(input);
  const blockedCount = getBlockedAppointmentIds(input).size;
  const templatePreviews = buildOperationalTemplatePreviews(input);
  const readinessSummary = {
    blockedCount,
    nextActionCount: priorityItems.length,
    preparedCount: priorityItems.filter((item) => item.readinessState === "prepared").length,
    readyNowCount: priorityItems.filter((item) => item.readinessState === "ready_now").length,
  };

  return {
    blockedCount,
    categoryCards,
    generatedAt: input.atRisk.generatedAt,
    hasAppointmentBase: input.hasAppointmentBase,
    hasLiveSignals:
      priorityItems.length > 0 ||
      input.confirmation.stateSummary.classifiedCount > 0 ||
      input.reminder.stateSummary.classifiedCount > 0 ||
      input.recovery.stateSummary.classifiedCount > 0 ||
      input.reviewRequest.stateSummary.classifiedCount > 0,
    needsAttentionNowCount: input.atRisk.attentionNowCount,
    priorityItems,
    prioritySummary: buildPrioritySummary(input, priorityItems, blockedCount),
    readinessSummary,
    templatePreviews,
  };
}
