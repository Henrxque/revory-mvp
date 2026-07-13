import Link from "next/link";
import { redirect } from "next/navigation";

import { RevenueRealizationFindingIcon } from "@/components/revenue-realization/RevenueRealizationFindingIcon";
import type { JobBillingReconciliation, RevenueRealizationFindingType } from "@/domain/revory/revenue-realization";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import {
  getRevenueRealizationFindingRead,
  getRevenueRealizationRead,
} from "@/services/revenue-realization/get-revenue-realization-read";
import { refreshRevenueRealizationFindings } from "./actions";

function money(valueCents: number | null, currency: string | null = "USD") {
  if (valueCents === null || !currency) return "No financial value";
  return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(valueCents / 100);
}

function Metric({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="rev-card rounded-[18px] p-4">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
      {note ? <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-muted)]">{note}</p> : null}
    </div>
  );
}

function ReconciliationCard({ row }: { row: JobBillingReconciliation }) {
  return (
    <article className="rev-card min-w-0 rounded-[22px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="rev-label">Job {row.jobExternalId}</p>
          <h3 className="mt-2 text-base font-bold">
            {row.state === "ELIGIBLE" ? "Reconstructable billing comparison" : "Financial output suppressed"}
          </h3>
        </div>
        <span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent-light)]">
          {row.valueBasis.replaceAll("_", " ")}
        </span>
      </div>
      {row.state === "ELIGIBLE" ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Expected billing" value={money(row.expectedBillingCents, row.currency)} />
            <Metric label="Observed invoices" value={money(row.invoicedCents, row.currency)} />
            <Metric label="Calculated gap" value={money(row.calculatedGapCents, row.currency)} />
          </div>
          <p className="mt-4 text-xs leading-5 text-[color:var(--text-muted)]">
            <strong className="text-[color:var(--foreground)]">Formula:</strong> {row.formula}.
          </p>
        </>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[color:var(--text-muted)]">
          {row.issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}
    </article>
  );
}

export default async function RevenueRealizationPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/revenue-realization"));
  const [read, findingRead] = await Promise.all([
    getRevenueRealizationRead(context.workspace.id),
    getRevenueRealizationFindingRead(context.workspace.id),
  ]);

  if (!read || read.summary.recordCounts.JOB === 0) {
    return (
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <p className="rev-kicker">Revenue Realization · local gated preview</p>
        <h1 className="rev-display-hero mt-3 max-w-[42rem]">Add explicit job and billing evidence before comparing records.</h1>
        <p className="mt-4 max-w-[44rem] text-sm leading-7 text-[color:var(--text-muted)]">
          REVORY never guesses links from names or amounts. Import jobs, invoices, change orders and costs with external IDs.
        </p>
        <Link className="rev-button-primary mt-6" href="/app/imports">Import Revenue Realization data</Link>
      </section>
    );
  }

  const reviewLinks = read.matches.filter((match) => match.state !== "MATCHED");
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <p className="rev-kicker">Revenue Realization · Sprint 9 local product gate</p>
        <h1 className="rev-display-hero mt-3 max-w-[46rem]">Turn defensible reconciliation into review-ready findings.</h1>
        <p className="mt-4 max-w-[50rem] text-sm leading-7 text-[color:var(--text-muted)]">
          Tier 2 rules run without AI. Every financial value has an observed or calculated basis;
          ambiguous links and incomplete inputs suppress the claim. Findings are review opportunities,
          not confirmed accounting loss or guaranteed recovery.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rev-button-primary" href="/app/revenue-realization/report">Open executive report</Link>
          <Link className="rev-button-secondary" href="/app/imports">Review imports</Link>
          <form action={refreshRevenueRealizationFindings}>
            <button className="rev-button-ghost" type="submit">Refresh deterministic findings</button>
          </form>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Calculated billing gap" note="Primary additive gap only" value={money(findingRead.summary.calculatedUnderbillingCents, findingRead.summary.currency)} />
          <Metric label="Approved CO review" note="Observed; not added again" value={money(findingRead.summary.approvedChangeOrderReviewCents, findingRead.summary.currency)} />
          <Metric label="Margin basis at risk" note="Calculated separately" value={money(findingRead.summary.marginAtRiskCents, findingRead.summary.currency)} />
          <Metric label="Operational candidates" note="No financial value" value={String(findingRead.summary.operationalCount)} />
        </div>
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rev-kicker">Premium findings</p>
            <h2 className="rev-display-section mt-2">Evidence first. Totals remain deliberately separate.</h2>
          </div>
          <span className="rev-label">{findingRead.summary.activeCount} active</span>
        </div>
        {findingRead.findings.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {findingRead.findings.map((finding) => (
              <Link className="rev-card-premium rev-card-hover rounded-[22px] p-5" href={`/app/revenue-realization/findings/${finding.id}`} key={finding.id}>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.1)] text-[color:var(--accent-light)]">
                    <RevenueRealizationFindingIcon type={finding.findingType as RevenueRealizationFindingType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="rev-label">Job {finding.jobExternalId}</p>
                        <h3 className="mt-2 text-base font-bold">{finding.findingType.replaceAll("_", " ")}</h3>
                      </div>
                      <strong>{money(finding.valueCents, finding.currency)}</strong>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{finding.reason}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-subtle)]">
                      <span>{finding.valueBasis}</span><span>·</span><span>{finding.confidence} confidence</span><span>·</span><span>P{finding.priority}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rev-card mt-5 rounded-[20px] p-5 text-sm leading-6 text-[color:var(--text-muted)]">
            No active Tier 2 finding is supported by the current evidence. Refresh after importing Sprint 9 fields such as explicit billing status or target gross margin.
          </div>
        )}
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <p className="rev-kicker">Reconciliation ledger</p>
        <h2 className="rev-display-section mt-2">Every gap remains reconstructable from source rows.</h2>
        <div className="mt-5 grid gap-4">{read.reconciliations.map((row, index) => <ReconciliationCard key={`${row.jobExternalId}:${index}`} row={row} />)}</div>
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <p className="rev-kicker">Explicit-link review</p>
        <h2 className="rev-display-section mt-2">No silent linking.</h2>
        {reviewLinks.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {reviewLinks.map((match) => (
              <article className="rev-card rounded-[18px] p-4" key={`${match.sourceRecordKey}:${match.relationField}`}>
                <strong>{match.sourceEntityType} {match.sourceExternalId} → {match.targetEntityType} {match.targetExternalId}</strong>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">{match.state}: {match.reason}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[color:var(--text-muted)]">Every explicit link resolves to exactly one record.</p>}
      </section>
    </div>
  );
}
