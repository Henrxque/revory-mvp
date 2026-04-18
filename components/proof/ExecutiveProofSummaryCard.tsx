"use client";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { ExecutiveProofSummaryRead } from "@/services/proof/get-executive-proof-summary-read";

type ExecutiveProofSummaryCardProps = Readonly<{
  read: ExecutiveProofSummaryRead;
}>;

export function ExecutiveProofSummaryCard({
  read,
}: ExecutiveProofSummaryCardProps) {
  const [primarySignal, ...secondarySignals] = read.signals;

  return (
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-5 shadow-[0_22px_56px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="rev-kicker">Executive proof</p>
          <p className="mt-1 text-[11px] font-medium text-[color:var(--text-muted)]">
            {read.workspaceName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-7 items-center rounded-[12px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--text-muted)]">
            {read.periodLabel}
          </span>
          <RevoryStatusBadge tone={read.freshness.tone}>{read.freshness.label}</RevoryStatusBadge>
        </div>
      </div>

      <div className="mt-4 max-w-[36rem] space-y-2">
        <h3 className="text-[1.45rem] font-semibold leading-[1.03] tracking-[-0.04em] text-[color:var(--foreground)]">
          {read.headline}
        </h3>
        <p className="text-sm leading-[1.55] text-[color:var(--text-muted)]">
          {read.summary}
        </p>
      </div>

      {primarySignal ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <div className="rounded-[22px] border border-[rgba(194,9,90,0.22)] bg-[linear-gradient(180deg,rgba(194,9,90,0.09),rgba(255,255,255,0.03))] px-4.5 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="rev-label">{primarySignal.label}</p>
              <RevoryStatusBadge tone={primarySignal.tone}>Core read</RevoryStatusBadge>
            </div>
            <p className="mt-3 text-[clamp(2rem,3vw,2.6rem)] font-semibold leading-none tracking-[-0.05em] text-[color:var(--foreground)]">
              {primarySignal.value}
            </p>
            <p className="mt-2 text-[12px] leading-[1.55] text-[color:var(--text-muted)]">
              {primarySignal.note}
            </p>
          </div>

          {secondarySignals.map((signal) => (
            <div
              key={signal.label}
              className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3.5"
            >
              <p className="rev-label">{signal.label}</p>
              <p className="mt-2.5 text-[1.25rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
                {signal.value}
              </p>
              <p className="mt-2.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                {signal.note}
              </p>
            </div>
          ))}
        </div>
      ) : null}

        <div className="mt-4 rounded-[18px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.015))] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-[30rem]">
            <p className="rev-label">Proof position</p>
            <p className="mt-2 text-[15px] font-semibold leading-[1.35] text-[color:var(--foreground)]">
              {read.safeguard.headline}
            </p>
            <p className="mt-2 text-[12px] leading-[1.55] text-[color:var(--text-muted)]">
              {read.safeguard.note}
            </p>
          </div>
          <RevoryStatusBadge tone={read.safeguard.tone}>
            {read.safeguard.tone === "real" ? "Stable" : "Watch"}
          </RevoryStatusBadge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RevoryStatusBadge tone="accent">{read.safeguard.coreReadLabel}</RevoryStatusBadge>
          <RevoryStatusBadge tone={read.safeguard.tone}>{read.safeguard.supportLabel}</RevoryStatusBadge>
          <RevoryStatusBadge tone={read.freshness.tone}>{read.freshness.label}</RevoryStatusBadge>
        </div>

        <p className="mt-3 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
          {read.freshness.note}
        </p>
      </div>
    </div>
  );
}
