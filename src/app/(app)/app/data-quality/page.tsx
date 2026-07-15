import Link from "next/link";
import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getCanonicalDataQualityDetail } from "@/services/canonical-intake/data-quality-detail";

type QualityTone = "danger" | "success" | "warning";

const toneStyles: Record<QualityTone, string> = {
  danger: "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  success: "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success)]",
  warning: "border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
};

const ruleLabels: Record<string, string> = {
  APPROVED_CHANGE_ORDER_BASIS: "Approved change orders can be reviewed",
  COST_REVENUE_BASIS: "Job cost and revenue can be compared",
  ESTIMATE_AGING_RISK: "Aging estimates can be flagged",
  HIGH_VALUE_STALE_QUOTE: "High-value stale estimates can be flagged",
  JOB_BILLING_RECONCILIATION: "Jobs and invoices can be reconciled",
  MISSING_OWNER_OR_NEXT_STEP: "Missing owners or next steps can be flagged",
  OPEN_ESTIMATE_NO_ACTIVITY: "Open estimates with no activity can be flagged",
  OVERDUE_FOLLOW_UP: "Overdue follow-ups can be flagged",
  RECOVERABLE_LOST_QUOTE: "Recently lost estimates can be reviewed",
};

function readable(value: string) {
  return value
    .replaceAll("ExternalId", " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();
}

export default async function DataQualityPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/data-quality"));
  const detail = await getCanonicalDataQualityDetail(context.workspace.id);
  const eligibility = Object.entries(detail.eligibility);
  const eligibleCount = eligibility.filter(([, value]) => value.eligible).length;

  return (
    <div className="space-y-5">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
        <p className="rev-kicker">Import health</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="rev-display-hero">See what is ready, incomplete or blocking.</h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">
              Green is ready, yellow needs your attention, and red blocks a reliable read until the problem is fixed.
            </p>
          </div>
          <Link className="rev-button-secondary" href="/app/imports">Review imports</Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric id="records" label="Records imported" tone={detail.recordCount ? "success" : "danger"} value={detail.recordCount} />
          <Metric label="Records matched" tone={detail.linkCoverage.linked ? "success" : "warning"} value={detail.linkCoverage.linked} />
          <Metric label="Records needing attention" tone={detail.linkCoverage.unmatched ? "warning" : "success"} value={detail.linkCoverage.unmatched} />
          <Metric label="Checks REVORY can run" tone={eligibleCount ? "success" : "danger"} value={eligibleCount} />
        </div>
      </section>

      <section className="rev-shell-panel rounded-[26px] p-5" id="links">
        <p className="rev-label">Record matching</p>
        <h2 className="mt-2 text-xl font-bold">Records that need an exact ID match</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
          REVORY never joins records by a similar name or amount. Missing and conflicting IDs stay visible, and unsupported financial totals stay suppressed.
        </p>
        {detail.linkIssues.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Source record</th>
                  <th className="px-3 py-2">Field that should connect</th>
                  <th className="px-3 py-2">Record REVORY expected</th>
                  <th className="px-3 py-2">Source system</th>
                </tr>
              </thead>
              <tbody>
                {detail.linkIssues.map((issue) => (
                  <tr className="border-t border-[color:var(--border)]" key={`${issue.sourceEntityType}:${issue.sourceExternalId}:${issue.relationField}:${issue.targetExternalId}`}>
                    <td className="px-3 py-3">
                      <Status tone={issue.status === "CONFLICTING" ? "danger" : "warning"}>
                        {issue.status === "CONFLICTING" ? "Conflicting IDs" : "Needs match"}
                      </Status>
                    </td>
                    <td className="px-3 py-3 font-bold">{issue.sourceEntityType} · {issue.sourceExternalId}</td>
                    <td className="px-3 py-3 text-[color:var(--text-muted)]">{readable(issue.relationField)}</td>
                    <td className="px-3 py-3">{issue.targetEntityType} · {issue.targetExternalId}</td>
                    <td className="px-3 py-3 text-[color:var(--text-muted)]">{issue.sourceSystem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ReadyMessage>Every imported reference points to exactly one matching record.</ReadyMessage>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rev-shell-panel rounded-[26px] p-5" id="issues">
          <p className="rev-label">Latest import</p>
          <h2 className="mt-2 text-xl font-bold">Problems found in the files</h2>
          {detail.issues.length ? (
            <div className="mt-4 space-y-3">
              {detail.issues.map((issue, index) => (
                <article className={`rounded-2xl border p-4 ${toneStyles.danger}`} key={`${issue.code}:${index}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">{issue.code.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]">{issue.message}</p>
                  {issue.fileName ? <p className="mt-1 text-xs text-[color:var(--text-muted)]">{issue.fileName}{issue.rowNumber ? ` · row ${issue.rowNumber}` : ""}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <ReadyMessage>The latest import has no blocking problems.</ReadyMessage>
          )}
        </div>

        <div className="rev-shell-panel rounded-[26px] p-5" id="eligibility">
          <p className="rev-label">Available checks</p>
          <h2 className="mt-2 text-xl font-bold">What REVORY can verify with these files</h2>
          <div className="mt-4 space-y-3">
            {eligibility.map(([rule, state]) => (
              <article className={`rounded-2xl border p-4 ${toneStyles[state.eligible ? "success" : "warning"]}`} key={rule}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[color:var(--foreground)]">{ruleLabels[rule] ?? readable(rule)}</p>
                  <Status tone={state.eligible ? "success" : "warning"}>{state.eligible ? "Ready" : "Needs data"}</Status>
                </div>
                {!state.eligible ? (
                  <p className="mt-2 text-xs text-[color:var(--text-muted)]">Still needed: {state.missingFields.map(readable).join(", ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ id, label, tone, value }: { id?: string; label: string; tone: QualityTone; value: number }) {
  return (
    <div className={`rev-card-hover rounded-[20px] border p-4 ${toneStyles[tone]}`} id={id}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] font-black">
          {tone === "success" ? "✓" : tone === "warning" ? "!" : "×"}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function Status({ children, tone }: { children: React.ReactNode; tone: QualityTone }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${toneStyles[tone]}`}>{children}</span>;
}

function ReadyMessage({ children }: { children: React.ReactNode }) {
  return <p className={`mt-4 rounded-2xl border p-4 text-sm ${toneStyles.success}`}>{children}</p>;
}
