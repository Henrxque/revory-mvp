import type { Metadata } from "next";
import Link from "next/link";

import { AppSidebar } from "@/components/app/AppSidebar";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { quoteRecoverySample, sampleMoney } from "@/services/demo/quote-recovery-sample";

export const metadata: Metadata = {
  title: "REVORY Sample Quote Recovery Workspace",
  description:
    "A read-only contractor Quote Recovery workspace built from synthetic sample data.",
  robots: { follow: false, index: false },
};

export default function DemoPage() {
  const sample = quoteRecoverySample;

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 font-[family:var(--font-app)] lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="relative z-40 shrink-0 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <AppSidebar
            activationStatus="Read only"
            bookingInputsStatus="Sample data"
            currentStepTitle="Synthetic Quote Recovery"
            demoMode
            userEmail="No customer account connected"
            workspaceName="Cedar Ridge Contractors"
            workspaceStatus="SAMPLE"
          />
        </div>

        <div className="min-w-0 space-y-5 overflow-x-clip">
          <header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[26px] px-5 py-3.5 backdrop-blur-xl">
            <div className="min-w-0">
              <p className="truncate text-[18px] font-semibold tracking-[-0.035em] text-[color:var(--foreground)]">
                Cedar Ridge Contractors sample workspace
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[color:var(--text-muted)]">
                Fictional contractor records · nothing on this page is saved
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RevoryStatusBadge tone="accent">Read-only sample</RevoryStatusBadge>
              <Link className="rev-button-secondary !min-h-9 !px-4 !py-2" href="/#pricing">
                See pricing
              </Link>
              <Link className="rev-button-secondary !min-h-9 !px-4 !py-2" href="/">
                Back to REVORY
              </Link>
            </div>
          </header>

          <section
            className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8"
            id="demo-dashboard"
          >
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="max-w-3xl">
                <p className="rev-kicker">Executive Quote Recovery read</p>
                <h1 className="rev-display-hero mt-3">
                  See what may still be recoverable - and why.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
                  This sample mirrors the private workspace structure. Estimated opportunities,
                  process gaps and import limitations remain visibly separate.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                <a className="rev-button-secondary whitespace-nowrap" href="/demo/quote-recovery.csv">
                  Export sample CSV
                </a>
                <a className="rev-button-primary whitespace-nowrap" href="#demo-opportunities">
                  Review opportunities
                </a>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                href="#demo-opportunities"
                label="Estimated recoverable"
                note="Modeled opportunity, not guaranteed revenue"
                value={sampleMoney(sample.metrics.estimatedRecoverableCents)}
              />
              <Metric
                href="#demo-opportunities"
                label="Opportunities to review"
                note="Open fictional records"
                value={String(sample.metrics.activeFindings)}
              />
              <Metric
                href="#demo-opportunities"
                label="Estimates with value"
                note="Imported estimate amount is available"
                value="8"
              />
              <Metric
                href="#demo-data"
                label="Process gaps"
                note="Never counted as financial loss"
                value={String(sample.metrics.operationalFindings)}
              />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rev-shell-panel rounded-[26px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="rev-label">Priority review</p>
                  <h2 className="mt-2 text-xl font-bold">Top opportunities</h2>
                </div>
                <RevoryStatusBadge tone="accent">
                  {sample.opportunities.length} prioritized
                </RevoryStatusBadge>
              </div>
              <div className="mt-4 space-y-3">
                {sample.opportunities.map((opportunity, index) => (
                  <a
                    className="rev-card-hover block rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,.02)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    href={`#sample-${opportunity.estimateExternalId}`}
                    key={opportunity.estimateExternalId}
                  >
                    <OpportunitySummary index={index} opportunity={opportunity} />
                  </a>
                ))}
              </div>
            </div>

            <aside className="rev-shell-panel flex h-full flex-col rounded-[26px] p-5" id="demo-data">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="rev-label">Import review</p>
                  <h2 className="mt-2 text-lg font-bold">Data readiness</h2>
                </div>
                <RevoryStatusBadge tone="future">Sample review</RevoryStatusBadge>
              </div>
              <p className="mt-7 text-4xl font-bold tracking-[-0.04em]">
                {sample.dataQuality.unmatchedRecords}
              </p>
              <p className="mt-1 text-sm font-semibold">connections need review</p>
              <p className="mt-3 text-xs leading-5 text-[color:var(--text-muted)]">
                Unmatched records stay visible and cannot create unsupported financial output.
              </p>
              <div className="mt-6 grid grid-cols-3 divide-x divide-[color:var(--border)] overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[rgba(20,21,22,.58)]">
                <QualitySummary label="Records imported" value={sample.dataQuality.acceptedRows} />
                <QualitySummary label="Connections confirmed" value={sample.dataQuality.linkedRecords} />
                <QualitySummary label="Checks available" value={6} />
              </div>
              <a
                className="rev-card-hover mt-5 flex items-center justify-between rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,.025)] px-4 py-3 text-sm font-semibold xl:mt-auto"
                href="#demo-data-detail"
              >
                <span>Review sample connections</span>
                <span aria-hidden="true" className="text-[color:var(--accent-light)]">→</span>
              </a>
            </aside>
          </section>

          <section className="space-y-4" id="demo-opportunities">
            <div>
              <p className="rev-kicker">Quote Recovery opportunities</p>
              <h2 className="mt-2 text-2xl font-bold">What deserves review first</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
                Open a sample record to inspect the exact imported evidence behind the finding.
              </p>
            </div>
            {sample.opportunities.map((opportunity, index) => (
              <details
                className="rev-card-hover group scroll-mt-6 rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,.02)] p-5"
                id={`sample-${opportunity.estimateExternalId}`}
                key={opportunity.estimateExternalId}
              >
                <summary className="cursor-pointer list-none">
                  <OpportunitySummary index={index} opportunity={opportunity} />
                  <p className="mt-3 text-xs font-semibold text-[color:var(--accent-light)] group-open:hidden">
                    Review imported evidence →
                  </p>
                </summary>
                <div className="mt-5 border-t border-[color:var(--border)] pt-5">
                  <p className="rev-label">Evidence used for this finding</p>
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-[color:var(--border)]">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="text-[color:var(--text-subtle)]">
                        <tr>
                          <th className="px-3 py-2">Imported field</th>
                          <th className="px-3 py-2">Imported value</th>
                          <th className="px-3 py-2">File and row</th>
                        </tr>
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
                  <p className="mt-4 text-sm">
                    <strong>Review next:</strong>{" "}
                    <span className="text-[color:var(--text-muted)]">
                      {opportunity.recommendedAction}
                    </span>
                  </p>
                </div>
              </details>
            ))}
          </section>

          <section
            className="rev-shell-panel grid gap-4 rounded-[26px] p-5 md:grid-cols-4"
            id="demo-data-detail"
          >
            <QualityDetail label="Rows accepted" value={String(sample.dataQuality.acceptedRows)} />
            <QualityDetail label="Connections confirmed" value={String(sample.dataQuality.linkedRecords)} />
            <QualityDetail label="Need an exact ID match" value={String(sample.dataQuality.unmatchedRecords)} />
            <QualityDetail label="Checks REVORY can run" value="6 of 6" />
          </section>

          <section className="grid gap-4 md:grid-cols-2" id="demo-history">
            <div className="rev-shell-panel rounded-[24px] p-5">
              <p className="rev-label">Growth intelligence</p>
              <h2 className="mt-2 text-lg font-bold">No synthetic history is invented</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Monthly movement appears only after real recurring imports exist in a private workspace.
              </p>
            </div>
            <div className="rev-shell-panel rounded-[24px] p-5" id="demo-settings">
              <p className="rev-label">Sample workspace limits</p>
              <h2 className="mt-2 text-lg font-bold">No settings or customer data</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                The public demo cannot upload, edit, dismiss, resolve, buy or persist anything.
              </p>
            </div>
          </section>

          <footer className="rounded-[22px] border border-[color:var(--border)] px-5 py-4 text-xs leading-5 text-[color:var(--text-muted)]">
            All names, amounts and files are fictional. The sample illustrates product structure only and never represents confirmed recovered revenue.
          </footer>
        </div>
      </div>
    </main>
  );
}

type SampleOpportunity = (typeof quoteRecoverySample.opportunities)[number];

function OpportunitySummary({
  index,
  opportunity,
}: {
  index: number;
  opportunity: SampleOpportunity;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-[color:var(--accent-light)]">
          0{index + 1} · {opportunity.type}
        </p>
        <p className="mt-2 font-bold">Estimate {opportunity.estimateExternalId}</p>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">{opportunity.reason}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold">{sampleMoney(opportunity.valueCents)}</p>
        <p className="text-xs text-[color:var(--text-muted)]">
          {opportunity.valueBasis.toLowerCase()} · {opportunity.confidence.toLowerCase()} confidence
        </p>
      </div>
    </div>
  );
}

function Metric({
  href,
  label,
  note,
  value,
}: {
  href: string;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <a
      className="rev-card-hover rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.76)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
      href={href}
    >
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{note}</p>
    </a>
  );
}

function QualitySummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-2.5 py-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase leading-4 tracking-[0.08em] text-[color:var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function QualityDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(20,21,22,.58)] p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{label}</p>
    </div>
  );
}
