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
    return "Revenue path pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
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

function formatBookingPathLabel(value: string | null) {
  switch (value) {
    case "SMS":
      return "Assisted booking path (SMS)";
    case "EMAIL":
      return "Primary booking path (Email)";
    default:
      return "Booking path pending";
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
  return (
    normalized.includes("awaiting") ||
    normalized.includes("no signal") ||
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("warming")
  );
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

type MotionStageCardProps = Readonly<{
  detail: string;
  label: string;
  stage: string;
  status: string;
  tone: "accent" | "neutral" | "real" | "future";
}>;

function MotionStageCard({
  detail,
  label,
  stage,
  status,
  tone,
}: MotionStageCardProps) {
  const toneClassName =
    tone === "real"
      ? "border-[rgba(46,204,134,0.2)] bg-[rgba(46,204,134,0.08)]"
      : tone === "accent"
        ? "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)]"
        : tone === "future"
          ? "border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.08)]"
          : "border-[color:var(--border)] bg-[rgba(255,255,255,0.025)]";

  const badgeTone =
    tone === "real" ? "real" : tone === "accent" ? "accent" : tone === "future" ? "future" : "neutral";

  return (
    <div className={`min-w-0 rounded-[22px] border p-4 ${toneClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rev-label">{stage}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{label}</p>
        </div>
        <RevoryStatusBadge tone={badgeTone}>{status}</RevoryStatusBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{detail}</p>
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
  const bookingPathLabel = formatBookingPathLabel(activationSetup.primaryChannel);
  const nextLeveragePoint = !hasImportedData
    ? "Bring the first booked appointment into view so REVORY Seller can open the revenue path with real booking evidence. Booking Inputs is the cleanest next step."
    : overview.upcomingAppointments === 0
      ? "Upload a fresher appointments export so the booking view stays current and booked outcomes stay trustworthy."
      : "Keep the lead and appointment base fresh so REVORY Seller can keep the booking motion and revenue read clean.";
  const speedSignalValue = hasImportedData ? "Signal warming up" : "Waiting for motion";
  const bookingRateValue = hasImportedData ? "Signal warming up" : "Waiting for motion";
  const leadBaseValue = overview.clientsImported > 0 ? overview.clientsImported : "Lead base pending";
  const bookedAppointmentsValue =
    overview.bookedAppointments > 0 ? overview.bookedAppointments : "Booked outcome pending";
  const motionStages = [
    {
      detail:
        overview.clientsImported > 0
          ? `${overview.clientsImported} client record${overview.clientsImported === 1 ? "" : "s"} currently give REVORY Seller a visible lead base to work from.`
          : "Bring the first lead base into view so REVORY Seller can start reading real demand and its path toward booking.",
      label: "Lead received",
      stage: "01",
      status: overview.clientsImported > 0 ? "Visible" : "Awaiting base",
      tone: overview.clientsImported > 0 ? ("real" as const) : ("future" as const),
    },
    {
      detail: `Main offer set to ${mainOfferLabel} with ${bookingPathLabel.toLowerCase()} kept as the natural booking destination for this workspace.`,
      label: "Guided flow started",
      stage: "02",
      status: "Active",
      tone: "accent" as const,
    },
    {
      detail:
        hasImportedData
          ? "Short triage still stays narrow and honest here. REVORY Seller is waiting for live event coverage before surfacing this signal."
          : "Triage stays inactive until a real lead base enters the workspace.",
      label: "Short triage",
      stage: "03",
      status: hasImportedData ? "Signal pending" : "Waiting",
      tone: "neutral" as const,
    },
    {
      detail:
        hasImportedData
          ? "Advance rate will appear once REVORY Seller can read how leads move from intake toward booking without inventing motion."
          : "Advance remains hidden until the workspace has real lead-to-booking movement to read.",
      label: "Lead advance",
      stage: "04",
      status: hasImportedData ? "Signal warming up" : "Not ready",
      tone: "neutral" as const,
    },
    {
      detail:
        overview.bookedAppointments > 0
          ? `${overview.bookedAppointments} booked appointment${overview.bookedAppointments === 1 ? "" : "s"} already visible in the current Seller view.`
          : "Booked appointments appear here as soon as REVORY Seller can read them from the first live dataset.",
      label: "Booking",
      stage: "05",
      status: overview.bookedAppointments > 0 ? "Visible" : "Awaiting booking",
      tone: overview.bookedAppointments > 0 ? ("real" as const) : ("future" as const),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-7 md:p-8">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="max-w-[46rem] space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Lead-to-booking motion</p>
              <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                {monthChip}
              </span>
              <RevoryStatusBadge tone={hasImportedData ? "real" : "neutral"}>
                {hasImportedData ? "Motion visible" : "Revenue path waiting"}
              </RevoryStatusBadge>
            </div>

            <h1 className="max-w-[40rem] font-[family:var(--font-display)] text-[clamp(2.4rem,4vw,3.95rem)] leading-[0.92] text-[color:var(--foreground)]">
              {hasImportedData
                ? "See how paid leads are moving toward booked appointments."
                : "Bring the first booked appointments into the live Seller view."}
            </h1>

            <p className="max-w-[39rem] text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              {hasImportedData
                ? "Revenue still stays first, but the dashboard now makes the booking motion explicit: lead base, guided path, booked outcomes, and the next controlled move."
                : "Start from one clean booking input and let REVORY Seller make booked outcomes, booking motion, and revenue path visible."}
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
                  ? "Revenue currently visible from the booked appointments attached to this workspace."
                  : "Revenue appears as soon as Seller can see booked appointments and apply the deal value already locked in activation."}
              </p>
              <div className="mt-5">
                <DocumentNavigationLink
                  className={`${hasImportedData ? "rev-button-secondary" : "rev-button-primary"} w-full justify-center px-5 py-3 text-sm`}
                  href="/app/imports"
                >
                  {hasImportedData ? "Refresh booking inputs" : "Open Booking Inputs"}
                </DocumentNavigationLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Lead base visible"
          note="Client records currently available for REVORY Seller to read as the live lead base."
          value={leadBaseValue}
        />
        <MetricCard
          label="Booked appointments"
          note="Appointments already visible as booked outcomes inside this workspace."
          value={bookedAppointmentsValue}
        />
        <MetricCard
          label="Lead advance rate"
          note="Appears once REVORY Seller has enough real lead-to-booking movement to measure it honestly."
          value={bookingRateValue}
        />
        <MetricCard
          label="Lead response time"
          note="Appears once REVORY Seller starts receiving real speed coverage from the live motion."
          value={speedSignalValue}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Why this revenue is believable
              </p>
              <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--text-muted)]">
                REVORY Seller does not treat revenue as a floating KPI. The number exists because activation locked the booking path, imported data made booked outcomes visible, and deal value turned those outcomes into money.
              </p>
            </div>
            <RevoryStatusBadge tone={hasImportedData ? "accent" : "neutral"}>
              {hasImportedData ? "Attribution path visible" : "Attribution path pending"}
            </RevoryStatusBadge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              {
                label: "Activation",
                note: "Main offer, lead source, booking path, and deal value were locked before the workspace went live.",
                value: activationSetup.isCompleted ? "Locked" : "Pending",
              },
              {
                label: "Booked outcomes",
                note: "Appointments visible in this workspace are the booked outcomes behind the revenue read.",
                value:
                  overview.bookedAppointments > 0
                    ? `${overview.bookedAppointments} visible`
                    : "Booked outcomes pending",
              },
              {
                label: "Deal value",
                note: "One booked appointment translates into money through the revenue baseline defined in activation.",
                value: activationSetup.averageDealValue
                  ? formatCurrency(Number(activationSetup.averageDealValue))
                  : "Awaiting value",
              },
              {
                label: "Revenue read",
                note: "The executive number stays short because the attribution path is already established underneath it.",
                value: formatCurrency(overview.estimatedImportedRevenue),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <p className="rev-label">{item.label}</p>
                <p className="mt-3 text-[1.05rem] font-semibold text-[color:var(--foreground)]">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-5 md:p-6">
          <p className="rev-label">Executive read</p>
          <p className="mt-3 text-[1.05rem] font-semibold text-[color:var(--foreground)]">
            Revenue stays dominant, but it now reads as the result of the Seller motion instead of as an isolated dashboard number.
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            The dashboard remains executive-first on purpose. Attribution is explained just enough to build trust, without turning the product into analytics-heavy BI.
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Lead-to-booking motion
            </p>
            <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--text-muted)]">
              The Seller core is the motion itself. Sources stay in the product only to feed this path, not to become the center of the experience.
            </p>
          </div>
          <RevoryStatusBadge tone={hasImportedData ? "accent" : "neutral"}>
            {hasImportedData ? "Motion active" : "Motion waiting on visibility"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-5">
          {motionStages.map((item) => (
            <MotionStageCard
              key={item.stage}
              detail={item.detail}
              label={item.label}
              stage={item.stage}
              status={item.status}
              tone={item.tone}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(300px,0.86fr)]">
        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Booking inputs
              </p>
              <p className="mt-1 max-w-[34rem] text-sm leading-6 text-[color:var(--text-muted)]">
                Upload freshness stays readable here because it supports the Seller motion, not because it is the product center.
              </p>
            </div>
            <RevoryStatusBadge tone={overview.importSources.length > 0 ? "real" : "neutral"}>
              {overview.importSources.length > 0 ? "Input active" : "Input pending"}
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
                No booked outcomes visible yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The live Seller view is ready for booked appointments. Open Booking Inputs, add the file you already have, and let REVORY Seller connect booking visibility to revenue.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Open Booking Inputs
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
                {hasImportedData ? "Review booking inputs" : "Open Booking Inputs"}
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
              label="Booking path"
              note="The guided flow keeps one explicit booking destination instead of multiple competing routes."
              value={bookingPathLabel}
            />
            <ContextCard
              label="Lead base"
              note="Current visible base available for booking and revenue visibility."
              value={`${overview.clientsImported} client records`}
            />
            <ContextCard
              label="Booked outcomes in view"
              note="Upcoming appointments currently visible as the live result of the booking path."
              value={`${overview.upcomingAppointments} upcoming`}
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
                No upcoming bookings visible yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Add the first appointments upload so REVORY Seller can make upcoming bookings visible in the live Seller view.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Open Booking Inputs
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
            note="Surfaces once Seller can compare which lead paths are feeding the healthiest booking pipeline."
            title="Source performance"
          />
        </div>
      </section>
    </div>
  );
}
