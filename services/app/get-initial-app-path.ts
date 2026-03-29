import "server-only";

import type { AppContext } from "@/services/app/get-app-context";
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from "@/services/imports/get-csv-upload-sources";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

export async function getInitialAppPath(appContext: AppContext) {
  if (appContext.activationSetup.isCompleted) {
    const csvUploadSources = await getCsvUploadSources(appContext.workspace.id);

    return hasLiveCsvUploadSource(csvUploadSources.appointments)
      ? "/app/dashboard"
      : "/app/imports";
  }

  return getOnboardingStepPath(
    resolveOnboardingStepKey(appContext.activationSetup.currentStep),
  );
}
