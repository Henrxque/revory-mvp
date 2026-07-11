import Link from "next/link";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { RevoryFirstLeakRead } from "@/types/imports";

type FirstLeakReadProps = Readonly<{
  read: RevoryFirstLeakRead;
}>;

const stateLabels: Record<RevoryFirstLeakRead["state"], string> = {
  DATA_STALE: "Data stale",
  EMPTY: "No active leak yet",
  HAS_REVENUE_AT_RISK: "Financial leaks visible",
  OPERATIONAL_ONLY: "Operational risks only",
  THIN_DATA: "Value evidence needed",
};

const categoryLabels: NonNullable<RevoryFirstLeakRead["topLeak"]>["category"] extends infer T
  ? Record<Extract<T, string>, string>
  : never = {
  DATA_QUALITY_RISK: "Data quality risk",
  FINANCIAL_LEAK: "Financial leak",
  OPERATIONAL_RISK: "Operational risk",
};

export function FirstLeakRead({ read }: FirstLeakReadProps) {
  const hasFinancialValue = read.state === "HAS_REVENUE_AT_RISK";

  return (
    <section className="rounded-[28px] border border-[rgba(67,179,155,0.3)] bg-[linear-gradient(145deg,rgba(67,179,155,0.1),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="rev-kicker">Your first leak read</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[color:var(--foreground)]">
            {read.summary}
          </h3>
        </div>
        <RevoryStatusBadge tone={hasFinancialValue ? "accent" : "neutral"}>
          {stateLabels[read.state]}
        </RevoryStatusBadge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.65fr))]">
        <div className="rounded-[22px] border border-[rgba(67,179,155,0.24)] bg-[rgba(67,179,155,0.08)] px-4 py-4">
          <p className="rev-label">Estimated Revenue at Risk</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
            {read.estimatedRevenueAtRiskLabel}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-muted)]">
            Financial leaks only. Operational and data-quality risks are not added to this value.
          </p>
        </div>
        {[
          ["Financial leaks", read.activeFinancialLeakCount],
          ["Operational risks", read.activeOperationalRiskCount],
          ["Data-quality risks", read.activeDataQualityRiskCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
          >
            <p className="rev-label">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {read.topLeak ? (
        <div className="mt-4 grid gap-4 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4 md:grid-cols-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-label">Highest-priority signal</p>
              <RevoryStatusBadge tone="neutral">
                {categoryLabels[read.topLeak.category]}
              </RevoryStatusBadge>
            </div>
            <p className="mt-2 text-base font-semibold text-[color:var(--foreground)]">
              {read.topLeak.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              <span className="font-semibold text-[color:var(--foreground)]">Evidence:</span>{" "}
              {read.topLeak.evidence}
            </p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--text-subtle)]">
              Confidence: {read.topLeak.confidence.toLowerCase()} · Severity:{" "}
              {read.topLeak.severity.toLowerCase()}
            </p>
          </div>
          <div>
            <p className="rev-label">Recommended action</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
              {read.topLeak.recommendedAction}
            </p>
            <p className="mt-3 text-xs leading-5 text-[color:var(--text-muted)]">
              {read.limitation}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <p className="rev-label">What the data does not prove yet</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {read.limitation}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="rev-button-primary" href={read.ctaHref}>
          {read.ctaLabel}
        </Link>
        <Link className="rev-button-secondary" href="/app/dashboard">
          Go to dashboard
        </Link>
      </div>
    </section>
  );
}
