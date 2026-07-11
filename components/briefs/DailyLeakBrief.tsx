import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type {
  DailyLeakBriefRead,
} from "@/services/revenue-leaks/get-daily-leak-brief-read";

type DailyLeakBriefProps = Readonly<{
  detailHref?: string;
  detailLabel?: string;
  read: DailyLeakBriefRead;
}>;

export function DailyLeakBrief({
  detailHref,
  detailLabel = "Review Revenue Leaks",
  read,
}: DailyLeakBriefProps) {
  const primaryLeak = read.primaryLeak;

  return (
    <section className="rev-card-premium overflow-hidden rounded-[30px] p-5 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)] xl:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rev-kicker">Today&rsquo;s Leak Brief</p>
            <RevoryStatusBadge tone={read.tone}>
              {read.stateLabel}
            </RevoryStatusBadge>
          </div>

          <div className="max-w-[39rem] space-y-2">
            <h2 className="rev-display-panel max-w-[35rem]">
              {read.headline}
            </h2>
            <p className="text-sm leading-[1.55] text-[color:var(--text-muted)]">
              {read.summary}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-[22px] border border-[rgba(194,9,90,0.2)] bg-[linear-gradient(180deg,rgba(194,9,90,0.085),rgba(255,255,255,0.024))] px-4 py-4">
              <p className="rev-label">{read.primarySignal.label}</p>
              <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-[-0.045em] text-[color:var(--foreground)]">
                {read.primarySignal.value}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                {read.primarySignal.note}
              </p>
            </div>

            <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-4">
              <p className="rev-label">Confidence / severity</p>
              <p className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
                {read.confidenceSeverityLabel}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                Based on active persisted leak evidence.
              </p>
            </div>

            <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-4">
              <p className="rev-label">Freshness</p>
              <p className="mt-2 text-[1.2rem] font-semibold leading-none tracking-[-0.035em] text-[color:var(--foreground)]">
                {read.freshness.label}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                {read.freshness.note}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.014))] p-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="rounded-[18px] border border-[rgba(194,9,90,0.18)] bg-[rgba(194,9,90,0.055)] px-3.5 py-3">
              <p className="rev-label">Recommended action</p>
              <p className="mt-2.5 text-[13px] font-semibold leading-[1.45] text-[color:var(--foreground)]">
                {read.recommendedAction}
            </p>
          </div>

          <div className="mt-3 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3.5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="rev-label">Top signal</p>
                <p className="mt-2.5 text-[12px] font-semibold leading-[1.45] text-[color:var(--foreground)]">
                  {primaryLeak ? primaryLeak.label : "No active signal visible"}
                </p>
              </div>
              <RevoryStatusBadge tone={primaryLeak ? read.tone : "real"}>
                {primaryLeak ? primaryLeak.categoryLabel : "Clear"}
              </RevoryStatusBadge>
            </div>
            <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {primaryLeak
                ? primaryLeak.note
                : "Run the leak read after new clinic data is imported."}
            </p>
          </div>

          <div className="mt-3 rounded-[18px] border border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.065)] px-3.5 py-3">
            <p className="rev-label">Honesty note</p>
            <p className="mt-2.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
              {read.honestyNote}
            </p>
          </div>

          <div className="mt-4">
            <DocumentNavigationLink
              className="rev-button-primary w-full justify-center"
              href={detailHref ?? read.detailHref}
            >
              {detailLabel}
            </DocumentNavigationLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
