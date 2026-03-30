import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevorySectionHeader } from "@/components/ui/RevorySectionHeader";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { RevoryOperationalSurface } from "@/types/operations";

type OperationalSurfaceProps = Readonly<{
  surface: RevoryOperationalSurface;
}>;

type SnapshotCardProps = Readonly<{
  label: string;
  note: string;
  tone: "accent" | "neutral" | "real";
  value: string | number;
}>;

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function SnapshotCard({ label, note, tone, value }: SnapshotCardProps) {
  const toneClassName =
    tone === "real"
      ? "border-[rgba(46,204,134,0.18)] bg-[rgba(46,204,134,0.06)]"
      : tone === "accent"
        ? "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)]"
        : "border-[color:var(--border)] bg-[rgba(255,255,255,0.025)]";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClassName}`}>
      <p className="rev-label">{label}</p>
      <p className="mt-3 text-[1.65rem] font-semibold leading-none text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">{note}</p>
    </div>
  );
}

export function OperationalSurface({ surface }: OperationalSurfaceProps) {
  const hasGuidedRead = surface.readinessSummary.nextActionCount > 0;
  const guidanceStatusLabel = surface.hasAppointmentBase ? "Contained support" : "Proof next";
  const guidanceStatusTone = surface.hasAppointmentBase ? "neutral" : "future";

  return (
    <section className="space-y-4">
      <RevorySectionHeader
        badgeLabel={guidanceStatusLabel}
        badgeTone={guidanceStatusTone}
        description="This layer stays intentionally secondary. Live REVORY Seller should lead with activation, Booking Inputs, and the revenue view, not with an operational board."
        eyebrow="Contained Guidance"
        title="Seller keeps this read narrow."
      />

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(21,20,28,0.98))] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="rev-kicker">Guidance snapshot</p>
            <h3 className="mt-3 max-w-2xl text-[1.95rem] leading-none text-[color:var(--foreground)] md:text-[2.2rem]">
              {surface.hasAppointmentBase
                ? surface.prioritySummary.headline
                : "Booked proof should turn on before deeper guidance appears."}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              {surface.hasAppointmentBase
                ? surface.prioritySummary.description
                : "Until booked appointments are visible, this surface should stay contained so REVORY Seller does not drift toward queue logic, inbox logic, or a heavier operations read."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RevoryStatusBadge tone={hasGuidedRead ? "accent" : "neutral"}>
              {hasGuidedRead ? "Guidance available" : "No live guidance yet"}
            </RevoryStatusBadge>
            <span className="inline-flex min-h-9 items-center rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
              Updated {formatGeneratedAt(surface.generatedAt)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SnapshotCard
            label="Booked proof"
            note="This should exist before any deeper guidance tries to feel commercially real."
            tone={surface.hasAppointmentBase ? "real" : "neutral"}
            value={surface.hasAppointmentBase ? "Visible" : "Next"}
          />
          <SnapshotCard
            label="Next guided read"
            note="How many items are narrow enough to support a controlled next move."
            tone={surface.readinessSummary.nextActionCount > 0 ? "accent" : "neutral"}
            value={surface.readinessSummary.nextActionCount}
          />
          <SnapshotCard
            label="Open blockers"
            note="Blockers can stay visible, but they should not turn Seller into an operational console."
            tone={surface.readinessSummary.blockedCount > 0 ? "accent" : "neutral"}
            value={surface.readinessSummary.blockedCount}
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="rev-label">Containment decision</p>
              <p className="mt-2.5 text-sm leading-[1.6] text-[color:var(--foreground)]">
                {surface.hasAppointmentBase
                  ? "This surface is intentionally constrained to a short supporting read. If it returns to the product later, it should stay outcome-aware and clearly secondary to revenue and booked proof."
                  : "This surface stays intentionally contained until booked visibility exists. The MVP should keep leading with Booking Inputs and the revenue view instead of opening a broader guidance layer too early."}
              </p>
              <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
                {surface.hasAppointmentBase
                  ? surface.prioritySummary.suggestedNextAction
                  : "Bring the first booked-visibility file into REVORY Seller before this guidance layer is allowed to matter."}
              </p>
            </div>

            {!surface.hasAppointmentBase ? (
              <div>
                <DocumentNavigationLink className="rev-button-primary" href="/app/imports">
                  View Booking Inputs
                </DocumentNavigationLink>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </section>
  );
}

