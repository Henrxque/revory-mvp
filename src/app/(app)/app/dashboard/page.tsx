import { redirect } from "next/navigation";

import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getDashboardDecisionSupport } from "@/services/decision-support/get-dashboard-decision-support";
import { getDashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Revenue pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
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
      label: "Live",
      tone: "real" as const,
    };
  }

  if (normalized.includes("review") || normalized.includes("warning")) {
    return {
      label: "Review",
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

function formatAppointmentDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
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

type SignalCardProps = Readonly<{
  hint: string;
  label: string;
  value: string | number;
}>;

function SignalCard({ hint, label, value }: SignalCardProps) {
  return (
    <div className="rev-card-soft min-w-0 rounded-[20px] px-4 py-4">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-[1.45rem] font-semibold leading-none text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--text-muted)]">{hint}</p>
    </div>
  );
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
  const overview = await getDashboardOverview(
    workspace.id,
    configuredValuePerBooking,
  );

  const monthChip = formatMonthChip();
  const hasBookedProofVisible = overview.bookedAppointments > 0;
  const revenueLabel = formatCurrency(overview.estimatedImportedRevenue);
  const dealValueLabel = formatDealValue(configuredValuePerBooking);
  const mainOfferLabel = formatMainOfferLabel(activationSetup.selectedTemplate);
  const bookingPathLabel = formatBookingPathLabel(activationSetup.primaryChannel);
  const decisionSupportRead = await getDashboardDecisionSupport({
    bookingPathLabel,
    dealValueLabel,
    mainOfferLabel,
    overview,
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
        cta: "Review Activation Path",
        headline: "Set main offer",
        href: "/app/setup",
        note: "Lock one offer to keep Seller narrow.",
      };
    }

    if (!hasBookingPathLocked) {
      return {
        cta: "Review Activation Path",
        headline: "Set booking path",
        href: "/app/setup",
        note: "Lock one path before revenue read.",
      };
    }

    if (!hasBookingValueLocked) {
      return {
        cta: "Review Activation Path",
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
      hint: "Visible booked outcomes",
      label: "Booked proof",
      value: overview.bookedAppointments > 0 ? overview.bookedAppointments : "Pending",
    },
    {
      hint: "Applied per booking",
      label: "Value per booking",
      value: dealValueLabel,
    },
    {
      hint: "Current commercial focus",
      label: "Main offer",
      value: mainOfferLabel,
    },
    {
      hint: "Primary conversion route",
      label: "Booking path",
      value: bookingPathLabel,
    },
  ] as const;

  return (
    <div className="space-y-5">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="max-w-[39rem] space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Revenue view</p>
              <span className="inline-flex min-h-7 items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--text-muted)]">
                {monthChip}
              </span>
              <RevoryStatusBadge tone={hasBookedProofVisible ? "real" : "future"}>
                {hasBookedProofVisible ? "Proof live" : "Proof pending"}
              </RevoryStatusBadge>
            </div>

            <h1 className="rev-display-hero max-w-[31rem]">
              {hasBookedProofVisible
                ? "Booked revenue is visible."
                : "Booked proof unlocks revenue."}
            </h1>

            <p className="max-w-[33rem] text-sm leading-[1.5] text-[color:var(--text-muted)]">
              {decisionSupportRead.summary}
            </p>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.12),rgba(255,255,255,0.03))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <p className="rev-label">Revenue now</p>
            <p className="mt-3 text-[clamp(2.2rem,3.2vw,3rem)] font-semibold leading-none text-[color:var(--accent-light)]">
              {revenueLabel}
            </p>

            <div className="mt-4 space-y-2.5 border-t border-[rgba(255,255,255,0.08)] pt-3.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[color:var(--text-muted)]">Booked appointments</span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  {overview.bookedAppointments > 0
                    ? `${overview.bookedAppointments} visible`
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
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {supportingSignals.map((signal) => (
          <SignalCard
            hint={signal.hint}
            key={signal.label}
            label={signal.label}
            value={signal.value}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Booked proof
            </p>
            <RevoryStatusBadge tone={hasBookedProofVisible ? "real" : "future"}>
              {hasBookedProofVisible ? "Live" : "Pending"}
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
                      <span>Coverage {progressPercent}%</span>
                      <span>Visible {bookedProofSource.successRows}</span>
                      <span>Review {bookedProofSource.errorRows}</span>
                    </div>
                    {!hasBookedProofVisible ? (
                      <p className="mt-3 text-xs leading-[1.45] text-[color:var(--text-muted)]">
                        The appointments source is present, but booked outcomes are still not visible in the revenue read.
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
                        Lead base support
                      </p>
                      <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                        {leadBaseSource.fileName ?? "File unavailable"}
                      </p>
                    </div>
                    <RevoryStatusBadge
                      tone={hasLiveImportSource(leadBaseSource) ? "neutral" : "future"}
                    >
                      {hasLiveImportSource(leadBaseSource) ? "Support live" : "Support pending"}
                    </RevoryStatusBadge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-[color:var(--text-muted)] sm:grid-cols-3">
                    <span>Rows {leadBaseSource.totalRows}</span>
                    <span>Visible {leadBaseSource.successRows}</span>
                    <span>Review {leadBaseSource.errorRows}</span>
                  </div>

                  <p className="mt-3 text-xs leading-[1.45] text-[color:var(--text-muted)]">
                    Lead base stays secondary. It adds context without promoting booked proof on its own.
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
                Upload appointments file to ground revenue with visible booked outcomes.
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
          <p className="rev-label">Next move</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
            {decisionSupportRead.title}
          </p>
          <p className="mt-2 text-sm leading-[1.45] text-[color:var(--text-muted)]">
            {decisionSupportRead.nextBestAction}
          </p>
          <p className="mt-3 text-xs leading-[1.45] text-[color:var(--text-subtle)]">
            {decisionSupportRead.recommendedPath}
          </p>
        </aside>
      </section>

      {overview.upcomingList.length > 0 ? (
        <section className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Upcoming bookings
            </p>
            <RevoryStatusBadge tone="real">{overview.upcomingAppointments} scheduled</RevoryStatusBadge>
          </div>
          <div className="mt-4 space-y-2.5">
            {overview.upcomingList.slice(0, 3).map((appointment) => (
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
