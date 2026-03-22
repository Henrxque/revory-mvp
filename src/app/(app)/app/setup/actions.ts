"use server";

import {
  CommunicationChannel,
  DataSourceType,
  FlowModeKey,
} from "@prisma/client";
import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { completeActivationSetup } from "@/services/onboarding/complete-activation-setup";
import { setCurrentOnboardingStep } from "@/services/onboarding/set-current-step";
import { updateActivationSetup } from "@/services/onboarding/update-activation-setup";
import { upsertOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";
import {
  getNextOnboardingStepKey,
  getOnboardingStepPath,
  getPreviousOnboardingStepKey,
  isOnboardingStepKey,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

const templateValues = ["MEDSPA"] as const;

function isTemplateValue(value: string): value is (typeof templateValues)[number] {
  return templateValues.includes(value as (typeof templateValues)[number]);
}

function isCommunicationChannel(value: string): value is CommunicationChannel {
  return Object.values(CommunicationChannel).includes(value as CommunicationChannel);
}

function isDataSourceType(value: string): value is DataSourceType {
  return Object.values(DataSourceType).includes(value as DataSourceType);
}

function isFlowModeKey(value: string): value is FlowModeKey {
  return Object.values(FlowModeKey).includes(value as FlowModeKey);
}

function normalizeGoogleReviewsUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function getSafeOnboardingContext(stepValue: FormDataEntryValue | null) {
  const appContext = await getAppContext();
  const requestedStepKey =
    typeof stepValue === "string" && isOnboardingStepKey(stepValue)
      ? stepValue
      : null;

  if (!appContext) {
    redirect(
      buildSignInRedirectPath(
        requestedStepKey ? getOnboardingStepPath(requestedStepKey) : "/app/setup",
      ),
    );
  }

  if (appContext.activationSetup.isCompleted) {
    redirect("/app/dashboard");
  }

  const currentStepKey = resolveOnboardingStepKey(appContext.activationSetup.currentStep);
  const safeRequestedStepKey = requestedStepKey ?? currentStepKey;

  if (safeRequestedStepKey !== currentStepKey) {
    redirect(getOnboardingStepPath(currentStepKey));
  }

  return {
    currentStepKey,
    workspaceId: appContext.workspace.id,
  };
}

export async function submitOnboardingStep(formData: FormData) {
  const { currentStepKey, workspaceId } = await getSafeOnboardingContext(
    formData.get("step"),
  );
  const nextStepKey = getNextOnboardingStepKey(currentStepKey);

  switch (currentStepKey) {
    case "template": {
      const selectedTemplate = formData.get("selectedTemplate");

      if (typeof selectedTemplate !== "string" || !isTemplateValue(selectedTemplate)) {
        redirect(`${getOnboardingStepPath(currentStepKey)}?error=template`);
      }

      await updateActivationSetup(workspaceId, {
        currentStep: nextStepKey ?? currentStepKey,
        isCompleted: false,
        selectedTemplate,
      });
      break;
    }
    case "source": {
      const selectedDataSourceType = formData.get("selectedDataSourceType");

      if (
        typeof selectedDataSourceType !== "string" ||
        !isDataSourceType(selectedDataSourceType)
      ) {
        redirect(`${getOnboardingStepPath(currentStepKey)}?error=source`);
      }

      await upsertOnboardingDataSource(workspaceId, selectedDataSourceType);
      await updateActivationSetup(workspaceId, {
        currentStep: nextStepKey ?? currentStepKey,
        isCompleted: false,
      });
      break;
    }
    case "channel": {
      const primaryChannel = formData.get("primaryChannel");

      if (typeof primaryChannel !== "string" || !isCommunicationChannel(primaryChannel)) {
        redirect(`${getOnboardingStepPath(currentStepKey)}?error=channel`);
      }

      await updateActivationSetup(workspaceId, {
        currentStep: nextStepKey ?? currentStepKey,
        isCompleted: false,
        primaryChannel,
      });
      break;
    }
    case "reviews": {
      const googleReviewsUrlValue = formData.get("googleReviewsUrl");
      const googleReviewsUrl =
        typeof googleReviewsUrlValue === "string"
          ? normalizeGoogleReviewsUrl(googleReviewsUrlValue)
          : null;

      if (!googleReviewsUrl) {
        redirect(`${getOnboardingStepPath(currentStepKey)}?error=reviews`);
      }

      await updateActivationSetup(workspaceId, {
        currentStep: nextStepKey ?? currentStepKey,
        googleReviewsUrl,
        isCompleted: false,
      });
      break;
    }
    case "mode": {
      const recommendedModeKey = formData.get("recommendedModeKey");

      if (
        typeof recommendedModeKey !== "string" ||
        !isFlowModeKey(recommendedModeKey)
      ) {
        redirect(`${getOnboardingStepPath(currentStepKey)}?error=mode`);
      }

      await updateActivationSetup(workspaceId, {
        currentStep: nextStepKey ?? currentStepKey,
        isCompleted: false,
        recommendedModeKey,
      });
      break;
    }
    case "activation": {
      const completionResult = await completeActivationSetup(workspaceId);

      if (!completionResult.ok) {
        redirect(`${getOnboardingStepPath(currentStepKey)}?error=activation`);
      }

      redirect("/app/dashboard");
    }
  }

  if (!nextStepKey) {
    redirect("/app/dashboard");
  }

  redirect(getOnboardingStepPath(nextStepKey));
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
