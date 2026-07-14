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

export default async function DataQualityPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/data-quality"));
  const detail = await getCanonicalDataQualityDetail(context.workspace.id);
  const eligibility = Object.entries(detail.eligibility);
  const eligibleCount = eligibility.filter(([, value]) => value.eligible).length;

  return (
    <div className="space-y-5">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
        <p className="rev-kicker">Data Quality drill-down</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="rev-display-hero">See what is ready, incomplete or blocking.</h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">
              Green evidence is ready, yellow evidence deserves review, and red evidence blocks or conflicts with a defensible read.
            </p>
          </div>
          <Link className="rev-button-secondary" href="/app/imports">
            Review imports
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Canonical records" tone={detail.recordCount ? "success" : "danger"} value={detail.recordCount} />
          <Metric label="Explicit links" tone={detail.linkCoverage.linked ? "success" : "warning"} value={detail.linkCoverage.linked} />
          <Metric label="Unmatched links" tone={detail.linkCoverage.unmatched ? "warning" : "success"} value={detail.linkCoverage.unmatched} />
          <Metric label="Eligible rules" tone={eligibleCount ? "success" : "danger"} value={eligibleCount} />
        </div>
      </section>

      <section className="rev-shell-panel rounded-[26px] p-5" id="links">
        <p className="rev-label">Explicit matching</p>
        <h2 className="mt-2 text-xl font-bold">Records that need a link decision</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
          REVORY never links records by approximate name or amount. Missing and conflicting IDs stay visible and suppress unsupported financial claims.
        </p>
        {detail.linkIssues.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Source record</th>
                  <th className="px-3 py-2">Relation</th>
                  <th className="px-3 py-2">Missing target</th>
                  <th className="px-3 py-2">Source system</th>
                </tr>
              </thead>
              <tbody>
                {detail.linkIssues.map((issue) => (
                  <tr className="border-t border-[color:var(--border)]" key={`${issue.sourceEntityType}:${issue.sourceExternalId}:${issue.relationField}:${issue.targetExternalId}`}>
                    <td className="px-3 py-3">
                      <Status tone={issue.status === "CONFLICTING" ? "danger" : "warning"}>
                        {issue.status === "CONFLICTING" ? "Conflict" : "Unmatched"}
                      </Status>
                    </td>
                    <td className="px-3 py-3 font-bold">{issue.sourceEntityType} · {issue.sourceExternalId}</td>
                    <td className="px-3 py-3 text-[color:var(--text-muted)]">{issue.relationField}</td>
                    <td className="px-3 py-3">{issue.targetEntityType} · {issue.targetExternalId}</td>
                    <td className="px-3 py-3 text-[color:var(--text-muted)]">{issue.sourceSystem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ReadyMessage>All imported relation IDs resolve to one explicit target.</ReadyMessage>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rev-shell-panel rounded-[26px] p-5" id="issues">
          <p className="rev-label">Committed batch</p>
          <h2 className="mt-2 text-xl font-bold">Import issues</h2>
          {detail.issues.length ? (
            <div className="mt-4 space-y-3">
              {detail.issues.map((issue, index) => (
                <article className={`rounded-2xl border p-4 ${toneStyles.danger}`} key={`${issue.code}:${index}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">{issue.code}</p>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]">{issue.message}</p>
                  {issue.fileName ? <p className="mt-1 text-xs text-[color:var(--text-muted)]">{issue.fileName}{issue.rowNumber ? ` · row ${issue.rowNumber}` : ""}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <ReadyMessage>No blocking import issue exists in the latest committed batch.</ReadyMessage>
          )}
        </div>

        <div className="rev-shell-panel rounded-[26px] p-5" id="eligibility">
          <p className="rev-label">Rule eligibility</p>
          <h2 className="mt-2 text-xl font-bold">What the evidence can support</h2>
          <div className="mt-4 space-y-3">
            {eligibility.map(([rule, state]) => (
              <article className={`rounded-2xl border p-4 ${toneStyles[state.eligible ? "success" : "warning"]}`} key={rule}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[color:var(--foreground)]">{rule.replaceAll("_", " ")}</p>
                  <Status tone={state.eligible ? "success" : "warning"}>{state.eligible ? "Eligible" : "Needs data"}</Status>
                </div>
                {!state.eligible ? (
                  <p className="mt-2 text-xs text-[color:var(--text-muted)]">Missing: {state.missingFields.join(", ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, tone, value }: { label: string; tone: QualityTone; value: number }) {
  return (
    <div className={`rev-card-hover rounded-[20px] border p-4 ${toneStyles[tone]}`} id={label === "Canonical records" ? "records" : undefined}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_14px_currentColor]" />
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
