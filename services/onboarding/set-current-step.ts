import "server-only";

import type { ActivationSetup } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { OnboardingStepKey } from "@/services/onboarding/wizard-steps";

export async function setCurrentOnboardingStep(
  workspaceId: string,
  stepKey: OnboardingStepKey,
): Promise<ActivationSetup> {
  return prisma.activationSetup.update({
    where: {
      workspaceId,
    },
    data: {
      currentStep: stepKey,
    },
  });
}
