import Link from "next/link";
import type { AiScanResult, AiScanFinding } from "@/domain/ai-integrity/reconciliation";
import { aiAmount, aiFindingTitle, aiMoney, aiReason } from "./report-copy";

export function AiFindingEvidence({ finding }: { finding: AiScanFinding }) {
  const ids = [finding.evidence.bucketId, ...(finding.evidence.bucketIds as string[] | undefined ?? []), ...(finding.evidence.ledgerRecordIds as string[] | undefined ?? [])].filter(Boolean);
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2"><div className="rev-shell-panel rounded-2xl p-5"><p className="rev-kicker">The calculation</p><p className="mt-3 break-words text-sm leading-7">{finding.findingType === "UNATTRIBUTED_PROVIDER_SPEND" ? `${finding.evidence.reportedComparableCost} reported − ${finding.evidence.attributedCost} attributed = ${finding.valueAmount} ${finding.valueCurrency} without a customer link` : `${aiAmount(String(finding.evidence.providerQuantity))} provider − ${aiAmount(String(finding.evidence.ledgerQuantity))} internal = ${aiAmount(String(finding.evidence.delta))} ${finding.evidence.unit}`}</p></div><div className="rev-shell-panel rounded-2xl p-5"><p className="rev-kicker">Next review</p><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{finding.recommendedReview}</p></div></div>
    <div><h3 className="text-sm font-semibold">What supports this result</h3><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{String(finding.evidence.eligibility)}</p><div className="mt-4 flex flex-wrap gap-2">{ids.map((id) => <span key={String(id)} className="break-all rounded-lg border border-[color:var(--border)] px-3 py-2 font-mono text-xs text-[color:var(--text-muted)]">{String(id)}</span>)}</div></div>
    <div><h3 className="text-sm font-semibold">Limits to keep in view</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[color:var(--text-muted)]">{finding.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul></div>
    <details className="rounded-2xl border border-[color:var(--border)] p-4"><summary className="cursor-pointer text-xs text-[color:var(--accent)]">Inspect original calculation fields</summary><p className="mt-4 break-all font-mono text-xs">{finding.formula}</p><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-[color:var(--text-muted)]">{JSON.stringify(finding.evidence, null, 2)}</pre></details>
  </div>;
}

export function AiIntegrityReport({ result, snapshotId, demo = false }: { result: AiScanResult; snapshotId?: string; demo?: boolean }) {
  const reasons = [...new Map(result.suppressions.map((s) => [s.code, s])).values()];
  return <div className="space-y-6">
    <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="rev-kicker">{demo ? "Synthetic example · Read-only demo" : "Integrity Scan · Synthetic test report"}</p><span className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-[color:var(--text-muted)]">{result.windowStart.slice(0, 10)} → {result.windowEnd.slice(0, 10)}</span></div>
      <h1 className="rev-display-hero mt-5">A clearer picture of your AI spend.</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">{result.findings.length} items deserve a review. Follow each result to its inputs, calculation and limits. A difference is a starting point for investigation.</p>
      {snapshotId ? <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-[color:var(--accent)]"><a href={`/api/ai-integrity/scans/${snapshotId}/export`}>Download evidence JSON ↗</a><a href={`/api/ai-integrity/scans/${snapshotId}/export?format=csv`}>Download findings CSV ↗</a></div> : null}
    </section>
    {result.coverage.groups.map((group) => <section key={`${group.provider}-${group.currency}`} className="space-y-3">
      <p className="px-1 text-xs uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">{group.provider} · {group.currency} · selected comparable provider cost</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Reported spend", aiMoney(group.reportedComparableCost, group.currency), "Observed · eligible provider buckets"],
        ["Attributed spend", aiMoney(group.attributedCost, group.currency), "Strong · confirmed exclusive projects"],
        ["Without a customer link", aiMoney(group.unattributedCost, group.currency), "Observed coverage gap · review identity"],
        ["Attribution coverage", group.coverageBps === null ? "Unavailable" : `${(group.coverageBps / 100).toFixed(2)}%`, "Attributed / comparable reported spend"],
      ].map(([label, value, caption]) => <div key={label} className="rev-shell-panel min-w-0 rounded-[24px] p-5"><p className="text-xs text-[color:var(--text-muted)]">{label}</p><p className="mt-3 break-words text-xl font-semibold tracking-[-0.03em]">{value}</p><p className="mt-3 text-[11px] leading-5 text-[color:var(--text-subtle)]">{caption}</p></div>)}</div>
    </section>)}
    {!result.coverage.groups.length ? <div className="rev-shell-panel rounded-2xl p-6 text-sm leading-7 text-[color:var(--text-muted)]">No eligible observed provider cost. Usage can still be compared when its evidence is complete; review exclusions below.</div> : null}
    <section className="rev-shell-panel rounded-[26px] p-5 md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your review queue</h2><p className="text-xs text-[color:var(--text-muted)]">{result.comparisons.length} eligible usage comparisons</p></div>
      <div className="mt-6 space-y-3">{result.findings.map((finding) => <article key={finding.fingerprint} className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
        <div className="flex flex-wrap justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">{finding.valueBasis === "OBSERVED" ? "Observed · coverage" : "Calculated · usage"}</p><h3 className="mt-2 text-base font-semibold">{aiFindingTitle(finding.findingType)}</h3></div><p className="text-lg font-semibold text-[color:var(--accent)]">{finding.valueAmount !== null ? aiMoney(finding.valueAmount, finding.valueCurrency!) : `${aiAmount(String(finding.evidence.delta))} ${finding.evidence.unit}`}</p></div>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-[color:var(--text-muted)]">{finding.findingType === "UNATTRIBUTED_PROVIDER_SPEND" ? "This spend has no reliable customer link. Confirm project ownership or retain it as shared spend." : "Provider usage and the internal ledger differ in the same unit and period. Review metering, retries and source completeness."}</p>
        {snapshotId ? <Link className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]" href={`/app/ai-integrity/reports/${snapshotId}/findings/${finding.fingerprint}`}>Review evidence →</Link> : <details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-[color:var(--accent)]">Explore the evidence</summary><div className="mt-5"><AiFindingEvidence finding={finding} /></div></details>}
      </article>)}{!result.findings.length ? <p className="text-sm leading-7 text-[color:var(--text-muted)]">No eligible findings in this evidence. Check coverage and exclusions before drawing a conclusion.</p> : null}</div>
    </section>
    <section className="rev-shell-panel rounded-[26px] p-5 md:p-7"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Coverage & data quality</h2><span className="text-xs text-[color:var(--text-muted)]">{result.suppressions.length} scope notes</span></div><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">Amounts cover the eligible buckets in the selected report. Excluded rows, adjustments and missing sources can limit the read.</p>
      <div className="mt-5 space-y-3">{reasons.map((reason) => <div key={reason.code} className="flex gap-3 border-t border-[color:var(--border)] pt-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" /><p className="text-xs leading-6 text-[color:var(--text-muted)]">{aiReason(reason.code)}</p></div>)}</div>
      <details className="mt-5"><summary className="cursor-pointer text-xs text-[color:var(--accent)]">View source freshness and scope details</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs leading-6">{JSON.stringify({ reviews: result.dataQuality.sourceReviews, sourceAgeHours: result.dataQuality.sourceAgeHours, consolidationLagHours: result.dataQuality.lagHours, exclusions: result.suppressions }, null, 2)}</pre></details>
    </section>
    <p className="px-1 text-xs leading-6 text-[color:var(--text-subtle)]">Covers observed provider spend and comparable usage differences. Revenue is imported as context. Each currency stands on its own; usage differences stay in their original units. {demo ? "Every record and amount in this demo is synthetic." : "Reports follow workspace retention. JSON contains replayable inputs; CSV summarizes findings."}</p>
  </div>;
}
