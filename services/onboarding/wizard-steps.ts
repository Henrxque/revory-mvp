export const onboardingSteps = [
  {
    key: "template",
    title: "Set Clinic + Main Offer",
    eyebrow: "Step 1 of 6",
    description:
      "Name the clinic and choose the one offer REVORY Seller should push from paid lead to booked appointment first.",
    fieldLabel: "Clinic + main offer",
    helperText:
      "This anchors Seller to a real MedSpa and one clear booking goal from the start.",
    ctaLabel: "Continue",
  },
  {
    key: "source",
    title: "Choose Your Lead Entry",
    eyebrow: "Step 2 of 6",
    description:
      "Choose where REVORY Seller should read paid demand first so activation starts from real lead flow.",
    fieldLabel: "Lead entry",
    helperText:
      "Choose the cleanest path to bring real demand into Seller without turning setup into a technical project.",
    ctaLabel: "Continue",
  },
  {
    key: "channel",
    title: "Lock Your Booking Path",
    eyebrow: "Step 3 of 6",
    description:
      "Set the primary path REVORY Seller should reinforce when a lead is ready to move toward booking.",
    fieldLabel: "Booking path",
    helperText:
      "A single primary path keeps booking fast and predictable. Email stays the default; SMS remains assisted when available.",
    ctaLabel: "Continue",
  },
  {
    key: "deal_value",
    title: "Set Value Per Booking",
    eyebrow: "Step 4 of 6",
    description:
      "Set the revenue tied to one booked appointment so REVORY Seller can read performance against money, not just activity.",
    fieldLabel: "Value per booking",
    helperText:
      "Keep this simple and directional. The goal is a clean revenue baseline from day one.",
    ctaLabel: "Continue",
  },
  {
    key: "mode",
    title: "Choose Your Booking Voice",
    eyebrow: "Step 5 of 6",
    description:
      "Choose the tone REVORY Seller should carry while guiding leads toward the first booking step.",
    fieldLabel: "Seller voice",
    helperText:
      "Keep the tone premium and controlled so the booking path feels consistent without needing extra setup.",
    ctaLabel: "Continue",
  },
  {
    key: "activation",
    title: "Go Live With Seller",
    eyebrow: "Step 6 of 6",
    description:
      "Review the setup, activate the workspace, and move into the live Seller revenue view.",
    fieldLabel: "Activation readiness",
    helperText:
      "Activation is the handoff into a live booking-first system with visible booked outcomes and cleaner revenue visibility.",
    ctaLabel: "Go live with REVORY Seller",
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
