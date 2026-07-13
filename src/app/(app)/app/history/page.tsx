import Link from "next/link";
import { redirect } from "next/navigation";

import type { GuardedSegment } from "@/domain/revory/growth-intelligence";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getGrowthAccess, getCanonicalVolumePolicy } from "@/services/billing/growth-access";
import { getGrowthIntelligenceHistory } from "@/services/growth-intelligence/snapshots";
import { getQuoteRecoveryMovement } from "@/services/quote-recovery/movement";
import { recordWeeklyDecisionFeedback } from "./actions";

function money(cents: number | null, currency = "USD") {
  if (cents === null) return "Suppressed";
  return new Intl.NumberFormat("en-US", { currency, maximumFractionDigits: 0, style: "currency" }).format(cents / 100);
}

export default async function HistoryPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/history"));
  const growthAccess = await getGrowthAccess(context.workspace.id);
  if (!growthAccess.enabled) {
    return (
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <p className="rev-kicker">Growth intelligence</p>
        <h1 className="rev-display-hero mt-3">Recurring history remains gated.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
          Twelve-month movement, guarded segmentation and the weekly management decision require a Growth or Pro entitlement. No financial snapshot is queried or disclosed on the Audit or Starter paths.
        </p>
        <Link className="rev-button-secondary mt-5 inline-flex" href="/app/dashboard">Return to dashboard</Link>
      </section>
    );
  }
  const [volumePolicy, movement, history] = await Promise.all([
    getCanonicalVolumePolicy(context.workspace.id),
    getQuoteRecoveryMovement(context.workspace.id),
    getGrowthIntelligenceHistory(context.workspace.id),
  ]);
  const eligible = history.current.segmentation.segments.filter((segment) => segment.eligibleForRanking);
  const suppressed = history.current.segmentation.segments.filter((segment) => !segment.eligibleForRanking);
  const maxQuote = Math.max(1, ...history.snapshots.map((snapshot) => snapshot.quoteEstimatedValueCents));
  const maxGap = Math.max(1, ...history.snapshots.map((snapshot) => snapshot.calculatedBillingGapCents ?? 0));

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="rev-kicker">Growth intelligence {growthAccess.preview ? "· internal preview" : ""}</p>
            <h1 className="rev-display-hero mt-3">Turn recurring reads into one guarded weekly decision.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">Twelve-month movement, source/owner/service concentration and financial bases remain separated. Thin cohorts are shown as suppressed, never ranked.</p>
          </div>
          {growthAccess.enabled ? <a className="rev-button-secondary" href="/app/history/report.pdf">Download executive PDF</a> : null}
        </div>
        {growthAccess.enabled ? (
          <div className={`mt-6 rounded-[22px] border p-5 ${history.current.decision.available ? "border-[color:var(--border-accent)] bg-[rgba(67,179,155,.08)]" : "border-[color:var(--border)] bg-[rgba(20,21,22,.55)]"}`}>
            <p className="rev-label">This week&apos;s management decision</p>
            <h2 className="mt-2 text-xl font-bold">{history.current.decision.headline}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-muted)]">{history.current.decision.rationale}</p>
            {history.current.decision.available ? <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs text-[color:var(--text-subtle)]">Was this decision useful for this week?</span>{["yes", "no"].map((value) => <form action={recordWeeklyDecisionFeedback} key={value}><input name="stateFingerprint" type="hidden" value={history.current.stateFingerprint}/><input name="useful" type="hidden" value={value}/><button className="rev-button-secondary min-h-8 px-3 py-1 text-xs" type="submit">{value === "yes" ? "Yes" : "No"}</button></form>)}</div> : null}
          </div>
        ) : <div className="mt-6 rounded-[22px] border border-dashed border-[color:var(--border)] p-5 text-sm text-[color:var(--text-muted)]">Growth intelligence remains gated. This is not a public checkout prompt; commercial release still requires the documented gate evidence.</div>}
      </section>

      <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="New" value={movement.newCount} />
        <Metric label="Persistent" value={movement.persistentCount} />
        <Metric label="Worsening" value={movement.worseningCount} />
        <Metric label="Resolved" value={movement.resolvedCount} />
        <Metric label="Recovered" value={movement.recoveredCount} />
        <Metric label="Confirmed value" value={money(movement.recoveredValueCents)} />
      </section>

      <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="rev-kicker">12-month movement</p><h2 className="mt-2 text-2xl font-bold">Comparable snapshots, separated by value basis.</h2></div>
          <p className="text-xs text-[color:var(--text-subtle)]">{history.snapshots.length} distinct committed state{history.snapshots.length === 1 ? "" : "s"}</p>
        </div>
        {history.snapshots.length ? (
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="flex min-w-[720px] items-end gap-3" aria-label="Twelve month intelligence movement">
              {history.snapshots.slice(-24).map((snapshot) => (
                <div className="min-w-[92px] flex-1" key={snapshot.id}>
                  <div className="flex h-36 items-end justify-center gap-1 rounded-2xl border border-[color:var(--border)] bg-[rgba(20,21,22,.55)] px-3 py-3">
                    <div aria-label={`Estimated quote opportunity ${money(snapshot.quoteEstimatedValueCents)}`} className="w-4 rounded-t bg-[rgba(67,179,155,.38)]" role="img" style={{ height: `${Math.max(4, snapshot.quoteEstimatedValueCents / maxQuote * 100)}%` }} />
                    <div aria-label={`Calculated billing gap ${money(snapshot.calculatedBillingGapCents)}`} className="w-4 rounded-t bg-[color:var(--accent)]" role="img" style={{ height: `${Math.max(snapshot.calculatedBillingGapCents ? 4 : 0, (snapshot.calculatedBillingGapCents ?? 0) / maxGap * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-center text-[10px] text-[color:var(--text-subtle)]">{snapshot.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[color:var(--text-muted)]"><span><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[rgba(67,179,155,.38)]" />Estimated quote opportunity</span><span><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--accent)]" />Calculated additive billing gap</span></div>
          </div>
        ) : <div className="mt-5 rounded-[22px] border border-dashed border-[color:var(--border)] p-6 text-sm text-[color:var(--text-muted)]">A committed import creates the first intelligence snapshot. Re-importing unchanged evidence does not duplicate history.</div>}
      </section>

      <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="rev-kicker">Guarded segmentation</p><h2 className="mt-2 text-2xl font-bold">Source, owner and service concentration.</h2></div>
          <p className="max-w-sm text-xs leading-5 text-[color:var(--text-subtle)]">Ranking requires {history.current.segmentation.minimumRecords}+ comparable records and findings on {history.current.segmentation.minimumFindingRecords}+ distinct records in one currency.</p>
        </div>
        {growthAccess.enabled && eligible.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{eligible.slice(0, 8).map((segment) => <SegmentCard key={`${segment.layer}-${segment.dimension}-${segment.label}`} segment={segment} />)}</div> : growthAccess.enabled ? <p className="mt-5 rounded-[22px] border border-dashed border-[color:var(--border)] p-5 text-sm text-[color:var(--text-muted)]">No cohort clears the minimum sample guard. REVORY will not manufacture a leaderboard.</p> : null}
        {growthAccess.enabled && suppressed.length ? <details className="mt-5 rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.45)] p-4"><summary className="cursor-pointer text-sm font-bold">{suppressed.length} suppressed cohort{suppressed.length === 1 ? "" : "s"}</summary><div className="mt-4 grid gap-2 sm:grid-cols-2">{suppressed.slice(0, 12).map((segment) => <div className="rounded-xl border border-[color:var(--border)] p-3 text-xs" key={`suppressed-${segment.layer}-${segment.dimension}-${segment.label}`}><b>{segment.label}</b><p className="mt-1 text-[color:var(--text-subtle)]">{segment.recordCount} records · {segment.findingRecordCount} with findings · {segment.suppressionReason?.replaceAll("_", " ").toLowerCase()}</p></div>)}</div></details> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Current volume policy" value={volumePolicy.label.replace("_", " ")} />
        <Metric label="Rows per file" value={volumePolicy.maxRowsPerFile.toLocaleString("en-US")} />
        <Metric label="File size" value={`${Math.round(volumePolicy.maxFileBytes / 1024 / 1024)} MB`} />
      </section>

      <p className="text-xs leading-5 text-[color:var(--text-subtle)]">Growth is implemented as a gated local capability. A technical preview, target price or report does not make the offer sellable; independent logic review, customer evidence, billing, email and production operations remain separate gates.</p>
      {!history.snapshots.length ? <Link className="rev-button-primary" href="/app/imports">Import current evidence</Link> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rev-card-premium rounded-[20px] p-4"><p className="rev-label">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>;
}

function SegmentCard({ segment }: { segment: GuardedSegment }) {
  const basis = segment.layer === "REVENUE_REALIZATION" ? "Calculated billing gap" : "Estimated quote opportunity";
  return <article className="rev-card-premium rev-card-hover rounded-[22px] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="rev-label">{segment.dimension.replace("_", " ")} · {segment.layer.replace("_", " ")}</p><h3 className="mt-2 text-lg font-bold">{segment.label}</h3></div><strong>{money(segment.financialValueCents, segment.currency ?? "USD")}</strong></div><p className="mt-3 text-sm text-[color:var(--text-muted)]">{segment.findingRecordCount} of {segment.recordCount} comparable records ({Math.round(segment.findingRateBps / 100)}%) have active findings.</p><p className="mt-2 text-xs text-[color:var(--text-subtle)]">{basis}. Review concentration only; not a rep or source performance verdict.</p></article>;
}
