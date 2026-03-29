import { redirect } from "next/navigation";

import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getDashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Awaiting revenue";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatMetricValue(value: number | null) {
  if (value === null) {
    return "Awaiting signal";
  }

  return `${value}`;
}

function formatMonthChip() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function formatSourceStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
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

function getProgressPercent(successRows: number, totalRows: number) {
  if (totalRows <= 0) {
    return 0;
  }

  return Math.round((successRows / totalRows) * 100);
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
      return "Main offer pending";
  }
}

function getImportSourceTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("imported") || normalized.includes("completed")) {
    return "real" as const;
  }

  if (normalized.includes("review") || normalized.includes("warning")) {
    return "future" as const;
  }

  return "neutral" as const;
}

function isPendingMetricValue(value: string | number) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized.includes("awaiting") || normalized.includes("no signal");
}

function getMetricValueClassName(
  value: string | number,
  emphasis: "primary" | "support",
) {
  const pending = isPendingMetricValue(value);

  if (emphasis === "primary") {
    return pending
      ? "text-[1.75rem] leading-[1.08]"
      : "text-[clamp(2.65rem,4vw,3.55rem)] leading-none";
  }

  return pending
    ? "text-[1.45rem] leading-[1.15]"
    : "text-[1.95rem] leading-none";
}

type MetricCardProps = Readonly<{
  label: string;
  note: string;
  value: string | number;
}>;

function MetricCard({ label, note, value }: MetricCardProps) {
  return (
    <div className="rev-card-soft min-w-0 rounded-[22px] px-4 py-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
        {label}
      </p>
      <p
        className={`mt-4 max-w-[11rem] font-semibold text-[color:var(--foreground)] ${getMetricValueClassName(
          value,
          "support",
        )}`}
      >
        {value}
      </p>
      <p className="mt-3 max-w-[18rem] text-[13px] leading-6 text-[color:var(--text-muted)]">
        {note}
      </p>
    </div>
  );
}

type SignalCardProps = Readonly<{
  note: string;
  title: string;
}>;

function SignalCard({ note, title }: SignalCardProps) {
  return (
    <div className="rev-card-soft min-w-0 rounded-[20px] px-4 py-4">
      <p className="rev-label">Secondary signal</p>
      <p className="mt-3 text-base font-semibold leading-6 text-[color:var(--foreground)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{note}</p>
    </div>
  );
}

type ContextCardProps = Readonly<{
  label: string;
  note: string;
  value: string;
}>;

function ContextCard({ label, note, value }: ContextCardProps) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <p className="rev-label">{label}</p>
      <p className="mt-3 text-[1.1rem] font-semibold leading-6 text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{note}</p>
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
  const overview = await getDashboardOverview(workspace.id);
  const monthChip = formatMonthChip();
  const hasImportedData =
    overview.importSources.length > 0 ||
    overview.appointmentsMonitored > 0 ||
    overview.clientsImported > 0;
  const mainOfferLabel = formatMainOfferLabel(activationSetup.selectedTemplate);
  const nextLeveragePoint = !hasImportedData
    ? "Open Lead Sources and bring in the first dataset so REVORY Seller can start reading booking and revenue context."
    : overview.upcomingAppointments === 0
      ? "Upload a fresher appointments export so the booking view stays current."
      : "Keep the appointment base fresh so revenue visibility and booking guidance stay trustworthy.";
  const speedSignalValue = hasImportedData ? "Awaiting signal" : "No signal yet";
  const bookingRateValue = hasImportedData ? "Awaiting signal" : "No signal yet";
  const activeSourcePathsValue = overview.importSources.length;

  return (
    <div className="space-y-5">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-7 md:p-8">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="max-w-[46rem] space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Revenue view</p>
              <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                {monthChip}
              </span>
              <RevoryStatusBadge tone={hasImportedData ? "real" : "neutral"}>
                {hasImportedData ? "Revenue view live" : "Awaiting first source"}
              </RevoryStatusBadge>
            </div>

            <h1 className="max-w-[40rem] font-[family:var(--font-display)] text-[clamp(2.4rem,4vw,3.95rem)] leading-[0.92] text-[color:var(--foreground)]">
              {hasImportedData
                ? "Revenue Generated by REVORY this month."
                : "Connect your first source to unlock the revenue view."}
            </h1>

            <p className="max-w-[39rem] text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              {hasImportedData
                ? "Money stays first. Booked appointments, source health, and booking context stay directly underneath so the dashboard remains premium and easy to read."
                : "Bring in appointments or client records and let REVORY Seller turn that first dataset into a clean, revenue-first booking view."}
            </p>
          </div>

          <div className="xl:ml-auto xl:w-full xl:max-w-[19rem]">
            <div className="rounded-[24px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.12),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
              <p className="rev-label">Primary metric</p>
              <p
                className={`mt-4 max-w-[14rem] font-semibold text-[color:var(--accent-light)] ${getMetricValueClassName(
                  formatCurrency(overview.estimatedImportedRevenue),
                  "primary",
                )}`}
              >
                {formatCurrency(overview.estimatedImportedRevenue)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                {hasImportedData
                  ? "Booked revenue currently visible inside this workspace."
                  : "Revenue appears as soon as appointment value data is attached."}
              </p>
              <div className="mt-5">
                <DocumentNavigationLink
                  className={`${hasImportedData ? "rev-button-secondary" : "rev-button-primary"} w-full justify-center px-5 py-3 text-sm`}
                  href="/app/imports"
                >
                  {hasImportedData ? "Refresh sources" : "Connect first source"}
                </DocumentNavigationLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Appointments booked"
          note="Scheduled or completed appointments currently attached to this workspace."
          value={overview.bookedAppointments}
        />
        <MetricCard
          label="Booking rate"
          note="Appears once REVORY Seller has enough real lead-to-booking data."
          value={bookingRateValue}
        />
        <MetricCard
          label="Response time"
          note="Appears once REVORY Seller starts receiving live speed signals."
          value={speedSignalValue}
        />
        <MetricCard
          label="Sources connected"
          note="Active sources feeding booking and revenue visibility."
          value={activeSourcePathsValue}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(300px,0.86fr)]">
        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Source health
              </p>
              <p className="mt-1 max-w-[34rem] text-sm leading-6 text-[color:var(--text-muted)]">
                Import quality, coverage, and base freshness kept readable in one place.
              </p>
            </div>
            <RevoryStatusBadge tone={overview.importSources.length > 0 ? "real" : "neutral"}>
              {overview.importSources.length > 0 ? "Sources active" : "Awaiting source"}
            </RevoryStatusBadge>
          </div>

          {overview.importSources.length > 0 ? (
            <div className="mt-5 space-y-4">
              {overview.importSources.map((source) => {
                const progressPercent = getProgressPercent(
                  source.successRows,
                  source.totalRows,
                );
                const sourceTone = getImportSourceTone(source.status);

                return (
                  <div
                    key={source.type}
                    className="min-w-0 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {source.templateLabel}
                        </p>
                        <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                          {source.fileName ?? "No file name saved"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex min-h-8 items-center rounded-[14px] border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                          sourceTone === "real"
                            ? "border-[rgba(46,204,134,0.25)] bg-[rgba(46,204,134,0.1)] text-[color:var(--success)]"
                            : sourceTone === "future"
                              ? "border-[rgba(245,166,35,0.24)] bg-[rgba(245,166,35,0.1)] text-[color:var(--warning)]"
                              : "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {formatSourceStatus(source.status)}
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#c2095a,#e0106a)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]">
                      <div className="grid divide-y divide-[color:var(--border)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        <div className="px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                            Coverage
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {progressPercent}%
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                            Success rows
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.successRows}
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                            Review rows
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.errorRows}
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                            Total rows
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.totalRows}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                No source health yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Open Lead Sources, upload the file you already have, and let REVORY Seller build the first booking and revenue view.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Open sources
                </DocumentNavigationLink>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="space-y-2">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Next leverage point
            </p>
            <p className="max-w-[28rem] text-sm leading-6 text-[color:var(--text-muted)]">
              Keep the next obvious move readable without turning the product into a queue.
            </p>
          </div>

          <div className="mt-5 rounded-[22px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-4 py-5">
            <p className="rev-label">Recommended move</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
              {nextLeveragePoint}
            </p>
            <div className="mt-5">
              <DocumentNavigationLink
                className={hasImportedData ? "rev-button-secondary" : "rev-button-primary"}
                href="/app/imports"
              >
                {hasImportedData ? "Review sources" : "Connect source"}
              </DocumentNavigationLink>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            {[
              {
                label: "One main offer",
                note: "Seller stays narrow around one guided booking motion per client.",
              },
              {
                label: "Revenue-first read",
                note: "Money stays dominant while source and booking context remain secondary.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
              >
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.92fr)_minmax(0,1.08fr)]">
        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Booking context
              </p>
              <p className="mt-1 max-w-[32rem] text-sm leading-6 text-[color:var(--text-muted)]">
                Short business context that keeps the dashboard readable and revenue-connected.
              </p>
            </div>
            <RevoryStatusBadge tone={hasImportedData ? "real" : "neutral"}>
              {hasImportedData ? "Revenue-connected" : "Signal pending"}
            </RevoryStatusBadge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ContextCard
              label="Main offer"
              note="Seller stays narrow around one main offer at a time."
              value={mainOfferLabel}
            />
            <ContextCard
              label="Lead base"
              note="Current imported base available for booking and revenue visibility."
              value={`${overview.clientsImported} client records`}
            />
            <ContextCard
              label="Schedule in view"
              note="Upcoming appointments currently visible in this workspace."
              value={`${overview.upcomingAppointments} upcoming`}
            />
            <ContextCard
              label="Canceled appointments"
              note="A light signal only, not the center of the dashboard."
              value={formatMetricValue(overview.canceledAppointments)}
            />
          </div>
        </section>

        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Appointments in view
              </p>
              <p className="mt-1 max-w-[32rem] text-sm leading-6 text-[color:var(--text-muted)]">
                The next booked appointments currently visible inside this workspace.
              </p>
            </div>
            <RevoryStatusBadge tone={overview.upcomingAppointments > 0 ? "real" : "neutral"}>
              {overview.upcomingAppointments > 0
                ? `${overview.upcomingAppointments} scheduled`
                : "Awaiting schedule"}
            </RevoryStatusBadge>
          </div>

          {overview.upcomingList.length > 0 ? (
            <div className="mt-5 space-y-3">
              {overview.upcomingList.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-3 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.12)] text-xs font-semibold text-[color:var(--accent-light)]">
                    {getInitials(appointment.clientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                      {appointment.clientName}
                    </p>
                    <p className="mt-1 truncate text-sm text-[color:var(--text-muted)]">
                      {appointment.serviceName ?? "Imported appointment"} -{" "}
                      {formatAppointmentDate(appointment.scheduledAt)}
                    </p>
                  </div>
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[rgba(46,204,134,0.22)] bg-[rgba(46,204,134,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--success)]">
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                No appointments in view yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Import an appointments source so REVORY Seller can keep a current booking schedule visible.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Open sources
                </DocumentNavigationLink>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
            Secondary signals
          </p>
          <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--text-muted)]">
            These stay secondary until REVORY Seller has the lead and response events needed to measure them honestly.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SignalCard
            note="Surfaces once Seller starts showing how quickly new leads move through the guided path."
            title="Lead response time"
          />
          <SignalCard
            note="Surfaces once Seller can measure how many leads advance toward booked appointments."
            title="Lead advance rate"
          />
          <SignalCard
            note="Surfaces once Seller can connect cleaner booking outcomes to the active source path."
            title="Booked appointments"
          />
          <SignalCard
            note="Surfaces once Seller can compare which sources are feeding the healthiest booking pipeline."
            title="Source performance"
          />
        </div>
      </section>
    </div>
  );
}
