"use client";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type {
  ExecutiveRevenueLeakSummaryLeak,
  ExecutiveRevenueLeakSummaryRead,
  ExecutiveRevenueLeakSummaryTone,
} from "@/services/revenue-leaks/get-executive-revenue-leak-summary-read";

type ExecutiveRevenueLeakSummaryCardProps = Readonly<{
  read: ExecutiveRevenueLeakSummaryRead;
  workspaceName: string;
}>;

function getStateBadgeLabel(state: ExecutiveRevenueLeakSummaryRead["state"]) {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "Risk visible";
    case "THIN_DATA":
      return "Thin value";
    case "DATA_STALE":
      return "Data stale";
    case "OPERATIONAL_ONLY":
      return "Operational";
    case "EMPTY":
      return "No active signals";
  }
}

function getStateTone(
  state: ExecutiveRevenueLeakSummaryRead["state"],
): ExecutiveRevenueLeakSummaryTone {
  switch (state) {
    case "HAS_REVENUE_AT_RISK":
      return "accent";
    case "THIN_DATA":
    case "DATA_STALE":
      return "future";
    case "OPERATIONAL_ONLY":
      return "neutral";
    case "EMPTY":
      return "real";
  }
}

function getTopExecutiveRisks(read: ExecutiveRevenueLeakSummaryRead) {
  return [
    ...read.topFinancialLeaks,
    ...read.topOperationalRisks,
    ...read.topDataQualityRisks,
  ].slice(0, 3);
}

function ExecutiveRiskRow({
  leak,
}: Readonly<{ leak: ExecutiveRevenueLeakSummaryLeak }>) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
            {leak.label}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
            {leak.categoryLabel}
          </p>
        </div>
        <RevoryStatusBadge tone={leak.category === "FINANCIAL_LEAK" ? "accent" : "neutral"}>
          {leak.estimatedValueLabel}
        </RevoryStatusBadge>
      </div>
      <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
        {leak.note}
      </p>
      <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-subtle)]">
        {leak.severityLabel} / {leak.confidenceLabel}
      </p>
    </div>
  );
}

export function ExecutiveRevenueLeakSummaryCard({
  read,
  workspaceName,
}: ExecutiveRevenueLeakSummaryCardProps) {
  const topRisks = getTopExecutiveRisks(read);

  return (
    <div className="rev-card-premium overflow-hidden rounded-[30px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="rev-kicker">{read.title}</p>
          <p className="mt-1 text-[11px] font-medium text-[color:var(--text-muted)]">
            {workspaceName}
          </p>
        </div>
        <RevoryStatusBadge tone={getStateTone(read.state)}>
          {getStateBadgeLabel(read.state)}
        </RevoryStatusBadge>
      </div>

      <div className="mt-4 max-w-[38rem] space-y-2">
        <h3 className="rev-display-panel max-w-[35rem]">{read.headline}</h3>
        <p className="text-sm leading-[1.55] text-[color:var(--text-muted)]">
          {read.summary}
        </p>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
        <div className="rounded-[24px] border border-[rgba(194,9,90,0.24)] bg-[linear-gradient(180deg,rgba(194,9,90,0.1),rgba(255,255,255,0.03))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
          <p className="rev-label">Estimated revenue at risk</p>
          <p className="mt-3 text-[clamp(2rem,3vw,2.6rem)] font-semibold leading-none tracking-[-0.05em] text-[color:var(--foreground)]">
            {read.estimatedRevenueAtRiskLabel}
          </p>
          <p className="mt-2 text-[12px] leading-[1.55] text-[color:var(--text-muted)]">
            Financial leak evidence only. Operational and data-quality risks stay separate.
          </p>
        </div>

        <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <p className="rev-label">Financial leaks</p>
          <p className="mt-2.5 text-[1.35rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
            {read.activeFinancialLeakCount}
          </p>
          <p className="mt-2.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
            Counted only when active and backed by financial leak evidence.
          </p>
        </div>

        <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <p className="rev-label">Operational / data quality</p>
          <p className="mt-2.5 text-[1.35rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
            {read.activeOperationalRiskCount} / {read.activeDataQualityRiskCount}
          </p>
          <p className="mt-2.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
            May block revenue, but not counted as confirmed financial loss.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
        <div className="rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="rev-label">Top executive risks</p>
              <p className="mt-2 text-[13px] leading-[1.5] text-[color:var(--text-muted)]">
                Shortlist from active persisted leak evidence.
              </p>
            </div>
            <RevoryStatusBadge tone={topRisks.length > 0 ? "accent" : "real"}>
              {topRisks.length > 0 ? `${topRisks.length} visible` : "Clear"}
            </RevoryStatusBadge>
          </div>

          <div className="mt-3 space-y-2">
            {topRisks.length > 0 ? (
              topRisks.map((leak) => (
                <ExecutiveRiskRow key={leak.id} leak={leak} />
              ))
            ) : (
              <p className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3.5 py-3 text-[12px] leading-[1.5] text-[color:var(--text-muted)]">
                No active executive risk is visible yet. Import clinic data and run the leak read before sharing.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-4">
            <p className="rev-label">Confidence / severity</p>
            <p className="mt-2 text-[15px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
              {read.confidenceSummary.label} / {read.severitySummary.label}
            </p>
            <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {read.confidenceSummary.note}
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-4">
            <p className="rev-label">Data freshness</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
                {read.dataFreshnessSummary.label}
              </p>
              <RevoryStatusBadge tone={read.dataFreshnessSummary.tone}>
                {read.dataFreshnessSummary.hasStaleDataRisk ? "Watch" : "Current"}
              </RevoryStatusBadge>
            </div>
            <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {read.dataFreshnessSummary.note}
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(194,9,90,0.22)] bg-[rgba(194,9,90,0.07)] px-4 py-4">
            <p className="rev-label">Recommended executive action</p>
            <p className="mt-2 text-[13px] font-semibold leading-[1.45] text-[color:var(--foreground)]">
              {read.recommendedExecutiveAction}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-[1.5] text-[color:var(--text-subtle)]">
        {read.honestyNote}
      </p>
    </div>
  );
}
