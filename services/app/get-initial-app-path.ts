import "server-only";

import type { AppContext } from "@/services/app/get-app-context";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

export function getInitialAppPath(appContext: AppContext) {
  if (appContext.activationSetup.isCompleted) {
    return "/app/dashboard";
  }

  return getOnboardingStepPath(
    resolveOnboardingStepKey(appContext.activationSetup.currentStep),
  );
}
