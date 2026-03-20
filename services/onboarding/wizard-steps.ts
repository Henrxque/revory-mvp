export const onboardingSteps = [
  {
    key: "template",
    title: "Template MedSpa",
    eyebrow: "Step 1 of 6",
    description:
      "Start by confirming the MedSpa template that guides the MVP setup.",
    fieldLabel: "Template selected for the workspace",
    helperText:
      "REVORY starts with a single MedSpa-first template in this MVP. The goal here is clarity, not template sprawl.",
    ctaLabel: "Continue",
  },
  {
    key: "source",
    title: "Supported Source Type",
    eyebrow: "Step 2 of 6",
    description:
      "Define the supported source path for appointments and clients before any real connection or import work.",
    fieldLabel: "Source path prepared for the next sprint",
    helperText:
      "This step only prepares the route for Google Calendar, Outlook Calendar, appointments CSV, clients CSV, or manual import.",
    ctaLabel: "Continue",
  },
  {
    key: "channel",
    title: "Primary Channel",
    eyebrow: "Step 3 of 6",
    description:
      "Choose the main communication channel for the MVP, keeping the operation email-first.",
    fieldLabel: "Primary channel for the initial flow",
    helperText:
      "Email remains the default and most important channel in the MVP. SMS can stay secondary if enabled later.",
    ctaLabel: "Continue",
  },
  {
    key: "reviews",
    title: "Google Reviews URL",
    eyebrow: "Step 4 of 6",
    description:
      "Prepare the Google Reviews destination so review requests have a clear target.",
    fieldLabel: "Review destination configured for the workspace",
    helperText:
      "The real URL persistence comes next. For now, this step keeps the sequence and review intent explicit.",
    ctaLabel: "Continue",
  },
  {
    key: "mode",
    title: "Recommended Mode",
    eyebrow: "Step 5 of 6",
    description:
      "Review the recommended operating mode that will later support the active mode applied to the workspace.",
    fieldLabel: "Recommended starting mode",
    helperText:
      "The wizard stays opinionated here. It prepares one recommended operating path instead of exposing open-ended configuration.",
    ctaLabel: "Continue",
  },
  {
    key: "activation",
    title: "Review and Activation",
    eyebrow: "Step 6 of 6",
    description:
      "Review the setup structure before wiring the real step data and final activation behavior.",
    fieldLabel: "Final check before activation logic",
    helperText:
      "This sprint delivers the guided structure and step persistence. The next step connects the real saved values behind each screen.",
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
