export const onboardingSteps = [
  {
    key: "template",
    title: "Set Your Main Offer",
    eyebrow: "Step 1 of 6",
    description:
      "Choose the one offer REVORY Seller should help move toward booked appointments first.",
    fieldLabel: "Main offer",
    helperText:
      "Start narrow. One main offer keeps activation premium, predictable, and easier to trust.",
    ctaLabel: "Continue",
  },
  {
    key: "source",
    title: "Choose Your Lead Source",
    eyebrow: "Step 2 of 6",
    description:
      "Pick the cleanest path to bring lead and booking data into REVORY Seller with the least friction.",
    fieldLabel: "Lead source",
    helperText:
      "Choose the path that gets this workspace live fastest without turning setup into a technical project.",
    ctaLabel: "Continue",
  },
  {
    key: "channel",
    title: "Choose Your Booking Path",
    eyebrow: "Step 3 of 6",
    description:
      "Set the primary booking lane REVORY Seller should treat as the default path when the workspace goes live.",
    fieldLabel: "Booking path",
    helperText:
      "A single primary path keeps activation simpler. Email is the default; SMS stays secondary when your plan enables it.",
    ctaLabel: "Continue",
  },
  {
    key: "deal_value",
    title: "Set Your Deal Value",
    eyebrow: "Step 4 of 6",
    description:
      "Set the average value tied to one booked appointment so REVORY Seller starts with a clean revenue baseline.",
    fieldLabel: "Average deal value",
    helperText:
      "Keep this directional, simple, and useful. The goal is cleaner revenue visibility from day one.",
    ctaLabel: "Continue",
  },
  {
    key: "mode",
    title: "Choose Your Brand Voice",
    eyebrow: "Step 5 of 6",
    description:
      "Choose the voice posture REVORY Seller should reflect in the guided booking motion.",
    fieldLabel: "Brand voice",
    helperText:
      "Keep the voice premium and opinionated so the workspace feels consistent without needing a complex builder.",
    ctaLabel: "Continue",
  },
  {
    key: "activation",
    title: "Review and Activate",
    eyebrow: "Step 6 of 6",
    description:
      "Review the essentials, activate the workspace, and move into a revenue-first dashboard.",
    fieldLabel: "Activation readiness",
    helperText:
      "Activation is the handoff from setup into booking visibility, revenue tracking, and a cleaner booking-first workspace.",
    ctaLabel: "Activate REVORY Seller",
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
