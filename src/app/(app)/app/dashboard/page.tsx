import { redirect } from "next/navigation";

import { RevorySectionHeader } from "@/components/ui/RevorySectionHeader";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { getDashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function formatActivatedAt(value: Date | null) {
  if (!value) {
    return "Activation timestamp pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatImportedAt(value: Date | null) {
  if (!value) {
    return "No file imported yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Awaiting revenue base";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatSourceStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function getBarWidth(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(8, Math.min(100, Math.round((value / total) * 100)));
}

export default async function DashboardPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
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
  const totalImportedRows = overview.importSources.reduce(
    (sum, source) => sum + source.totalRows,
    0,
  );
  const totalSuccessfulRows = overview.importSources.reduce(
    (sum, source) => sum + source.successRows,
    0,
  );
  const totalErroredRows = overview.importSources.reduce(
    (sum, source) => sum + source.errorRows,
    0,
  );
  const importedSourcesLabel =
    overview.importSources.length > 0
      ? `${overview.importSources.length} source${overview.importSources.length > 1 ? "s" : ""} live`
      : "No source live yet";
  const monitoredBarWidth = getBarWidth(
    overview.upcomingAppointments,
    overview.appointmentsMonitored,
  );
  const canceledBarWidth = getBarWidth(
    overview.canceledAppointments,
    overview.appointmentsMonitored,
  );
  const nextPhaseBlocks = [
    {
      description:
        "Confirmation rate stays in the future layer until reminders and confirmations start generating monitored events.",
      label: "Coming soon",
      title: "Confirmations",
    },
    {
      description:
        "Recovery outcomes remain outside the current imported-only scope, so this stays explicitly in the next phase.",
      label: "Next phase",
      title: "Recovery",
    },
    {
      description:
        "Review automation only becomes real when the outbound flow and delivery layer exist beyond Sprint 2.",
      label: "Coming soon",
      title: "Reviews",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,17,24,0.98),rgba(11,10,15,0.98))] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <RevoryStatusBadge tone="neutral">REVORY Overview</RevoryStatusBadge>
              <RevoryStatusBadge tone="real">{importedSourcesLabel}</RevoryStatusBadge>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--text-subtle)]">
                Dashboard MVP
              </p>
              <h2 className="font-[family:var(--font-display)] text-5xl leading-none text-[color:var(--foreground)] md:text-6xl">
                Real imported signals, premium shell, honest next phase.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
                The dashboard now pulls from appointments, clients, and source
                metadata already persisted in the workspace. Future automation
                layers stay visible, but they remain clearly marked as not live yet.
              </p>
            </div>
          </div>

          <div className="grid min-w-[260px] gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              <RevoryStatusBadge tone="accent">
                {workspace.activeModeKey}
              </RevoryStatusBadge>
              <RevoryStatusBadge tone="neutral">Current workspace state</RevoryStatusBadge>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                Activation
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                Completed
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Activated at {formatActivatedAt(activationSetup.activatedAt)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[28px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.24),rgba(30,26,36,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              Estimated Imported Revenue
            </p>
            <RevoryStatusBadge
              tone={overview.estimatedImportedRevenue === null ? "future" : "real"}
            >
              {overview.estimatedImportedRevenue === null ? "Revenue base pending" : "Real now"}
            </RevoryStatusBadge>
          </div>
          <p className="mt-6 text-4xl font-semibold text-[color:var(--foreground)] md:text-5xl">
            {formatCurrency(overview.estimatedImportedRevenue)}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/72">
            This card only reflects the sum of <code>estimatedRevenue</code> values
            already present in persisted appointments. It does not imply realized,
            protected, or recovered revenue.
          </p>
        </div>

        <div className="rev-card rounded-[28px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
            Appointments Monitored
          </p>
          <p className="mt-4 text-4xl font-semibold text-[color:var(--foreground)]">
            {overview.appointmentsMonitored}
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            Total appointments persisted from CSV into this workspace.
          </p>
        </div>

        <div className="rev-card rounded-[28px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
            Clients Imported
          </p>
          <p className="mt-4 text-4xl font-semibold text-[color:var(--foreground)]">
            {overview.clientsImported}
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            Current client base stored from official client imports.
          </p>
        </div>

        <div className="rev-card rounded-[28px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
            Upcoming Appointments
          </p>
          <p className="mt-4 text-4xl font-semibold text-[color:var(--foreground)]">
            {overview.upcomingAppointments}
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            Scheduled appointments still ahead of the current server-side time reference.
          </p>
        </div>

        <div className="rev-card rounded-[28px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
            Cancelled Appointments
          </p>
          <p className="mt-4 text-4xl font-semibold text-[color:var(--foreground)]">
            {overview.canceledAppointments}
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            Appointments already imported with canceled status.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <RevorySectionHeader
            badgeLabel="Latest aggregate source state"
            badgeTone="neutral"
            description="Import readiness reflects the last aggregate state saved for each CSV source, not a detailed execution history."
            eyebrow="Import Readiness"
            title="The imported base is already visible in the dashboard."
          />

          {overview.importSources.length > 0 ? (
            <div className="mt-5 space-y-3">
              {overview.importSources.map((source) => (
                <div
                  key={source.type}
                  className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                        {source.templateLabel}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                        {formatSourceStatus(source.status)}
                      </p>
                    </div>
                    <RevoryStatusBadge
                      tone={source.successRows > 0 ? "real" : "neutral"}
                    >
                      {source.fileName ?? "No file yet"}
                    </RevoryStatusBadge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                        Last import
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                        {formatImportedAt(source.importedAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                        Success rows
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                        {source.successRows} / {source.totalRows}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                        Rows needing correction
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                        {source.errorRows}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] px-5 py-5">
              <p className="text-lg font-semibold text-[color:var(--foreground)]">
                No CSV sources imported yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The dashboard shell is ready, but this workspace still needs its
                first appointments or clients CSV import before real imported
                signals can appear.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <RevorySectionHeader
            badgeLabel="Not live yet"
            badgeTone="future"
            description="These blocks mirror the visual direction of the mockup while staying explicit about what still belongs to the next phase."
            eyebrow="Next Phase"
            title="Future layers stay visible without pretending they already run."
          />

          <div className="mt-5 space-y-3">
            {nextPhaseBlocks.map((block) => (
              <div
                key={block.title}
                className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">
                    {block.title}
                  </p>
                  <RevoryStatusBadge tone="future">{block.label}</RevoryStatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  {block.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <RevorySectionHeader
            badgeLabel="Real now"
            badgeTone="real"
            description="This block keeps the semantic reading of the imported appointments grounded in counts that already exist in the database."
            eyebrow="Operational Snapshot"
            title="What the imported appointment base currently says."
          />

          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Upcoming appointments within monitored base
                </p>
                <span className="text-sm font-semibold text-[color:var(--foreground)]">
                  {overview.upcomingAppointments}
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#e0106a,#ff6fa8)]"
                  style={{ width: `${monitoredBarWidth}%` }}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Cancelled appointments within monitored base
                </p>
                <span className="text-sm font-semibold text-[color:var(--foreground)]">
                  {overview.canceledAppointments}
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#57536c,#8f8aa8)]"
                  style={{ width: `${canceledBarWidth}%` }}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                Semantics
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                Appointments monitored means the total appointments already
                imported and persisted in this workspace. It does not imply
                real-time monitoring or continuous automation yet.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <RevorySectionHeader
            badgeLabel="Sprint 2 state"
            badgeTone="accent"
            description="This panel keeps the product honest about what is already real, what is aggregated, and what still waits for the next sprint."
            eyebrow="Workspace State"
            title="The MVP is operational, but still intentionally narrow."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                Active mode
              </p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
                {workspace.activeModeKey}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The same mode selected during setup and applied at activation.
              </p>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                Import readiness
              </p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
                {totalSuccessfulRows} rows
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Persisted from the latest aggregate import state across all CSV sources.
              </p>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                Total tracked rows
              </p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
                {totalImportedRows}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Current aggregate row count from the latest saved import state.
              </p>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-subtle)]">
                Rows needing correction
              </p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
                {totalErroredRows}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Rejections from the current aggregate import state, not a deep execution log.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
