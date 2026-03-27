import type { RevoryAtRiskClassification } from "@/types/at-risk";
import type { RevoryConfirmationClassification } from "@/types/confirmation";
import {
  buildOperationalCategoryReadiness,
  formatOperationalReasonLabel,
} from "@/services/operations/build-operational-state";
import type {
  RevoryOperationalCategory,
  RevoryOperationalReasonCode,
  RevoryOperationalState,
} from "@/types/operational-state";
import type {
  RevoryOperationalOutreachPreparationState,
  RevoryOperationalTemplateDefinition,
  RevoryOperationalTemplateKey,
  RevoryOperationalTemplatePlaceholderDefinition,
  RevoryOperationalTemplatePlaceholderKey,
  RevoryOperationalTemplatePreview,
} from "@/types/operational-template";
import type { RevoryRecoveryOpportunityClassification } from "@/types/recovery";
import type { RevoryReminderClassification } from "@/types/reminder";
import type { RevoryReviewRequestEligibilityClassification } from "@/types/review-request";

type BuildOperationalTemplatePreviewsInput = {
  atRisk: RevoryAtRiskClassification;
  confirmation: RevoryConfirmationClassification;
  recovery: RevoryRecoveryOpportunityClassification;
  reminder: RevoryReminderClassification;
  reviewRequest: RevoryReviewRequestEligibilityClassification;
};

type TemplateContext = Partial<Record<RevoryOperationalTemplatePlaceholderKey, string>>;

type TemplatePreparationState = {
  blockedReason: string | null;
  liveItemCount: number;
  outreachState: RevoryOperationalOutreachPreparationState;
  outreachStateLabel: string;
  suggestedNextStep: string;
};

const placeholderCatalog: Record<
  RevoryOperationalTemplatePlaceholderKey,
  RevoryOperationalTemplatePlaceholderDefinition
> = {
  client_first_name: {
    key: "client_first_name",
    label: "Client first name",
    token: "{{client_first_name}}",
  },
  client_full_name: {
    key: "client_full_name",
    label: "Client full name",
    token: "{{client_full_name}}",
  },
  google_reviews_url: {
    key: "google_reviews_url",
    label: "Google reviews URL",
    token: "{{google_reviews_url}}",
  },
  provider_name: {
    key: "provider_name",
    label: "Provider name",
    token: "{{provider_name}}",
  },
  scheduled_at: {
    key: "scheduled_at",
    label: "Scheduled time",
    token: "{{scheduled_at}}",
  },
  service_name: {
    key: "service_name",
    label: "Service name",
    token: "{{service_name}}",
  },
};

const operationalTemplateDefinitions: Record<
  RevoryOperationalTemplateKey,
  RevoryOperationalTemplateDefinition
> = {
  confirmation: {
    body: [
      "Hi {{client_first_name}},",
      "",
      "This is a quick confirmation for your {{service_name}} on {{scheduled_at}} with {{provider_name}}.",
      "If anything needs to change, just reply to this email.",
    ].join("\n"),
    categoryLabel: "Confirmation",
    description:
      "A first confirmation note for appointments that are already inside the confirmation window.",
    key: "confirmation",
    placeholders: [
      "client_first_name",
      "service_name",
      "scheduled_at",
      "provider_name",
    ],
    title: "Confirmation template",
  },
  recovery: {
    body: [
      "Hi {{client_first_name}},",
      "",
      "We noticed your {{service_name}} did not happen as planned.",
      "If you want to come back in, reply to this email and we can help with the next step.",
    ].join("\n"),
    categoryLabel: "Recovery",
    description:
      "A narrow recovery starting point for recent disruptions, without pretending REVORY already runs a rebooking engine.",
    key: "recovery",
    placeholders: ["client_first_name", "service_name"],
    title: "Recovery template",
  },
  reminder: {
    body: [
      "Hi {{client_first_name}},",
      "",
      "This is a reminder for your {{service_name}} on {{scheduled_at}} with {{provider_name}}.",
      "We look forward to seeing you.",
    ].join("\n"),
    categoryLabel: "Reminder",
    description:
      "A simple reminder base for appointments already inside the reminder window.",
    key: "reminder",
    placeholders: [
      "client_first_name",
      "service_name",
      "scheduled_at",
      "provider_name",
    ],
    title: "Reminder template",
  },
  review_request: {
    body: [
      "Hi {{client_first_name}},",
      "",
      "Thank you for visiting us for {{service_name}}.",
      "If you have a moment, we would appreciate your review here: {{google_reviews_url}}",
    ].join("\n"),
    categoryLabel: "Review request",
    description:
      "A short review-request base that stays in eligibility mode instead of pretending REVORY already runs full reputation operations.",
    key: "review_request",
    placeholders: ["client_first_name", "service_name", "google_reviews_url"],
    title: "Review request template",
  },
};

const sampleFallbackContext: Record<RevoryOperationalTemplateKey, TemplateContext> = {
  confirmation: {
    client_first_name: "Ashley",
    client_full_name: "Ashley Monroe",
    provider_name: "Dr. Rivera",
    scheduled_at: "Mar 28, 3:00 PM",
    service_name: "Laser Consultation",
  },
  recovery: {
    client_first_name: "Mila",
    client_full_name: "Mila Stone",
    service_name: "Injectables",
  },
  reminder: {
    client_first_name: "Olivia",
    client_full_name: "Olivia Reed",
    provider_name: "Dr. Kent",
    scheduled_at: "Mar 28, 9:00 AM",
    service_name: "Post-Treatment Check",
  },
  review_request: {
    client_first_name: "Emma",
    client_full_name: "Emma Vale",
    google_reviews_url: "https://g.page/your-google-reviews",
    service_name: "Hydrafacial",
  },
};

function getFirstName(name: string | null | undefined) {
  if (!name) {
    return null;
  }

  const firstName = name
    .split(/\s+/)
    .map((part) => part.trim())
    .find(Boolean);

  return firstName ?? null;
}

function formatTemplateDate(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function pickTemplateSourceItem<T extends { operationalState: RevoryOperationalState }>(
  items: T[],
) {
  return (
    items.find((item) => item.operationalState.isReadyForAction) ??
    items.find((item) => item.operationalState.isBlocked) ??
    items.find((item) => item.operationalState.isPrepared) ??
    items[0] ??
    null
  );
}

function getTemplateContext(
  key: RevoryOperationalTemplateKey,
  input: BuildOperationalTemplatePreviewsInput,
): TemplateContext | null {
  switch (key) {
    case "confirmation": {
      const item = pickTemplateSourceItem(input.confirmation.items);

      if (!item) {
        return null;
      }

      return {
        client_first_name: getFirstName(item.clientName) ?? undefined,
        client_full_name: item.clientName,
        provider_name: item.providerName ?? undefined,
        scheduled_at: formatTemplateDate(item.scheduledAt) ?? undefined,
        service_name: item.serviceName ?? undefined,
      };
    }
    case "reminder": {
      const item = pickTemplateSourceItem(input.reminder.items);

      if (!item) {
        return null;
      }

      return {
        client_first_name: getFirstName(item.clientName) ?? undefined,
        client_full_name: item.clientName,
        provider_name: item.providerName ?? undefined,
        scheduled_at: formatTemplateDate(item.scheduledAt) ?? undefined,
        service_name: item.serviceName ?? undefined,
      };
    }
    case "recovery": {
      const item = pickTemplateSourceItem(input.recovery.items);

      if (!item) {
        return null;
      }

      return {
        client_first_name: getFirstName(item.clientName) ?? undefined,
        client_full_name: item.clientName,
        service_name: item.serviceName ?? undefined,
      };
    }
    case "review_request": {
      const item = pickTemplateSourceItem(input.reviewRequest.items);

      if (!item) {
        return null;
      }

      return {
        client_first_name: getFirstName(item.clientName) ?? undefined,
        client_full_name: item.clientName,
        google_reviews_url: item.googleReviewsUrl ?? undefined,
        service_name: item.serviceName ?? undefined,
      };
    }
  }
}

function renderTemplateBody(
  definition: RevoryOperationalTemplateDefinition,
  context: TemplateContext,
) {
  return definition.placeholders.reduce((body, placeholderKey) => {
    const placeholder = placeholderCatalog[placeholderKey];
    const replacement =
      context[placeholderKey] ?? sampleFallbackContext[definition.key][placeholderKey] ?? "---";

    return body.replaceAll(placeholder.token, replacement);
  }, definition.body);
}

function collectReasonCodes(states: RevoryOperationalState[]) {
  return states.flatMap((state) => state.reasonCodes);
}

function buildCategoryReadinessFromInput(
  key: RevoryOperationalTemplateKey,
  input: BuildOperationalTemplatePreviewsInput,
) {
  switch (key) {
    case "confirmation":
      return buildOperationalCategoryReadiness({
        category: "confirmation",
        reasonCodes: collectReasonCodes(
          input.confirmation.items.map((item) => item.operationalState),
        ),
        stateSummary: input.confirmation.stateSummary,
      });
    case "reminder":
      return buildOperationalCategoryReadiness({
        category: "reminder",
        reasonCodes: collectReasonCodes(
          input.reminder.items.map((item) => item.operationalState),
        ),
        stateSummary: input.reminder.stateSummary,
      });
    case "recovery":
      return buildOperationalCategoryReadiness({
        category: "recovery",
        reasonCodes: collectReasonCodes(
          input.recovery.items.map((item) => item.operationalState),
        ),
        stateSummary: input.recovery.stateSummary,
      });
    case "review_request":
      return buildOperationalCategoryReadiness({
        category: "review_request",
        reasonCodes: collectReasonCodes(
          input.reviewRequest.items.map((item) => item.operationalState),
        ),
        stateSummary: input.reviewRequest.stateSummary,
      });
  }
}

function getPrimaryBlockedReason(
  reasonCodes: RevoryOperationalReasonCode[],
) {
  const firstReason = reasonCodes[0];

  return firstReason ? formatOperationalReasonLabel(firstReason) : null;
}

function resolveTemplateOutreachState(
  category: RevoryOperationalCategory,
  input: BuildOperationalTemplatePreviewsInput,
  liveItemCount: number,
): TemplatePreparationState {
  const readiness = buildCategoryReadinessFromInput(category, input);
  const blockedReason = getPrimaryBlockedReason(readiness.primaryReasonCodes);
  const hasMixedBlockedPaths = readiness.readyCount > 0 && readiness.blockedCount > 0;

  switch (category) {
    case "confirmation":
      if (readiness.stage === "ready") {
        return {
          blockedReason: hasMixedBlockedPaths ? blockedReason : null,
          liveItemCount,
          outreachState: "ready",
          outreachStateLabel: hasMixedBlockedPaths
            ? "Ready, with blockers"
            : "Ready for outreach",
          suggestedNextStep:
            hasMixedBlockedPaths
              ? "Use the base confirmation message for the ready appointments, then resolve the missing email path on the blocked confirmations."
              : "Use the base confirmation message for appointments already inside the confirmation window.",
        };
      }

      if (readiness.stage === "blocked") {
        return {
          blockedReason,
          liveItemCount,
          outreachState: "recommended",
          outreachStateLabel: "Recommended next",
          suggestedNextStep:
            "Tighten the client email base first so eligible confirmation paths can move from blocked to ready.",
        };
      }

      if (readiness.stage === "prepared") {
        return {
          blockedReason: null,
          liveItemCount,
          outreachState: "prepared",
          outreachStateLabel: "Prepared for later",
          suggestedNextStep:
            "The template base is already in place; this category turns live as appointments move into the confirmation window.",
        };
      }

      return {
        blockedReason: null,
        liveItemCount,
        outreachState: "detected",
        outreachStateLabel: "Detected in model",
        suggestedNextStep:
          "Keep the template ready. Confirmation outreach starts once appointments enter the active window.",
      };
    case "reminder":
      if (readiness.stage === "ready") {
        return {
          blockedReason: hasMixedBlockedPaths ? blockedReason : null,
          liveItemCount,
          outreachState: "ready",
          outreachStateLabel: hasMixedBlockedPaths
            ? "Ready, with blockers"
            : "Ready for outreach",
          suggestedNextStep:
            hasMixedBlockedPaths
              ? "Use the reminder base for the ready appointments, then resolve the missing email path on the blocked reminders."
              : "Use the reminder base for appointments already inside the reminder window.",
        };
      }

      if (readiness.stage === "blocked") {
        return {
          blockedReason,
          liveItemCount,
          outreachState: "recommended",
          outreachStateLabel: "Recommended next",
          suggestedNextStep:
            "Fix the client email path first so reminder outreach can move from visible to ready.",
        };
      }

      if (readiness.stage === "prepared") {
        return {
          blockedReason: null,
          liveItemCount,
          outreachState: "prepared",
          outreachStateLabel: "Prepared for later",
          suggestedNextStep:
            "The reminder template is already prepared; it becomes live as the schedule moves closer.",
        };
      }

      return {
        blockedReason: null,
        liveItemCount,
        outreachState: "detected",
        outreachStateLabel: "Detected in model",
        suggestedNextStep:
          "Keep the reminder base available. It activates once the schedule reaches the reminder window.",
      };
    case "recovery":
      if (readiness.stage === "ready") {
        return {
          blockedReason: hasMixedBlockedPaths ? blockedReason : null,
          liveItemCount,
          outreachState: "ready",
          outreachStateLabel: hasMixedBlockedPaths
            ? "Ready, with blockers"
            : "Ready for outreach",
          suggestedNextStep:
            hasMixedBlockedPaths
              ? "Use the recovery message for the ready opportunities, then resolve the missing email path on the blocked disruptions."
              : "Use the recovery message as a narrow first outreach path for recent disruptions.",
        };
      }

      if (readiness.stage === "blocked") {
        return {
          blockedReason,
          liveItemCount,
          outreachState: "recommended",
          outreachStateLabel: "Recommended next",
          suggestedNextStep:
            "Recovery is surfaced, but it still needs a usable email path before outreach can be prepared cleanly.",
        };
      }

      if (readiness.stage === "prepared") {
        return {
          blockedReason: null,
          liveItemCount,
          outreachState: "prepared",
          outreachStateLabel: "Prepared for later",
          suggestedNextStep:
            "The recovery base is already shaped, but it stays intentionally narrow and non-automated in this MVP.",
        };
      }

      return {
        blockedReason: null,
        liveItemCount,
        outreachState: "detected",
        outreachStateLabel: "Detected in model",
        suggestedNextStep:
          "Recovery stays available as a controlled template foundation without pretending there is already a rebooking engine.",
      };
    case "review_request":
      if (readiness.stage === "ready") {
        return {
          blockedReason: hasMixedBlockedPaths ? blockedReason : null,
          liveItemCount,
          outreachState: "ready",
          outreachStateLabel: hasMixedBlockedPaths
            ? "Ready, with blockers"
            : "Ready for outreach",
          suggestedNextStep:
            hasMixedBlockedPaths
              ? "Use the review-request base for the ready visits, then resolve the missing email or reviews destination on the blocked paths."
              : "The review-request base is ready for recent eligible visits that already have a destination and email path.",
        };
      }

      if (readiness.stage === "blocked") {
        return {
          blockedReason,
          liveItemCount,
          outreachState: "recommended",
          outreachStateLabel: "Recommended next",
          suggestedNextStep:
            blockedReason === "Missing reviews destination"
              ? "Configure the Google Reviews destination first so the request can move from visible to ready."
              : "Tighten the client email path first so the review request can move from visible to ready.",
        };
      }

      if (readiness.stage === "prepared") {
        return {
          blockedReason: null,
          liveItemCount,
          outreachState: "prepared",
          outreachStateLabel: "Prepared for later",
          suggestedNextStep:
            "The eligibility base is already being read; the template is ready to support the first review-request layer as soon as the path is clean.",
        };
      }

      return {
        blockedReason: null,
        liveItemCount,
        outreachState: "detected",
        outreachStateLabel: "Detected in model",
        suggestedNextStep:
          "Keep the review base narrow and honest. It remains eligibility-first until more of the execution layer is live.",
      };
  }
}

function getLiveItemCount(
  key: RevoryOperationalTemplateKey,
  input: BuildOperationalTemplatePreviewsInput,
) {
  switch (key) {
    case "confirmation": {
      const readiness = buildCategoryReadinessFromInput(key, input);

      return readiness.stage === "ready"
        ? input.confirmation.readyForConfirmationCount
        : readiness.stage === "blocked"
          ? input.confirmation.blockedMissingEmailCount
          : readiness.stage === "prepared"
            ? input.confirmation.scheduledLaterCount
            : input.confirmation.stateSummary.classifiedCount;
    }
    case "reminder": {
      const readiness = buildCategoryReadinessFromInput(key, input);

      return readiness.stage === "ready"
        ? input.reminder.readyForReminderCount
        : readiness.stage === "blocked"
          ? input.reminder.blockedMissingEmailCount
          : readiness.stage === "prepared"
            ? input.reminder.scheduledLaterCount
            : input.reminder.stateSummary.classifiedCount;
    }
    case "recovery": {
      const readiness = buildCategoryReadinessFromInput(key, input);

      return readiness.stage === "ready"
        ? input.recovery.readyForRecoveryCount
        : readiness.stage === "blocked"
          ? input.recovery.blockedMissingEmailCount
          : input.recovery.stateSummary.classifiedCount;
    }
    case "review_request": {
      const readiness = buildCategoryReadinessFromInput(key, input);

      return readiness.stage === "ready"
        ? input.reviewRequest.eligibleCount
        : readiness.stage === "blocked"
          ? input.reviewRequest.blockedMissingEmailCount +
              input.reviewRequest.blockedMissingReviewsUrlCount
          : readiness.stage === "prepared"
            ? input.reviewRequest.totalCompletedAppointmentsInWindow
            : input.reviewRequest.stateSummary.classifiedCount;
    }
  }
}

function buildOperationalTemplatePreview(
  definition: RevoryOperationalTemplateDefinition,
  context: TemplateContext | null,
  preparationState: TemplatePreparationState,
): RevoryOperationalTemplatePreview {
  const previewContext = context ?? sampleFallbackContext[definition.key];

  return {
    blockedReason: preparationState.blockedReason,
    body: renderTemplateBody(definition, previewContext),
    categoryLabel: definition.categoryLabel,
    description: definition.description,
    key: definition.key,
    liveItemCount: preparationState.liveItemCount,
    outreachState: preparationState.outreachState,
    outreachStateLabel: preparationState.outreachStateLabel,
    placeholders: definition.placeholders.map(
      (placeholderKey) => placeholderCatalog[placeholderKey],
    ),
    previewMode: context ? "live_preview" : "controlled_sample",
    previewModeLabel: context ? "Live preview" : "Controlled sample",
    suggestedNextStep: preparationState.suggestedNextStep,
    title: definition.title,
  };
}

function buildTemplatePreparationState(
  key: RevoryOperationalTemplateKey,
  input: BuildOperationalTemplatePreviewsInput,
): TemplatePreparationState {
  const liveItemCount = getLiveItemCount(key, input);

  switch (key) {
    case "confirmation":
      return resolveTemplateOutreachState("confirmation", input, liveItemCount);
    case "reminder":
      return resolveTemplateOutreachState("reminder", input, liveItemCount);
    case "recovery":
      return resolveTemplateOutreachState("recovery", input, liveItemCount);
    case "review_request":
      return resolveTemplateOutreachState("review_request", input, liveItemCount);
  }
}

export function buildOperationalTemplatePreviews(
  input: BuildOperationalTemplatePreviewsInput,
): RevoryOperationalTemplatePreview[] {
  return (
    Object.values(
      operationalTemplateDefinitions,
    ) as RevoryOperationalTemplateDefinition[]
  ).map((definition) =>
    buildOperationalTemplatePreview(
      definition,
      getTemplateContext(definition.key, input),
      buildTemplatePreparationState(definition.key, input),
    ),
  );
}
