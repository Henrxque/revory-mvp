import { DataSourceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";
import {
  getOnboardingStep,
  getOnboardingStepPath,
  onboardingSteps,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function formatSourceLabel(value: DataSourceType | null) {
  switch (value) {
    case "APPOINTMENTS_CSV":
      return "CSV upload";
    case "CLIENTS_CSV":
      return "Client export";
    case "GOOGLE_CALENDAR":
      return "Calendar sync";
    case "OUTLOOK_CALENDAR":
      return "Calendar sync (Outlook)";
    case "MANUAL_IMPORT":
      return "Guided import";
    default:
      return null;
  }
}

function formatMainOfferLabel(value: string | null) {
  switch (value) {
    case "INJECTABLES":
      return "Injectables";
    case "LASER_SKIN":
      return "Laser & Skin";
    case "BODY_CONTOURING":
      return "Body Contouring";
    default:
      return null;
  }
}

function formatBrandVoiceLabel(modeKey: string | null) {
  switch (modeKey) {
    case "MODE_A":
      return "Calm & Premium";
    case "MODE_B":
      return "Clear & Assertive";
    case "MODE_C":
      return "High-Touch Premium";
    default:
      return null;
  }
}

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

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

type SetupItem = {
  detail: string;
  label: string;
  ready: boolean;
};

type SetupItemDetailProps = Readonly<{
  detail: string;
  tone: "configured" | "pending";
}>;

function SetupItemDetail({ detail, tone }: SetupItemDetailProps) {
  if (isLikelyUrl(detail)) {
    return (
      <div
        className={`mt-3 min-w-0 overflow-hidden rounded-[16px] border px-3 py-2 ${
          tone === "configured"
            ? "border-[rgba(46,204,134,0.2)] bg-[rgba(10,36,24,0.45)]"
            : "border-[rgba(245,166,35,0.2)] bg-[rgba(48,31,10,0.38)]"
        }`}
      >
        <p
          className="min-w-0 text-xs leading-5 text-[color:var(--text-muted)] [overflow-wrap:anywhere]"
          title={detail}
        >
          {detail}
        </p>
      </div>
    );
  }

  return (
    <p
      className="mt-2 min-w-0 text-sm leading-6 text-[color:var(--text-muted)] break-words"
      title={detail}
    >
      {detail}
    </p>
  );
}

export default async function SetupPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app/setup"));
  }

  const dataSource = await getOnboardingDataSource(appContext.workspace.id);
  const currentStepKey = resolveOnboardingStepKey(appContext.activationSetup.currentStep);
  const currentStep = getOnboardingStep(currentStepKey);
  const continueSetupHref = getOnboardingStepPath(currentStepKey);
  const sourceLabel = formatSourceLabel(dataSource?.type ?? null);
  const mainOfferLabel = formatMainOfferLabel(appContext.activationSetup.selectedTemplate);
  const brandVoiceLabel = formatBrandVoiceLabel(appContext.activationSetup.recommendedModeKey);
  const dealValueLabel = formatDealValue(appContext.activationSetup.averageDealValue ?? null);

  const setupItems: SetupItem[] = [
    {
      detail: mainOfferLabel ?? "No main offer selected yet",
      label: "Main offer",
      ready: Boolean(mainOfferLabel),
    },
    {
      detail: sourceLabel ?? "No lead source selected yet",
      label: "Lead source",
      ready: Boolean(sourceLabel),
    },
    {
      detail:
        appContext.activationSetup.primaryChannel === "SMS"
          ? "Assisted booking path (SMS)"
          : "Primary booking path (Email)",
      label: "Booking path",
      ready: Boolean(appContext.activationSetup.primaryChannel),
    },
    {
      detail: dealValueLabel ?? "No deal value set yet",
      label: "Average deal value",
      ready: Boolean(appContext.activationSetup.averageDealValue),
    },
    {
      detail: brandVoiceLabel ?? "No brand voice selected yet",
      label: "Brand voice",
      ready: Boolean(brandVoiceLabel),
    },
    {
      detail: appContext.activationSetup.isCompleted
        ? "Workspace already activated"
        : `Current step: ${currentStep.title}`,
      label: "Go-live status",
      ready: appContext.activationSetup.isCompleted,
    },
  ];

  const configuredItems = setupItems.filter((item) => item.ready);
  const pendingItems = setupItems.filter((item) => !item.ready);

  return (
    <div className="space-y-6">
      <section className="rev-card-soft rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <p className="rev-kicker">Activation Setup</p>
            <h1 className="font-[family:var(--font-display)] text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.94] text-[color:var(--foreground)]">
              {appContext.activationSetup.isCompleted
                ? "Your Seller setup is already in place."
                : "Finish Seller setup before REVORY goes live."}
            </h1>
            <p className="max-w-[720px] text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              {appContext.activationSetup.isCompleted
                ? "This page keeps the Seller setup state readable without pushing you back into the wizard."
                : "This page keeps main offer, lead source, booking path, deal value, and brand voice readable in one place so activation stays clean."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
              {appContext.activationSetup.isCompleted ? "Activated" : "Setup in progress"}
            </RevoryStatusBadge>
            <span className="inline-flex min-h-9 items-center rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
              {configuredItems.length} of {setupItems.length} configured
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
          <div className="min-w-0 overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="rev-label">Current setup status</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
              {appContext.activationSetup.isCompleted
                ? "The activation flow is complete. Dashboard and source mapping already use this workspace state."
                : `REVORY Seller is still waiting on setup completion. The current step is "${currentStep.title}".`}
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {appContext.activationSetup.isCompleted
                ? "You can keep working from the dashboard or source mapping without reopening the step-by-step flow."
                : "The setup stays narrow on purpose: one main offer, one lead source, one booking path, one deal value, one brand voice, then activation."}
            </p>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-5">
            <p className="rev-label">Next step</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
              {appContext.activationSetup.isCompleted
                ? "The setup is already complete. Use the dashboard as the main workspace and come back here only when you need a clean activation checkpoint."
                : `Continue from "${currentStep.title}" to finish the activation path cleanly.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {appContext.activationSetup.isCompleted ? (
                <>
                  <DocumentNavigationLink className="rev-button-primary" href="/app/dashboard">
                    Open dashboard
                  </DocumentNavigationLink>
                  <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                    Review sources
                  </DocumentNavigationLink>
                </>
              ) : (
                <DocumentNavigationLink className="rev-button-primary" href={continueSetupHref}>
                  Continue setup
                </DocumentNavigationLink>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] xl:items-start">
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                Configured items
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                What REVORY already has on file for this Seller workspace.
              </p>
            </div>
            <RevoryStatusBadge tone="real">{configuredItems.length} configured</RevoryStatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            {configuredItems.map((item) => (
              <div
                key={item.label}
                className="min-w-0 overflow-hidden rounded-[20px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {item.label}
                  </p>
                  <RevoryStatusBadge tone="real">Configured</RevoryStatusBadge>
                </div>
                <SetupItemDetail detail={item.detail} tone="configured" />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                Pending items
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                What still needs user input before setup is fully complete.
              </p>
            </div>
            <RevoryStatusBadge tone={pendingItems.length > 0 ? "future" : "neutral"}>
              {pendingItems.length > 0 ? `${pendingItems.length} pending` : "Nothing pending"}
            </RevoryStatusBadge>
          </div>

          {pendingItems.length > 0 ? (
            <div className="mt-5 space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 overflow-hidden rounded-[20px] border border-[rgba(245,166,35,0.18)] bg-[rgba(245,166,35,0.06)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--foreground)]">
                      {item.label}
                    </p>
                    <RevoryStatusBadge tone="future">Pending</RevoryStatusBadge>
                  </div>
                  <SetupItemDetail detail={item.detail} tone="pending" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 min-w-0 overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-5">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                Nothing is currently pending.
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The workspace activation is already complete, so this page is now a clean status
                checkpoint rather than an active to-do list.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Step-by-step activation view
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              A short read of the activation path without forcing the wizard open.
            </p>
          </div>
          <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
            {appContext.activationSetup.isCompleted ? "Completed" : currentStep.eyebrow}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {onboardingSteps.map((step) => {
            const stepIndex = onboardingSteps.findIndex((candidate) => candidate.key === step.key);
            const currentIndex = onboardingSteps.findIndex(
              (candidate) => candidate.key === currentStepKey,
            );
            const isCompleted = appContext.activationSetup.isCompleted || stepIndex < currentIndex;
            const isCurrent = !appContext.activationSetup.isCompleted && step.key === currentStepKey;

            return (
              <div
                key={step.key}
                className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="rev-label">{step.eyebrow}</p>
                  <RevoryStatusBadge
                    tone={isCompleted ? "real" : isCurrent ? "accent" : "neutral"}
                  >
                    {isCompleted ? "Done" : isCurrent ? "Current" : "Pending"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

