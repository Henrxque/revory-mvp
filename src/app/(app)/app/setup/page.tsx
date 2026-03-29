import { DataSourceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { isSupportedOnboardingSourceType } from "@/services/onboarding/supported-onboarding-source-types";
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
      return "Appointments CSV";
    case "CLIENTS_CSV":
      return "Client export";
    case "MANUAL_IMPORT":
      return "Guided CSV upload";
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

function formatBookingPathLabel(value: string | null) {
  switch (value) {
    case "SMS":
      return "Assisted booking path (SMS)";
    case "EMAIL":
      return "Primary booking path (Email)";
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
  note: string;
  ready: boolean;
  type: "pillar" | "support";
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
  const bookingPathLabel = formatBookingPathLabel(appContext.activationSetup.primaryChannel);
  const brandVoiceLabel = formatBrandVoiceLabel(appContext.activationSetup.recommendedModeKey);
  const dealValueLabel = formatDealValue(appContext.activationSetup.averageDealValue ?? null);
  const sourceNeedsReview =
    Boolean(dataSource?.type) &&
    !isSupportedOnboardingSourceType(dataSource?.type ?? null);

  const setupItems: SetupItem[] = [
    {
      detail: mainOfferLabel ?? "No main offer selected yet",
      label: "Main offer",
      note: "Defines the one offer REVORY Seller should help book first.",
      ready: Boolean(mainOfferLabel),
      type: "pillar",
    },
    {
      detail: bookingPathLabel ?? "No booking path selected yet",
      label: "Booking path",
      note: "Defines the exact route REVORY Seller should push leads into when it is time to convert interest into a booked appointment.",
      ready: Boolean(bookingPathLabel),
      type: "pillar",
    },
    {
      detail: sourceNeedsReview
        ? "Current lead entry needs review"
        : sourceLabel ?? "Lead entry point pending",
      label: "Lead source",
      note: sourceNeedsReview
        ? "This workspace still carries a source type that Sprint 2 does not support in the live Seller flow."
        : "Sets where Seller reads initial demand and hands qualified lead flow into the booking path.",
      ready: Boolean(sourceLabel) && !sourceNeedsReview,
      type: "pillar",
    },
    {
      detail: dealValueLabel ?? "No deal value set yet",
      label: "Deal value",
      note: "Turns booked appointments into a clean revenue signal from day one.",
      ready: Boolean(appContext.activationSetup.averageDealValue),
      type: "pillar",
    },
    {
      detail: brandVoiceLabel ?? "No brand voice selected yet",
      label: "Brand voice",
      note: "Keeps the booking motion consistent without turning Seller into a builder.",
      ready: Boolean(brandVoiceLabel),
      type: "support",
    },
    {
      detail: appContext.activationSetup.isCompleted
        ? "Workspace already activated"
        : `Current step: ${currentStep.title}`,
      label: "Go-live status",
      note: "Shows whether the booking pillars are already active in the live Seller workspace.",
      ready: appContext.activationSetup.isCompleted,
      type: "support",
    },
  ];

  const pillarItems = setupItems.filter((item) => item.type === "pillar");
  const supportItems = setupItems.filter((item) => item.type === "support");
  const configuredPillars = pillarItems.filter((item) => item.ready);
  const pendingPillars = pillarItems.filter((item) => !item.ready);

  return (
    <div className="space-y-6">
      <section className="rev-card-soft rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <p className="rev-kicker">Activation integrity</p>
            <h1 className="font-[family:var(--font-display)] text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.94] text-[color:var(--foreground)]">
              {appContext.activationSetup.isCompleted
                ? "Your Seller booking engine is already active."
                : "Turn the setup into a live Seller booking engine."}
            </h1>
            <p className="max-w-[720px] text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              {appContext.activationSetup.isCompleted
                ? "This page keeps the booking pillars readable without dragging you back into the wizard."
                : "Main offer, lead source, booking path, and deal value are the pillars that shape how REVORY Seller reads demand, pushes toward booking, and frames revenue from day one."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
              {appContext.activationSetup.isCompleted ? "Activated" : "Setup in progress"}
            </RevoryStatusBadge>
            <span className="inline-flex min-h-9 items-center rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
              {configuredPillars.length} of {pillarItems.length} booking pillars locked
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
          <div className="min-w-0 overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="rev-label">Why activation matters</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
              {appContext.activationSetup.isCompleted
                ? "The activation flow is complete. Dashboard and booking inputs already use the live Seller state."
                : `REVORY Seller is still waiting on activation integrity. The current step is "${currentStep.title}".`}
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {appContext.activationSetup.isCompleted
                ? "You can keep working from the dashboard or sources view without reopening the guided flow."
                : "The path stays narrow on purpose: one main offer, one lead source, one booking path, one deal value, one booking voice, then activation."}
            </p>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-5">
            <p className="rev-label">Next controlled step</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
              {appContext.activationSetup.isCompleted
                ? "The setup is already complete. Use the dashboard as the main workspace and return here only when you need a clean activation checkpoint."
                : `Continue from "${currentStep.title}" to finish the booking pillars cleanly.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {appContext.activationSetup.isCompleted ? (
                <>
                  <DocumentNavigationLink className="rev-button-primary" href="/app/dashboard">
                    Open dashboard
                  </DocumentNavigationLink>
                  <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                    Open Booking Inputs
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pillarItems.map((item) => (
          <div
            key={item.label}
            className={`min-w-0 overflow-hidden rounded-[24px] border p-5 ${
              item.ready
                ? "border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)]"
                : "border-[rgba(245,166,35,0.18)] bg-[rgba(245,166,35,0.06)]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="rev-label">{item.label}</p>
              <RevoryStatusBadge tone={item.ready ? "real" : "future"}>
                {item.ready ? "Locked" : "Pending"}
              </RevoryStatusBadge>
            </div>
            <p className="mt-3 text-base font-semibold text-[color:var(--foreground)]">
              {item.detail}
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Booking handoff
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              The setup should make the path to booking obvious: where the lead enters, which path Seller reinforces, and what counts as the outcome.
            </p>
          </div>
          <RevoryStatusBadge tone={bookingPathLabel ? "accent" : "future"}>
            {bookingPathLabel ? "Path defined" : "Path pending"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
            <p className="rev-label">01 • Lead enters</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {sourceLabel ?? "Lead entry point pending"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              This is the starting point REVORY Seller reads before it can guide the booking motion.
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <p className="rev-label">02 • Seller guides</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {bookingPathLabel ?? "Booking path pending"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              This is the main handoff REVORY Seller treats as the natural destination of the guided path.
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] p-4">
            <p className="rev-label">03 • Booking lands</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              Booked appointment
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Deal value then turns each visible booking into a revenue read instead of a generic activity signal.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Revenue line of sight
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              REVORY Seller should make revenue feel earned and explainable from the first session, not decorative.
            </p>
          </div>
          <RevoryStatusBadge
            tone={
              bookingPathLabel && dealValueLabel && appContext.activationSetup.isCompleted
                ? "real"
                : "future"
            }
          >
            {bookingPathLabel && dealValueLabel && appContext.activationSetup.isCompleted
              ? "Revenue path locked"
              : "Revenue path pending"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
            <p className="rev-label">01 • Activation</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              Seller setup locked
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Activation integrity keeps main offer, source, booking path, and deal value inside one narrow system.
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <p className="rev-label">02 • Booking path</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {bookingPathLabel ?? "Booking path pending"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Seller pushes the lead into one explicit booking destination instead of spreading motion across multiple lanes.
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] p-4">
            <p className="rev-label">03 • Booked outcome</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              Booked appointment
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Bookings are the live proof point behind the revenue read.
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
            <p className="rev-label">04 • Revenue</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {dealValueLabel ?? "Deal value pending"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Deal value is what turns each visible booking into a clean revenue signal on the dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] xl:items-start">
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                Booking pillars already in place
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                The parts of the Seller engine that are already ready to shape booking performance.
              </p>
            </div>
            <RevoryStatusBadge tone="real">{configuredPillars.length} locked</RevoryStatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            {configuredPillars.map((item) => (
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
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.note}</p>
                <SetupItemDetail detail={item.detail} tone="configured" />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                What still blocks activation integrity
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                The missing pieces that still prevent Seller from starting with a clean lead-to-booking motion.
              </p>
            </div>
            <RevoryStatusBadge tone={pendingPillars.length > 0 ? "future" : "neutral"}>
              {pendingPillars.length > 0 ? `${pendingPillars.length} pending` : "Nothing pending"}
            </RevoryStatusBadge>
          </div>

          {pendingPillars.length > 0 ? (
            <div className="mt-5 space-y-3">
              {pendingPillars.map((item) => (
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
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.note}</p>
                  <SetupItemDetail detail={item.detail} tone="pending" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 min-w-0 overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-5">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                Nothing currently blocks activation integrity.
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The booking pillars are already locked, so this page now works as a clean checkpoint rather than an active to-do list.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Activation support
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Supporting context that keeps the Seller motion consistent after the core booking pillars are locked.
            </p>
          </div>
          <RevoryStatusBadge tone={supportItems.every((item) => item.ready) ? "real" : "neutral"}>
            {supportItems.filter((item) => item.ready).length} of {supportItems.length} ready
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {supportItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">{item.label}</p>
                <RevoryStatusBadge tone={item.ready ? "real" : "neutral"}>
                  {item.ready ? "Ready" : "In progress"}
                </RevoryStatusBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.note}</p>
              <SetupItemDetail detail={item.detail} tone={item.ready ? "configured" : "pending"} />
            </div>
          ))}
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

