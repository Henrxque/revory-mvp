import { RevorySectionHeader } from "@/components/ui/RevorySectionHeader";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { RevoryOperationalTemplatePreview } from "@/types/operational-template";

type OperationalTemplatePreviewGridProps = Readonly<{
  previews: RevoryOperationalTemplatePreview[];
}>;

export function OperationalTemplatePreviewGrid({
  previews,
}: OperationalTemplatePreviewGridProps) {
  return (
    <section className="space-y-4">
      <RevorySectionHeader
        badgeLabel="Guided preparation"
        badgeTone="neutral"
        description="Each category keeps a short booking playbook, a preparation state, and a controlled preview. This is preparation, not live outreach delivery."
        eyebrow="Booking Playbook"
        title="Preview and guidance stay separate."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {previews.map((preview) => (
          <article
            key={preview.key}
            className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[34rem] space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RevoryStatusBadge tone="neutral">{preview.categoryLabel}</RevoryStatusBadge>
                  <RevoryStatusBadge
                    tone={
                      preview.outreachState === "ready"
                        ? "real"
                        : preview.outreachState === "prepared"
                          ? preview.blockedReason
                            ? "neutral"
                            : "neutral"
                        : preview.outreachState === "recommended"
                          ? "future"
                          : "neutral"
                    }
                  >
                    {preview.outreachStateLabel}
                  </RevoryStatusBadge>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">
                    {preview.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                    {preview.description}
                  </p>
                  <p className="mt-3 text-xs text-[color:var(--text-soft)]">
                    {preview.previewModeLabel}
                    {preview.liveItemCount > 0 ? ` - ${preview.liveItemCount} in view` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="rev-label">Guidance</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                  {preview.suggestedNextStep}
                </p>
              </div>
              <div className="border-t border-[color:var(--border)] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                <p className="rev-label">State</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                  {preview.outreachStateLabel}
                </p>
                {preview.blockedReason ? (
                  <p className="mt-2 text-sm leading-6 text-[color:var(--warning)]">
                    Blocked by {preview.blockedReason.toLowerCase()}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                    No blocker is shaping this base right now.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="rev-label">Preview</p>
                <span className="text-xs text-[color:var(--text-soft)]">
                  Preview only - controlled placeholders
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--foreground)]">
                {preview.body.split("\n").map((line, index) => (
                  <p key={`${preview.key}-${index}`}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="rev-label">Allowed placeholders</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {preview.placeholders.map((placeholder) => (
                  <span
                    key={`${preview.key}-${placeholder.key}`}
                    className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-soft)]"
                  >
                    {placeholder.token}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
