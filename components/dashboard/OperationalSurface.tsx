import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevorySectionHeader } from "@/components/ui/RevorySectionHeader";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { RevoryOperationalSurface } from "@/types/operations";

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

export function OperationalSurface({ surface }: OperationalSurfaceProps) {
  return (
    <section className="space-y-4">
      <RevorySectionHeader
        badgeLabel={surface.hasLiveSignals ? "Signals live" : "Awaiting operational base"}
        badgeTone={surface.hasLiveSignals ? "real" : "neutral"}
        description="REVORY keeps this layer narrow on purpose. It shows the operational signal, the current status, and the next suggested action without pretending the product is already a CRM or an automation engine."
        eyebrow="Operational Layer"
        title="Who needs action and why."
      />

      <div className="grid gap-4 xl:grid-cols-[0.84fr_1.16fr]">
        <section className="rev-shell-hero rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="rev-kicker">Operational focus</p>
              <h3 className="mt-3 max-w-xl text-3xl leading-none text-[color:var(--foreground)] md:text-4xl">
                {surface.prioritySummary.headline}
              </h3>
            </div>
            <RevoryStatusBadge tone={surface.needsAttentionNowCount > 0 ? "accent" : "real"}>
              {surface.needsAttentionNowCount > 0
                ? `${surface.needsAttentionNowCount} attention now`
                : "Guided visibility"}
            </RevoryStatusBadge>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
            {surface.prioritySummary.description}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rev-card-soft rounded-[20px] p-4">
              <p className="rev-label">Signals surfaced</p>
              <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                {surface.priorityItems.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The current layer of guided items visible in the workspace right now.
              </p>
            </div>
            <div className="rev-card-soft rounded-[20px] p-4">
              <p className="rev-label">Attention now</p>
              <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                {surface.needsAttentionNowCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Tight-window appointments currently surfaced by the MVP risk logic.
              </p>
            </div>
            <div className="rev-card-soft rounded-[20px] p-4">
              <p className="rev-label">Blocked paths</p>
              <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                {surface.blockedCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Unique items still blocked by missing email or reviews destination.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4">
            <p className="rev-label">Suggested next action</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
              {surface.prioritySummary.suggestedNextAction}
            </p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {surface.categoryCards.map((card) => (
            <div
              key={card.key}
              className="rev-card rev-card-hover rounded-[24px] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <RevoryStatusBadge tone={card.tone}>{card.kindLabel}</RevoryStatusBadge>
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">
                    {card.title}
                  </p>
                </div>
                <p className="text-3xl font-semibold leading-none text-[color:var(--foreground)]">
                  {card.count}
                </p>
              </div>

              <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">
                {card.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {card.blockedCount > 0 ? (
                  <RevoryStatusBadge tone="future">
                    {card.blockedCount} blocked
                  </RevoryStatusBadge>
                ) : null}
                {card.count === 0 ? (
                  <RevoryStatusBadge tone="neutral">No live items</RevoryStatusBadge>
                ) : null}
              </div>

              <div className="mt-4 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="rev-label">Suggested next action</p>
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
              Suggested operational queue
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              This is not a CRM inbox. REVORY is only showing the small set of items that
              already deserves context and a suggested next move.
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
            {surface.priorityItems.map((item) => (
              <article
                key={`${item.categoryKey}-${item.id}`}
                className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <RevoryStatusBadge tone="neutral">{item.categoryLabel}</RevoryStatusBadge>
                      <RevoryStatusBadge tone={item.stateTone}>{item.stateLabel}</RevoryStatusBadge>
                    </div>
                    <p className="text-lg font-semibold text-[color:var(--foreground)]">
                      {item.clientName}
                    </p>
                    <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                      {[item.serviceName ?? "Imported appointment", item.providerName]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                      {formatTimestamp(item.timestampLabel, item.timestamp)}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {formatRevenue(item.estimatedRevenue)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="rev-label">Insight</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.insight}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="rev-label">Status</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.stateLabel}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="rev-label">Suggested next action</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.nextAction}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-5">
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
