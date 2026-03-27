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
        badgeLabel="Controlled templates"
        badgeTone="neutral"
        description="One base message per operational category, controlled placeholders, and no campaign builder."
        eyebrow="Execution Foundation"
        title="Base messages stay short and controlled."
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
                      preview.blockedReason
                        ? "future"
                        : preview.outreachState === "ready"
                        ? "real"
                        : preview.outreachState === "recommended"
                          ? "future"
                          : preview.outreachState === "prepared"
                            ? "neutral"
                            : "neutral"
                    }
                  >
                    {preview.outreachStateLabel}
                  </RevoryStatusBadge>
                  <RevoryStatusBadge
                    tone={preview.previewMode === "live_preview" ? "real" : "future"}
                  >
                    {preview.previewModeLabel}
                  </RevoryStatusBadge>
                  {preview.liveItemCount > 0 ? (
                    <RevoryStatusBadge tone="neutral">
                      {preview.liveItemCount} surfaced
                    </RevoryStatusBadge>
                  ) : null}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">
                    {preview.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                    {preview.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
              <p className="rev-label">Next step</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                {preview.suggestedNextStep}
              </p>
              {preview.blockedReason ? (
                <p className="mt-2 text-sm leading-6 text-[color:var(--warning)]">
                  {preview.blockedReason}
                </p>
              ) : null}
            </div>

            <div className="mt-4 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] p-4">
              <p className="rev-label">Base preview</p>
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
                    className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]"
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
