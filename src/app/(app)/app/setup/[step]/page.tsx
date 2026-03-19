import { redirect } from "next/navigation";

import { OnboardingStepLayout } from "@/components/onboarding/OnboardingStepLayout";
import { getAppContext } from "@/services/app/get-app-context";
import {
  goToNextOnboardingStep,
  goToPreviousOnboardingStep,
} from "../actions";
import {
  getNextOnboardingStepKey,
  getOnboardingStep,
  getOnboardingStepPath,
  getPreviousOnboardingStepKey,
  isOnboardingStepKey,
  onboardingSteps,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

type OnboardingStepPageProps = Readonly<{
  params: Promise<{
    step: string;
  }>;
}>;

const stepBody: Record<
  (typeof onboardingSteps)[number]["key"],
  {
    checklist: string[];
    summary: string;
  }
> = {
  activation: {
    checklist: [
      "Confirm that the onboarding path is complete from template through mode selection.",
      "Review the wizard structure before wiring the real saved values in the next step.",
      "Use the dashboard placeholder as the next visual checkpoint after this guided flow.",
    ],
    summary:
      "This final screen closes the guided structure without introducing activation logic complexity too early.",
  },
  channel: {
    checklist: [
      "Keep the MVP anchored on email-first communication.",
      "Make the primary channel explicit before recovery and review flows start using it.",
      "Avoid presenting multiple channels with equal importance in this sprint.",
    ],
    summary:
      "The wizard isolates the communication choice so the product keeps a clear operational default.",
  },
  mode: {
    checklist: [
      "Show one recommended operating path instead of a configurable engine.",
      "Prepare the mode selection that will later support the active workspace mode.",
      "Keep the decision lightweight and easy to review.",
    ],
    summary:
      "The recommended mode step keeps the onboarding opinionated and consistent with the closed MVP flow.",
  },
  reviews: {
    checklist: [
      "Prepare the Google Reviews destination as a distinct onboarding checkpoint.",
      "Keep the field focused on the Google Reviews URL only.",
      "Leave validation and persistence of the real value to the next step.",
    ],
    summary:
      "This step keeps review generation visible in the flow before the setup becomes active.",
  },
  source: {
    checklist: [
      "Capture the source type in the onboarding sequence without implementing the real connection yet.",
      "Keep the supported source options explicit and narrow.",
      "Prepare the UI state for future connection or CSV import work.",
    ],
    summary:
      "The source step stays intentionally lightweight so Sprint 1 does not pull integration work forward.",
  },
  template: {
    checklist: [
      "Confirm the MedSpa-first template as the starting point for the workspace.",
      "Keep the MVP centered on one clear setup path.",
      "Use this as the first real step after workspace creation.",
    ],
    summary:
      "The wizard opens with the MedSpa template so the onboarding starts with the product's core positioning.",
  },
};

export default async function OnboardingStepPage({
  params,
}: OnboardingStepPageProps) {
  const { step: stepParam } = await params;
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  if (appContext.activationSetup.isCompleted) {
    redirect("/app/dashboard");
  }

  const currentStepKey = resolveOnboardingStepKey(appContext.activationSetup.currentStep);

  if (!isOnboardingStepKey(stepParam)) {
    redirect(getOnboardingStepPath(currentStepKey));
  }

  if (stepParam !== currentStepKey) {
    redirect(getOnboardingStepPath(currentStepKey));
  }

  const step = getOnboardingStep(currentStepKey);
  const previousStepKey = getPreviousOnboardingStepKey(currentStepKey);
  const nextStepKey = getNextOnboardingStepKey(currentStepKey);
  const currentStepBody = stepBody[currentStepKey];

  return (
    <OnboardingStepLayout
      currentStepKey={currentStepKey}
      step={step}
      stepKeys={onboardingSteps.map((wizardStep) => wizardStep.key)}
      previousAction={
        previousStepKey ? (
          <form action={goToPreviousOnboardingStep}>
            <input name="step" type="hidden" value={currentStepKey} />
            <button
              type="submit"
              className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-medium text-black/70 transition hover:bg-white"
            >
              Back
            </button>
          </form>
        ) : (
          <span className="text-sm text-black/45">This is the first step.</span>
        )
      }
      nextAction={
        <form action={goToNextOnboardingStep}>
          <input name="step" type="hidden" value={currentStepKey} />
          <button
            type="submit"
            className="rounded-full bg-[color:var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {nextStepKey ? step.ctaLabel : "Continue to dashboard"}
          </button>
        </form>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Step intent
          </p>
          <p className="mt-3 text-sm leading-7 text-black/70">
            {currentStepBody.summary}
          </p>
        </div>

        <div className="space-y-3">
          {currentStepBody.checklist.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-4 text-sm leading-6 text-black/75"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
