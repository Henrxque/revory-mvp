import type { RevoryCsvTriageReviewState } from "@/types/imports";

type DataQualityCheckCardProps = Readonly<{
  triage: RevoryCsvTriageReviewState | null;
}>;

const leakLabels: Record<string, string> = {
  BOOKING_PATH_BLOCKED: "Blocked booking path",
  CANCELED_NOT_RECOVERED: "Unrecovered cancellation",
  MISSING_CONTACT: "Missing contact",
  NO_SHOW_REVENUE: "No-show revenue risk",
  STALE_BOOKED_PROOF: "Stale appointment evidence",
};

function formatField(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function DataQualityCheckCard({
  triage,
}: DataQualityCheckCardProps) {
  if (!triage || triage.status === "error") {
    return null;
  }

  return (
    <section className="rev-card rounded-[24px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rev-label">Data quality check</p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Evidence coverage before import.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            Missing fields may lower confidence.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">
            {triage.qualityScore}%
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
            {triage.qualityState.replaceAll("_", " ")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[18px] border border-[rgba(46,204,134,0.2)] bg-[rgba(46,204,134,0.06)] px-4 py-4">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            {triage.importSupported
              ? "REVORY can detect these leaks from this file."
              : "Potential leak coverage only after a supported import."}
          </p>
          {triage.supportedLeaks.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-muted)]">
              {triage.supportedLeaks.map((leak) => (
                <li key={leak}>{leakLabels[leak] ?? formatField(leak)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              No reliable leak coverage is available from the current fields yet.
            </p>
          )}
        </div>

        <div className="rounded-[18px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.06)] px-4 py-4">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Missing fields
          </p>
          {triage.missingFields.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-muted)]">
              {triage.missingFields.map((field) => (
                <li key={field}>{formatField(field)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              Required field coverage is present.
            </p>
          )}
        </div>

        <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Review notes
          </p>
          {triage.warnings.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--text-muted)]">
              {triage.warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              No additional warning was found in this bounded review.
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-[color:var(--text-subtle)]">
            This check does not import automatically or create revenue leaks.
          </p>
        </div>
      </div>
    </section>
  );
}
