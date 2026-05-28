import "server-only";

import type { Prisma } from "@prisma/client";

import { applyActivationIntentClassification } from "@/services/decision-support/apply-intent-classification";
import { applyDecisionSupportPatch, toDecisionSupportPatch } from "@/services/decision-support/apply-decision-support-patch";
import { buildActivationStepRead } from "@/services/decision-support/build-activation-step-read";
import { requestBoundedDecisionSupportPatch } from "@/services/llm/request-bounded-decision-support-patch";
import { requestBoundedIntentClassification } from "@/services/llm/request-bounded-intent-classification";
import type { OnboardingStepKey } from "@/services/onboarding/wizard-steps";
import type { RevoryDecisionSupportRead } from "@/types/decision-support";
import type { RevoryIntentCode, RevoryObjectionCode } from "@/types/intent-classification";

type GetActivationStepReadInput = {
  averageDealValue: Prisma.Decimal | null;
  primaryChannel: string | null;
  recommendedModeKey: string | null;
  selectedDataSourceType: string | null;
  selectedTemplate: string | null;
  stepKey: OnboardingStepKey;
};

export async function getActivationStepRead(
  input: GetActivationStepReadInput,
): Promise<RevoryDecisionSupportRead> {
  const fallbackRead = buildActivationStepRead(input);
  const allowedIntents: readonly RevoryIntentCode[] = (() => {
    switch (input.stepKey) {
      case "template":
        return ["LOCK_MAIN_OFFER"];
      case "source":
        return ["CHOOSE_LEAD_ENTRY", "START_BOOKED_PROOF"];
      case "channel":
        return ["LOCK_BOOKING_PATH"];
      case "deal_value":
        return ["SET_VALUE_PER_BOOKING"];
      case "mode":
        return ["COMPLETE_ACTIVATION"];
      case "activation":
        return ["COMPLETE_ACTIVATION", "START_BOOKED_PROOF"];
    }
  })();
  const allowedObjections: readonly RevoryObjectionCode[] = (() => {
    switch (input.stepKey) {
      case "template":
        return ["MULTI_OFFER_RISK", "NO_ACTIVE_BLOCKER"];
      case "source":
        return ["LEAD_ENTRY_MISSING", "NO_ACTIVE_BLOCKER"];
      case "channel":
        return ["BOOKING_PATH_MISSING", "NO_ACTIVE_BLOCKER"];
      case "deal_value":
        return ["VALUE_PER_BOOKING_MISSING", "NO_ACTIVE_BLOCKER"];
      case "mode":
        return ["NO_ACTIVE_BLOCKER"];
      case "activation":
        return ["PROOF_NOT_VISIBLE", "NO_ACTIVE_BLOCKER"];
    }
  })();
  const classification = await requestBoundedIntentClassification({
    allowedIntents,
    allowedObjections,
    context: {
      averageDealValue:
        input.averageDealValue === null ? null : Number(input.averageDealValue),
      primaryChannel: input.primaryChannel,
      recommendedModeKey: input.recommendedModeKey,
      selectedDataSourceType: input.selectedDataSourceType,
      selectedTemplate: input.selectedTemplate,
      stepKey: input.stepKey,
    },
    useCase: "activation",
  });
  const classifiedRead = applyActivationIntentClassification(
    fallbackRead,
    input.stepKey,
    classification,
  );
  const patch = await requestBoundedDecisionSupportPatch({
    context: {
      averageDealValue:
        input.averageDealValue === null ? null : Number(input.averageDealValue),
      classification,
      currentRecommendation: toDecisionSupportPatch(classifiedRead),
      primaryChannel: input.primaryChannel,
      recommendedModeKey: input.recommendedModeKey,
      selectedDataSourceType: input.selectedDataSourceType,
      selectedTemplate: input.selectedTemplate,
      stepKey: input.stepKey,
    },
    fallback: toDecisionSupportPatch(classifiedRead),
    prompt:
      "Write a compact REVORY Revenue Leak Detector activation guidance patch. Keep every field to one short sentence. Stay premium, evidence-first, revenue-risk-first, leak-read ready, and narrow. Respect the provided intent classification and objection classification when they are present. Do not invent revenue numbers, confirmed loss, recovered revenue, new options, channels, workflow branches, or unsupported leak signals. Use estimated revenue at risk only when supplied by deterministic services in context. Never mention AI, model behavior, fallback systems, hidden operations, internal decision logic, CRM, inbox, BI, scheduling system, sales agent, or clinical advice. Keep the recommendation strictly inside the current activation step and current workspace state.",
    useCase: "activation",
  });

  return applyDecisionSupportPatch(classifiedRead, patch);
}
