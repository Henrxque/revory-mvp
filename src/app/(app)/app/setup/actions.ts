"use server";

import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { setCurrentOnboardingStep } from "@/services/onboarding/set-current-step";
import {
  getNextOnboardingStepKey,
  getOnboardingStepPath,
  getPreviousOnboardingStepKey,
  isOnboardingStepKey,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

async function getSafeOnboardingContext(stepValue: FormDataEntryValue | null) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  if (appContext.activationSetup.isCompleted) {
    redirect("/app/dashboard");
  }

  const currentStepKey = resolveOnboardingStepKey(appContext.activationSetup.currentStep);
  const requestedStepKey =
    typeof stepValue === "string" && isOnboardingStepKey(stepValue)
      ? stepValue
      : currentStepKey;

  if (requestedStepKey !== currentStepKey) {
    redirect(getOnboardingStepPath(currentStepKey));
  }

  return {
    currentStepKey,
    workspaceId: appContext.workspace.id,
  };
}

export async function goToPreviousOnboardingStep(formData: FormData) {
  const { currentStepKey, workspaceId } = await getSafeOnboardingContext(
    formData.get("step"),
  );
  const previousStepKey = getPreviousOnboardingStepKey(currentStepKey);

  if (!previousStepKey) {
    redirect(getOnboardingStepPath(currentStepKey));
  }

  await setCurrentOnboardingStep(workspaceId, previousStepKey);
  redirect(getOnboardingStepPath(previousStepKey));
}

export async function goToNextOnboardingStep(formData: FormData) {
  const { currentStepKey, workspaceId } = await getSafeOnboardingContext(
    formData.get("step"),
  );
  const nextStepKey = getNextOnboardingStepKey(currentStepKey);

  if (!nextStepKey) {
    redirect("/app/dashboard");
  }

  await setCurrentOnboardingStep(workspaceId, nextStepKey);
  redirect(getOnboardingStepPath(nextStepKey));
}
