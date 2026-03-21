import { redirect } from "next/navigation";

import { OnboardingStepLayout } from "@/components/onboarding/OnboardingStepLayout";
import { getAppContext } from "@/services/app/get-app-context";
import { getOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";
import {
  getNextOnboardingStepKey,
  getOnboardingStep,
  getOnboardingStepPath,
  getPreviousOnboardingStepKey,
  isOnboardingStepKey,
  onboardingSteps,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import {
  goToPreviousOnboardingStep,
  submitOnboardingStep,
} from "../actions";

type OnboardingStepPageProps = Readonly<{
  params: Promise<{
    step: string;
  }>;
  searchParams: Promise<{
    error?: string;
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
      "Require the minimum setup values before allowing activation.",
      "Use activation to mark the workspace as ready and redirect to the dashboard placeholder.",
    ],
    summary:
      "This final screen concludes the setup, marks the workspace as active, and sends the user to the placeholder dashboard.",
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

const optionCardClassName =
  "flex cursor-pointer items-start gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4 transition hover:border-[color:var(--border-accent)] hover:bg-[color:var(--background-card-hover)]";

export default async function OnboardingStepPage({
  params,
  searchParams,
}: OnboardingStepPageProps) {
  const { step: stepParam } = await params;
  const { error } = await searchParams;
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
  const sourceSelection = await getOnboardingDataSource(appContext.workspace.id);
  const previousStepKey = getPreviousOnboardingStepKey(currentStepKey);
  const nextStepKey = getNextOnboardingStepKey(currentStepKey);
  const currentStepBody = stepBody[currentStepKey];
  const hasError = Boolean(error);
  const selectedTemplate = appContext.activationSetup.selectedTemplate ?? "MEDSPA";
  const selectedPrimaryChannel = appContext.activationSetup.primaryChannel;
  const selectedGoogleReviewsUrl = appContext.activationSetup.googleReviewsUrl ?? "";
  const selectedRecommendedModeKey =
    appContext.activationSetup.recommendedModeKey ?? "MODE_A";
  const selectedDataSourceType = sourceSelection?.type ?? null;

  return (
    <OnboardingStepLayout
      currentStepKey={currentStepKey}
      formAction={submitOnboardingStep}
      formFields={<input name="step" type="hidden" value={currentStepKey} />}
      step={step}
      stepKeys={onboardingSteps.map((wizardStep) => wizardStep.key)}
      previousAction={
        previousStepKey ? (
          <button
            className="rev-button-secondary"
            formAction={goToPreviousOnboardingStep}
            type="submit"
          >
            Back
          </button>
        ) : (
          <span className="text-sm text-[color:var(--text-muted)]">
            This is the first step.
          </span>
        )
      }
      nextAction={
        <button
          className="rev-button-primary"
          type="submit"
        >
          {nextStepKey ? step.ctaLabel : "Continue to dashboard"}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rev-card rounded-[24px] p-5">
          <p className="rev-label">
            Step intent
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
            {currentStepBody.summary}
          </p>
        </div>

        <div className="space-y-3">
          {currentStepBody.checklist.map((item) => (
            <div
              key={item}
              className="rev-card-soft rounded-[22px] px-4 py-4 text-sm leading-6 text-[color:var(--text-muted)]"
            >
              {item}
            </div>
          ))}
        </div>

        {hasError ? (
          <div className="rev-feedback-error">
            Check the value for this step and try again.
          </div>
        ) : null}

        <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-6 text-[color:var(--text-muted)]">
          {currentStepKey === "template" ? (
            <div className="space-y-3">
              <label className={optionCardClassName}>
                <input
                  defaultChecked={selectedTemplate === "MEDSPA"}
                  name="selectedTemplate"
                  type="radio"
                  value="MEDSPA"
                />
                <span className="space-y-1">
                  <span className="block font-medium text-[color:var(--foreground)]">
                    MedSpa
                  </span>
                  <span className="block text-sm text-[color:var(--text-muted)]">
                    Premium, self-service setup for appointments, recovery,
                    reviews, and ROI visibility.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {currentStepKey === "source" ? (
            <div className="space-y-3">
              {[
                {
                  value: "GOOGLE_CALENDAR",
                  label: "Google Calendar",
                  note: "Prepare the connection path without integrating it yet.",
                },
                {
                  value: "OUTLOOK_CALENDAR",
                  label: "Outlook Calendar",
                  note: "Prepare the connection path without integrating it yet.",
                },
                {
                  value: "APPOINTMENTS_CSV",
                  label: "Appointments CSV",
                  note: "Prepare the upload route without parsing files yet.",
                },
                {
                  value: "CLIENTS_CSV",
                  label: "Clients CSV",
                  note: "Prepare the upload route without parsing files yet.",
                },
                {
                  value: "MANUAL_IMPORT",
                  label: "Manual import",
                  note: "Keep a simple fallback path for MVP setup.",
                },
              ].map((option) => (
                <label key={option.value} className={optionCardClassName}>
                  <input
                    defaultChecked={selectedDataSourceType === option.value}
                    name="selectedDataSourceType"
                    type="radio"
                    value={option.value}
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-[color:var(--foreground)]">
                      {option.label}
                    </span>
                    <span className="block text-sm text-[color:var(--text-muted)]">
                      {option.note}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {currentStepKey === "channel" ? (
            <div className="space-y-3">
              {[
                {
                  value: "EMAIL",
                  label: "Email",
                  note: "Default and primary channel for the MVP.",
                },
                {
                  value: "SMS",
                  label: "SMS",
                  note: "Structural option only. The MVP still operates email-first.",
                },
              ].map((option) => (
                <label key={option.value} className={optionCardClassName}>
                  <input
                    defaultChecked={selectedPrimaryChannel === option.value}
                    name="primaryChannel"
                    type="radio"
                    value={option.value}
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-[color:var(--foreground)]">
                      {option.label}
                    </span>
                    <span className="block text-sm text-[color:var(--text-muted)]">
                      {option.note}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {currentStepKey === "reviews" ? (
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  Google Reviews URL
                </span>
                <input
                  className="rev-input-field"
                  defaultValue={selectedGoogleReviewsUrl}
                  name="googleReviewsUrl"
                  placeholder="https://g.page/r/your-google-reviews-link"
                  type="url"
                />
              </label>
              <p className="text-sm text-[color:var(--text-muted)]">
                Save the destination only. Review requests and delivery logic
                are still out of scope for this sprint.
              </p>
            </div>
          ) : null}

          {currentStepKey === "mode" ? (
            <div className="space-y-3">
              {[
                {
                  value: "MODE_A",
                  label: "Mode A",
                  note: "Conservative starting path for guided MVP activation.",
                },
                {
                  value: "MODE_B",
                  label: "Mode B",
                  note: "Balanced path when the workspace wants moderate automation.",
                },
                {
                  value: "MODE_C",
                  label: "Mode C",
                  note: "More assertive starting path while keeping the setup closed.",
                },
              ].map((option) => (
                <label key={option.value} className={optionCardClassName}>
                  <input
                    defaultChecked={selectedRecommendedModeKey === option.value}
                    name="recommendedModeKey"
                    type="radio"
                    value={option.value}
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-[color:var(--foreground)]">
                      {option.label}
                    </span>
                    <span className="block text-sm text-[color:var(--text-muted)]">
                      {option.note}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {currentStepKey === "activation" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: "Template", value: selectedTemplate || "Not selected" },
                  {
                    label: "Source type",
                    value: selectedDataSourceType || "Not selected",
                  },
                  {
                    label: "Primary channel",
                    value: selectedPrimaryChannel || "Not selected",
                  },
                  {
                    label: "Recommended mode",
                    value: selectedRecommendedModeKey || "Not selected",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rev-card rounded-[22px] p-4"
                  >
                    <p className="rev-label">
                      {item.label}
                    </p>
                    <p className="mt-2 font-medium text-[color:var(--foreground)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rev-card rounded-[22px] p-4">
                <p className="rev-label">
                  Google Reviews URL
                </p>
                <p className="mt-2 break-all font-medium text-[color:var(--foreground)]">
                  {selectedGoogleReviewsUrl || "Not configured"}
                </p>
              </div>

              <div className="rev-feedback-warning">
                If the required setup values are present, activation will mark
                this workspace as completed, apply the active mode, and
                redirect to the dashboard placeholder.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
