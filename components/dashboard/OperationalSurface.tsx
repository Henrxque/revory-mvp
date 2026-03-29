import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { OperationalTemplatePreviewGrid } from "@/components/dashboard/OperationalTemplatePreviewGrid";
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

function getCategoryCardGridClassName(index: number, total: number) {
  if (total === 5) {
    return index >= 3 ? "xl:col-span-3" : "xl:col-span-2";
  }

  return "xl:col-span-2";
}

export function OperationalSurface({ surface }: OperationalSurfaceProps) {
  const attentionNowBadgeLabel =
    surface.needsAttentionNowCount === 1
      ? "1 needs attention now"
      : `${surface.needsAttentionNowCount} need attention now`;

  return (
    <section className="space-y-4">
      <RevorySectionHeader
        badgeLabel={surface.hasLiveSignals ? "Signals visible" : "Booked visibility pending"}
        badgeTone={surface.hasLiveSignals ? "real" : "neutral"}
        description="A short booking read of signal, guidance, blockers, and the next narrow step. Guidance stays visible without implying a live delivery engine."
        eyebrow="Booking Pulse"
        title="What deserves attention next."
      />

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(21,20,28,0.98))] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="rev-kicker">Conversion guidance</p>
            <h3 className="mt-3 max-w-2xl text-[1.95rem] leading-none text-[color:var(--foreground)] md:text-[2.2rem]">
              {surface.prioritySummary.headline}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              {surface.prioritySummary.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RevoryStatusBadge tone={surface.needsAttentionNowCount > 0 ? "accent" : "real"}>
              {surface.needsAttentionNowCount > 0
                ? attentionNowBadgeLabel
                : "Guided visibility"}
            </RevoryStatusBadge>
            <span className="inline-flex min-h-9 items-center rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
              Updated {formatGeneratedAt(surface.generatedAt)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)]">
            <div className="grid divide-y divide-[color:var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-4 py-4">
                <p className="rev-label">Booking priorities</p>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                  {surface.readinessSummary.nextActionCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  The short list worth reading first.
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="rev-label">Next step ready</p>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                  {surface.readinessSummary.readyNowCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  Items already clear enough for the next guided step.
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="rev-label">Current blockers</p>
                <div className="mt-3">
                  <RevoryStatusBadge
                    tone={surface.readinessSummary.blockedCount > 0 ? "future" : "neutral"}
                  >
                    {surface.readinessSummary.blockedCount > 0
                      ? `${surface.readinessSummary.blockedCount} blocked`
                      : "No open blockers"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  Worth fixing after the clearest next steps are understood.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] p-4 md:p-5">
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="max-w-2xl">
                <p className="rev-label">Next guided step</p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
                  {surface.prioritySummary.suggestedNextAction}
                </p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  This is guidance, not a live queue. The broader signal and readiness stay visible below by category.
                </p>
              </div>
              {!surface.hasAppointmentBase ? (
                <div>
                  <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                    Open Booking Inputs
                  </DocumentNavigationLink>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="rev-kicker">Signals and guidance</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
              Each category stays visible, but the dashboard should still lead with the narrowest next step.
            </p>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--text-soft)]">
            Guided booking framing
          </span>
        </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {surface.categoryCards.map((card, index) => (
          <div
            key={card.key}
            className={`rev-card rev-card-hover flex h-full flex-col rounded-[24px] p-4 md:p-5 ${getCategoryCardGridClassName(
              index,
              surface.categoryCards.length,
            )}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RevoryStatusBadge tone="neutral">{card.kindLabel}</RevoryStatusBadge>
                  <RevoryStatusBadge tone={card.tone}>{card.readinessLabel}</RevoryStatusBadge>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">
                    {card.title}
                  </p>
                  <p className="max-w-[32rem] text-sm leading-6 text-[color:var(--text-muted)]">
                    {card.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[color:var(--text-soft)]">
                    {card.count === 0 ? <span>{card.emptyLabel}</span> : null}
                    {card.blockedCount > 0 ? <span>{card.blockedCount} blocked</span> : null}
                  </div>
                </div>
              </div>
              <div
                className={`inline-flex min-h-[3.15rem] min-w-[3.15rem] items-center justify-center rounded-[16px] border px-3 text-[1.35rem] font-semibold leading-none ${toneCountClasses[card.tone]}`}
              >
                {card.count}
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4 md:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="rev-label">Status</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                  {card.readinessLabel}
                </p>
                {card.blockedReason ? (
                  <p className="mt-2 text-sm leading-6 text-[color:var(--warning)]">
                    {card.blockedReason}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                    No blocker is shaping this category right now.
                  </p>
                )}
              </div>
              <div className="border-t border-[color:var(--border)] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                <p className="rev-label">Next guided step</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                  {card.nextAction}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      </section>

      <OperationalTemplatePreviewGrid previews={surface.templatePreviews} />

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
              <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
              Booking priorities
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              This is a short guided read, not a working queue. REVORY stays far from a CRM or inbox here.
            </p>
          </div>
          <RevoryStatusBadge tone={surface.priorityItems.length > 0 ? "accent" : "neutral"}>
            {surface.priorityItems.length > 0
              ? `${surface.priorityItems.length} focus items`
              : "Nothing needs focus"}
          </RevoryStatusBadge>
        </div>

        {surface.priorityItems.length > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                Priority follows this reading order: at-risk, reminder, confirmation, follow-up.
                The rest stays visible by category without becoming a queue.
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
                      <RevoryStatusBadge tone={item.stateTone}>{item.readinessLabel}</RevoryStatusBadge>
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
                    <p className="rev-label">Insight</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.insight}
                    </p>
                  </div>
                  <div
                    className={`rounded-[18px] border p-4 ${tonePanelClasses[item.stateTone]}`}
                  >
                    <p className="rev-label">Status</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {item.readinessLabel}
                    </p>
                    {item.blockedReason ? (
                      <p className="mt-2 text-sm leading-6 text-[color:var(--warning)]">
                        {item.blockedReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="rev-label">Next action</p>
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
                    ? "Nothing currently needs a guided next step."
                    : "Booking pulse turns on after the first appointments upload."}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  {surface.hasAppointmentBase
                    ? "The current schedule is visible, but nothing needs a controlled next step right now."
                    : "Add appointments first so REVORY has a real schedule to classify instead of placeholder states."}
                </p>
              </div>
              <RevoryStatusBadge tone={surface.hasAppointmentBase ? "real" : "neutral"}>
                {surface.hasAppointmentBase ? "Quiet right now" : "Visibility pending"}
              </RevoryStatusBadge>
            </div>
            {!surface.hasAppointmentBase ? (
              <div className="mt-4">
                <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                  Open Booking Inputs
                </DocumentNavigationLink>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}
