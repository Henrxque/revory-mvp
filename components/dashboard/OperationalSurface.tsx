import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevorySectionHeader } from "@/components/ui/RevorySectionHeader";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type {
  RevoryOperationalSurface,
  RevoryOperationalTone,
} from "@/types/operations";

type OperationalSurfaceProps = Readonly<{
  surface: RevoryOperationalSurface;
}>;

function formatTimestamp(label: string, value: Date) {
  return `${label} ${new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value)}`;
}

function formatRevenue(value: number | null) {
  if (value === null) {
    return "Revenue base not attached";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

const toneCountClasses: Record<RevoryOperationalTone, string> = {
  accent:
    "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.12)] text-[color:var(--accent-light)]",
  future:
    "border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.1)] text-[color:var(--warning)]",
  neutral:
    "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--foreground)]",
  real: "border-[rgba(46,204,134,0.2)] bg-[rgba(46,204,134,0.1)] text-[color:var(--success)]",
};

const tonePanelClasses: Record<RevoryOperationalTone, string> = {
  accent:
    "border-[rgba(194,9,90,0.22)] bg-[linear-gradient(180deg,rgba(194,9,90,0.1),rgba(255,255,255,0.02))]",
  future:
    "border-[rgba(245,166,35,0.18)] bg-[linear-gradient(180deg,rgba(245,166,35,0.08),rgba(255,255,255,0.02))]",
  neutral: "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]",
  real: "border-[rgba(46,204,134,0.18)] bg-[linear-gradient(180deg,rgba(46,204,134,0.08),rgba(255,255,255,0.02))]",
};

export function OperationalSurface({ surface }: OperationalSurfaceProps) {
  return (
    <section className="space-y-4">
      <RevorySectionHeader
        badgeLabel={surface.hasLiveSignals ? "Signals live" : "Awaiting operational base"}
        badgeTone={surface.hasLiveSignals ? "real" : "neutral"}
        description="A narrow operating layer that keeps signal, current status, and the next suggested action readable without pretending REVORY is already a CRM or an automation engine."
        eyebrow="Operational Layer"
        title="Who needs action, and why."
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(21,20,28,0.98))] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="rev-kicker">Operational focus</p>
              <h3 className="mt-3 max-w-xl text-3xl leading-none text-[color:var(--foreground)] md:text-[2.65rem]">
                {surface.prioritySummary.headline}
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <RevoryStatusBadge tone={surface.needsAttentionNowCount > 0 ? "accent" : "real"}>
                {surface.needsAttentionNowCount > 0
                  ? `${surface.needsAttentionNowCount} attention now`
                  : "Guided visibility"}
              </RevoryStatusBadge>
              <span className="inline-flex min-h-9 items-center rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                Updated {formatGeneratedAt(surface.generatedAt)}
              </span>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
            {surface.prioritySummary.description}
          </p>

          <div className="mt-6 overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)]">
            <div className="grid divide-y divide-[color:var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-4 py-4">
                <p className="rev-label">Signals surfaced</p>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                  {surface.priorityItems.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  Guided items currently visible in the workspace.
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="rev-label">Attention now</p>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                  {surface.needsAttentionNowCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  Tight-window appointments surfaced by the current logic.
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="rev-label">Operational friction</p>
                <div className="mt-3">
                  <RevoryStatusBadge tone={surface.blockedCount > 0 ? "future" : "neutral"}>
                    {surface.blockedCount > 0
                      ? `${surface.blockedCount} blocked`
                      : "No open blockers"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  Visible, but still secondary to live action queues.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="rev-label">Current priority</p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
                  {surface.prioritySummary.suggestedNextAction}
                </p>
              </div>
              {!surface.hasAppointmentBase ? (
                <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                  Open imports
                </DocumentNavigationLink>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {surface.categoryCards.map((card) => (
            <div
              key={card.key}
              className="rev-card rev-card-hover flex h-full flex-col rounded-[24px] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RevoryStatusBadge tone={card.tone}>{card.kindLabel}</RevoryStatusBadge>
                    {card.blockedCount > 0 ? (
                      <RevoryStatusBadge tone="future">
                        {card.blockedCount} blocked
                      </RevoryStatusBadge>
                    ) : null}
                    {card.count === 0 ? (
                      <RevoryStatusBadge tone="neutral">No live items</RevoryStatusBadge>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-[color:var(--foreground)]">
                      {card.title}
                    </p>
                    <p className="text-sm leading-7 text-[color:var(--text-muted)]">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div
                  className={`inline-flex min-h-[4.5rem] min-w-[4.5rem] items-center justify-center rounded-[22px] border px-4 text-3xl font-semibold leading-none ${toneCountClasses[card.tone]}`}
                >
                  {card.count}
                </div>
              </div>

              <div className="mt-auto border-t border-[color:var(--border)] pt-4">
                <p className="rev-label">How to read it</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                  {card.nextAction}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Operational focus list
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              This is a short, prioritized list. REVORY is not trying to become a CRM inbox
              here.
            </p>
          </div>
          <RevoryStatusBadge tone={surface.priorityItems.length > 0 ? "accent" : "neutral"}>
            {surface.priorityItems.length > 0
              ? `${surface.priorityItems.length} items surfaced`
              : "No open items"}
          </RevoryStatusBadge>
        </div>

        {surface.priorityItems.length > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                Priority follows this reading order: at-risk, reminder, confirmation,
                recovery, then review visibility. Lower-priority categories stay visible in
                their cards even when they do not lead the short list.
              </p>
            </div>
            {surface.priorityItems.map((item) => (
              <article
                key={`${item.categoryKey}-${item.id}`}
                className={`rounded-[22px] border p-4 ${tonePanelClasses[item.stateTone]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <RevoryStatusBadge tone="neutral">{item.categoryLabel}</RevoryStatusBadge>
                      <RevoryStatusBadge tone={item.stateTone}>{item.stateLabel}</RevoryStatusBadge>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[color:var(--foreground)]">
                        {item.clientName}
                      </p>
                      <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                        {[item.serviceName ?? "Imported appointment", item.providerName]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[13rem] rounded-[18px] border border-[color:var(--border)] bg-[rgba(11,10,15,0.22)] px-4 py-3 sm:text-right">
                    <p className="rev-label">Timing</p>
                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                      {formatTimestamp(item.timestampLabel, item.timestamp)}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {formatRevenue(item.estimatedRevenue)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.75fr_1.2fr]">
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="rev-label">Why surfaced</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.insight}
                    </p>
                  </div>
                  <div
                    className={`rounded-[18px] border p-4 ${tonePanelClasses[item.stateTone]}`}
                  >
                    <p className="rev-label">Current status</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.stateLabel}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="rev-label">Recommended next step</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.nextAction}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {surface.hasAppointmentBase
                    ? "No appointments currently need operational action."
                    : "The operational layer turns on after the first appointments import."}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  {surface.hasAppointmentBase
                    ? "REVORY is already evaluating confirmation, reminders, at-risk, recovery, and review eligibility in the background. Nothing currently needs focus."
                    : "Import appointments first so REVORY has a real schedule to classify instead of placeholder states."}
                </p>
              </div>
              <RevoryStatusBadge tone={surface.hasAppointmentBase ? "real" : "neutral"}>
                {surface.hasAppointmentBase ? "Quiet right now" : "Awaiting import"}
              </RevoryStatusBadge>
            </div>
            {!surface.hasAppointmentBase ? (
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                  Open imports
                </DocumentNavigationLink>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}
