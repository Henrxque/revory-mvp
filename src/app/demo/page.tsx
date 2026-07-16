import type { Metadata } from "next";
import Link from "next/link";

import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { quoteRecoverySample, sampleMoney } from "@/services/demo/quote-recovery-sample";

export const metadata: Metadata = {
  title: "REVORY Sample Quote Recovery Workspace",
  description: "A read-only contractor Quote Recovery workspace built from synthetic sample data.",
  robots: { follow: false, index: false },
};

export default function DemoPage() {
  const sample = quoteRecoverySample;
  return (
    <main className="min-h-screen overflow-x-hidden bg-[color:var(--background)] px-4 py-4 font-[family:var(--font-app)] md:px-6 md:py-6">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[26px] px-5 py-3">
          <Link aria-label="REVORY home" href="/">
            <RevoryLogo compact />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(67,179,155,.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent-light)]">
              Synthetic sample data
            </span>
            <Link className="rev-button-secondary !min-h-9 !px-4 !py-2" href="/">
              Back to REVORY
            </Link>
          </div>
        </header>

        <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8" id="sample-dashboard">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="rev-kicker">Read-only sample workspace</p>
              <h1 className="rev-display-hero mt-3">See the evidence behind a Quote Recovery read.</h1>
              <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                This public workspace is static. It accepts no files, writes no data and
                cannot access a real customer workspace.
              </p>
            </div>
            <a className="rev-button-primary" href="/demo/quote-recovery.csv">
              Export sample CSV
            </a>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Reviewed estimate value" value={sampleMoney(sample.metrics.reviewedEstimateValueCents)} />
            <Metric label="Estimated recoverable" note="Not guaranteed revenue" value={sampleMoney(sample.metrics.estimatedRecoverableCents)} />
            <Metric label="Active findings" value={String(sample.metrics.activeFindings)} />
            <Metric label="Operational findings" note="No financial amount" value={String(sample.metrics.operationalFindings)} />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rev-shell-panel rounded-[26px] p-5" id="sample-data-quality">
            <p className="rev-kicker">Data Quality</p>
            <h2 className="mt-3 text-xl font-bold">Evidence readiness</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <QualityRow label="Accepted rows" value={String(sample.dataQuality.acceptedRows)} />
              <QualityRow label="Confirmed connections" value={String(sample.dataQuality.linkedRecords)} />
              <QualityRow label="Unmatched records" value={String(sample.dataQuality.unmatchedRecords)} />
              <QualityRow label="Checks available" value={sample.dataQuality.eligibility} />
            </dl>
            <p className="mt-5 rounded-2xl border border-[color:var(--border)] p-4 text-xs leading-5 text-[color:var(--text-muted)]">
              Unmatched sample records stay visible and do not create unsupported financial output.
            </p>
          </aside>

          <div className="min-w-0 space-y-4" id="sample-opportunities">
            <div>
              <p className="rev-kicker">Priority opportunities</p>
              <h2 className="mt-2 text-2xl font-bold">What deserves review first</h2>
            </div>
            {sample.opportunities.map((opportunity, index) => (
              <article className="rev-card-premium min-w-0 rounded-[26px] p-5" key={opportunity.estimateExternalId}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[color:var(--accent-light)]">
                      {index + 1}. {opportunity.type}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{opportunity.customer}</h3>
                    <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
                      Estimate {opportunity.estimateExternalId} · {opportunity.confidence} confidence
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{sampleMoney(opportunity.valueCents)}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">{opportunity.valueBasis}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">{opportunity.reason}</p>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--border)]">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="text-[color:var(--text-subtle)]">
                      <tr><th className="px-3 py-2">Evidence field</th><th className="px-3 py-2">Sample value</th><th className="px-3 py-2">Source lineage</th></tr>
                    </thead>
                    <tbody>
                      {opportunity.evidence.map(([field, value, source]) => (
                        <tr className="border-t border-[color:var(--border)]" key={field}>
                          <td className="px-3 py-2.5 font-bold">{field}</td>
                          <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{value}</td>
                          <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm"><strong>Review next:</strong> <span className="text-[color:var(--text-muted)]">{opportunity.recommendedAction}</span></p>
              </article>
            ))}
          </div>
        </section>

        <footer className="rounded-[22px] border border-[color:var(--border)] px-5 py-4 text-xs leading-5 text-[color:var(--text-muted)]">
          Sample values are synthetic and illustrate product structure only. No sample action persists, triggers checkout or represents confirmed recovered revenue.
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, note, value }: { label: string; note?: string; value: string }) {
  return <div className="rev-card rounded-[20px] p-4"><p className="rev-label">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p>{note ? <p className="mt-1 text-xs text-[color:var(--text-muted)]">{note}</p> : null}</div>;
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[color:var(--text-subtle)]">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>;
}
