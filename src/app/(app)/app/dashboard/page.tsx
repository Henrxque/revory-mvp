import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DailyBookingBrief } from "@/components/briefs/DailyBookingBrief";
import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { ExecutiveProofSummarySheet } from "@/components/proof/ExecutiveProofSummarySheet";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getDailyBookingBriefRead } from "@/services/briefs/get-daily-booking-brief-read";
import { buildDashboardDecisionSupport } from "@/services/decision-support/build-dashboard-decision-support";
import { getDashboardDecisionSupport } from "@/services/decision-support/get-dashboard-decision-support";
import { getDashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import { getExecutiveProofSummaryRead } from "@/services/proof/get-executive-proof-summary-read";
import type { RevoryDecisionSupportRead } from "@/types/decision-support";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Revenue pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatLimitedCurrency(value: number | null, unavailableLabel = "Unavailable") {
  if (value === null) {
    return unavailableLabel;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatCompactCurrency(value: number | null) {
  if (value === null) {
    return "Value pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatDealValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Value pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatMonthChip() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date());
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
      return "Offer pending";
  }
}

function formatBookingPathLabel(value: string | null) {
  switch (value) {
    case "SMS":
      return "SMS";
    case "EMAIL":
      return "Email";
    default:
      return "Path pending";
  }
}

function formatSourceStatus(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("imported") ||
    normalized.includes("completed") ||
    normalized.includes("connected")
  ) {
    return {
      label: "Visible",
      tone: "real" as const,
    };
  }

  if (normalized.includes("review") || normalized.includes("warning")) {
    return {
      label: "Needs review",
      tone: "future" as const,
    };
  }

  return {
      label: "Pending",
      tone: "neutral" as const,
    };
}

function hasLiveImportSource(source: {
  status: string;
  successRows: number;
} | null) {
  if (!source) {
    return false;
  }

  const normalized = source.status.toLowerCase();

  return (
    source.successRows > 0 ||
    normalized.includes("imported") ||
    normalized.includes("connected")
  );
}

function formatSourceLabel(type: string) {
  return type === "APPOINTMENTS_CSV" ? "Booked proof" : "Lead base";
}

function getProgressPercent(successRows: number, totalRows: number) {
  if (totalRows <= 0) {
    return 0;
  }

  return Math.round((successRows / totalRows) * 100);
}

function formatAppointmentDate(value: Date | string) {
  const normalizedValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(normalizedValue.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(normalizedValue);
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "RV"
  );
}

type AttributionSignalCardProps = Readonly<{
  hint: string;
  isPrimary?: boolean;
  label: string;
  value: string | number;
}>;

function AttributionSignalCard({
  hint,
  isPrimary = false,
  label,
  value,
}: AttributionSignalCardProps) {
  const softValue = isSoftValue(value);

  return (
    <div
      className={`min-w-0 rounded-[20px] border px-4 py-4 ${
        isPrimary
          ? "border-[rgba(194,9,90,0.18)] bg-[linear-gradient(180deg,rgba(194,9,90,0.05),rgba(255,255,255,0.02))]"
          : softValue
            ? "border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012))]"
            : "border-[color:var(--border)] bg-[rgba(255,255,255,0.018)]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
        {label}
      </p>
      <p
        className={`mt-2.5 leading-none tracking-[-0.02em] ${
          isPrimary
            ? softValue
              ? "text-[1.42rem] font-medium text-[color:var(--text-muted)]"
              : "text-[1.95rem] font-semibold text-[color:var(--foreground)]"
            : softValue
              ? "text-[1.18rem] font-medium text-[color:var(--text-muted)]"
              : "text-[1.45rem] font-semibold text-[color:var(--foreground)]"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-2.5 text-[13px] leading-[1.5] ${
          softValue ? "text-[color:var(--text-subtle)]" : "text-[color:var(--text-muted)]"
        }`}
      >
        {hint}
      </p>
      {softValue ? (
        <div className="mt-3 h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
      ) : null}
    </div>
  );
}

function isSoftValue(value: string | number) {
  if (typeof value === "number") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized.includes("pending") ||
    normalized.includes("unavailable") ||
    normalized.includes("value pending") ||
    /^0\/\d+$/.test(normalized) ||
    normalized === "0%"
  );
}

type ExecutiveSignalCardProps = Readonly<{
  hint: string;
  isPrimary?: boolean;
  label: string;
  value: string | number;
}>;

function ExecutiveSignalCard({
  hint,
  isPrimary = false,
  label,
  value,
}: ExecutiveSignalCardProps) {
  const softValue = isSoftValue(value);

  return (
    <div
      className={`min-w-0 rounded-[22px] border px-5 py-4 ${
        isPrimary
          ? "border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.08),rgba(255,255,255,0.03))] shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
          : softValue
            ? "border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012))]"
            : "border-[color:var(--border)] bg-[rgba(255,255,255,0.018)]"
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
          isPrimary
            ? "text-[color:var(--accent-light)]"
            : "text-[color:var(--text-subtle)]"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 tracking-[-0.03em] ${
          isPrimary
            ? softValue
              ? "text-[1.95rem] font-medium leading-none text-[color:var(--text-muted)]"
              : "text-[clamp(2.4rem,3vw,3.15rem)] font-semibold leading-none text-[color:var(--foreground)]"
            : softValue
              ? "text-[1.35rem] font-medium leading-none text-[color:var(--text-muted)]"
              : "text-[1.9rem] font-semibold leading-none text-[color:var(--foreground)]"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-3 leading-[1.45] ${
          isPrimary
            ? "max-w-[20rem] text-sm text-[color:var(--text-muted)]"
            : softValue
              ? "max-w-[16rem] text-[13px] text-[color:var(--text-subtle)]"
              : "max-w-[16rem] text-[13px] text-[color:var(--text-muted)]"
        }`}
      >
        {hint}
      </p>
      {softValue ? (
        <div className="mt-4 h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
      ) : null}
    </div>
  );
}

type MomentumMonthCardProps = Readonly<{
  bookedAppointments: number;
  estimatedRevenue: number | null;
  isStrongest: boolean;
  label: string;
}>;

function MomentumMonthCard({
  bookedAppointments,
  estimatedRevenue,
  isStrongest,
  label,
}: MomentumMonthCardProps) {
  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isStrongest
          ? "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.06)]"
          : "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rev-label">{label}</p>
        {isStrongest ? <RevoryStatusBadge tone="accent">Best month</RevoryStatusBadge> : null}
      </div>

      <p className="mt-3 text-[1.7rem] font-semibold leading-none text-[color:var(--foreground)]">
        {bookedAppointments}
      </p>
      <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--text-muted)]">
        {bookedAppointments === 1 ? "booked appointment" : "booked appointments"}
      </p>

      <div className="mt-4 border-t border-[color:var(--border)] pt-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
          Revenue read
        </p>
        <p className="mt-1.5 text-sm font-semibold text-[color:var(--foreground)]">
          {formatCompactCurrency(estimatedRevenue)}
        </p>
      </div>
    </div>
  );
}

type DashboardDecisionSupportProps = Readonly<{
  bookingPathLabel: string;
  dealValueLabel: string;
  fallbackRead: RevoryDecisionSupportRead;
  mainOfferLabel: string;
  overview: Awaited<ReturnType<typeof getDashboardOverview>>;
}>;

function DashboardNextMoveAside({
  read,
}: Readonly<{
  read: RevoryDecisionSupportRead;
}>) {
  return (
    <aside className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
      <p className="rev-label">Next move</p>
      <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
        {read.title}
      </p>
      <p className="mt-2 text-sm leading-[1.45] text-[color:var(--text-muted)]">
        {read.nextBestAction}
      </p>
      <p className="mt-3 text-xs leading-[1.45] text-[color:var(--text-subtle)]">
        {read.recommendedPath}
      </p>
    </aside>
  );
}

async function DashboardNextMoveAsideAsync({
  bookingPathLabel,
  dealValueLabel,
  fallbackRead,
  mainOfferLabel,
  overview,
}: DashboardDecisionSupportProps) {
  let read = fallbackRead;

  try {
    read = await getDashboardDecisionSupport({
      bookingPathLabel,
      dealValueLabel,
      mainOfferLabel,
      overview,
    });
  } catch (error) {
    console.warn("[dashboard] next-move layer degraded", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return <DashboardNextMoveAside read={read} />;
}

export default async function DashboardPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app/dashboard"));
  }

  if (!appContext.activationSetup.isCompleted) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const { activationSetup, workspace } = appContext;
  const configuredValuePerBooking = activationSetup.averageDealValue
    ? Number(activationSetup.averageDealValue)
    : null;
  const [overview, dailyBriefRead] = await Promise.all([
    getDashboardOverview(
      workspace.id,
      configuredValuePerBooking,
    ),
    getDailyBookingBriefRead(workspace.id, activationSetup),
  ]);

  const monthChip = formatMonthChip();
  const hasBookedProofVisible = overview.bookedAppointments > 0;
  const revenueLabel = formatCurrency(overview.estimatedImportedRevenue);
  const dealValueLabel = formatDealValue(configuredValuePerBooking);
  const mainOfferLabel = formatMainOfferLabel(activationSetup.selectedTemplate);
  const bookingPathLabel = formatBookingPathLabel(activationSetup.primaryChannel);
  const fallbackDecisionSupportRead = buildDashboardDecisionSupport({
    bookingPathLabel,
    dealValueLabel,
    mainOfferLabel,
    overview,
  });
  const executiveProofSummaryRead = getExecutiveProofSummaryRead({
    dailyBriefRead,
    overview,
    workspaceName: workspace.name,
  });
  const bookedProofSource = overview.bookedProofSource;
  const leadBaseSource = overview.leadBaseSource;
  const hasMainOfferLocked = activationSetup.selectedTemplate !== null;
  const hasBookingPathLocked = activationSetup.primaryChannel !== null;
  const hasBookingValueLocked = activationSetup.averageDealValue !== null;
  const hasBookedProofSourceVisible = hasLiveImportSource(bookedProofSource);
  const nextMove = (() => {
    if (!hasMainOfferLocked) {
      return {
        cta: "Finish Activation",
        headline: "Set main offer",
        href: "/app/setup",
        note: "Lock one offer to keep Seller narrow.",
      };
    }

    if (!hasBookingPathLocked) {
      return {
        cta: "Finish Activation",
        headline: "Set booking path",
        href: "/app/setup",
        note: "Lock one path before revenue read.",
      };
    }

    if (!hasBookingValueLocked) {
      return {
        cta: "Finish Activation",
        headline: "Set booking value",
        href: "/app/setup",
        note: "Complete the revenue anchor.",
      };
    }

    if (!hasBookedProofVisible) {
      if (hasBookedProofSourceVisible) {
        return {
          cta: "Review booked proof",
          headline: "Booked proof needs a clean pass",
          href: "/app/imports",
          note: "The appointments source is present, but booked outcomes still are not supporting revenue.",
        };
      }

      return {
        cta: "Add booked proof",
        headline: "Add booked proof",
        href: "/app/imports",
        note: "Revenue becomes credible after proof.",
      };
    }

    return {
      cta: "Refresh booked proof",
      headline: "Refresh booked proof",
      href: "/app/imports",
      note: "Keep revenue and proof aligned.",
    };
  })();

  const supportingSignals = [
    {
      hint: "Booked appointments visible",
      label: "Booked proof",
      value: overview.bookedAppointments > 0 ? overview.bookedAppointments : "Pending",
    },
    {
      hint: "Revenue baseline applied",
      label: "Value per booking",
      value: dealValueLabel,
    },
    {
      hint: "Offer pushed first",
      label: "Main offer",
      value: mainOfferLabel,
    },
    {
      hint: "Primary route into booking",
      label: "Booking path",
      value: bookingPathLabel,
    },
  ] as const;
  const attributionRead = overview.attributionRead;
  const executiveRead = overview.executiveRead;
  const recentMomentum = overview.recentMomentum;
  const retentionRead = overview.retentionRead;
  const renewalRead = overview.renewalRead;
  const strongestMonthLabel = recentMomentum.strongestMonthLabel;
  const longitudinalSummary = hasBookedProofVisible
    ? recentMomentum.bookedAppointments > 0
      ? `${recentMomentum.bookedAppointments} booked appointments are visible across ${recentMomentum.windowLabel.toLowerCase()}.`
      : "Booked proof is visible, but recent monthly proof is still thin."
    : "Recent momentum becomes usable after booked proof is visible.";
  const longitudinalAsideTitle = hasBookedProofVisible
    ? recentMomentum.bookedAppointments > 0
      ? "Value is easier to defend over time"
      : "Visible proof still needs more time depth"
    : "Longitudinal proof starts after booked proof";
  const longitudinalAsideNote = hasBookedProofVisible
    ? recentMomentum.bookedAppointments > 0
      ? strongestMonthLabel
        ? `${strongestMonthLabel} is currently the strongest visible month in this short read.`
        : "Seller keeps this read short until more booked proof accumulates."
      : "The revenue snapshot is working, but the longitudinal layer still needs more visible bookings."
    : "Once booked appointments are visible, Seller starts defending value over time instead of only in one snapshot.";
  const attributionSummary = hasBookedProofVisible
    ? attributionRead.status === "degraded"
      ? "Revenue is still visible, but attribution support is temporarily unavailable in this read."
      : attributionRead.bookedAppointmentsWithLeadBaseSupport !== null &&
          attributionRead.bookedAppointmentsWithLeadBaseSupport > 0
        ? `${attributionRead.bookedAppointmentsWithLeadBaseSupport} booked appointments already carry lead-base support behind the revenue read.`
      : attributionRead.bookedAppointmentsWithIdentity > 0
        ? "Booked proof is visible, but lead-base support is still thin behind the revenue read."
        : "Booked proof is visible, but attribution clarity is still thin."
    : "Attribution clarity becomes useful after booked proof is visible.";

  return (
    <div className="space-y-5">
      <DailyBookingBrief read={dailyBriefRead} />

      <section
        id="revenue-view"
        className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="max-w-[39rem] space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Revenue view</p>
              <span className="inline-flex min-h-7 items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--text-muted)]">
                {monthChip}
              </span>
              <RevoryStatusBadge tone={hasBookedProofVisible ? "real" : "future"}>
                {hasBookedProofVisible ? "Proof visible" : "Proof pending"}
              </RevoryStatusBadge>
            </div>

            <h1 className="rev-display-hero max-w-[31rem]">
              {hasBookedProofVisible
                ? "See booked appointments in revenue."
                : "Revenue starts with booked proof."}
            </h1>

            <p className="max-w-[33rem] text-sm leading-[1.5] text-[color:var(--text-muted)]">
              {fallbackDecisionSupportRead.summary}
            </p>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.12),rgba(255,255,255,0.03))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <p className="rev-label">Booked revenue now</p>
            <p className="mt-3 text-[clamp(2.2rem,3.2vw,3rem)] font-semibold leading-none text-[color:var(--accent-light)]">
              {revenueLabel}
            </p>

            <div className="mt-4 space-y-2.5 border-t border-[rgba(255,255,255,0.08)] pt-3.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[color:var(--text-muted)]">Booked appointments</span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  {overview.bookedAppointments > 0
                    ? `${overview.bookedAppointments} booked`
                    : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[color:var(--text-muted)]">Value per booking</span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  {dealValueLabel}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <DocumentNavigationLink
                className="rev-button-primary w-full justify-center px-5 py-3 text-sm"
                href={nextMove.href}
              >
                {nextMove.cta}
              </DocumentNavigationLink>
              <div className="mt-2">
                <ExecutiveProofSummarySheet read={executiveProofSummaryRead} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-[34rem]">
            <p className="text-[1.02rem] font-semibold tracking-[-0.01em] text-[color:var(--foreground)]">
              Executive read
            </p>
            <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
              {executiveRead.summary}
            </p>
          </div>
          <RevoryStatusBadge
            className="mt-0.5 self-start rounded-full border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.08)] px-3 py-[0.42rem] text-[10px]"
            tone={hasBookedProofVisible ? "real" : "future"}
          >
            {hasBookedProofVisible ? "Readable" : "Pending"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
          {executiveRead.tiles.map((tile, index) => (
            <ExecutiveSignalCard
              hint={tile.hint}
              isPrimary={index === 0}
              key={tile.label}
              label={tile.label}
              value={tile.value}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.015))] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
              Executive framing
            </p>
            <p className="mt-2.5 text-[15px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
              {executiveRead.headline}
            </p>
            <p className="mt-3 max-w-[24rem] text-sm leading-[1.55] text-[color:var(--text-muted)]">
              Seller keeps this read short: booked revenue first, then the strongest support still available.
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.015))] px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[32rem]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                  Commercial safeguard
                </p>
                <p className="mt-2.5 text-[15px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
                {overview.commercialSafeguard.headline}
                </p>
                <p className="mt-3 text-sm leading-[1.55] text-[color:var(--text-muted)]">
                {overview.commercialSafeguard.summary}
                </p>
              </div>
              <RevoryStatusBadge
                className="mt-0.5 self-start rounded-full px-3 py-[0.42rem] text-[10px]"
                tone={overview.commercialSafeguard.status === "stable" ? "real" : "neutral"}
              >
                {overview.commercialSafeguard.status === "stable" ? "Stable" : "Watch"}
              </RevoryStatusBadge>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <RevoryStatusBadge
                className="min-h-7 rounded-full px-3 py-[0.4rem] text-[10px] tracking-[0.01em]"
                tone={hasBookedProofVisible ? "real" : "future"}
              >
                {overview.commercialSafeguard.coreReadLabel}
              </RevoryStatusBadge>
              <RevoryStatusBadge
                className="min-h-7 rounded-full px-3 py-[0.4rem] text-[10px] tracking-[0.01em]"
                tone={overview.commercialSafeguard.status === "stable" ? "neutral" : "future"}
              >
                {overview.commercialSafeguard.supportLabel}
              </RevoryStatusBadge>
              {overview.commercialSafeguard.status === "watch" ? (
                <DocumentNavigationLink
                  className="inline-flex min-h-7 items-center justify-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-3 py-[0.4rem] text-[11px] font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.05)]"
                  href={overview.commercialSafeguard.actionHref}
                >
                  {overview.commercialSafeguard.actionLabel}
                </DocumentNavigationLink>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {overview.supportIntegrity.degradedSections.length > 0 ? (
        <section className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {overview.supportIntegrity.headline}
              </p>
              <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--text-muted)]">
                {overview.supportIntegrity.summary}
              </p>
            </div>
            <RevoryStatusBadge tone="neutral">
              {overview.supportIntegrity.degradedSections.length} limited
            </RevoryStatusBadge>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.012))] p-4 md:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          {supportingSignals.map((signal, index) => (
            <AttributionSignalCard
              hint={signal.hint}
              isPrimary={index === 0}
              key={signal.label}
              label={signal.label}
              value={signal.value}
            />
          ))}
        </div>

        <div className="mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
          <div className="rounded-[24px] border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[36rem]">
                <p className="text-[1.02rem] font-semibold tracking-[-0.01em] text-[color:var(--foreground)]">
                  Attribution clarity
                </p>
                <p className="mt-1.5 text-sm leading-[1.52] text-[color:var(--text-muted)]">
                  {attributionSummary}
                </p>
              </div>
              <RevoryStatusBadge
                className="mt-0.5 self-start rounded-full border-[rgba(245,166,35,0.18)] bg-[rgba(245,166,35,0.08)] px-3 py-[0.42rem] text-[10px]"
                tone={
                  attributionRead.status === "degraded"
                    ? "neutral"
                    : attributionRead.bookedAppointmentsWithLeadBaseSupport !== null &&
                        attributionRead.bookedAppointmentsWithLeadBaseSupport > 0
                    ? "real"
                    : attributionRead.bookedAppointmentsWithIdentity > 0
                      ? "future"
                      : "neutral"
                }
              >
                {attributionRead.status === "degraded"
                  ? "Limited"
                  : attributionRead.bookedAppointmentsWithLeadBaseSupport !== null &&
                      attributionRead.bookedAppointmentsWithLeadBaseSupport > 0
                  ? "Supported"
                  : attributionRead.bookedAppointmentsWithIdentity > 0
                    ? "Thin"
                    : "Pending"}
              </RevoryStatusBadge>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]">
              <AttributionSignalCard
                hint="Clients carrying usable lead context"
                isPrimary
                label="Lead-base clients"
                value={
                  attributionRead.status === "degraded"
                    ? "Unavailable"
                    : attributionRead.leadBaseClients && attributionRead.leadBaseClients > 0
                      ? attributionRead.leadBaseClients
                      : "Pending"
                }
              />
              <AttributionSignalCard
                hint="Booked proof already backed by lead-base support"
                label="Booked with lead support"
                value={
                  attributionRead.status === "degraded"
                    ? "Unavailable"
                    : hasBookedProofVisible &&
                        attributionRead.bookedAppointmentsWithLeadBaseSupport !== null
                      ? `${attributionRead.bookedAppointmentsWithLeadBaseSupport}/${overview.bookedAppointments}`
                    : "Pending"
                }
              />
              <AttributionSignalCard
                hint="Booked revenue already tied to supported lead context"
                label="Revenue with lead support"
                value={formatLimitedCurrency(attributionRead.revenueWithLeadBaseSupport)}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012))] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                    Booked with identity
                  </p>
                  <RevoryStatusBadge
                    className="self-start rounded-full px-3 py-[0.38rem] text-[10px]"
                    tone={attributionRead.identityCoveragePercent !== null ? "neutral" : "future"}
                  >
                    {attributionRead.identityCoveragePercent !== null ? "Visible" : "Thin"}
                  </RevoryStatusBadge>
                </div>
                <p
                  className={`mt-3 leading-none tracking-[-0.02em] ${
                    hasBookedProofVisible
                      ? "text-[1.55rem] font-semibold text-[color:var(--foreground)]"
                      : "text-[1.22rem] font-medium text-[color:var(--text-muted)]"
                  }`}
                >
                  {hasBookedProofVisible
                    ? `${attributionRead.bookedAppointmentsWithIdentity}/${overview.bookedAppointments}`
                    : "Pending"}
                </p>
                <p className="mt-2.5 min-h-[3.25rem] text-sm leading-[1.52] text-[color:var(--text-muted)]">
                  {attributionRead.identityCoveragePercent !== null
                    ? `${attributionRead.identityCoveragePercent}% of visible booked appointments already have client identity attached.`
                    : "Identity coverage appears after booked proof is visible."}
                </p>
              </div>

              <div className="rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012))] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                    Support coverage
                  </p>
                  <RevoryStatusBadge
                    className="self-start rounded-full px-3 py-[0.38rem] text-[10px]"
                    tone={
                      attributionRead.status === "degraded"
                        ? "neutral"
                        : attributionRead.leadBaseCoveragePercent !== null
                          ? "real"
                          : "future"
                    }
                  >
                    {attributionRead.status === "degraded"
                      ? "Limited"
                      : attributionRead.leadBaseCoveragePercent !== null
                        ? "Visible"
                        : "Thin"}
                  </RevoryStatusBadge>
                </div>
                <p
                  className={`mt-3 leading-none tracking-[-0.02em] ${
                    attributionRead.status === "degraded" ||
                    attributionRead.leadBaseCoveragePercent === null
                      ? "text-[1.22rem] font-medium text-[color:var(--text-muted)]"
                      : "text-[1.55rem] font-semibold text-[color:var(--foreground)]"
                  }`}
                >
                  {attributionRead.status === "degraded"
                    ? "Unavailable"
                    : attributionRead.leadBaseCoveragePercent !== null
                    ? `${attributionRead.leadBaseCoveragePercent}%`
                    : "Pending"}
                </p>
                <p className="mt-2.5 min-h-[3.25rem] text-sm leading-[1.52] text-[color:var(--text-muted)]">
                  {attributionRead.status === "degraded"
                    ? "Lead-base support is temporarily unavailable, but revenue and booked proof remain readable."
                    : attributionRead.leadBaseCoveragePercent !== null
                    ? "Visible booked proof already backed by lead-base support."
                    : "Lead-base coverage becomes usable after proof is visible."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Recent booked momentum
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {longitudinalSummary}
              </p>
            </div>
            <RevoryStatusBadge tone={recentMomentum.bookedAppointments > 0 ? "real" : "future"}>
              {recentMomentum.windowLabel}
            </RevoryStatusBadge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentMomentum.timeline.map((month) => (
              <MomentumMonthCard
                bookedAppointments={month.bookedAppointments}
                estimatedRevenue={month.estimatedRevenue}
                isStrongest={Boolean(
                  strongestMonthLabel && strongestMonthLabel === month.label && month.bookedAppointments > 0,
                )}
                key={month.monthKey}
                label={month.label}
              />
            ))}
          </div>
        </div>

        <aside className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
          <p className="rev-label">Renewal read</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
            {renewalRead.headline}
          </p>
          <p className="mt-2 text-sm leading-[1.45] text-[color:var(--text-muted)]">
            {renewalRead.summary}
          </p>

          <div className="mt-4 space-y-2 border-t border-[color:var(--border)] pt-3.5">
            {renewalRead.supportPoints.map((point) => (
              <div
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5"
                key={point.label}
              >
                <span className="text-xs text-[color:var(--text-muted)]">{point.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[color:var(--foreground)]">
                    {point.value}
                  </span>
                  <RevoryStatusBadge tone={point.tone}>
                    {point.statusLabel}
                  </RevoryStatusBadge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
              Retention defense
            </p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
              {retentionRead.headline}
            </p>
            <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--text-muted)]">
              {retentionRead.summary}
            </p>
            <div className="mt-3 space-y-2">
              {retentionRead.checkpoints.map((checkpoint) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3 py-2"
                  key={checkpoint.label}
                >
                  <span className="text-xs text-[color:var(--text-muted)]">{checkpoint.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[color:var(--foreground)]">
                      {checkpoint.value}
                    </span>
                    <RevoryStatusBadge tone={checkpoint.tone}>
                      {checkpoint.tone === "real"
                        ? "Healthy"
                        : checkpoint.tone === "future"
                          ? "Thin"
                          : "Building"}
                    </RevoryStatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
              Revenue defense
            </p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
              {longitudinalAsideTitle}
            </p>
            <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--text-muted)]">
              {longitudinalAsideNote}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--text-muted)]">
              <span>
                Booked in view:{" "}
                <span className="font-semibold text-[color:var(--foreground)]">
                  {recentMomentum.bookedAppointments > 0
                    ? `${recentMomentum.bookedAppointments} booked`
                    : "Pending"}
                </span>
              </span>
              <span>
                Revenue in view:{" "}
                <span className="font-semibold text-[color:var(--foreground)]">
                  {formatCurrency(recentMomentum.estimatedRevenue)}
                </span>
              </span>
              <span>
                Strongest month:{" "}
                <span className="font-semibold text-[color:var(--foreground)]">
                  {strongestMonthLabel ?? "Still building"}
                </span>
              </span>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Booked proof
            </p>
            <RevoryStatusBadge tone={hasBookedProofVisible ? "real" : "future"}>
              {hasBookedProofVisible ? "Visible" : "Pending"}
            </RevoryStatusBadge>
          </div>

          {bookedProofSource ? (
            <div className="mt-4 space-y-3">
              {(() => {
                const status = formatSourceStatus(bookedProofSource.status);
                const progressPercent = getProgressPercent(
                  bookedProofSource.successRows,
                  bookedProofSource.totalRows,
                );

                return (
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {formatSourceLabel(bookedProofSource.type)}
                        </p>
                  <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                          {bookedProofSource.fileName ?? "File unavailable"}
                        </p>
                      </div>
                      <RevoryStatusBadge tone={status.tone}>{status.label}</RevoryStatusBadge>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#c2095a,#e0106a)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-[color:var(--text-muted)] sm:grid-cols-3">
                      <span>Proof kept {progressPercent}%</span>
                      <span>Booked visible {bookedProofSource.successRows}</span>
                      <span>Needs review {bookedProofSource.errorRows}</span>
                    </div>
                    {!hasBookedProofVisible ? (
                      <p className="mt-3 text-xs leading-[1.45] text-[color:var(--text-muted)]">
                        The appointments file is in, but booked outcomes still are not visible enough to support revenue.
                      </p>
                    ) : null}
                  </div>
                );
              })()}

              {leadBaseSource ? (
                <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">
                        Lead-base support
                      </p>
                      <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                        {leadBaseSource.fileName ?? "File unavailable"}
                      </p>
                    </div>
                    <RevoryStatusBadge
                      tone={hasLiveImportSource(leadBaseSource) ? "neutral" : "future"}
                    >
                      {hasLiveImportSource(leadBaseSource) ? "Support visible" : "Support pending"}
                    </RevoryStatusBadge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-[color:var(--text-muted)] sm:grid-cols-3">
                    <span>Lead rows {leadBaseSource.totalRows}</span>
                    <span>Support visible {leadBaseSource.successRows}</span>
                    <span>Needs review {leadBaseSource.errorRows}</span>
                  </div>

                  <p className="mt-3 text-xs leading-[1.45] text-[color:var(--text-muted)]">
                    Lead base stays secondary. It adds context without acting as booked proof.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                Booked proof pending
              </p>
              <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--text-muted)]">
                Upload booked appointments so revenue can read real bookings, not activity alone.
              </p>
            </div>
          )}
        </div>

        <Suspense fallback={<DashboardNextMoveAside read={fallbackDecisionSupportRead} />}>
          <DashboardNextMoveAsideAsync
            bookingPathLabel={bookingPathLabel}
            dealValueLabel={dealValueLabel}
            fallbackRead={fallbackDecisionSupportRead}
            mainOfferLabel={mainOfferLabel}
            overview={overview}
          />
        </Suspense>
      </section>

      {overview.upcomingRead.status === "degraded" ? (
        <section className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Upcoming bookings
            </p>
            <RevoryStatusBadge tone="neutral">Limited</RevoryStatusBadge>
          </div>
          <p className="mt-3 text-sm leading-[1.45] text-[color:var(--text-muted)]">
            Upcoming bookings are temporarily unavailable in this read. Booked proof and revenue stay visible.
          </p>
        </section>
      ) : overview.upcomingRead.list.length > 0 ? (
        <section className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Upcoming bookings
            </p>
            <RevoryStatusBadge tone="real">{overview.upcomingRead.appointments} scheduled</RevoryStatusBadge>
          </div>
          <div className="mt-4 space-y-2.5">
            {overview.upcomingRead.list.slice(0, 3).map((appointment) => (
              <div
                className="flex items-center gap-3 rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3"
                key={appointment.id}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.12)] text-[11px] font-semibold text-[color:var(--accent-light)]">
                  {getInitials(appointment.clientName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                    {appointment.clientName}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-muted)]">
                    {appointment.serviceName ?? "Booked appointment"} -{" "}
                    {formatAppointmentDate(appointment.scheduledAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
