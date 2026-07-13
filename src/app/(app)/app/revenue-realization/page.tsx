import Link from "next/link";
import { redirect } from "next/navigation";

import type { JobBillingReconciliation } from "@/domain/revory/revenue-realization";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getRevenueRealizationRead } from "@/services/revenue-realization/get-revenue-realization-read";

function money(valueCents: number | null, currency: string | null) {
  if (valueCents === null || !currency) return "Suppressed";
  return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(valueCents / 100);
}

function ReconciliationCard({ row }: { row: JobBillingReconciliation }) {
  return (
    <article className="rev-card-premium min-w-0 rounded-[24px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="rev-label">Job {row.jobExternalId}</p>
          <h3 className="mt-2 text-lg font-bold">
            {row.state === "ELIGIBLE" ? "Reconstructable billing comparison" : "Financial output suppressed"}
          </h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
            row.state === "ELIGIBLE"
              ? "border-[color:var(--border-accent)] text-[color:var(--accent-light)]"
              : "border-[color:var(--border)] text-[color:var(--text-muted)]"
          }`}
        >
          {row.valueBasis.replaceAll("_", " ")}
        </span>
      </div>

      {row.state === "ELIGIBLE" ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Expected billing basis" value={money(row.expectedBillingCents, row.currency)} />
            <Metric label="Observed eligible invoices" value={money(row.invoicedCents, row.currency)} />
            <Metric label="Calculated difference" value={money(row.calculatedGapCents, row.currency)} />
            <Metric label="Observed job costs" value={money(row.observedCostCents, row.currency)} />
          </div>
          <p className="mt-4 text-xs leading-5 text-[color:var(--text-muted)]">
            <strong className="text-[color:var(--foreground)]">Formula:</strong> {row.formula}.
            This is a deterministic reconciliation output, not a released finding or guaranteed loss.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--border)]">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[color:var(--text-subtle)]">
                <tr>
                  <th className="px-3 py-2">Source record</th>
                  <th className="px-3 py-2">Observed field</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Lineage</th>
                </tr>
              </thead>
              <tbody>
                {row.inputEvidence.map((input) => (
                  <tr className="border-t border-[color:var(--border)]" key={`${input.externalId}:${input.field}`}>
                    <td className="px-3 py-2.5 font-bold">{input.externalId}</td>
                    <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{input.field}</td>
                    <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{money(input.valueCents, row.currency)}</td>
                    <td className="px-3 py-2.5 text-[color:var(--text-muted)]">
                      {input.provenance.fileName} · row {input.provenance.rowNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[color:var(--text-muted)]">
          {row.issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rev-card rounded-[18px] p-4">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

export default async function RevenueRealizationPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/revenue-realization"));
  const read = await getRevenueRealizationRead(context.workspace.id);

  if (!read || read.summary.recordCounts.JOB === 0) {
    return (
      <div className="space-y-5">
        <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
          <p className="rev-kicker">Revenue Realization · local gated preview</p>
          <h1 className="rev-display-hero mt-3 max-w-[42rem]">Add explicit job and billing evidence before comparing records.</h1>
          <p className="mt-4 max-w-[44rem] text-sm leading-7 text-[color:var(--text-muted)]">
            Sprint 8 never guesses a link from names or amounts. Import jobs, invoices,
            change orders and costs with external IDs to review eligibility.
          </p>
          <Link className="rev-button-primary mt-6" href="/app/imports">Import Revenue Realization data</Link>
        </section>
      </div>
    );
  }

  const reviewLinks = read.matches.filter((match) => match.state !== "MATCHED");
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <p className="rev-kicker">Revenue Realization · Sprints 7–8 local gate</p>
        <h1 className="rev-display-hero mt-3 max-w-[44rem]">Reconcile only what explicit source evidence can support.</h1>
        <p className="mt-4 max-w-[48rem] text-sm leading-7 text-[color:var(--text-muted)]">
          Matching uses external IDs only. Ambiguity, missing currency, incomplete status or
          an unknown contract basis suppresses the calculated output. Sprint 9 findings and pricing remain gated.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Eligible jobs" value={String(read.summary.eligibleJobs)} />
          <Metric label="Suppressed jobs" value={String(read.summary.suppressedJobs)} />
          <Metric label="Matched links" value={String(read.summary.matchedLinks)} />
          <Metric label="Links needing review" value={String(read.summary.unmatchedLinks + read.summary.conflictLinks)} />
        </div>
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rev-kicker">Tier 2 eligibility</p>
            <h2 className="rev-display-section mt-2">Rules stay off until their bases are complete.</h2>
          </div>
          <Link className="rev-button-secondary" href="/app/imports">Review imports</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Object.entries(read.eligibility).map(([rule, state]) => (
            <article className="rev-card rounded-[20px] p-4" key={rule}>
              <p className="text-sm font-bold">{rule.replaceAll("_", " ")}</p>
              <p className={`mt-2 text-xs font-bold ${state.eligible ? "text-[color:var(--accent-light)]" : "text-[color:var(--text-muted)]"}`}>
                {state.eligible ? "Eligible for deterministic review" : "Suppressed by Data Quality"}
              </p>
              {state.missingFields.length ? <p className="mt-2 text-xs leading-5 text-[color:var(--text-subtle)]">Needs: {state.missingFields.join(", ")}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="rev-kicker">Reconciliation ledger</p>
          <h2 className="rev-display-section mt-2">Every calculation remains reconstructable.</h2>
        </div>
        {read.reconciliations.map((row) => <ReconciliationCard key={row.jobExternalId} row={row} />)}
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <p className="rev-kicker">Unmatched and conflict review</p>
        <h2 className="mt-2 text-xl font-bold">No silent linking</h2>
        {reviewLinks.length ? (
          <div className="mt-4 space-y-2">
            {reviewLinks.map((match) => (
              <article className="rounded-2xl border border-[color:var(--border)] p-4 text-sm" key={`${match.sourceRecordKey}:${match.relationField}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>{match.sourceEntityType} {match.sourceExternalId} → {match.targetEntityType} {match.targetExternalId}</strong>
                  <span className="rev-label">{match.state}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">{match.reason}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[color:var(--text-muted)]">Every explicit link resolves to exactly one record.</p>}
      </section>
    </div>
  );
}
