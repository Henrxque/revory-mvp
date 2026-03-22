import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

export default async function SetupPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app/setup"));
  }

  if (appContext.activationSetup.isCompleted) {
    redirect("/app/dashboard");
  }

  redirect(
    getOnboardingStepPath(
      resolveOnboardingStepKey(appContext.activationSetup.currentStep),
    ),
  );
}
