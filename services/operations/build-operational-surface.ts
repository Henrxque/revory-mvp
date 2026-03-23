import type { RevoryAtRiskClassification } from "@/types/at-risk";
import type { RevoryConfirmationClassification } from "@/types/confirmation";
import type {
  RevoryOperationalCard,
  RevoryOperationalPriorityItem,
  RevoryOperationalSurface,
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

function getBlockedAppointmentIds(input: BuildOperationalSurfaceInput) {
  const blockedIds = new Set<string>();

  for (const item of input.atRisk.items) {
    if (item.reasons.some((reason) => reason.code.includes("missing_email"))) {
      blockedIds.add(item.appointmentId);
    }
  }

  for (const item of input.recovery.items) {
    if (item.recoveryState === "blocked_missing_email") {
      blockedIds.add(item.appointmentId);
    }
  }

  for (const item of input.reviewRequest.items) {
    if (item.reviewEligibilityState !== "eligible_for_review_request") {
      blockedIds.add(item.appointmentId);
    }
  }

  return blockedIds;
}

function buildCategoryCards(
  input: BuildOperationalSurfaceInput,
): RevoryOperationalCard[] {
  return [
    {
      blockedCount: input.atRisk.blockedContactCount,
      count: input.atRisk.atRiskCount,
      description:
        input.atRisk.atRiskCount > 0
          ? `${input.atRisk.attentionNowCount} need immediate attention and ${input.atRisk.watchlistCount} stay on the watchlist.`
          : "No appointments are currently surfaced by the initial at-risk signals.",
      kindLabel: "Insight",
      key: "at_risk",
      nextAction:
        input.atRisk.atRiskCount > 0
          ? "Review these appointments first. REVORY is surfacing explainable signals, not predictive scoring."
          : "Keep the imported appointment base current so the at-risk layer stays trustworthy.",
      title: "At-risk appointments",
      tone:
        input.atRisk.attentionNowCount > 0
          ? "accent"
          : input.atRisk.atRiskCount > 0
            ? "future"
            : "neutral",
    },
    {
      blockedCount: input.confirmation.blockedMissingEmailCount,
      count: input.confirmation.readyForConfirmationCount,
      description:
        input.confirmation.readyForConfirmationCount > 0
          ? `${input.confirmation.readyForConfirmationCount} appointments are already inside the ${input.confirmation.windowHours}h confirmation window.`
          : "No appointments are currently waiting in the confirmation-ready queue.",
      kindLabel: "Status",
      key: "confirmation",
      nextAction:
        input.confirmation.blockedMissingEmailCount > 0
          ? `${input.confirmation.blockedMissingEmailCount} still need a usable email before confirmation can help.`
          : "Keep this queue visible while REVORY stays in the first email-first confirmation layer.",
      title: "Confirmation queue",
      tone: input.confirmation.readyForConfirmationCount > 0 ? "real" : "neutral",
    },
    {
      blockedCount: input.reminder.blockedMissingEmailCount,
      count: input.reminder.readyForReminderCount,
      description:
        input.reminder.readyForReminderCount > 0
          ? `${input.reminder.readyForReminderCount} appointments are already inside the ${input.reminder.windowHours}h reminder window.`
          : "No appointments are currently waiting in the reminder-ready queue.",
      kindLabel: "Status",
      key: "reminder",
      nextAction:
        input.reminder.blockedMissingEmailCount > 0
          ? `${input.reminder.blockedMissingEmailCount} still need a usable email before reminder logic can help.`
          : "Keep the reminder window visible, but do not confuse it with a full cadence engine.",
      title: "Reminder queue",
      tone: input.reminder.readyForReminderCount > 0 ? "real" : "neutral",
    },
    {
      blockedCount: input.recovery.blockedMissingEmailCount,
      count: input.recovery.readyForRecoveryCount,
      description:
        input.recovery.opportunityCount > 0
          ? `${input.recovery.opportunityCount} recent disruptions were surfaced without pretending there is already a rebooking machine behind them.`
          : "No cancellations or no-shows currently qualify as near-term recovery opportunities.",
      kindLabel: "Insight",
      key: "recovery",
      nextAction:
        input.recovery.blockedMissingEmailCount > 0
          ? `${input.recovery.blockedMissingEmailCount} remain blocked because the MVP still depends on a usable email path.`
          : "Keep recovery visible as guided opportunity, not as a call-center workflow.",
      title: "Recovery opportunities",
      tone: input.recovery.readyForRecoveryCount > 0 ? "real" : "neutral",
    },
    {
      blockedCount:
        input.reviewRequest.blockedMissingEmailCount +
        input.reviewRequest.blockedMissingReviewsUrlCount,
      count: input.reviewRequest.eligibleCount,
      description:
        input.reviewRequest.eligibleCount > 0
          ? `${input.reviewRequest.eligibleCount} completed visits are already eligible for a simple review request layer.`
          : "No completed visits are currently review-ready inside the initial eligibility window.",
      kindLabel: "Status",
      key: "review_request",
      nextAction:
        input.reviewRequest.blockedMissingReviewsUrlCount > 0
          ? `${input.reviewRequest.blockedMissingReviewsUrlCount} stay blocked until the Google Reviews destination is configured.`
          : "Keep reviews honest: this is eligibility visibility, not a live reputation campaign engine.",
      title: "Review-ready visits",
      tone: input.reviewRequest.eligibleCount > 0 ? "real" : "neutral",
    },
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
      categoryKey: "at_risk",
      categoryLabel: "At-risk",
      clientName: item.clientName,
      estimatedRevenue: item.estimatedRevenue,
      id: item.appointmentId,
      insight: item.reasons.map((reason) => reason.label).join(" + "),
      nextAction: item.reasons.some((reason) => reason.code.includes("missing_email"))
        ? "Add a usable client email so REVORY can support the next confirmation or reminder step."
        : "Keep this appointment visible now and protect the slot before it goes cold.",
      providerName: item.providerName,
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
    .map((item) => ({
      categoryKey: "reminder",
      categoryLabel: "Reminder",
      clientName: item.clientName,
      estimatedRevenue: item.estimatedRevenue,
      id: item.appointmentId,
      insight:
        item.reminderState === "blocked_missing_email"
          ? "Inside reminder window without usable email"
          : "Inside reminder window",
      nextAction:
        item.reminderState === "blocked_missing_email"
          ? "Add a usable client email to unblock reminder readiness."
          : "Keep this appointment visible in the narrow reminder-ready queue.",
      providerName: item.providerName,
      serviceName: item.serviceName,
      stateLabel:
        item.reminderState === "blocked_missing_email"
          ? "Blocked by email"
          : "Reminder ready",
      stateTone:
        item.reminderState === "blocked_missing_email" ? "future" : "real",
      timestamp: item.scheduledAt,
      timestampLabel: "Scheduled",
    }));
}

function buildConfirmationPriorityItems(
  confirmation: RevoryConfirmationClassification,
  seenAppointmentIds: Set<string>,
): RevoryOperationalPriorityItem[] {
  return confirmation.items
    .filter((item) => item.requiresAttention && !seenAppointmentIds.has(item.appointmentId))
    .map((item) => ({
      categoryKey: "confirmation",
      categoryLabel: "Confirmation",
      clientName: item.clientName,
      estimatedRevenue: item.estimatedRevenue,
      id: item.appointmentId,
      insight:
        item.confirmationState === "blocked_missing_email"
          ? "Inside confirmation window without usable email"
          : "Inside confirmation window",
      nextAction:
        item.confirmationState === "blocked_missing_email"
          ? "Add a usable client email to unblock confirmation readiness."
          : "Keep this appointment visible in the confirmation-ready queue.",
      providerName: item.providerName,
      serviceName: item.serviceName,
      stateLabel:
        item.confirmationState === "blocked_missing_email"
          ? "Blocked by email"
          : "Confirmation ready",
      stateTone:
        item.confirmationState === "blocked_missing_email" ? "future" : "real",
      timestamp: item.scheduledAt,
      timestampLabel: "Scheduled",
    }));
}

function buildRecoveryPriorityItems(
  recovery: RevoryRecoveryOpportunityClassification,
): RevoryOperationalPriorityItem[] {
  return recovery.items.map((item) => ({
    categoryKey: "recovery",
    categoryLabel: "Recovery",
    clientName: item.clientName,
    estimatedRevenue: item.estimatedRevenue,
    id: item.appointmentId,
    insight: item.reasons[0]?.label ?? "Recovery opportunity surfaced",
    nextAction:
      item.recoveryState === "blocked_missing_email"
        ? "Add a usable client email before REVORY can support recovery here."
        : "Keep this disrupted visit visible for the first recovery outreach layer.",
    providerName: item.providerName,
    serviceName: item.serviceName,
    stateLabel:
      item.recoveryState === "blocked_missing_email"
        ? "Blocked by email"
        : "Recovery ready",
    stateTone: item.recoveryState === "blocked_missing_email" ? "future" : "real",
    timestamp: item.disruptionDate,
    timestampLabel: "Disrupted",
  }));
}

function buildReviewPriorityItems(
  reviewRequest: RevoryReviewRequestEligibilityClassification,
): RevoryOperationalPriorityItem[] {
  return reviewRequest.items.map((item) => ({
    categoryKey: "review_request",
    categoryLabel: "Reviews",
    clientName: item.clientName,
    estimatedRevenue: item.estimatedRevenue,
    id: item.appointmentId,
    insight:
      item.reviewEligibilityState === "blocked_missing_reviews_url"
        ? "Completed recently, but the reviews destination is still missing"
        : item.reviewEligibilityState === "blocked_missing_email"
          ? "Completed recently without usable email"
          : "Completed recently and eligible for a review request",
    nextAction:
      item.reviewEligibilityState === "eligible_for_review_request"
        ? "Keep this visit visible for the first email-first review layer."
        : item.reviewEligibilityState === "blocked_missing_reviews_url"
          ? "Configure the Google Reviews destination before REVORY can support the request."
          : "Add a usable client email before REVORY can support the request.",
    providerName: item.providerName,
    serviceName: item.serviceName,
    stateLabel:
      item.reviewEligibilityState === "eligible_for_review_request"
        ? "Review-ready"
        : item.reviewEligibilityState === "blocked_missing_reviews_url"
          ? "Blocked by reviews URL"
          : "Blocked by email",
    stateTone:
      item.reviewEligibilityState === "eligible_for_review_request" ? "real" : "future",
    timestamp: item.completedAt,
    timestampLabel: "Completed",
  }));
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

  return items.slice(0, 7);
}

function buildPrioritySummary(
  input: BuildOperationalSurfaceInput,
  priorityItems: RevoryOperationalPriorityItem[],
  blockedCount: number,
): RevoryOperationalSurface["prioritySummary"] {
  if (!input.hasAppointmentBase) {
    return {
      description:
        "REVORY already knows how to classify confirmation, reminders, at-risk signals, recovery, and review eligibility. This layer turns on as soon as the workspace has imported appointments to monitor.",
      headline: "Operational visibility starts with the appointment base.",
      suggestedNextAction:
        "Open Imports and bring in the first appointments CSV so the operational layer has something real to work with.",
    };
  }

  if (priorityItems.length === 0) {
    return {
      description:
        "The imported base is live, but no current appointment, disruption, or completed visit needs operational attention right now.",
      headline: "The workspace is currently quiet.",
      suggestedNextAction:
        "Keep the imported schedule fresh so REVORY can keep surfacing trustworthy operational signals.",
    };
  }

  if (input.atRisk.attentionNowCount > 0) {
    return {
      description:
        "REVORY has already surfaced a small group of appointments that deserves a closer look now. The list below keeps the signal, the status, and the next suggested move separate and readable.",
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
      headline: "The workspace has signals, but some paths are still blocked.",
      suggestedNextAction:
        "Tighten the client contact base first so confirmation, reminders, recovery, and reviews can progress cleanly.",
    };
  }

  return {
    description:
      "The first operational layer is live. REVORY is surfacing the people who are ready for the next step without turning the product into a CRM or inbox.",
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

  return {
    blockedCount,
    categoryCards,
    generatedAt: input.atRisk.generatedAt,
    hasAppointmentBase: input.hasAppointmentBase,
    hasLiveSignals:
      priorityItems.length > 0 ||
      input.confirmation.readyForConfirmationCount > 0 ||
      input.reminder.readyForReminderCount > 0 ||
      input.recovery.opportunityCount > 0 ||
      input.reviewRequest.totalCompletedAppointmentsInWindow > 0,
    needsAttentionNowCount: input.atRisk.attentionNowCount,
    priorityItems,
    prioritySummary: buildPrioritySummary(input, priorityItems, blockedCount),
  };
}
