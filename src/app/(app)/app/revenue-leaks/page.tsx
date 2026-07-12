import { redirect } from "next/navigation";

import { RunLeakReadAction } from "@/components/dashboard/RunLeakReadAction";
import { RevenueLeakFilters } from "@/components/revenue-leaks/RevenueLeakFilters";
import { RevenueLeakList } from "@/components/revenue-leaks/RevenueLeakList";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import {
  getRevenueLeakListForWorkspace,
  type RevenueLeakListFilter,
} from "@/services/revenue-leaks/get-revenue-leak-list";
import { syncDashboardRevenueLeaks } from "../dashboard/actions";

type RevenueLeaksPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

const supportedFilters = new Set<RevenueLeakListFilter>([
  "ALL_ACTIVE",
  "FINANCIAL",
  "OPERATIONAL",
  "DATA_QUALITY",
  "HIGH_SEVERITY",
  "LOW_CONFIDENCE",
  "RESOLVED",
  "DISMISSED",
]);

export default async function RevenueLeaksPage({
  searchParams,
}: RevenueLeaksPageProps) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app/revenue-leaks"));
  }

  if (
    !appContext.activationSetup.isCompleted &&
    !isInternalMigrationPreviewEnabled()
  ) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filter = resolveFilter(resolvedSearchParams.filter);
  const read = await getRevenueLeakListForWorkspace({
    filter,
    workspaceId: appContext.workspace.id,
  });

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <RevoryStatusBadge tone="accent">Leak evidence</RevoryStatusBadge>
              <RevoryStatusBadge tone="neutral">
                Estimate, not accounting loss
              </RevoryStatusBadge>
            </div>

            <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.065em] text-[color:var(--foreground)] md:text-[46px]">
              Revenue Leaks
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[color:var(--text-muted)]">
              Review the preserved evidence-list experience while contractor-native findings remain behind their release gate.
            </p>
          </div>

          <RunLeakReadAction
            action={syncDashboardRevenueLeaks}
            initialState={{
              message: "Refresh leak signals from your latest imported data.",
              ok: null,
              summary: null,
            }}
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SummaryTile
            label="Active signals"
            value={read.activeCount}
            note="Open or acknowledged evidence"
          />
          <SummaryTile
            label="Resolved"
            value={read.resolvedCount}
            note="Manually closed evidence"
          />
          <SummaryTile
            label="Dismissed"
            value={read.dismissedCount}
            note="Signals removed from active read"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="rev-label">Signal view</p>
            <p className="mt-1 text-[13px] leading-6 text-[color:var(--text-muted)]">
              Filter the evidence list without turning it into a reporting suite.
            </p>
          </div>
          <RevoryStatusBadge tone="neutral">
            {read.filteredCount} visible
          </RevoryStatusBadge>
        </div>

        <RevenueLeakFilters activeFilter={filter} />
      </section>

      <RevenueLeakList activeFilter={filter} items={read.items} />

      <section className="rounded-[24px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.07)] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--warning)]">
          Product truth
        </p>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[color:var(--text-muted)]">
          Compatibility findings remain migration evidence. Operational and data-quality risks may block revenue, but REVORY does not count them as confirmed financial loss or contractor-native output.
        </p>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  note,
  value,
}: Readonly<{
  label: string;
  note: string;
  value: number;
}>) {
  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.022)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-[12px] leading-5 text-[color:var(--text-muted)]">
        {note}
      </p>
    </div>
  );
}

function resolveFilter(
  value: string | string[] | undefined,
): RevenueLeakListFilter {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate && supportedFilters.has(candidate as RevenueLeakListFilter)) {
    return candidate as RevenueLeakListFilter;
  }

  return "ALL_ACTIVE";
}
