import type { OnboardingStep, OnboardingStepKey } from "@/services/onboarding/wizard-steps";

type OnboardingStepLayoutProps = Readonly<{
  children?: React.ReactNode;
  currentStepKey: OnboardingStepKey;
  nextAction?: React.ReactNode;
  previousAction?: React.ReactNode;
  step: OnboardingStep;
  stepKeys: readonly OnboardingStepKey[];
}>;

function getStepState(
  stepKeys: readonly OnboardingStepKey[],
  currentStepKey: OnboardingStepKey,
  stepKey: OnboardingStepKey,
) {
  const stepOrder = stepKeys.indexOf(stepKey);
  const currentOrder = stepKeys.indexOf(currentStepKey);

  if (stepOrder < currentOrder) {
    return "done";
  }

  if (stepOrder === currentOrder) {
    return "current";
  }

  return "upcoming";
}

export function OnboardingStepLayout({
  children,
  currentStepKey,
  nextAction,
  previousAction,
  step,
  stepKeys,
}: OnboardingStepLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
          Guided Setup
        </p>

        <div className="mt-5 space-y-3">
          {stepKeys.map((stepKey, index) => {
            const status = getStepState(stepKeys, currentStepKey, stepKey);

            return (
              <div
                key={stepKey}
                className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
                  {stepKeyLabels[stepKey]}
                </p>
                <p className="mt-2 text-xs text-black/55">
                  {status === "current"
                    ? "Current"
                    : status === "done"
                      ? "Completed path"
                      : "Upcoming"}
                </p>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
            {step.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
            {step.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/70 md:text-base">
            {step.description}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">
              This step defines
            </p>
            <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
              {step.fieldLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">
              Guidance
            </p>
            <p className="mt-3 text-sm leading-6 text-black/70">{step.helperText}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-6">
          {children}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[color:var(--border)] bg-white/80 p-5">
          <div>{previousAction}</div>
          <div>{nextAction}</div>
        </div>
      </div>
    </div>
  );
}

const stepKeyLabels: Record<OnboardingStepKey, string> = {
  activation: "Review and Activation",
  channel: "Primary Channel",
  mode: "Recommended Mode",
  reviews: "Google Reviews URL",
  source: "Supported Source Type",
  template: "Template MedSpa",
};
