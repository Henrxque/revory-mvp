import type { Prisma } from "@prisma/client";
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

function formatDealValue(value: Prisma.Decimal | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(numericValue);
}

function formatDealValueInput(value: Prisma.Decimal | null) {
  return value ? value.toString() : "";
}

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
      "Review the core setup choices before turning the workspace into a live Seller system.",
      "Confirm that REVORY has enough context to show booking visibility and revenue context clearly.",
      "Keep activation short, explicit, and self-service.",
    ],
    summary:
      "This final step moves the workspace from setup into a live REVORY Seller environment.",
    whyItMatters:
      "Activation is the moment setup ends and revenue visibility begins. The customer should feel ready to track booking signals, not trapped in more configuration.",
    next:
      "After activation, the dashboard becomes the home for revenue visibility, source health, and the next leverage point.",
  },
  channel: {
    checklist: [
      "Keep one primary booking lane so the path feels predictable from day one.",
      "Anchor the MVP in a single, reliable booking path.",
      "Avoid making the customer guess how REVORY Seller will move leads forward.",
    ],
    summary:
      "This choice sets the main booking lane REVORY Seller should prioritize in the guided booking path.",
    whyItMatters:
      "A premium self-service setup should remove ambiguity early. One default lane keeps the product focused and easier to trust.",
    next:
      "Next, REVORY Seller sets the revenue baseline tied to a booked appointment.",
  },
  mode: {
    checklist: [
      "Keep the voice choice understandable in plain language.",
      "Treat the choice as guided setup, not as a configuration matrix.",
      "Make the customer feel the path is narrow, premium, and easy to launch.",
    ],
    summary:
      "This choice defines the voice posture REVORY Seller should use as the starting booking tone.",
    whyItMatters:
      "Brand voice should simplify the launch. It frames the initial setup without turning the MVP into a custom builder.",
    next:
      "After this, activation becomes a clean final review instead of another strategic decision.",
  },
  deal_value: {
    checklist: [
      "Keep this value easy to set without turning setup into a finance workflow.",
      "Use one clear number to anchor revenue visibility from day one.",
      "Avoid bloating the step with advanced pricing logic.",
    ],
    summary:
      "This step stores the average revenue tied to one booked appointment.",
    whyItMatters:
      "Revenue visibility gets sharper when the product starts from a clean baseline instead of a blank state.",
    next:
      "Once deal value is set, REVORY Seller can lock the brand voice and move to final activation.",
  },
  source: {
    checklist: [
      "Make the lead-source path obvious before the customer reaches Sources and Mapping.",
      "Keep supported input types explicit and narrow.",
      "Position imports as guided, not technical.",
    ],
    summary:
      "This choice tells REVORY Seller how the workspace plans to bring in the lead and booking data needed for visibility.",
    whyItMatters:
      "The product only feels premium when setup lowers friction. A clear source path prepares the customer for guided imports instead of messy prep work.",
    next:
      "After the lead source is chosen, REVORY Seller asks for the primary booking path.",
  },
  template: {
    checklist: [
      "Start with one main offer instead of spreading setup across multiple services.",
      "Keep the setup focused on what the clinic wants to book first.",
      "Make the first choice feel confident and low-friction.",
    ],
    summary:
      "The main offer anchors the workspace in the premium booking motion REVORY Seller is designed around.",
    whyItMatters:
      "A narrow product feels easier to trust. One main offer tells the customer REVORY Seller is built to focus, not sprawl.",
    next:
      "After confirming the main offer, REVORY Seller helps the customer choose how lead and booking data will enter the workspace.",
  },
};

const optionCardClassName =
  "flex cursor-pointer items-start gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4 transition hover:border-[color:var(--border-accent)] hover:bg-[color:var(--background-card-hover)]";

const sourceTypeLabels: Record<string, string> = {
  APPOINTMENTS_CSV: "CSV upload",
  CLIENTS_CSV: "Client export",
  GOOGLE_CALENDAR: "Calendar sync",
  MANUAL_IMPORT: "Guided import",
  OUTLOOK_CALENDAR: "Calendar sync (Outlook)",
};

const modeLabels: Record<string, string> = {
  MODE_A: "Calm & Premium",
  MODE_B: "Clear & Assertive",
  MODE_C: "High-Touch Premium",
};

const channelLabels: Record<string, string> = {
  EMAIL: "Primary booking path (Email)",
  SMS: "Assisted booking path (SMS)",
};

const mainOfferLabels: Record<string, string> = {
  BODY_CONTOURING: "Body Contouring",
  INJECTABLES: "Injectables",
  LASER_SKIN: "Laser & Skin",
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
  const selectedTemplate = appContext.activationSetup.selectedTemplate ?? "INJECTABLES";
  const selectedPrimaryChannel = appContext.activationSetup.primaryChannel;
  const selectedAverageDealValue = appContext.activationSetup.averageDealValue ?? null;
  const selectedRecommendedModeKey =
    appContext.activationSetup.recommendedModeKey ?? "MODE_A";
  const selectedDataSourceType = sourceSelection?.type ?? null;
  const formattedDealValue = formatDealValue(selectedAverageDealValue);

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
              {[
                {
                  value: "INJECTABLES",
                  label: "Injectables",
                  note: "Best when the clinic wants REVORY Seller focused on a high-intent consult or treatment path.",
                },
                {
                  value: "LASER_SKIN",
                  label: "Laser & Skin",
                  note: "Best when the clinic wants one clear path around laser, skin, or resurfacing demand.",
                },
                {
                  value: "BODY_CONTOURING",
                  label: "Body Contouring",
                  note: "Best when the clinic wants one structured path for a premium body treatment offer.",
                },
              ].map((option) => (
                <label key={option.value} className={optionCardClassName}>
                  <input
                    defaultChecked={selectedTemplate === option.value}
                    name="selectedTemplate"
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

          {currentStepKey === "source" ? (
            <div className="space-y-3">
              {[
                {
                  value: "GOOGLE_CALENDAR",
                  label: "Calendar sync",
                  note: "Best when the workspace wants a direct sync path for ongoing lead and booking visibility.",
                },
                {
                  value: "OUTLOOK_CALENDAR",
                  label: "Calendar sync (Outlook)",
                  note: "Best when the workspace already runs on Outlook and wants the same sync-first path.",
                },
                {
                  value: "APPOINTMENTS_CSV",
                  label: "CSV upload",
                  note: "Recommended when the workspace already has exports and wants guided mapping inside REVORY Seller.",
                },
                {
                  value: "CLIENTS_CSV",
                  label: "Client export",
                  note: "Recommended when the workspace wants to start from client records and keep revenue context visible.",
                },
                {
                  value: "MANUAL_IMPORT",
                  label: "Guided import",
                  note: "Fallback for exports that need one more guided pass before the data is ready.",
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
                  label: "Primary booking path (Email)",
                  note: "Recommended default for the MVP and the clearest way to keep the booking path simple.",
                },
                {
                  value: "SMS",
                  label: "Assisted booking path (SMS)",
                  note: "Useful when available in-plan, but REVORY Seller still treats one lane as the primary booking path.",
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

          {currentStepKey === "deal_value" ? (
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  Average deal value
                </span>
                <input
                  className="rev-input-field"
                  defaultValue={formatDealValueInput(selectedAverageDealValue)}
                  name="averageDealValue"
                  placeholder="$350"
                  type="text"
                />
              </label>
              <p className="text-sm text-[color:var(--text-muted)]">
                Set the average revenue tied to one booked appointment. Keep it simple and directional.
              </p>
            </div>
          ) : null}

          {currentStepKey === "mode" ? (
            <div className="space-y-3">
              {[
                {
                  value: "MODE_A",
                  label: "Calm & Premium",
                  note: "Best when the clinic wants a measured, polished tone in the booking path.",
                },
                {
                  value: "MODE_B",
                  label: "Clear & Assertive",
                  note: "Best when the clinic wants a firmer, more direct booking posture.",
                },
                {
                  value: "MODE_C",
                  label: "High-Touch Premium",
                  note: "Best when the clinic wants a more concierge-like tone without losing focus.",
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
                  {
                    label: "Main offer",
                    value: mainOfferLabels[selectedTemplate] || "Not selected",
                  },
                  {
                    label: "Lead source",
                    value:
                      (selectedDataSourceType && sourceTypeLabels[selectedDataSourceType]) ||
                      "Not selected",
                  },
                  {
                    label: "Booking path",
                    value:
                      (selectedPrimaryChannel &&
                        channelLabels[selectedPrimaryChannel]) ||
                      "Not selected",
                  },
                  {
                    label: "Brand voice",
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
                  Average deal value
                </p>
                <p className="mt-2 break-all font-medium text-[color:var(--foreground)]">
                  {formattedDealValue ?? "Not configured"}
                </p>
              </div>

              <div className="rev-feedback-warning">
                If the required setup values are present, activation will mark
                this workspace as live and send the customer into the revenue
                view.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
