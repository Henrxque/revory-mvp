import type { OnboardingStep, OnboardingStepKey } from "@/services/onboarding/wizard-steps";

type OnboardingStepLayoutProps = Readonly<{
  children?: React.ReactNode;
  currentStepKey: OnboardingStepKey;
  formAction?: (formData: FormData) => void | Promise<void>;
  formFields?: React.ReactNode;
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
  formAction,
  formFields,
  nextAction,
  previousAction,
  step,
  stepKeys,
}: OnboardingStepLayoutProps) {
  const currentStepIndex = stepKeys.indexOf(currentStepKey);
  const progressWidth = `${((currentStepIndex + 1) / stepKeys.length) * 100}%`;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="rev-shell-hero rounded-[28px] p-5">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="rev-kicker">Activation integrity</p>
            <h2 className="font-[family:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)]">
              Turn six guided choices into one live booking system.
            </h2>
            <p className="text-sm leading-7 text-[color:var(--text-muted)]">
              Main offer, lead source, booking path, and deal value are not admin
              fields here. They are the pillars REVORY Seller uses to move paid
              leads toward booked appointments.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="rev-label">Progress</p>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {currentStepIndex + 1} / {stepKeys.length}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#c2095a,#e0106a)]"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="rev-label">Seller guardrails</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                One clear decision per step. One booking motion. No CRM sprawl,
                no channel maze, no heavy ops setup.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {stepKeys.map((stepKey, index) => {
              const status = getStepState(stepKeys, currentStepKey, stepKey);
              const isCurrent = status === "current";
              const isDone = status === "done";

              return (
                <div
                  key={stepKey}
                  className={`rounded-[22px] border px-4 py-4 ${
                    isCurrent
                      ? "border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.16),rgba(255,255,255,0.03))]"
                      : "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="rev-label">Step {index + 1}</p>
                      <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
                        {stepKeyLabels[stepKey]}
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        isCurrent
                          ? "bg-[color:var(--accent-light)]"
                          : isDone
                            ? "bg-[color:var(--success)]"
                            : "bg-[color:var(--text-subtle)]"
                      }`}
                    />
                  </div>
                  <p
                    className={`mt-3 text-xs ${
                      isCurrent
                        ? "text-[color:var(--accent-light)]"
                        : isDone
                          ? "text-[color:var(--success)]"
                          : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    {isCurrent ? "Current pillar" : isDone ? "Locked in" : "Up next"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <form action={formAction} className="space-y-6">
        {formFields}

        <div className="rev-shell-hero rev-accent-mist-soft rounded-[28px] p-6">
          <div className="space-y-3">
            <p className="rev-kicker">{step.eyebrow}</p>
            <h2 className="font-[family:var(--font-display)] text-4xl leading-none text-[color:var(--foreground)] md:text-5xl">
              {step.title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              {step.description}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">Booking pillar</p>
            <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
              {step.fieldLabel}
            </p>
          </div>

          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">Activation effect</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {step.helperText}
            </p>
          </div>
        </div>

        <div className="rev-shell-panel rounded-[28px] p-6">
          {children}
        </div>

        <div className="rev-shell-panel flex flex-wrap items-center justify-between gap-3 rounded-[28px] p-5">
          <div>{previousAction}</div>
          <div>{nextAction}</div>
        </div>
      </form>
    </div>
  );
}

const stepKeyLabels: Record<OnboardingStepKey, string> = {
  activation: "Activation",
  channel: "Booking Path",
  deal_value: "Deal Value",
  mode: "Brand Voice",
  source: "Lead Source",
  template: "Main Offer",
};
