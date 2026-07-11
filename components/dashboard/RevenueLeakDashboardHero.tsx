import type { ReactNode } from "react";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type {
  RevenueLeakRead,
  RevenueLeakReadState,
} from "@/services/revenue-leaks/get-revenue-leak-read";

type RevenueLeakDashboardHeroProps = Readonly<{
  actionArea?: ReactNode;
  evidenceCopy?: string;
  id?: string;
  monthLabel: string;
  read: RevenueLeakRead;
}>;

function getRevenueLeakStateLabel(state: RevenueLeakReadState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "Risk visible";
    case "THIN_DATA":
      return "Thin value";
    case "DATA_STALE":
      return "Data stale";
    case "NO_FINANCIAL_LEAKS":
      return "Operational";
    case "EMPTY":
      return "No active leaks";
  }
}

function getRevenueLeakStateTone(state: RevenueLeakReadState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "accent" as const;
    case "DATA_STALE":
    case "THIN_DATA":
      return "future" as const;
    case "NO_FINANCIAL_LEAKS":
      return "neutral" as const;
    case "EMPTY":
      return "real" as const;
  }
}

function getRevenueLeakHeroHeadline(state: RevenueLeakReadState) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "Estimated revenue at risk is now visible.";
    case "THIN_DATA":
      return "Leak evidence is visible, but value is still thin.";
    case "DATA_STALE":
      return "Your revenue risk read needs fresher data.";
    case "NO_FINANCIAL_LEAKS":
      return "Operational risks are visible before financial value.";
    case "EMPTY":
      return "Refresh the leak read after clinic data is uploaded.";
  }
}

function formatLeakCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function RevenueLeakDashboardHero({
  actionArea,
  evidenceCopy =
    "REVORY reads persisted leak evidence from your clinic data and keeps operational risks separate from estimated financial value.",
  id = "revenue-view",
  monthLabel,
  read,
}: RevenueLeakDashboardHeroProps) {
  const leakStateTone = getRevenueLeakStateTone(read.state);
  const topLeak = read.topLeak;

  return (
    <section
      className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7"
      id={id}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="max-w-[39rem] space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rev-kicker">Revenue leak read</p>
            <span className="inline-flex min-h-7 items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--text-muted)]">
              {monthLabel}
            </span>
            <RevoryStatusBadge tone={leakStateTone}>
              {getRevenueLeakStateLabel(read.state)}
            </RevoryStatusBadge>
          </div>

          <h1 className="rev-display-hero max-w-[31rem]">
            {getRevenueLeakHeroHeadline(read.state)}
          </h1>

          <p className="max-w-[33rem] text-sm leading-[1.5] text-[color:var(--text-muted)]">
            {evidenceCopy}
          </p>
        </div>

        <div className="rounded-[22px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(67,179,155,0.12),rgba(255,255,255,0.03))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
          <p className="rev-label">Estimated Revenue at Risk This Month</p>
          <p className="mt-3 text-[clamp(2.2rem,3.2vw,3rem)] font-semibold leading-none text-[color:var(--accent-light)]">
            {read.estimatedRevenueAtRiskLabel}
          </p>
          <p className="mt-2 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
            Estimate from active leak evidence, not confirmed accounting loss.
          </p>

          <div className="mt-4 space-y-2.5 border-t border-[rgba(255,255,255,0.08)] pt-3.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[color:var(--text-muted)]">Open leak signals</span>
              <span className="font-semibold text-[color:var(--foreground)]">
                {formatLeakCount(read.activeLeakCount, "signal")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[color:var(--text-muted)]">Operational risks</span>
              <span className="font-semibold text-[color:var(--foreground)]">
                {read.activeOperationalRiskCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[color:var(--text-muted)]">Confidence / severity</span>
              <span className="font-semibold text-[color:var(--foreground)]">
                {read.confidenceSummary.dominant ?? "Pending"} /{" "}
                {read.severitySummary.dominant ?? "Pending"}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.035)] px-3.5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="rev-label">Top leak</p>
                <p className="mt-1.5 text-sm font-semibold leading-[1.35] text-[color:var(--foreground)]">
                  {topLeak ? topLeak.label : "No active leak visible"}
                </p>
              </div>
              <RevoryStatusBadge tone={topLeak ? leakStateTone : "real"}>
                {topLeak ? topLeak.estimatedValueLabel : "Clear"}
              </RevoryStatusBadge>
            </div>
            <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {topLeak
                ? topLeak.reason
                : "No persisted open revenue leak is visible in the current read."}
            </p>
          </div>

          <div className="mt-3 rounded-[16px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="rev-label">Data freshness</p>
              <RevoryStatusBadge
                tone={read.dataFreshnessSummary.hasStaleDataRisk ? "future" : "real"}
              >
                {read.dataFreshnessSummary.label}
              </RevoryStatusBadge>
            </div>
            <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {read.dataFreshnessSummary.note}
            </p>
          </div>

          <div className="mt-3 rounded-[16px] border border-[rgba(67,179,155,0.22)] bg-[rgba(67,179,155,0.075)] px-3.5 py-3">
            <p className="rev-label">Recommended action</p>
            <p className="mt-2 text-[12px] font-medium leading-[1.5] text-[color:var(--foreground)]">
              {read.recommendedAction}
            </p>
          </div>

          {actionArea ? <div className="mt-3">{actionArea}</div> : null}
        </div>
      </div>
    </section>
  );
}
