import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { RevenueLeakListItem } from "@/services/revenue-leaks/get-revenue-leak-list";

type RevenueLeakCardProps = Readonly<{
  item: RevenueLeakListItem;
}>;

function getSeverityTone(severity: RevenueLeakListItem["severity"]) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "future" as const;
    case "MEDIUM":
      return "neutral" as const;
    case "LOW":
      return "real" as const;
  }
}

function getConfidenceTone(confidence: RevenueLeakListItem["confidence"]) {
  switch (confidence) {
    case "HIGH":
      return "real" as const;
    case "MEDIUM":
      return "neutral" as const;
    case "LOW":
      return "future" as const;
  }
}

function getStatusTone(status: RevenueLeakListItem["status"]) {
  switch (status) {
    case "OPEN":
      return "accent" as const;
    case "ACKNOWLEDGED":
      return "neutral" as const;
    case "RESOLVED":
      return "real" as const;
    case "DISMISSED":
      return "future" as const;
  }
}

function getCategoryTone(category: RevenueLeakListItem["category"]) {
  switch (category) {
    case "FINANCIAL_LEAK":
      return "accent" as const;
    case "OPERATIONAL_RISK":
      return "neutral" as const;
    case "DATA_QUALITY_RISK":
      return "future" as const;
  }
}

export function RevenueLeakCard({ item }: RevenueLeakCardProps) {
  const signals = item.evidenceSummary.signals;

  return (
    <article className="rev-card-premium overflow-hidden rounded-[28px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <RevoryStatusBadge tone={getCategoryTone(item.category)}>
              {item.categoryLabel}
            </RevoryStatusBadge>
            <RevoryStatusBadge tone={getStatusTone(item.status)}>
              {item.statusLabel}
            </RevoryStatusBadge>
          </div>

          <div>
            <h3 className="text-[20px] font-semibold tracking-[-0.035em] text-[color:var(--foreground)]">
              {item.typeLabel}
            </h3>
            <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[color:var(--text-muted)]">
              {item.reason}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          <RevoryStatusBadge tone={getSeverityTone(item.severity)}>
            {item.severityLabel}
          </RevoryStatusBadge>
          <RevoryStatusBadge tone={getConfidenceTone(item.confidence)}>
            {item.confidenceLabel}
          </RevoryStatusBadge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] p-4">
          <p className="rev-label">Evidence</p>
          <p className="mt-2 text-[14px] leading-6 text-[color:var(--foreground)]">
            {item.evidenceSummary.summary}
          </p>
          {signals.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {signals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] p-4">
          <p className="rev-label">Next safe action</p>
          <p className="mt-2 text-[14px] leading-6 text-[color:var(--foreground)]">
            {item.recommendedAction}
          </p>
          <p className="mt-3 text-[12px] leading-5 text-[color:var(--text-muted)]">
            {item.confidenceExplanation}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {item.category === "FINANCIAL_LEAK" ? (
          <div className="rounded-[18px] border border-[rgba(67,179,155,0.16)] bg-[rgba(67,179,155,0.055)] px-3 py-3">
            <p className="rev-label">Estimated value</p>
            <p className="mt-1 text-[13px] font-semibold text-[color:var(--foreground)]">
              {item.estimatedValueLabel}
            </p>
          </div>
        ) : (
          <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.016)] px-3 py-3">
            <p className="rev-label">Value treatment</p>
            <p className="mt-1 text-[13px] font-semibold text-[color:var(--text-muted)]">
              Not counted as revenue at risk
            </p>
          </div>
        )}

        <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.016)] px-3 py-3">
          <p className="rev-label">Context</p>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--foreground)]">
            {item.contextLabel}
          </p>
        </div>

        <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.016)] px-3 py-3">
          <p className="rev-label">Detected</p>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--foreground)]">
            {item.detectedAtLabel}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-muted)]">
            {item.sourceWindowLabel}
          </p>
        </div>
      </div>
    </article>
  );
}
