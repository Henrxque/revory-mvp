import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { RevoryDecisionSupportRead } from "@/types/decision-support";

type RevoryDecisionSupportCardProps = Readonly<{
  read: RevoryDecisionSupportRead;
}>;

export function RevoryDecisionSupportCard({
  read,
}: RevoryDecisionSupportCardProps) {
  return (
    <section className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[36rem] space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
            {read.eyebrow}
          </p>
          <h3 className="text-[1.05rem] font-semibold leading-6 text-[color:var(--foreground)]">
            {read.title}
          </h3>
          <p className="text-sm leading-[1.5] text-[color:var(--text-muted)]">
            {read.summary}
          </p>
        </div>
        <RevoryStatusBadge tone={read.tone}>{read.badgeLabel}</RevoryStatusBadge>
      </div>

      <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
        <div className="rounded-[20px] border border-[rgba(194,9,90,0.18)] bg-[rgba(194,9,90,0.08)] px-3.5 py-3">
          <p className="rev-label">Next best action</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--foreground)]">
            {read.nextBestAction}
          </p>
        </div>

        <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
          <p className="rev-label">Detected objection</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--foreground)]">
            {read.detectedObjection}
          </p>
        </div>

        <div className="rounded-[20px] border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.08)] px-3.5 py-3 md:col-span-2">
          <p className="rev-label">Recommended path</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--foreground)]">
            {read.recommendedPath}
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
        {read.signals.map((signal, index) => (
          <div
            key={`${read.title}-${signal.label}`}
            className={`rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5 ${
              index === read.signals.length - 1 && read.signals.length % 2 === 1
                ? "md:col-span-2"
                : ""
            }`}
          >
            <p className="rev-label">{signal.label}</p>
            <p className="mt-1.5 text-[1rem] font-semibold text-[color:var(--foreground)]">
              {signal.value}
            </p>
            <p className="mt-1 text-sm leading-[1.45] text-[color:var(--text-muted)]">
              {signal.note}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

