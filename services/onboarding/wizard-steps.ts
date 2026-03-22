export const onboardingSteps = [
  {
    key: "template",
    title: "Choose Your MedSpa Template",
    eyebrow: "Step 1 of 6",
    description:
      "Start with the MedSpa-first template REVORY was designed to activate quickly and clearly.",
    fieldLabel: "Business template",
    helperText:
      "One focused template keeps setup premium, consistent, and easy to review before automation starts.",
    ctaLabel: "Continue",
  },
  {
    key: "source",
    title: "Choose Your Data Source",
    eyebrow: "Step 2 of 6",
    description:
      "Pick the path that will bring appointments and clients into REVORY with the least friction.",
    fieldLabel: "Data source path",
    helperText:
      "The fastest path is the official CSV template. Assisted import helps when your existing export uses different column names.",
    ctaLabel: "Continue",
  },
  {
    key: "channel",
    title: "Primary Channel",
    eyebrow: "Step 3 of 6",
    description:
      "Set the default channel REVORY should prioritize for confirmations, reminders, and future recovery flows.",
    fieldLabel: "Default communication channel",
    helperText:
      "Email is the recommended MVP default. SMS can stay secondary when your plan enables it.",
    ctaLabel: "Continue",
  },
  {
    key: "reviews",
    title: "Google Reviews Destination",
    eyebrow: "Step 4 of 6",
    description:
      "Add the review link REVORY should use once review requests become active for this workspace.",
    fieldLabel: "Review destination",
    helperText:
      "Keeping the destination ready now makes the growth layer much easier to activate later.",
    ctaLabel: "Continue",
  },
  {
    key: "mode",
    title: "Choose Your Starting Mode",
    eyebrow: "Step 5 of 6",
    description:
      "Choose how hands-on or automated the workspace should feel when REVORY starts operating.",
    fieldLabel: "Starting mode",
    helperText:
      "Modes stay intentionally opinionated so activation remains self-service and easy to trust.",
    ctaLabel: "Continue",
  },
  {
    key: "activation",
    title: "Review and Activation",
    eyebrow: "Step 6 of 6",
    description:
      "Review the essentials, activate the workspace, and move into the operational dashboard.",
    fieldLabel: "Activation readiness",
    helperText:
      "Activation is the handoff from setup into daily monitoring, imports, and future revenue recovery flows.",
    ctaLabel: "Activate REVORY",
  },
] as const;

export type OnboardingStepKey = (typeof onboardingSteps)[number]["key"];
export type OnboardingStep = (typeof onboardingSteps)[number];

const onboardingStepMap = new Map(
  onboardingSteps.map((step) => [step.key, step]),
);

export function isOnboardingStepKey(value: string): value is OnboardingStepKey {
  return onboardingStepMap.has(value as OnboardingStepKey);
}

export function resolveOnboardingStepKey(value: string | null | undefined) {
  if (value && isOnboardingStepKey(value)) {
    return value;
  }

  return onboardingSteps[0].key;
}

export function getOnboardingStep(stepKey: OnboardingStepKey): OnboardingStep {
  const step = onboardingStepMap.get(stepKey);

  if (!step) {
    throw new Error(`Unknown onboarding step: ${stepKey}`);
  }

  return step;
}

export function getOnboardingStepIndex(stepKey: OnboardingStepKey) {
  return onboardingSteps.findIndex((step) => step.key === stepKey);
}

export function getPreviousOnboardingStepKey(stepKey: OnboardingStepKey) {
  const previousIndex = getOnboardingStepIndex(stepKey) - 1;

  return previousIndex >= 0 ? onboardingSteps[previousIndex].key : null;
}

export function getNextOnboardingStepKey(stepKey: OnboardingStepKey) {
  const nextIndex = getOnboardingStepIndex(stepKey) + 1;

  return nextIndex < onboardingSteps.length ? onboardingSteps[nextIndex].key : null;
}

export function getOnboardingStepPath(stepKey: OnboardingStepKey) {
  return `/app/setup/${stepKey}`;
}
