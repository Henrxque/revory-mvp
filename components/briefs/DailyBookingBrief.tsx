import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { DailyBookingBriefRead } from "@/services/briefs/get-daily-booking-brief-read";

type DailyBookingBriefProps = Readonly<{
  read: DailyBookingBriefRead;
}>;

export function DailyBookingBrief({ read }: DailyBookingBriefProps) {
  const [primarySignal, ...secondarySignals] = read.signals;
  const focusSurfaceLabel = read.nextMove.href.includes("#booking-assistance-flow")
    ? "Booking assistance"
    : read.nextMove.href.includes("#booking-inputs-flow")
      ? "Booking inputs"
      : read.nextMove.href.includes("#revenue-view")
        ? "Revenue view"
        : "Current surface";

  return (
    <section className="rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.14)] md:p-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] xl:items-start">
        <div className="space-y-4.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rev-kicker">Daily booking brief</p>
            <RevoryStatusBadge tone={read.tone}>Daily use read</RevoryStatusBadge>
          </div>

          <div className="max-w-[38rem] space-y-2">
            <h2 className="text-[1.45rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--foreground)]">
              {read.headline}
            </h2>
            <p className="text-sm leading-[1.55] text-[color:var(--text-muted)]">{read.summary}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            {primarySignal ? (
              <div className="rounded-[22px] border border-[rgba(194,9,90,0.22)] bg-[linear-gradient(180deg,rgba(194,9,90,0.08),rgba(255,255,255,0.024))] px-4.5 py-4 shadow-[0_16px_34px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="rev-label">{primarySignal.label}</p>
                  <RevoryStatusBadge tone={primarySignal.tone}>{primarySignal.note}</RevoryStatusBadge>
                </div>
                <p className="mt-3 text-[clamp(2rem,3vw,2.55rem)] font-semibold leading-none tracking-[-0.05em] text-[color:var(--foreground)]">
                  {primarySignal.value}
                </p>
                <p className="mt-2 text-[12px] leading-[1.5] text-[color:var(--text-muted)]">
                  {primarySignal.note}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {secondarySignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="rev-label">{signal.label}</p>
                    <RevoryStatusBadge tone={signal.tone}>{signal.note}</RevoryStatusBadge>
                  </div>
                  <p className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
                    {signal.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.016))] p-4.5">
          <div className="rounded-[16px] border border-[rgba(194,9,90,0.16)] bg-[rgba(194,9,90,0.05)] px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="rev-label">Today&apos;s next move</p>
              <RevoryStatusBadge tone={read.tone}>Now</RevoryStatusBadge>
            </div>
            <p className="mt-2.5 text-[13px] font-semibold text-[color:var(--foreground)]">
              {read.nextMove.label}
            </p>
            <p className="mt-1.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {read.nextMove.note}
            </p>
          </div>

          <div className="mt-3 rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="rev-label">Since last check</p>
              <RevoryStatusBadge tone={read.recentChange.tone}>Visible</RevoryStatusBadge>
            </div>
            <p className="mt-2.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {read.recentChange.note}
            </p>
          </div>

          <div className="mt-4">
            <DocumentNavigationLink
              className="rev-button-secondary w-full justify-center"
              href={read.nextMove.href}
            >
              {read.nextMove.label}
            </DocumentNavigationLink>
            <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
              Today&apos;s focus: {focusSurfaceLabel}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
