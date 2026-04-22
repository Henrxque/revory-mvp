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
  type OnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import { getBookedProofRead } from "@/services/proof/get-booked-proof-read";

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
  stepKey?: OnboardingStepKey;
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
  const [uploadSources, bookedProofRead] = await Promise.all([
    getCsvUploadSources(appContext.workspace.id),
    getBookedProofRead(appContext.workspace.id),
  ]);
  const currentStepKey = resolveOnboardingStepKey(appContext.activationSetup.currentStep);
  const currentStep = getOnboardingStep(currentStepKey);
  const currentStepIndex = onboardingSteps.findIndex(
    (candidate) => candidate.key === currentStepKey,
  );
  const channelStepIndex = onboardingSteps.findIndex(
    (candidate) => candidate.key === "channel",
  );
  const hasBookingPathConfirmed =
    appContext.activationSetup.isCompleted || currentStepIndex > channelStepIndex;
  const continueSetupHref = getOnboardingStepPath(currentStepKey);
  const sourceLabel = formatSourceLabel(dataSource?.type ?? null);
  const mainOfferLabel = formatMainOfferLabel(appContext.activationSetup.selectedTemplate);
  const bookingPathLabel = hasBookingPathConfirmed
    ? formatBookingPathLabel(appContext.activationSetup.primaryChannel)
    : null;
  const brandVoiceLabel = formatBrandVoiceLabel(appContext.activationSetup.recommendedModeKey);
  const dealValueLabel = formatDealValue(appContext.activationSetup.averageDealValue ?? null);
  const sourceNeedsReview =
    Boolean(dataSource?.type) &&
    !isSupportedOnboardingSourceType(dataSource?.type ?? null);
  const hasBookedProofVisible = bookedProofRead.hasBookedProofVisible;
  const hasAppointmentsSourceReady = hasLiveCsvUploadSource(uploadSources.appointments);

  const setupItems: SetupItem[] = [
    {
      detail: mainOfferLabel ?? "Offer pending",
      label: "Main offer",
      note: "Offer pushed first.",
      ready: Boolean(mainOfferLabel),
      stepKey: "template",
      type: "pillar",
    },
    {
      detail: bookingPathLabel ?? "Path pending",
      label: "Booking path",
      note: "Route leads into booking.",
      ready: Boolean(bookingPathLabel),
      stepKey: "channel",
      type: "pillar",
    },
    {
      detail: sourceNeedsReview
        ? "Current lead entry needs review"
        : sourceLabel ?? "Source pending",
      label: "Lead entry",
      note: sourceNeedsReview
        ? "Unsupported input type."
        : "Where paid leads first appear.",
      ready: Boolean(sourceLabel) && !sourceNeedsReview,
      stepKey: "source",
      type: "pillar",
    },
    {
      detail: dealValueLabel ?? "Value pending",
      label: "Value per booking",
      note: "Revenue anchor per booking.",
      ready: Boolean(appContext.activationSetup.averageDealValue),
      stepKey: "deal_value",
      type: "pillar",
    },
    {
      detail: brandVoiceLabel ?? "Voice pending",
      label: "Seller voice",
      note: "Tone for the first booking step.",
      ready: Boolean(brandVoiceLabel),
      stepKey: "mode",
      type: "support",
    },
  ];

  const pillarItems = setupItems.filter((item) => item.type === "pillar");
  const supportItems = setupItems.filter((item) => item.type === "support");
  const configuredPillars = pillarItems.filter((item) => item.ready);
  const pendingPillars = pillarItems.filter((item) => !item.ready);
  const configuredSupportItems = supportItems.filter((item) => item.ready);
  const pendingSupportItems = supportItems.filter((item) => !item.ready);
  const corePathLocked = configuredPillars.length === pillarItems.length;
  const revenuePathLocked =
    appContext.activationSetup.isCompleted &&
    corePathLocked &&
    hasBookedProofVisible &&
    Boolean(dealValueLabel);
  const setupHeroTitle = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Seller is ready to read revenue."
      : "Seller is live. Booked proof comes next."
    : "Finish setup. Launch Seller.";
  const setupHeroDescription = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Booked proof is visible and revenue can now read real bookings."
      : hasAppointmentsSourceReady
        ? "Seller is live. Review booked proof so revenue can read real bookings."
        : "Seller is live. Add booked proof to open revenue."
    : `${configuredPillars.length}/${pillarItems.length} activation choices are already locked.`;
  const missingItems = [
    ...pendingPillars,
    ...pendingSupportItems,
    ...(!hasBookedProofVisible
      ? [
          {
            detail: hasAppointmentsSourceReady
              ? "Review appointments file"
              : "Add booked appointments file",
            label: "Booked proof",
            note: hasAppointmentsSourceReady
              ? "Booked outcomes still are not visible."
              : "Needed before revenue can read real bookings.",
            ready: false,
            type: "support" as const,
          },
        ]
      : []),
  ];
  const readyItems = [
    ...configuredPillars,
    ...configuredSupportItems,
    ...(hasBookedProofVisible
      ? [
          {
            detail: "Visible in Booking Inputs",
            label: "Booked proof",
            note: "Revenue support is live.",
            ready: true,
            type: "support" as const,
          },
        ]
      : []),
  ];
  const nextMove = appContext.activationSetup.isCompleted
    ? hasBookedProofVisible
      ? {
          description: "Open Revenue View or refresh Booking Inputs when booked data changes.",
          href: "/app/dashboard",
          label: "Open Revenue View",
          secondaryHref: "/app/imports",
          secondaryLabel: "Refresh booked proof",
          title: "Revenue is ready",
        }
      : {
          description: hasAppointmentsSourceReady
            ? "Review the appointments pass so booked outcomes become visible."
            : "Add booked proof to complete revenue support.",
          href: "/app/imports",
          label: hasAppointmentsSourceReady ? "Review booked proof" : "Add booked proof",
          secondaryHref: null,
          secondaryLabel: null,
          title: hasAppointmentsSourceReady ? "Booked proof is next" : "Booked proof is next",
        }
    : {
        description: `Finish "${currentStep.title}" to lock activation and move into the live booking path.`,
        href: continueSetupHref,
        label: "Continue activation",
        secondaryHref: null,
        secondaryLabel: null,
        title:
          !mainOfferLabel
            ? "Set main offer"
            : !bookingPathLabel
              ? "Set booking path"
              : !dealValueLabel
                ? "Set booking value"
                : "Continue activation",
      };
  const activationSnapshot = [
    {
      label: "Seller",
      tone: appContext.activationSetup.isCompleted ? ("real" as const) : ("future" as const),
      value: appContext.activationSetup.isCompleted ? "Live" : "Pending",
    },
    {
      label: "Booked proof",
      tone: hasBookedProofVisible ? ("real" as const) : ("future" as const),
      value: hasBookedProofVisible ? "Live" : "Pending",
    },
    {
      label: "Revenue read",
      tone: revenuePathLocked ? ("real" as const) : ("future" as const),
      value: revenuePathLocked ? "Ready" : "Pending",
    },
    {
      label: "Open items",
      tone: missingItems.length > 0 ? ("future" as const) : ("real" as const),
      value: missingItems.length > 0 ? `${missingItems.length}` : "0",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-4">
            <div className="max-w-[36rem] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                  Activation
                </p>
                <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
                  {appContext.activationSetup.isCompleted ? "Activated" : "In progress"}
                </RevoryStatusBadge>
                <span className="inline-flex min-h-6 items-center rounded-[11px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-2.5 py-[0.35rem] text-[9px] font-medium text-[color:var(--text-muted)]">
                  {configuredPillars.length}/{pillarItems.length} choices locked
                </span>
              </div>
              <h1 className="rev-display-hero max-w-[24rem]">{setupHeroTitle}</h1>
              <p className="max-w-[30rem] text-sm leading-[1.5] text-[color:var(--text-muted)]">
                {setupHeroDescription}
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {activationSnapshot.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3 py-2.5"
                >
                  <p className="text-[11px] font-medium text-[color:var(--foreground)]">{item.label}</p>
                  <RevoryStatusBadge tone={item.tone}>{item.value}</RevoryStatusBadge>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[22px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <p className="rev-label">Next step</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
              {nextMove.title}
            </p>
            <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
              {nextMove.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <DocumentNavigationLink className="rev-button-primary" href={nextMove.href}>
                {nextMove.label}
              </DocumentNavigationLink>
              {appContext.activationSetup.isCompleted ? (
                <DocumentNavigationLink
                  className="rev-button-secondary"
                  href={`${getOnboardingStepPath("template")}?edit=1`}
                >
                  Adjust setup
                </DocumentNavigationLink>
              ) : null}
              {nextMove.secondaryHref && nextMove.secondaryLabel ? (
                <DocumentNavigationLink className="rev-button-secondary" href={nextMove.secondaryHref}>
                  {nextMove.secondaryLabel}
                </DocumentNavigationLink>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {pillarItems.map((item) => (
          <div
            key={item.label}
            className={`min-w-0 overflow-hidden rounded-[18px] border p-3.5 ${
              item.ready
                ? "border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)]"
                : "border-[rgba(245,166,35,0.18)] bg-[rgba(245,166,35,0.06)]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                {item.label}
              </p>
              <RevoryStatusBadge tone={item.ready ? "real" : "future"}>
                {item.ready ? "Locked" : "Pending"}
              </RevoryStatusBadge>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
              {item.detail}
            </p>
            <p className="mt-1.5 text-[12px] leading-[1.45] text-[color:var(--text-muted)]">{item.note}</p>
            {appContext.activationSetup.isCompleted && item.stepKey ? (
              <div className="mt-3">
                <DocumentNavigationLink
                  className="rev-action-button min-h-8 px-3 py-1 text-[10px]"
                  href={`${getOnboardingStepPath(item.stepKey)}?edit=1`}
                >
                  Adjust
                </DocumentNavigationLink>
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              How value unlocks
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Lead entry supports proof. Proof supports the revenue read.
            </p>
          </div>
          <RevoryStatusBadge tone={revenuePathLocked ? "real" : "future"}>
            {revenuePathLocked ? "Revenue linked" : "Revenue pending"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="rev-label">Booked proof path</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs text-[color:var(--foreground)]">
                {sourceLabel ?? "Lead entry pending"}
              </span>
              <span className="text-xs text-[color:var(--text-subtle)]">→</span>
              <span className="inline-flex items-center rounded-[12px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-3 py-1.5 text-xs text-[color:var(--foreground)]">
                {bookingPathLabel ?? "Booking path pending"}
              </span>
              <span className="text-xs text-[color:var(--text-subtle)]">→</span>
              <span className="inline-flex items-center rounded-[12px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] px-3 py-1.5 text-xs text-[color:var(--foreground)]">
                Booked proof
              </span>
            </div>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="rev-label">Revenue clarity</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-[12px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] px-3 py-1.5 text-xs text-[color:var(--foreground)]">
                Booked proof
              </span>
              <span className="text-xs text-[color:var(--text-subtle)]">→</span>
              <span className="inline-flex items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs text-[color:var(--foreground)]">
                {dealValueLabel ?? "Value pending"}
              </span>
              <span className="text-xs text-[color:var(--text-subtle)]">→</span>
              <span className="inline-flex items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs text-[color:var(--foreground)]">
                Revenue view
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Ready now
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              What is already supporting Seller.
            </p>
          </div>
            <RevoryStatusBadge tone="real">{readyItems.length}</RevoryStatusBadge>
          </div>

          <div className="mt-4 space-y-2.5">
            {readyItems.map((item) => (
              <div
                key={`${item.type}-${item.label}`}
                className="min-w-0 overflow-hidden rounded-[18px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)] p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {item.label}
                  </p>
                  <RevoryStatusBadge tone="real">Locked</RevoryStatusBadge>
                </div>
                <p className="mt-1 text-[12px] leading-[1.45] text-[color:var(--text-muted)]">{item.note}</p>
                <SetupItemDetail detail={item.detail} tone="configured" />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Still missing
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              What still blocks proof or revenue.
            </p>
          </div>
            <RevoryStatusBadge tone={missingItems.length > 0 ? "future" : "neutral"}>
              {missingItems.length > 0 ? `${missingItems.length}` : "0"}
            </RevoryStatusBadge>
          </div>

          {missingItems.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {missingItems.map((item) => (
                <div
                  key={`${item.type}-${item.label}`}
                  className="min-w-0 overflow-hidden rounded-[18px] border border-[rgba(245,166,35,0.18)] bg-[rgba(245,166,35,0.06)] p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--foreground)]">
                      {item.label}
                    </p>
                    <RevoryStatusBadge tone="future">Pending</RevoryStatusBadge>
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.45] text-[color:var(--text-muted)]">{item.note}</p>
                  <SetupItemDetail detail={item.detail} tone="pending" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 min-w-0 overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-5">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                No blockers.
              </p>
              <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
                Activation is clean.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Activation path
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Short path to live Seller.
            </p>
          </div>
          <RevoryStatusBadge tone={appContext.activationSetup.isCompleted ? "real" : "future"}>
            {appContext.activationSetup.isCompleted ? "Live" : currentStep.eyebrow}
          </RevoryStatusBadge>
        </div>

        <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {onboardingSteps.map((step) => {
            const stepIndex = onboardingSteps.findIndex((candidate) => candidate.key === step.key);
            const isCompleted = appContext.activationSetup.isCompleted || stepIndex < currentStepIndex;
            const isCurrent = !appContext.activationSetup.isCompleted && step.key === currentStepKey;
            const editHref =
              appContext.activationSetup.isCompleted && step.key !== "activation"
                ? `${getOnboardingStepPath(step.key)}?edit=1`
                : null;
            const cardClassName = `rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-3.5 ${
              editHref
                ? "block transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.04)]"
                : ""
            }`;
            const cardContent = (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="rev-label">{step.eyebrow}</p>
                  <RevoryStatusBadge
                    tone={isCompleted ? "real" : isCurrent ? "accent" : "neutral"}
                  >
                    {isCompleted ? "Done" : isCurrent ? "Current" : "Up next"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2.5 text-sm font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </p>
                {editHref ? (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-light)]">
                    Adjust
                  </p>
                ) : null}
              </>
            );

            return editHref ? (
              <DocumentNavigationLink className={cardClassName} href={editHref} key={step.key}>
                {cardContent}
              </DocumentNavigationLink>
            ) : (
              <div className={cardClassName} key={step.key}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


