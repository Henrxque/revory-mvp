import type { RevoryDecisionSupportRead } from "@/types/decision-support";

type RevoryDecisionSupportCardProps = Readonly<{
  read: RevoryDecisionSupportRead;
  surface?: "activation" | "dashboard" | "imports";
}>;

export function RevoryDecisionSupportCard({
  read,
  surface = "imports",
}: RevoryDecisionSupportCardProps) {
  if (surface === "imports") {
    const currentSupportSignal =
      read.signals.find((signal) => /support|proof|live/i.test(signal.label)) ??
      read.signals[0];
    const reviewSignal =
      read.signals.find((signal) => /review|held|block|need/i.test(signal.label)) ??
      read.signals[1] ??
      read.signals[0];

    return (
      <section className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 md:min-h-[13.5rem] md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-[40rem] space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
              {read.eyebrow}
            </p>
            <h3 className="text-[1.05rem] font-semibold leading-6 text-[color:var(--foreground)]">
              {read.title}
            </h3>
            <p className="text-sm leading-[1.5] text-[color:var(--text-muted)]">
              {read.detectedObjection}
            </p>
          </div>

        </div>

        <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
          <div className="rounded-[18px] border border-[rgba(194,9,90,0.2)] bg-[rgba(194,9,90,0.08)] px-3.5 py-3 md:min-h-[6.2rem]">
            <p className="rev-label">Next move</p>
            <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--foreground)]">
              {read.nextBestAction}
            </p>
          </div>

          <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 md:min-h-[6.2rem]">
            <p className="rev-label">Next move</p>
            <p className="mt-1.5 text-sm leading-[1.45] text-[color:var(--foreground)]">
              {read.recommendedPath}
            </p>
          </div>

          <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 md:min-h-[6.2rem]">
            <p className="rev-label">Current support</p>
            <p className="mt-1.5 text-[0.98rem] font-semibold text-[color:var(--foreground)]">
              {currentSupportSignal?.value ?? "Not visible yet"}
            </p>
            <p className="mt-1 text-xs leading-[1.45] text-[color:var(--text-muted)]">
              {currentSupportSignal?.note ?? read.summary}
            </p>
            <p className="mt-1.5 text-[11px] leading-[1.45] text-[color:var(--text-subtle)]">
              To review: {reviewSignal?.value ?? "0"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-[1.5] text-[color:var(--text-muted)]">
          {read.guardrailNote}
        </p>
      </section>
    );
  }

  const isActivation = surface === "activation";
  const isDashboard = surface === "dashboard";
  const labels = isActivation
    ? {
        blocker: "Keep tight",
        nextMove: "Next move",
        path: "From here",
      }
    : {
        blocker: "Main blocker",
        nextMove: "Next move",
        path: "Shortest path",
      };

  const shellClassName = isActivation
    ? "rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] p-4"
    : isDashboard
      ? "rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 md:p-5"
      : "rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] p-4 md:p-5";
  const summaryClassName = isActivation
    ? "text-[13px] leading-[1.5] text-[color:var(--text-muted)]"
    : "text-sm leading-[1.5] text-[color:var(--text-muted)]";
  const signalGridClassName = isActivation
    ? "mt-3 grid gap-2 md:grid-cols-3"
    : "mt-3.5 grid gap-2.5 md:grid-cols-2";
  const footerText = read.guardrailNote;

  return (
    <section className={shellClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[38rem] space-y-1.5">
          <p
            className={`font-medium uppercase tracking-[0.22em] ${
              isActivation
                ? "text-[10px] text-[color:var(--text-subtle)]"
                : "text-[11px] text-[color:var(--accent)]"
            }`}
          >
            {read.eyebrow}
          </p>
          <h3 className="text-[1.05rem] font-semibold leading-6 text-[color:var(--foreground)]">
            {read.title}
          </h3>
          <p className={summaryClassName}>{read.summary}</p>
        </div>

      </div>

      <div className={`grid gap-2.5 md:grid-cols-2 ${isActivation ? "mt-3" : "mt-3.5"}`}>
        <div
          className={`rounded-[20px] px-3.5 py-3 ${
            isActivation
              ? "border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]"
              : "border border-[rgba(194,9,90,0.18)] bg-[rgba(194,9,90,0.08)]"
          }`}
        >
          <p className="rev-label">{labels.nextMove}</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--foreground)]">
            {read.nextBestAction}
          </p>
        </div>

        <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
          <p className="rev-label">{labels.blocker}</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--foreground)]">
            {read.detectedObjection}
          </p>
        </div>

        <div
          className={`rounded-[20px] px-3.5 py-3 md:col-span-2 ${
            isDashboard
              ? "border border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.08)]"
              : "border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]"
          }`}
        >
          <p className="rev-label">{labels.path}</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--foreground)]">
            {read.recommendedPath}
          </p>
        </div>
      </div>

      <div className={signalGridClassName}>
        {read.signals.map((signal, index) => (
          <div
            key={`${read.title}-${signal.label}`}
            className={`rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] ${
              isActivation ? "px-3.5 py-3" : "px-4 py-3.5"
            } ${
              index === read.signals.length - 1 &&
              read.signals.length % 2 === 1 &&
              !isActivation
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

      <div
        className={`rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.015)] ${
          isActivation ? "mt-3 px-3.5 py-3" : "mt-3.5 px-4 py-3.5"
        }`}
      >
        <p className="text-xs leading-[1.5] text-[color:var(--text-muted)]">
          {footerText}
        </p>
      </div>
    </section>
  );
}
