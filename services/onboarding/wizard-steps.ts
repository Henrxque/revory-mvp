export const onboardingSteps = [
  {
    key: "template",
    title: "Set Clinic + Main Offer",
    eyebrow: "Step 1 of 6",
    description:
      "Name the clinic and choose the one primary offer REVORY should use to understand which appointment and booking risks matter most.",
    fieldLabel: "Clinic + main offer",
    helperText:
      "Your primary offer helps REVORY understand which appointment and booking risks matter most.",
    ctaLabel: "Continue",
  },
  {
    key: "source",
    title: "Choose Your Data Entry",
    eyebrow: "Step 2 of 6",
    description:
      "Choose where REVORY should read structured clinic data first so activation starts from real evidence.",
    fieldLabel: "Data entry",
    helperText:
      "Choose the cleanest path to bring appointment or client evidence into REVORY without turning setup into a technical project.",
    ctaLabel: "Continue",
  },
  {
    key: "channel",
    title: "Lock Your Booking Path",
    eyebrow: "Step 3 of 6",
    description:
      "Set the primary path REVORY should use to identify blocked booking opportunities and operational leak risks.",
    fieldLabel: "Booking path",
    helperText:
      "Your booking path helps REVORY identify blocked booking opportunities and operational leak risks.",
    ctaLabel: "Continue",
  },
  {
    key: "deal_value",
    title: "Set Estimated Value",
    eyebrow: "Step 4 of 6",
    description:
      "Set a directional value so REVORY can estimate revenue at risk when direct appointment value is missing.",
    fieldLabel: "Estimated value",
    helperText:
      "Used to estimate revenue at risk when direct appointment value is missing.",
    ctaLabel: "Continue",
  },
  {
    key: "mode",
    title: "Choose Message Tone",
    eyebrow: "Step 5 of 6",
    description:
      "Choose the tone REVORY should use for bounded guidance and suggested next-step language.",
    fieldLabel: "Message tone",
    helperText:
      "Keep the tone premium and controlled so guidance stays consistent without becoming a custom copy system.",
    ctaLabel: "Continue",
  },
  {
    key: "activation",
    title: "Activate REVORY Read",
    eyebrow: "Step 6 of 6",
    description:
      "Review the setup, activate the workspace, and move into the live REVORY leak read.",
    fieldLabel: "Activation readiness",
    helperText:
      "Activation starts the leak-read workflow with appointment evidence, data quality context and estimated revenue at risk.",
    ctaLabel: "Activate REVORY read",
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
  if (value === "reviews") {
    return "deal_value";
  }

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
