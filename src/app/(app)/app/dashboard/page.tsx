import { redirect } from "next/navigation";

import { OperationalSurface } from "@/components/dashboard/OperationalSurface";
import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getDashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import { getOperationalSurface } from "@/services/operations/get-operational-surface";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Awaiting import";
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

function formatModeLabel(modeKey: string) {
  switch (modeKey) {
    case "MODE_A":
      return "Mode A - Basic Reminder";
    case "MODE_B":
      return "Mode B - Attendance Recovery";
    case "MODE_C":
      return "Mode C - Attendance + Reviews";
    default:
      return modeKey;
  }
}

function formatModeBadgeLabel(modeKey: string) {
  switch (modeKey) {
    case "MODE_A":
      return "Mode A";
    case "MODE_B":
      return "Mode B";
    case "MODE_C":
      return "Mode C";
    default:
      return modeKey;
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

function getDashboardActionButtonClassName(hasImportedData: boolean) {
  return hasImportedData ? "rev-button-secondary" : "rev-button-primary";
}

type MetricCardProps = Readonly<{
  accent?: boolean;
  label: string;
  note: string;
  value: string | number;
}>;

function MetricCard({ accent = false, label, note, value }: MetricCardProps) {
  return (
    <div
      className={`rounded-[20px] border px-5 py-5 ${
        accent
          ? "border-[color:var(--border-accent)] bg-[linear-gradient(135deg,rgba(194,9,90,0.14),rgba(21,20,28,0.98))]"
          : "border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
        {label}
      </p>
      <p
        className={`mt-4 text-[2rem] font-semibold leading-none ${
          accent ? "text-[color:var(--accent-light)]" : "text-[color:var(--foreground)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{note}</p>
    </div>
  );
}

type NorthStarCardProps = Readonly<{
  note: string;
  title: string;
}>;

function NorthStarCard({ note, title }: NorthStarCardProps) {
  return (
    <div className="rev-card-soft rounded-[20px] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
        <RevoryStatusBadge tone="neutral">Future layer</RevoryStatusBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{note}</p>
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
  const operationalSurface = await getOperationalSurface(
    workspace.id,
    overview.appointmentsMonitored > 0,
  );
  const monthChip = formatMonthChip();
  const hasImportedData =
    overview.importSources.length > 0 ||
    overview.appointmentsMonitored > 0 ||
    overview.clientsImported > 0;
  const workspaceReadyItems = [
    {
      done: activationSetup.isCompleted,
      label: "Workspace activated",
      note: "Core setup is complete and the private workspace is live.",
    },
    {
      done: overview.importSources.length > 0,
      label: "Data imported",
      note: "Bring in appointments or clients so REVORY has an operational base to monitor.",
    },
    {
      done: Boolean(activationSetup.googleReviewsUrl),
      label: "Google reviews destination",
      note: "The growth layer already has the target link saved for future review requests.",
    },
    {
      done: Boolean(activationSetup.recommendedModeKey),
      label: "Starting mode selected",
      note: `${formatModeLabel(workspace.activeModeKey)} is the current operating direction.`,
    },
  ];
  const flowCatalog = [
    {
      included: true,
      note: "Included in every starting mode once the live automation layer turns on.",
      title: "Confirmation Flow",
    },
    {
      included: true,
      note: "Included in every starting mode for pre-appointment follow-up.",
      title: "Reminder Flow",
    },
    {
      included: workspace.activeModeKey === "MODE_B" || workspace.activeModeKey === "MODE_C",
      note:
        workspace.activeModeKey === "MODE_B" || workspace.activeModeKey === "MODE_C"
          ? "Included in this mode once recovery logic is live."
          : "Unlocks when the workspace moves beyond the reminder-only mode.",
      title: "Rebooking / Empty Slot Recovery",
    },
    {
      included: workspace.activeModeKey === "MODE_C",
      note:
        workspace.activeModeKey === "MODE_C"
          ? "Included in this mode once the review layer is active."
          : "Unlocks in the review-focused mode.",
      title: "Review Request Flow",
    },
  ];
  const nextBestAction = !hasImportedData
    ? "Open Imports and bring in the first CSV so REVORY can start monitoring real appointments and clients."
    : overview.upcomingAppointments === 0
      ? "Upload a fresher appointments export so the workspace has a current schedule to monitor."
      : "Review the import quality and keep the appointment base fresh while the operational flow layer is added.";

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rounded-[30px] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="max-w-3xl space-y-3">
            <p className="rev-kicker">Operations overview</p>
            <h1 className="font-[family:var(--font-display)] text-4xl leading-none text-[color:var(--foreground)] md:text-5xl">
              {hasImportedData
                ? "Your workspace already has an operational base."
                : "Activation is complete. Now give REVORY the data to work with."}
            </h1>
            <p className="text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              {hasImportedData
                ? "Imported appointments and clients already give REVORY enough structure to keep the operational layer readable. What matters now is keeping the base fresh, readable, and ready for the next live actions."
                : "The premium experience starts with a low-friction import. Bring in appointments or clients and let REVORY turn that first dataset into a clean operational view."}
            </p>
          </div>

          <div className="space-y-3 xl:ml-auto xl:max-w-[20rem]">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                {monthChip}
              </span>
              <RevoryStatusBadge tone={hasImportedData ? "real" : "neutral"}>
                {hasImportedData ? "Operational base live" : "Awaiting first import"}
              </RevoryStatusBadge>
            </div>

            <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="rev-label">Current access point</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                {hasImportedData
                  ? "Open imports whenever you need to refresh the base or review import quality."
                  : "Bring the first CSV in and give REVORY a real schedule and client base to work with."}
              </p>
              <div className="mt-4">
                <DocumentNavigationLink
                  className={`${getDashboardActionButtonClassName(hasImportedData)} w-full justify-center px-5 py-3 text-sm`}
                  href="/app/imports"
                >
                  {hasImportedData ? "Open imports" : "Import data"}
                </DocumentNavigationLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_repeat(4,minmax(0,1fr))]">
        <MetricCard
          accent
          label="Monitored Revenue Base"
          note={
            overview.estimatedImportedRevenue === null
              ? "REVORY will show the revenue base as soon as appointment values arrive."
              : "Current revenue already attached to imported appointments."
          }
          value={formatCurrency(overview.estimatedImportedRevenue)}
        />
        <MetricCard
          label="Appointments Monitored"
          note="Appointments already persisted in this workspace."
          value={overview.appointmentsMonitored}
        />
        <MetricCard
          label="Upcoming Appointments"
          note="Scheduled ahead of the current server time."
          value={overview.upcomingAppointments}
        />
        <MetricCard
          label="Client Profiles"
          note="Current stored client base available to REVORY."
          value={overview.clientsImported}
        />
        <MetricCard
          label="Cancelled Appointments"
          note="Imported rows already marked as canceled."
          value={overview.canceledAppointments}
        />
      </section>

      <OperationalSurface surface={operationalSurface} />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                Import readiness
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Keep what landed, what needs review, and what still needs cleanup visible.
              </p>
            </div>
            <RevoryStatusBadge tone={overview.importSources.length > 0 ? "real" : "neutral"}>
              {overview.importSources.length > 0 ? "Imported" : "Awaiting import"}
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
                    className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {source.templateLabel}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
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
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                            Coverage
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {progressPercent}%
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                            Success rows
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.successRows}
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                            Review rows
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                            {source.errorRows}
                          </p>
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
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
                No import state yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Open Imports, upload the file you already have, and let REVORY guide the
                header mapping inside the app before the final import runs.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Open imports
                </DocumentNavigationLink>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                Mode and flow roadmap
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                The workspace already has a clear operating direction, even before every live
                automation is on.
              </p>
            </div>
            <RevoryStatusBadge tone="accent">
              {formatModeBadgeLabel(workspace.activeModeKey)}
            </RevoryStatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            {flowCatalog.map((flow) => (
              <div
                key={flow.title}
                className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                    {flow.title}
                  </p>
                  <RevoryStatusBadge tone={flow.included ? "real" : "neutral"}>
                    {flow.included ? "Included" : "Locked for this mode"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  {flow.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                Upcoming appointments
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                The next scheduled appointments already visible in the current workspace base.
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
                No upcoming appointments yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Import an appointments CSV to give REVORY a current schedule to monitor.
              </p>
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-secondary" href="/app/imports">
                  Open imports
                </DocumentNavigationLink>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
          <div className="space-y-3">
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Workspace readiness
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              Keep category, current status, and the next obvious move readable at a glance.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {workspaceReadyItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                    {item.label}
                  </p>
                  <RevoryStatusBadge tone={item.done ? "real" : "future"}>
                    {item.done ? "Ready" : "Pending"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  {item.note}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-4 py-4">
            <p className="rev-label">Next best action</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
              {nextBestAction}
            </p>
            {!hasImportedData ? (
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                  Import data
                </DocumentNavigationLink>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Future outcomes
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Once the base stays clean and the operational layer is live, these are the
              outcome metrics REVORY starts surfacing next.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NorthStarCard
            note="Starts once confirmation logic is running on top of imported appointments."
            title="Confirmation Rate"
          />
          <NorthStarCard
            note="Appears when no-show prevention begins protecting booked revenue."
            title="Estimated Revenue Protected"
          />
          <NorthStarCard
            note="Appears when rebooking and empty-slot recovery are active."
            title="Estimated Revenue Recovered"
          />
          <NorthStarCard
            note="Appears when the review request layer begins using the saved Google link."
            title="Google Reviews Requested"
          />
        </div>
      </section>
    </div>
  );
}
