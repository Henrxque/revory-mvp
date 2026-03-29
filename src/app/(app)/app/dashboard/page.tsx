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
    return "Awaiting booked proof";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatDealValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Not set";
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
      return "Not locked";
  }
}

function formatBookingPathLabel(value: string | null) {
  switch (value) {
    case "SMS":
      return "Assisted booking path (SMS)";
    case "EMAIL":
      return "Primary booking path (Email)";
    default:
      return "Not locked";
  }
}

function formatBookingPathMetricLabel(value: string | null) {
  switch (value) {
    case "SMS":
      return "SMS";
    case "EMAIL":
      return "Email";
    default:
      return "Not locked";
  }
}

function formatRevenueProofLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
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
      ? "text-[1.58rem] leading-[1.12]"
      : "text-[clamp(2.15rem,3.2vw,2.95rem)] leading-none";
  }

  return pending
    ? "text-[1.25rem] leading-[1.2]"
    : "text-[1.72rem] leading-none";
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
  const hasRevenueProofVisible = overview.bookedAppointments > 0;
  const mainOfferLabel = formatMainOfferLabel(activationSetup.selectedTemplate);
  const bookingPathLabel = formatBookingPathLabel(activationSetup.primaryChannel);
  const bookingPathMetricLabel = formatBookingPathMetricLabel(
    activationSetup.primaryChannel,
  );
  const dealValueLabel = formatDealValue(
    activationSetup.averageDealValue
      ? Number(activationSetup.averageDealValue)
      : null,
  );
  const revenueProofLabel = formatRevenueProofLabel(overview.estimatedImportedRevenue);
  const nextLeveragePoint = !hasRevenueProofVisible
    ? "Open Booking Inputs and add booked proof first. That is the shortest path to a revenue view that feels commercially real."
    : overview.upcomingAppointments === 0
      ? "Refresh booked visibility so the booked calendar stays current and the revenue read stays believable."
      : "Keep booked visibility fresh so REVORY Seller can preserve a clean commercial read.";
  const bookedAppointmentsValue =
    overview.bookedAppointments > 0 ? overview.bookedAppointments : "Awaiting booked proof";
  const motionStages = [
    {
      detail:
        overview.clientsImported > 0
          ? `${overview.clientsImported} client record${overview.clientsImported === 1 ? "" : "s"} currently anchor the visible lead base behind this revenue read.`
          : "Bring the first lead base into view so REVORY Seller can start reading paid demand honestly.",
      label: "Lead base",
      stage: "01",
      status: overview.clientsImported > 0 ? "Visible" : "Next up",
      tone: overview.clientsImported > 0 ? ("real" as const) : ("future" as const),
    },
    {
      detail: `Main offer stays on ${mainOfferLabel} with ${bookingPathLabel.toLowerCase()} kept as the one booking destination REVORY Seller reinforces.`,
      label: "Booking path",
      stage: "02",
      status: "Locked",
      tone: "accent" as const,
    },
    {
      detail:
        overview.bookedAppointments > 0
          ? `${overview.bookedAppointments} booked appointment${overview.bookedAppointments === 1 ? "" : "s"} already give the revenue number a live commercial outcome.`
          : "As soon as booked appointments become visible, revenue stops reading like a promise and starts reading like proof.",
      label: "Booked outcome",
      stage: "03",
      status: overview.bookedAppointments > 0 ? "Visible" : "Proof next",
      tone: overview.bookedAppointments > 0 ? ("real" as const) : ("future" as const),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
          <div className="max-w-[40rem] space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Revenue view</p>
              <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                {monthChip}
              </span>
              <RevoryStatusBadge tone={hasRevenueProofVisible ? "real" : "neutral"}>
                {hasRevenueProofVisible ? "Revenue connected" : "Booked proof next"}
              </RevoryStatusBadge>
            </div>

            <h1 className="rev-display-hero max-w-[31rem]">
              {hasRevenueProofVisible
                ? "See booked revenue with real proof underneath."
                : "Booked proof turns this page into a real revenue view."}
            </h1>

            <p className="max-w-[34rem] text-sm leading-6 text-[color:var(--text-muted)] md:text-[15px]">
              {hasRevenueProofVisible
                ? "REVORY Seller keeps the value read immediate: revenue first, booked proof underneath, and one clear next move."
                : "Bring one clean booked-visibility file into Seller first. That is what turns this page from a placeholder number into a commercially believable revenue view."}
            </p>
          </div>

          <div className="xl:ml-auto xl:w-full xl:max-w-[18.75rem]">
            <div className="rounded-[22px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.12),rgba(255,255,255,0.03))] p-[1.125rem] shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
              <p className="rev-label">Booked revenue visible</p>
              <p
                className={`mt-4 max-w-[14rem] font-semibold text-[color:var(--accent-light)] ${getMetricValueClassName(
                  formatCurrency(overview.estimatedImportedRevenue),
                  "primary",
                )}`}
              >
                {formatCurrency(overview.estimatedImportedRevenue)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                {hasRevenueProofVisible
                  ? "This is the revenue already visible from booked appointments currently in view."
                  : "This number becomes real as soon as Seller can see booked appointments and apply the value per booking already locked in activation."}
              </p>
              <div className="mt-5 space-y-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
                {[
                  {
                    label: "Booked appointments",
                    value:
                      overview.bookedAppointments > 0
                        ? `${overview.bookedAppointments} visible`
                        : "Not visible yet",
                  },
                  {
                    label: "Value per booking",
                    value: dealValueLabel,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[color:var(--text-muted)]">{item.label}</span>
                    <span className="font-semibold text-[color:var(--foreground)]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <DocumentNavigationLink
                  className={`${hasRevenueProofVisible ? "rev-button-secondary" : "rev-button-primary"} w-full justify-center px-5 py-3 text-sm`}
                  href="/app/imports"
                >
                  {hasRevenueProofVisible ? "Refresh booked proof" : "Add booked proof"}
                </DocumentNavigationLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Booked proof"
          note="Booked appointments currently carrying the revenue number above."
          value={bookedAppointmentsValue}
        />
        <MetricCard
          label="Revenue per booking"
          note="The dollar value REVORY uses to turn each visible booking into revenue proof."
          value={dealValueLabel}
        />
        <MetricCard
          label="Main offer live"
          note="The one commercial offer currently generating the booked outcomes behind this read."
          value={mainOfferLabel}
        />
        <MetricCard
          label="Booking path"
          note="The single path REVORY Seller keeps reinforcing toward a booked appointment."
          value={bookingPathMetricLabel}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Why revenue is believable
              </p>
              <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--text-muted)]">
                REVORY Seller only lets revenue lead when the path underneath is already legible: booking path locked, booked outcomes visible, and value per booking attached.
              </p>
            </div>
            <RevoryStatusBadge tone={hasRevenueProofVisible ? "accent" : "neutral"}>
              {hasRevenueProofVisible ? "Confidence visible" : "Confidence building"}
            </RevoryStatusBadge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Booking path locked",
                note: "Main offer, booking path, and value per booking were locked before the workspace went live.",
                value: activationSetup.isCompleted ? "Locked" : "Next",
              },
              {
                label: "Booked proof visible",
                note: "Appointments visible in this workspace are the booked outcomes carrying the revenue read.",
                value:
                  overview.bookedAppointments > 0
                    ? `${overview.bookedAppointments} visible`
                    : "Awaiting booked proof",
              },
              {
                label: "Revenue baseline",
                note: "This is the dollar value attached to each visible booking in the revenue number above.",
                value: dealValueLabel,
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
          <p className="rev-label">Commercial read</p>
          <p className="mt-3 text-[1.05rem] font-semibold text-[color:var(--foreground)]">
            One dominant revenue number on top. Just enough booked proof underneath to make the read convincing, not analytical.
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            Revenue stays first on purpose. The dashboard explains the number just enough to support the booking promise, without turning REVORY Seller into BI.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
              <p className="rev-label">Booked proof in view</p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                {overview.bookedAppointments > 0
                  ? `${overview.bookedAppointments} booked`
                  : "Proof next"}
              </p>
            </div>
            <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
              <p className="rev-label">Revenue proof visible</p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                {revenueProofLabel}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-[rgba(255,255,255,0.08)] pt-4">
            <p className="rev-label">Next commercial move</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
              {nextLeveragePoint}
            </p>
            <div className="mt-5">
              <DocumentNavigationLink
                className={hasRevenueProofVisible ? "rev-button-secondary" : "rev-button-primary"}
                href="/app/imports"
              >
                {hasRevenueProofVisible ? "Review booked proof" : "Add booked proof"}
              </DocumentNavigationLink>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Revenue path
            </p>
            <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--text-muted)]">
              The dashboard only needs three proof points to feel trustworthy: visible lead base, locked booking path, and visible booked outcome.
            </p>
          </div>
          <RevoryStatusBadge tone={hasRevenueProofVisible ? "accent" : "neutral"}>
            {hasRevenueProofVisible ? "Commercial path visible" : "Commercial path opening"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
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
                Booked visibility
              </p>
              <p className="mt-1 max-w-[34rem] text-sm leading-6 text-[color:var(--text-muted)]">
                These files stay visible here only because they explain the revenue read with booked proof. They make the value feel earned, not estimated.
              </p>
            </div>
            <RevoryStatusBadge tone={overview.importSources.length > 0 ? "real" : "neutral"}>
              {overview.importSources.length > 0 ? "Proof active" : "Proof building"}
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
                          {source.fileName ?? "File name unavailable"}
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
                            Visible rows
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.successRows}
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                            Needs review
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.errorRows}
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                            Rows received
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
                No booked proof visible yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Booking Inputs lets you add the file you already have so booked appointments become visible and the revenue number can stop feeling abstract.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Add booked proof
                </DocumentNavigationLink>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="space-y-2">
            <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
              Commercial guardrails
            </p>
            <p className="max-w-[28rem] text-sm leading-6 text-[color:var(--text-muted)]">
              The dashboard stays narrow on purpose so the revenue read feels commercial, not back-office.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            {[
              {
                label: "One main offer",
                note: "Seller stays commercially narrow around one guided booking motion per client.",
              },
              {
                label: "Revenue-first read",
                note: "Money stays dominant while context remains secondary and supportive.",
              },
              {
                label: "Booked proof",
                note: "Uploads and booked appointments only stay visible because they make the number believable.",
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
                Commercial context
              </p>
              <p className="mt-1 max-w-[32rem] text-sm leading-6 text-[color:var(--text-muted)]">
                Short business context that keeps the revenue number legible at a glance.
              </p>
            </div>
            <RevoryStatusBadge tone={hasRevenueProofVisible ? "real" : "neutral"}>
              {hasRevenueProofVisible ? "Revenue-linked" : "Signal building"}
            </RevoryStatusBadge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ContextCard
              label="Main offer"
              note="Seller stays commercially narrow around one offer at a time."
              value={mainOfferLabel}
            />
            <ContextCard
              label="Booking path"
              note="The dashboard keeps one explicit booking destination instead of multiple competing routes."
              value={bookingPathLabel}
            />
            <ContextCard
              label="Lead base"
              note="Visible lead base currently supporting the booking and revenue read."
              value={`${overview.clientsImported} client records`}
            />
            <ContextCard
              label="Upcoming bookings"
              note="The next booked appointments currently visible as the live result of the booking path."
              value={`${overview.upcomingAppointments} upcoming`}
            />
          </div>
        </section>

        <section className="min-w-0 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
                Upcoming booked appointments
              </p>
              <p className="mt-1 max-w-[32rem] text-sm leading-6 text-[color:var(--text-muted)]">
                The next booked appointments currently visible inside this workspace.
              </p>
            </div>
            <RevoryStatusBadge tone={overview.upcomingAppointments > 0 ? "real" : "neutral"}>
              {overview.upcomingAppointments > 0
                ? `${overview.upcomingAppointments} scheduled`
                : "Calendar building"}
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
                      {appointment.serviceName ?? "Booked appointment"} -{" "}
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
                No booked calendar visible yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Add the first booked-visibility file so the dashboard can show a live booked calendar behind the revenue read.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Add booked proof
                </DocumentNavigationLink>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-[1rem] font-semibold text-[color:var(--foreground)]">
            Signals that turn on later
          </p>
          <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--text-muted)]">
            These support confidence once Seller has enough live motion, but they stay secondary to revenue and booked proof.
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
            note="Surfaces once Seller can connect cleaner booked outcomes to the active booking path."
            title="Booked appointments"
          />
          <SignalCard
            note="Surfaces once Seller can compare which active paths are feeding the healthiest booked pipeline."
            title="Booking path health"
          />
        </div>
      </section>
    </div>
  );
}
