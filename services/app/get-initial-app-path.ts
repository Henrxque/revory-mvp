import "server-only";

import type { AppContext } from "@/services/app/get-app-context";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import { getBookedProofRead } from "@/services/proof/get-booked-proof-read";

export async function getInitialAppPath(appContext: AppContext) {
  if (appContext.activationSetup.isCompleted) {
    const bookedProofRead = await getBookedProofRead(appContext.workspace.id);

    return bookedProofRead.hasBookedProofVisible
      ? "/app/dashboard"
      : "/app/imports";
  }

  return getOnboardingStepPath(
    resolveOnboardingStepKey(appContext.activationSetup.currentStep),
  );
}
