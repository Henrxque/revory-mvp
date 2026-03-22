import { redirect } from "next/navigation";

import { OnboardingStepLayout } from "@/components/onboarding/OnboardingStepLayout";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";
import {
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
    next: string;
    summary: string;
    whyItMatters: string;
  }
> = {
  activation: {
    checklist: [
      "Review the core setup choices before handing the workspace into the live dashboard.",
      "Confirm that REVORY has enough context to start monitoring data with confidence.",
      "Keep activation simple, explicit, and self-service.",
    ],
    summary:
      "This final step turns the workspace from setup mode into an operational REVORY environment.",
    whyItMatters:
      "Activation is the moment the customer stops configuring and starts expecting visibility, guidance, and a clean path into imports and future flows.",
    next:
      "After activation, the dashboard becomes the home for imported data, readiness, and the next best action.",
  },
  channel: {
    checklist: [
      "Keep one primary channel so the product feels predictable from day one.",
      "Anchor the MVP in email-first communication.",
      "Avoid making the customer guess which channel REVORY will prioritize.",
    ],
    summary:
      "The communication choice sets the default lane REVORY should use for confirmations, reminders, and future recovery moments.",
    whyItMatters:
      "A premium self-service setup should remove ambiguity early. Picking one default channel now makes every future flow easier to trust.",
    next:
      "Next, REVORY captures the Google Reviews destination so the growth layer has a clear target.",
  },
  mode: {
    checklist: [
      "Make the operating style understandable in plain language.",
      "Keep the choice lightweight instead of exposing a configuration engine.",
      "Let the customer understand what is included before activation.",
    ],
    summary:
      "This choice defines how much of REVORY's operational motion should be included in the starting setup.",
    whyItMatters:
      "Modes translate product complexity into a clear product promise: reminders only, recovery included, or recovery plus reviews.",
    next:
      "After this, activation becomes a clean final review instead of another decision point.",
  },
  reviews: {
    checklist: [
      "Keep the setup focused on the Google Reviews destination only.",
      "Make the field easy to understand and easy to validate.",
      "Prepare the workspace for future review requests without adding extra friction now.",
    ],
    summary:
      "This step stores the destination REVORY should use when review request flows are active for this workspace.",
    whyItMatters:
      "Reviews are part of the product promise. Capturing the destination now keeps growth visible in onboarding instead of bolting it on later.",
    next:
      "Once the review link is in place, REVORY can help the customer choose the best starting mode.",
  },
  source: {
    checklist: [
      "Make the data path obvious before the customer reaches the imports area.",
      "Keep supported source types explicit and narrow.",
      "Position CSV imports as guided, not technical.",
    ],
    summary:
      "This choice tells REVORY how the workspace plans to bring in appointments and clients.",
    whyItMatters:
      "The product only feels premium when setup lowers friction. A clear source path prepares the customer for guided imports instead of external cleanup work.",
    next:
      "After the source is chosen, REVORY asks for the primary communication channel.",
  },
  template: {
    checklist: [
      "Start with the MedSpa-first motion REVORY is built to serve.",
      "Keep the setup focused on one strong vertical instead of generic options.",
      "Make the first choice feel confident and low-friction.",
    ],
    summary:
      "The template step anchors the workspace in the premium MedSpa journey REVORY is designed around.",
    whyItMatters:
      "A narrow product feels easier to trust. This first decision tells the customer REVORY is built for their business, not for everybody.",
    next:
      "After confirming the template, REVORY helps the customer choose how data will enter the workspace.",
  },
};

const optionCardClassName =
  "flex cursor-pointer items-start gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4 transition hover:border-[color:var(--border-accent)] hover:bg-[color:var(--background-card-hover)]";

const sourceTypeLabels: Record<string, string> = {
  APPOINTMENTS_CSV: "Appointments CSV",
  CLIENTS_CSV: "Clients CSV",
  GOOGLE_CALENDAR: "Google Calendar",
  MANUAL_IMPORT: "Manual import",
  OUTLOOK_CALENDAR: "Outlook Calendar",
};

const modeLabels: Record<string, string> = {
  MODE_A: "Mode A · Basic Reminder",
  MODE_B: "Mode B · Attendance Recovery",
  MODE_C: "Mode C · Attendance + Reviews",
};

const channelLabels: Record<string, string> = {
  EMAIL: "Email",
  SMS: "SMS",
};

export default async function OnboardingStepPage({
  params,
  searchParams,
}: OnboardingStepPageProps) {
  const { step: stepParam } = await params;
  const { error } = await searchParams;
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath(`/app/setup/${stepParam}`));
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
          {step.ctaLabel}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">What this step does</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
              {currentStepBody.summary}
            </p>
          </div>

          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">Why it matters</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
              {currentStepBody.whyItMatters}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {currentStepBody.checklist.map((item, index) => (
            <div
              key={item}
              className="rev-card-soft rounded-[22px] px-4 py-4 text-sm leading-6 text-[color:var(--text-muted)]"
            >
              <p className="rev-label">Focus {index + 1}</p>
              <p className="mt-3">{item}</p>
            </div>
          ))}
        </div>

        {hasError ? (
          <div className="rev-feedback-error">
            Check the value for this step and try again.
          </div>
        ) : null}

        <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-6 text-[color:var(--text-muted)]">
          <span className="rev-label">What happens next</span>
          <p className="mt-3">{currentStepBody.next}</p>
        </div>

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
                    Premium, self-service setup for appointment monitoring,
                    recovery, reviews, and a clearer revenue story.
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
                  note: "Best when the workspace wants a direct calendar connection as the long-term path.",
                },
                {
                  value: "OUTLOOK_CALENDAR",
                  label: "Outlook Calendar",
                  note: "Best when the workspace already runs on Outlook and wants the same calendar-first path.",
                },
                {
                  value: "APPOINTMENTS_CSV",
                  label: "Appointments CSV",
                  note: "Recommended when the workspace already has scheduling exports and wants guided mapping inside REVORY.",
                },
                {
                  value: "CLIENTS_CSV",
                  label: "Clients CSV",
                  note: "Recommended when the workspace wants to start from patient records and visit history.",
                },
                {
                  value: "MANUAL_IMPORT",
                  label: "Manual import",
                  note: "Fallback for exports that need human confirmation inside REVORY before import.",
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
                  note: "Recommended default for the MVP and the clearest way to keep activation simple.",
                },
                {
                  value: "SMS",
                  label: "SMS",
                  note: "Useful when available in-plan, but REVORY still treats email as the primary path.",
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
                Save the destination REVORY should use once review requests are
                active for this workspace.
              </p>
            </div>
          ) : null}

          {currentStepKey === "mode" ? (
            <div className="space-y-3">
              {[
                {
                  value: "MODE_A",
                  label: "Mode A · Basic Reminder",
                  note: "Best for a lighter launch focused on confirmations and reminders.",
                },
                {
                  value: "MODE_B",
                  label: "Mode B · Attendance Recovery",
                  note: "Adds the recovery motion for teams that want to protect more empty slots.",
                },
                {
                  value: "MODE_C",
                  label: "Mode C · Attendance + Reviews",
                  note: "Extends the recovery motion with the review layer for a fuller starting setup.",
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
                    value:
                      (selectedDataSourceType && sourceTypeLabels[selectedDataSourceType]) ||
                      "Not selected",
                  },
                  {
                    label: "Primary channel",
                    value:
                      (selectedPrimaryChannel &&
                        channelLabels[selectedPrimaryChannel]) ||
                      "Not selected",
                  },
                  {
                    label: "Recommended mode",
                    value:
                      (selectedRecommendedModeKey &&
                        modeLabels[selectedRecommendedModeKey]) ||
                      "Not selected",
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
                this workspace as live, apply the selected starting mode, and
                send the customer into the dashboard.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
