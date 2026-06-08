import type { RevoryCsvTriageReviewState } from "@/types/imports";

type AiCsvTriagePanelProps = Readonly<{
  isPending: boolean;
  triage: RevoryCsvTriageReviewState | null;
}>;

function formatDatasetType(value: RevoryCsvTriageReviewState["detectedDatasetType"]) {
  switch (value) {
    case "PAYMENTS_UNSUPPORTED":
      return "Payments file";
    case "APPOINTMENTS":
      return "Appointments";
    case "CLIENTS":
      return "Clients";
    case "LEADS":
      return "Leads";
    default:
      return "Unknown";
  }
}

export function AiCsvTriagePanel({
  isPending,
  triage,
}: AiCsvTriagePanelProps) {
  const modeLabel =
    triage?.mode === "SAVED_MAPPING"
      ? "Using saved mapping"
      : triage?.mode === "AI_ASSISTED"
        ? "AI-assisted"
        : "Deterministic fallback";

  return (
    <section className="rev-card rounded-[24px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="rev-label">File triage</p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Review mapping before importing.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            AI-assisted mapping is a suggestion, not a final import. REVORY
            profiles only a bounded, sanitized sample and still requires review.
            The full CSV is not sent to the AI provider.
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
          {isPending ? "Reviewing" : triage ? modeLabel : "Waiting"}
        </span>
      </div>

      {isPending ? (
        <div className="mt-5 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Profiling columns and data quality.
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-muted)]">
            The current mapping remains available while this bounded review runs.
          </p>
        </div>
      ) : triage ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Dataset type
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                {formatDatasetType(triage.detectedDatasetType)}
              </p>
            </div>
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Confidence
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                {triage.confidence}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Mapping fit {triage.mappingConfidence}%
              </p>
            </div>
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Source format
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                {triage.probableSourceFormat ?? "Not identified"}
              </p>
            </div>
          </div>

          {!triage.matchesSelectedTemplate ? (
            <div className="mt-4 rounded-[18px] border border-[rgba(255,114,141,0.28)] bg-[rgba(255,114,141,0.08)] px-4 py-4 text-sm leading-6 text-[color:var(--danger)]">
              This file does not match the selected import lane. Choose the correct
              lane or review the mapping before continuing.
            </div>
          ) : null}

          {triage.detectedDatasetType === "LEADS" ? (
            <div className="mt-4 rounded-[18px] border border-[rgba(245,166,35,0.26)] bg-[rgba(245,166,35,0.08)] px-4 py-4 text-sm leading-6 text-[color:var(--warning)]">
              Lead-shaped files can be profiled, but lead import is not available in
              this version. Use appointments or clients for the current import flow.
            </div>
          ) : null}

          {!triage.importSupported && triage.detectedDatasetType !== "LEADS" ? (
            <div className="mt-4 rounded-[18px] border border-[rgba(245,166,35,0.26)] bg-[rgba(245,166,35,0.08)] px-4 py-4 text-sm leading-6 text-[color:var(--warning)]">
              REVORY can review this file shape, but the current import flow only
              persists supported appointment and client CSV files.
            </div>
          ) : null}

          {triage.errorMessage ? (
            <p className="mt-4 text-sm leading-6 text-[color:var(--danger)]">
              {triage.errorMessage}
            </p>
          ) : null}

          {triage.mode === "SAVED_MAPPING" ? (
            <div className="mt-4 rounded-[18px] border border-[rgba(46,204,134,0.22)] bg-[rgba(46,204,134,0.07)] px-4 py-4">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                Using saved mapping
              </p>
              <p className="mt-1.5 text-sm leading-6 text-[color:var(--text-muted)]">
                The columns match a mapping you previously confirmed. Review or
                adjust it before importing.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-5 text-sm leading-6 text-[color:var(--text-muted)]">
          Select a CSV to start deterministic profiling and one bounded assisted review.
        </p>
      )}
    </section>
  );
}
