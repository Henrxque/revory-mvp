import { DataSourceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from "@/services/imports/get-csv-upload-sources";
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
      return "Appointments upload";
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
  const uploadSources = await getCsvUploadSources(appContext.workspace.id);
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
  const hasBookedProofVisible = hasLiveCsvUploadSource(uploadSources.appointments);

  const setupItems: SetupItem[] = [
    {
      detail: mainOfferLabel ?? "Main offer next",
      label: "Main offer",
      note: "Defines the one offer REVORY Seller should help book first.",
      ready: Boolean(mainOfferLabel),
      type: "pillar",
    },
    {
      detail: bookingPathLabel ?? "Booking path next",
      label: "Booking path",
      note: "Defines the exact route REVORY Seller should push leads into when it is time to convert interest into a booked appointment.",
      ready: Boolean(bookingPathLabel),
      type: "pillar",
    },
    {
      detail: sourceNeedsReview
        ? "Current lead entry needs review"
        : sourceLabel ?? "Lead entry next",
      label: "Lead entry",
      note: sourceNeedsReview
        ? "This workspace still carries a lead-entry type that the live Seller flow does not support yet."
        : "Sets where Seller reads initial demand and hands qualified lead flow into the booking path.",
      ready: Boolean(sourceLabel) && !sourceNeedsReview,
      type: "pillar",
    },
    {
      detail: dealValueLabel ?? "Value per booking next",
      label: "Value per booking",
      note: "Turns each booked appointment into visible revenue proof from day one.",
      ready: Boolean(appContext.activationSetup.averageDealValue),
      type: "pillar",
    },
    {
      detail: brandVoiceLabel ?? "Voice next",
      label: "Seller voice",
      note: "Keeps the booking motion consistent without turning Seller into a builder.",
      ready: Boolean(brandVoiceLabel),
      type: "support",
    },
    {
      detail: appContext.activationSetup.isCompleted
        ? "Workspace already activated"
        : `Current step: ${currentStep.title}`,
      label: "Go-live status",
      note: "Shows whether the activation pillars are already active in the live Seller workspace.",
      ready: appContext.activationSetup.isCompleted,
      type: "support",
    },
  ];

  const pillarItems = setupItems.filter((item) => item.type === "pillar");
  const supportItems = setupItems.filter((item) => item.type === "support");
  const configuredPillars = pillarItems.filter((item) => item.ready);
  const pendingPillars = pillarItems.filter((item) => !item.ready);
  const setupHeroTitle = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Your Seller booking engine is already live."
      : "Your Seller booking engine is live. Booked proof is next."
    : "Turn activation into booked appointments and revenue visibility.";
  const setupHeroDescription = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "This page keeps the activation pillars readable without dragging you back into the guided path."
      : "Activation is complete. The next move that makes Seller feel commercially real is bringing booked proof into view before you lean on the revenue read."
    : "Main offer, lead entry, booking path, and value per booking are the activation pillars that turn REVORY Seller from setup into a live booking and revenue path.";
  const activationContextCopy = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Activation is complete. Dashboard and Booking Inputs already use the live Seller state."
      : "Activation is complete. The next thing that makes Seller feel commercially real is booked proof."
    : `REVORY Seller is still waiting on activation integrity. The current move is "${currentStep.title}".`;
  const activationContextSupportCopy = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "You can keep working from the revenue view or Booking Inputs without reopening the guided path."
      : "Open Booking Inputs next so Seller can make booked appointments visible before the revenue view carries the commercial story."
    : "The path stays narrow on purpose: one main offer, one lead entry, one booking path, one value per booking, one Seller voice, then go live.";
  const nextMoveLabel = appContext.activationSetup.isCompleted
    ? "Best next workspace move"
    : "Next activation move";
  const activationSnapshot = [
    {
      label: "Workspace state",
      tone: appContext.activationSetup.isCompleted ? ("real" as const) : ("future" as const),
      value: appContext.activationSetup.isCompleted ? "Live" : "In progress",
    },
    {
      label: "Booked proof",
      tone: hasBookedProofVisible ? ("real" as const) : ("future" as const),
      value: hasBookedProofVisible ? "Visible" : "Next",
    },
    {
      label: "Current step",
      tone: "neutral" as const,
      value: currentStep.eyebrow,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rev-card-soft rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="space-y-5">
          <div className="max-w-[40rem] space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Activation integrity</p>
              <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
                {appContext.activationSetup.isCompleted ? "Activated" : "Activation in progress"}
              </RevoryStatusBadge>
              <span className="inline-flex min-h-7 items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--text-muted)]">
                {configuredPillars.length}/{pillarItems.length} pillars locked
              </span>
            </div>
            <h1 className="rev-display-hero max-w-[31rem]">
              {setupHeroTitle}
            </h1>
            <p className="max-w-[35rem] text-sm leading-6 text-[color:var(--text-muted)] md:text-[15px]">
              {setupHeroDescription}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {activationSnapshot.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3"
              >
                <p className="text-[12px] font-medium text-[color:var(--foreground)]">{item.label}</p>
                <RevoryStatusBadge tone={item.tone}>{item.value}</RevoryStatusBadge>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
            <div className="min-w-0 overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="rev-label">Why activation matters</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
                {activationContextCopy}
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                {activationContextSupportCopy}
              </p>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-5">
              <p className="rev-label">{nextMoveLabel}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
                {appContext.activationSetup.isCompleted
                  ? hasBookedProofVisible
                    ? "Booked proof is already visible. Open the revenue view for the cleanest commercial read, or return to Booking Inputs whenever you want to refresh that proof."
                    : "Activation is already complete. The cleanest next move is Booking Inputs so Seller can make booked proof visible before you lean on the revenue view."
                  : `Continue from "${currentStep.title}" to finish the activation pillars cleanly.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {appContext.activationSetup.isCompleted ? (
                  hasBookedProofVisible ? (
                    <>
                      <DocumentNavigationLink className="rev-button-primary" href="/app/dashboard">
                        Open Revenue View
                      </DocumentNavigationLink>
                      <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                        Review Booking Inputs
                      </DocumentNavigationLink>
                    </>
                  ) : (
                    <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                      Add booked proof
                    </DocumentNavigationLink>
                  )
                ) : (
                  <DocumentNavigationLink className="rev-button-primary" href={continueSetupHref}>
                    Continue activation
                  </DocumentNavigationLink>
                )}
              </div>
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
                {item.ready ? "Locked" : "Next"}
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
              Booked appointment path
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Activation should make the path to booking obvious: where the lead enters, which path Seller reinforces, and what eventually counts as visible revenue proof.
            </p>
          </div>
          <RevoryStatusBadge tone={bookingPathLabel ? "accent" : "future"}>
            {bookingPathLabel ? "Path defined" : "Path next"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
            <p className="rev-label">01 • Lead enters</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {sourceLabel ?? "Lead entry next"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              This is the starting point REVORY Seller reads before it can guide the booking motion.
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <p className="rev-label">02 • Seller guides</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {bookingPathLabel ?? "Booking path next"}
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
              Value per booking then turns each visible booking into a revenue read instead of a generic activity signal.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Revenue outcome path
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              REVORY Seller should make revenue feel earned and explainable from the first session, not decorative or delayed.
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
              : "Revenue path opening"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
            <p className="rev-label">01 • Activation</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              Seller activation locked
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Activation integrity keeps main offer, lead entry, booking path, and value per booking inside one narrow system.
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <p className="rev-label">02 • Booking path</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
              {bookingPathLabel ?? "Booking path next"}
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
              {dealValueLabel ?? "Value per booking next"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              Value per booking is what turns each visible booking into a clean revenue signal on the dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] xl:items-start">
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Activation pillars already locked
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              The parts of the Seller engine that are already ready to shape booked appointments and revenue outcome.
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
                  <RevoryStatusBadge tone="real">Locked</RevoryStatusBadge>
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
              What still blocks go-live
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              The missing pieces that still prevent Seller from starting with a clean paid-lead-to-booked-appointment motion.
            </p>
          </div>
            <RevoryStatusBadge tone={pendingPillars.length > 0 ? "future" : "neutral"}>
              {pendingPillars.length > 0 ? `${pendingPillars.length} next` : "All clear"}
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
                    <RevoryStatusBadge tone="future">Next</RevoryStatusBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.note}</p>
                  <SetupItemDetail detail={item.detail} tone="pending" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 min-w-0 overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-5">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                Activation path is clear.
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
              Support layer
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Supporting context that keeps the activation path consistent after the core pillars are locked.
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
                  {item.ready ? "Live" : "Building"}
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
              Activation path
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              A short read of the activation path without forcing the guided flow open.
            </p>
          </div>
          <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
            {appContext.activationSetup.isCompleted ? "Live" : currentStep.eyebrow}
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
                    {isCompleted ? "Done" : isCurrent ? "Current" : "Up next"}
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

