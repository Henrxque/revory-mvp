import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { OnboardingStepLayout } from "@/components/onboarding/OnboardingStepLayout";
import { RevoryDecisionSupportCard } from "@/components/ui/RevoryDecisionSupportCard";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { buildActivationStepRead } from "@/services/decision-support/build-activation-step-read";
import { getActivationStepRead } from "@/services/decision-support/get-activation-step-read";
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
    edit?: string;
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

function getClinicNameInputValue(
  workspaceName: string,
  profileBrandName: string | null | undefined,
) {
  if (profileBrandName?.trim()) {
    return profileBrandName.trim();
  }

  if (workspaceName === "REVORY Workspace" || workspaceName.endsWith("'s Workspace")) {
    return "";
  }

  return workspaceName;
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
      "Review the few choices that shape appointment evidence and revenue risk.",
      "Confirm REVORY has enough context to read appointment evidence clearly.",
      "Keep go-live short, explicit, and self-service.",
    ],
    summary:
      "This final step turns the workspace into an active REVORY revenue leak read.",
    whyItMatters:
      "Activation is where setup stops feeling theoretical and starts showing structured clinic data, appointment evidence and estimated revenue at risk in one narrow system.",
    next:
      "After activation, REVORY moves into Clinic Data first or straight into the Leak Read when appointment evidence is already visible.",
  },
  channel: {
    checklist: [
      "Keep one primary booking lane so the motion feels predictable from day one.",
      "Anchor REVORY in one booking path instead of multiple competing routes.",
      "Make blocked booking risk easier to detect.",
    ],
    summary:
      "This choice sets the main route REVORY uses to identify blocked booking opportunities and operational leak risks.",
    whyItMatters:
      "A premium self-service system removes ambiguity early. One default path keeps operational leak risk easier to understand.",
    next:
      "Next, REVORY sets the estimated value used when direct appointment value is missing.",
  },
  mode: {
    checklist: [
      "Keep the voice choice understandable in plain language.",
      "Treat the choice as delivery posture, not as a custom copy system.",
      "Keep guidance premium and easy to understand.",
    ],
    summary:
      "This choice defines the message tone REVORY should use for bounded guidance.",
    whyItMatters:
      "Tone should support clarity and consistency, not create another setup project. The goal is bounded guidance without turning REVORY into a copy builder.",
    next:
      "After this, activation becomes a clean final review instead of another strategy pass.",
  },
  deal_value: {
    checklist: [
      "Keep this value easy to set without turning setup into a finance workflow.",
      "Use one clear number to anchor estimated revenue at risk from day one.",
      "Avoid bloating the step with pricing logic or plan complexity.",
    ],
    summary:
      "This step stores the directional value used when direct appointment value is missing.",
    whyItMatters:
      "REVORY should feel connected to money from the first session. A clear estimated value keeps the read centered on revenue risk instead of generic activity.",
    next:
      "Once estimated value is set, REVORY can lock message tone and move to final activation.",
  },
  source: {
    checklist: [
      "Make the data entry path obvious before the customer reaches Clinic Data.",
      "Keep supported input types explicit and narrow.",
      "Position uploads as guided, not technical.",
    ],
    summary:
      "This choice tells REVORY where structured clinic evidence will come from first.",
    whyItMatters:
      "The product only feels premium when setup starts from real clinic data. A clear data entry path connects REVORY to evidence instead of a vague setup state.",
    next:
      "After the data entry path is chosen, REVORY locks the primary booking path.",
  },
  template: {
    checklist: [
      "Start by naming the clinic so REVORY feels anchored to a real MedSpa.",
      "Choose one main offer instead of spreading attention across multiple services.",
      "Keep the first setup move concrete, narrow, and low-friction.",
    ],
    summary:
      "This step anchors the workspace to a real clinic and the one offer REVORY uses to understand appointment and booking risks.",
    whyItMatters:
      "A narrow product feels easier to trust when it clearly belongs to a real clinic and one primary offer. This keeps the setup evidence-first instead of abstract.",
    next:
      "After locking the main offer, REVORY connects the data entry path feeding the leak read.",
  },
};

const optionCardClassName =
  "flex cursor-pointer items-start gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4 transition hover:border-[color:var(--border-accent)] hover:bg-[color:var(--background-card-hover)]";

const sourceTypeLabels: Record<string, string> = {
  APPOINTMENTS_CSV: "Appointments upload",
  CLIENTS_CSV: "Client export",
  MANUAL_IMPORT: "Guided CSV upload",
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

type ActivationDecisionSupportProps = Readonly<{
  averageDealValue: Prisma.Decimal | null;
  primaryChannel: string | null;
  recommendedModeKey: string | null;
  selectedDataSourceType: string | null;
  selectedTemplate: string | null;
  stepKey: (typeof onboardingSteps)[number]["key"];
}>;

async function ActivationDecisionSupport({
  averageDealValue,
  primaryChannel,
  recommendedModeKey,
  selectedDataSourceType,
  selectedTemplate,
  stepKey,
}: ActivationDecisionSupportProps) {
  const read = await getActivationStepRead({
    averageDealValue,
    primaryChannel,
    recommendedModeKey,
    selectedDataSourceType,
    selectedTemplate,
    stepKey,
  });

  return <RevoryDecisionSupportCard read={read} surface="activation" />;
}

export default async function OnboardingStepPage({
  params,
  searchParams,
}: OnboardingStepPageProps) {
  const { step: stepParam } = await params;
  const { edit, error } = await searchParams;
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath(`/app/setup/${stepParam}`));
  }

  const persistedCurrentStepKey = resolveOnboardingStepKey(appContext.activationSetup.currentStep);

  if (!isOnboardingStepKey(stepParam)) {
    redirect(getOnboardingStepPath(persistedCurrentStepKey));
  }

  const isEditingCompletedSetup =
    appContext.activationSetup.isCompleted && edit === "1" && stepParam !== "activation";

  if (appContext.activationSetup.isCompleted && !isEditingCompletedSetup) {
    redirect("/app/setup");
  }

  const currentStepKey = isEditingCompletedSetup ? stepParam : persistedCurrentStepKey;

  if (!isEditingCompletedSetup && stepParam !== currentStepKey) {
    redirect(getOnboardingStepPath(currentStepKey));
  }

  const step = getOnboardingStep(currentStepKey);
  const sourceSelection = await getOnboardingDataSource(appContext.workspace.id);
  const previousStepKey = getPreviousOnboardingStepKey(currentStepKey);
  const currentStepBody = stepBody[currentStepKey];
  const hasError = Boolean(error);
  const clinicName = getClinicNameInputValue(
    appContext.workspace.name,
    appContext.medSpaProfile?.brandName,
  );
  const businessTypeLabel = appContext.medSpaProfile?.businessType?.trim() || "MedSpa";
  const persistedTemplate = appContext.activationSetup.selectedTemplate;
  const selectedTemplate = persistedTemplate ?? "INJECTABLES";
  const selectedPrimaryChannel = appContext.activationSetup.primaryChannel;
  const selectedAverageDealValue = appContext.activationSetup.averageDealValue ?? null;
  const persistedRecommendedModeKey = appContext.activationSetup.recommendedModeKey;
  const selectedRecommendedModeKey = persistedRecommendedModeKey ?? "MODE_A";
  const selectedDataSourceType = sourceSelection?.type ?? null;
  const formattedDealValue = formatDealValue(selectedAverageDealValue);
  const selectedMainOfferLabel =
    (persistedTemplate && mainOfferLabels[persistedTemplate]) || "Main offer pending";
  const selectedLeadEntryLabel =
    (selectedDataSourceType && sourceTypeLabels[selectedDataSourceType]) || "Data entry pending";
  const selectedBookingPathLabel = selectedPrimaryChannel
    ? currentStepKey === "channel" || currentStepKey === "template" || currentStepKey === "source"
      ? `${channelLabels[selectedPrimaryChannel]} · recommended`
      : channelLabels[selectedPrimaryChannel]
    : "Booking path pending";
  const selectedMessageToneLabel =
    (persistedRecommendedModeKey && modeLabels[persistedRecommendedModeKey]) || "Message tone pending";
  const activationStepFallbackRead = buildActivationStepRead({
    averageDealValue: selectedAverageDealValue,
    primaryChannel: selectedPrimaryChannel,
    recommendedModeKey: selectedRecommendedModeKey,
    selectedDataSourceType,
    selectedTemplate,
    stepKey: currentStepKey,
  });

  return (
    <OnboardingStepLayout
      currentStepKey={currentStepKey}
      formAction={submitOnboardingStep}
      formFields={
        <>
          <input name="step" type="hidden" value={currentStepKey} />
          {isEditingCompletedSetup ? <input name="mode" type="hidden" value="edit" /> : null}
        </>
      }
      isAdjustmentMode={isEditingCompletedSetup}
      step={step}
      stepKeys={onboardingSteps.map((wizardStep) => wizardStep.key)}
      contextPanel={
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">Clinic context</p>
            <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
              {clinicName || "Clinic name pending"}
            </p>
            <p className="mt-1.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
              {isEditingCompletedSetup
                ? `${businessTypeLabel}. REVORY stays active while this one setup choice is adjusted.`
                : `${businessTypeLabel}. REVORY is being configured for one clear revenue leak read, not a generic workspace.`}
            </p>
          </div>

          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">Current setup</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                selectedMainOfferLabel,
                selectedLeadEntryLabel,
                selectedBookingPathLabel,
                formattedDealValue ?? "Value pending",
                selectedMessageToneLabel,
              ].map((item) => (
                <span
                  className="inline-flex min-h-8 items-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--foreground)]"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      }
      previousAction={
        isEditingCompletedSetup ? (
          <DocumentNavigationLink className="rev-button-secondary" href="/app/setup">
            Back to setup
          </DocumentNavigationLink>
        ) : previousStepKey ? (
          <button
            className="rev-button-secondary"
            formAction={goToPreviousOnboardingStep}
            type="submit"
          >
            Back
          </button>
        ) : (
          <span className="text-sm text-[color:var(--text-muted)]">
            Activation starts here.
          </span>
        )
      }
      nextAction={
        <button
          className="rev-button-primary"
          type="submit"
        >
          {isEditingCompletedSetup ? "Save adjustment" : step.ctaLabel}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">What this sets</p>
            <p className="mt-2.5 text-sm leading-[1.6] text-[color:var(--text-muted)]">
              {currentStepBody.summary}
            </p>
          </div>

          <div className="rev-card rounded-[24px] p-5">
            <p className="rev-label">Why this changes booking performance</p>
            <p className="mt-2.5 text-sm leading-[1.6] text-[color:var(--text-muted)]">
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
                <p className="rev-label">Key point {index + 1}</p>
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
          <span className="rev-label">What unlocks next</span>
          <p className="mt-3">{currentStepBody.next}</p>
        </div>

        <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-6 text-[color:var(--text-muted)]">
          {currentStepKey === "template" ? (
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  Clinic name
                </span>
                <input
                  className="rev-input-field"
                  defaultValue={clinicName}
                  name="clinicName"
                  placeholder="Lumina Aesthetics"
                  type="text"
                />
              </label>
              <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="rev-label">Business type</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                  {businessTypeLabel}
                </p>
                <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
                  REVORY stays anchored to a MedSpa-first leak read from the first step.
                </p>
              </div>

              {[
                {
                  value: "INJECTABLES",
                  label: "Injectables",
                  note: "Best when the clinic wants REVORY focused on a high-intent consult path with clear revenue risk.",
                },
                {
                  value: "LASER_SKIN",
                  label: "Laser & Skin",
                  note: "Best when the clinic wants one clear booking motion around laser, skin, or resurfacing demand.",
                },
                {
                  value: "BODY_CONTOURING",
                  label: "Body Contouring",
                  note: "Best when the clinic wants one structured path for a premium body offer with a single booking goal.",
                },
              ].map((option) => (
                <label key={option.value} className={optionCardClassName}>
                  <input
                    defaultChecked={persistedTemplate === option.value}
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
                  value: "APPOINTMENTS_CSV",
                  label: "Appointments upload",
                  note: "Best when this clinic already has appointment exports and wants the fastest path to clinic data visibility.",
                },
                {
                  value: "CLIENTS_CSV",
                  label: "Client export",
                  note: "Best when this clinic wants client context visible before appointment evidence is complete.",
                },
                {
                  value: "MANUAL_IMPORT",
                  label: "Guided CSV upload",
                  note: "Fallback when the clinic export needs one guided pass before REVORY can read it cleanly.",
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
                  note: "Best when this clinic wants one clear handoff into booking with minimal setup overhead.",
                },
                {
                  value: "SMS",
                  label: "Assisted booking path (SMS)",
                  note: "Useful when available in-plan, but REVORY still keeps one main booking destination instead of multiple parallel lanes.",
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
                  Estimated appointment value
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
                Used to estimate revenue at risk when direct appointment value is missing.
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
                    defaultChecked={persistedRecommendedModeKey === option.value}
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
              <div className="space-y-3">
                <div className="rounded-[22px] border border-[rgba(67,179,155,0.18)] bg-[rgba(67,179,155,0.08)] p-4">
                  <p className="rev-label">What goes live</p>
                  <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
                    These are the choices REVORY will use to read clinic data, identify operational leak risks, and estimate revenue at risk from the first session.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      label: "Main offer",
                      value: mainOfferLabels[selectedTemplate] || "Not selected",
                    },
                    {
                      label: "Data entry",
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
                      label: "Estimated value",
                      value: formattedDealValue ?? "Not set",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rev-card rounded-[22px] p-4"
                    >
                      <p className="rev-label">{item.label}</p>
                      <p className="mt-2 font-medium text-[color:var(--foreground)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="rev-label">Lead enters from</p>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                    {(selectedDataSourceType && sourceTypeLabels[selectedDataSourceType]) || "Not selected"}
                  </p>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
                    REVORY reads clinic evidence from this path first.
                  </p>
                </div>
                <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.08)] p-4">
                  <p className="rev-label">REVORY hands off to</p>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                    {(selectedPrimaryChannel && channelLabels[selectedPrimaryChannel]) || "Not selected"}
                  </p>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
                    This stays the natural booking destination of the guided flow.
                  </p>
                </div>
                <div className="rounded-[20px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] p-4">
                  <p className="rev-label">Outcome visible as</p>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                    Appointment evidence + estimated risk
                  </p>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
                    Visibility starts from appointment evidence, not from generic activation completion.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    label: "Message tone",
                    value:
                      (selectedRecommendedModeKey &&
                        modeLabels[selectedRecommendedModeKey]) ||
                      "Not selected",
                  },
                  {
                    label: "Activation outcome",
                    value: "Dashboard becomes the live home for appointment evidence and estimated revenue at risk.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rev-card rounded-[22px] p-4"
                  >
                    <p className="rev-label">{item.label}</p>
                    <p className="mt-2 font-medium text-[color:var(--foreground)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rev-feedback-warning">
                Activation marks this workspace as active and moves the customer into REVORY, where appointment evidence and estimated revenue at risk become visible.
              </div>

              <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="rev-label">How revenue becomes visible</p>
                <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
                  Revenue at risk does not appear from activation alone. REVORY needs appointment evidence, then applies estimated value when direct appointment value is missing.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <Suspense
          fallback={
            <RevoryDecisionSupportCard
              read={activationStepFallbackRead}
              surface="activation"
            />
          }
        >
          <ActivationDecisionSupport
            averageDealValue={selectedAverageDealValue}
            primaryChannel={selectedPrimaryChannel}
            recommendedModeKey={selectedRecommendedModeKey}
            selectedDataSourceType={selectedDataSourceType}
            selectedTemplate={selectedTemplate}
            stepKey={currentStepKey}
          />
        </Suspense>
      </div>
    </OnboardingStepLayout>
  );
}

