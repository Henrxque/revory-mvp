import Link from "next/link";
import { redirect } from "next/navigation";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { formatWorkspaceMoney } from "@/domain/revory/currency";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

function title(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/dashboard"));
  const read = await getQuoteRecoveryRead(context.workspace.id);
  const top = read.findings.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,470px)]">
          <div className="max-w-2xl">
            <p className="rev-kicker">Executive Quote Recovery read</p>
            <h1 className="rev-display-hero mt-3">See what may still be recoverable - and why.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Estimated opportunities remain separate from operational and data-quality risks.
              Every finding is traceable to imported evidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end" data-testid="executive-actions">
            <a className="rev-button-secondary whitespace-nowrap" href="/app/quote-recovery/export">
              Export CSV
            </a>
            <a className="rev-button-secondary whitespace-nowrap" href="/app/dashboard/report.pdf">
              Export PDF
            </a>
            <Link className="rev-button-primary whitespace-nowrap" href="/app/revenue-leaks">
              Review opportunities
            </Link>
          </div>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <Metric
            label="Estimated recoverable"
            note={read.summary.hasMixedCurrencies ? "Shown separately because more than one currency is present" : "Modeled opportunity, not guaranteed revenue"}
            value={read.summary.estimatedValueCents === null ? "Multiple currencies" : formatWorkspaceMoney(read.summary.estimatedValueCents, read.summary.reportingCurrency)}
            href="/app/revenue-leaks?filter=FINANCIAL"
          />
          <Metric href="/app/revenue-leaks?filter=ACTIVE" label="Opportunities to review" note="Open and acknowledged records" value={String(read.summary.activeCount)} />
          <Metric href="/app/revenue-leaks?filter=FINANCIAL" label="Opportunities with value" note="Estimate amount is available" value={String(read.summary.financialCount)} />
          <Metric href="/app/revenue-leaks?filter=OPERATIONAL" label="Process gaps" note="Never counted as financial loss" value={String(read.summary.operationalCount)} />
        </div>
      </section>

      {!read.dataQuality.hasImport ? (
        <Empty />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rev-shell-panel rounded-[26px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="rev-label">Priority review</p>
                <h2 className="mt-2 text-xl font-bold">Top opportunities</h2>
              </div>
              <RevoryStatusBadge tone="accent">{top.length} prioritized</RevoryStatusBadge>
            </div>
            <div className="mt-4 space-y-3">
              {top.map((finding, index) => (
                <Link
                  className="rev-card-hover block rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,.02)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                  data-testid="priority-opportunity"
                  href={`/app/revenue-leaks/${finding.id}`}
                  key={finding.id}
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[color:var(--accent-light)]">
                        0{index + 1} · {title(finding.findingType)}
                      </p>
                      <p className="mt-2 font-bold">Estimate {finding.estimateExternalId}</p>
                      <p className="mt-1 text-sm text-[color:var(--text-muted)]">{finding.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {finding.valueCents === null ? "Process gap" : formatWorkspaceMoney(finding.valueCents, finding.currency)}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {finding.valueBasis.toLowerCase()} · {finding.confidence.toLowerCase()} confidence
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <DataQuality read={read.dataQuality} />
        </section>
      )}
    </div>
  );
}

function Metric({ href, label, note, value }: { href: string; label: string; note: string; value: string }) {
  return (
    <Link className="rev-card-hover group rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.76)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]" data-testid="executive-metric" href={href}>
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{note}</p>
    </Link>
  );
}

function Empty() {
  return (
    <section className="rounded-[26px] border border-dashed border-[color:var(--border-accent)] p-8 text-center">
      <h2 className="text-xl font-bold">Import estimate evidence to create the first read.</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">
        REVORY will not display synthetic metrics or financial claims before it validates an approved import.
      </p>
      <Link className="rev-button-primary mt-5" href="/app/imports">
        Open secure imports
      </Link>
    </section>
  );
}

function DataQuality({ read }: { read: Awaited<ReturnType<typeof getQuoteRecoveryRead>>["dataQuality"] }) {
  const eligible = Object.values(read.eligibility).filter((rule) => rule.eligible).length;
  const blockingCount = read.linkCoverage.conflicting + read.issues.length;
  const attentionCount = blockingCount + read.linkCoverage.unmatched;
  const needsAttention = attentionCount > 0;
  const hasBlockingProblems = blockingCount > 0;
  const reviewHref = hasBlockingProblems
    ? "/app/data-quality#issues"
    : read.linkCoverage.unmatched > 0
      ? "/app/data-quality#links"
      : "/app/data-quality#eligibility";
  const attentionLabel = hasBlockingProblems ? "items need review" : "connections need review";
  const reviewActionLabel = hasBlockingProblems
    ? "Review import issues"
    : read.linkCoverage.unmatched > 0
      ? "Review data connections"
      : "View import details";

  return (
    <aside className="rev-shell-panel flex h-full flex-col overflow-hidden rounded-[26px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="rev-label">Import review</p>
          <h2 className="mt-2 text-lg font-bold">Data readiness</h2>
        </div>
        <RevoryStatusBadge tone={needsAttention ? "future" : "real"}>
          {needsAttention ? "Needs attention" : "Ready"}
        </RevoryStatusBadge>
      </div>

      <div className="mt-7">
        <p className="text-4xl font-bold tracking-[-0.04em] text-[color:var(--foreground)]">
          {needsAttention ? attentionCount : "Ready"}
        </p>
        <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
          {needsAttention ? attentionLabel : "The latest import is ready"}
        </p>
        <p className="mt-3 text-xs leading-5 text-[color:var(--text-muted)]">
          {hasBlockingProblems
            ? "Some import or matching problems may affect the reliability of this read."
            : read.linkCoverage.unmatched > 0
              ? "Some connections between imported records could not be confirmed by ID."
              : "Imported records are connected well enough for REVORY to run the available checks."}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 divide-x divide-[color:var(--border)] overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[rgba(20,21,22,.58)]">
        <QualitySummary label="Records imported" value={read.recordCount} />
        <QualitySummary label="Connections confirmed" value={read.linkCoverage.linked} />
        <QualitySummary label="Checks available" value={eligible} />
      </div>

      <Link
        className="rev-card-hover mt-5 flex items-center justify-between rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,.025)] px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] xl:mt-auto"
        href={reviewHref}
      >
        <span>{reviewActionLabel}</span>
        <span aria-hidden="true" className="text-[color:var(--accent-light)]">
          →
        </span>
      </Link>
    </aside>
  );
}

function QualitySummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-2.5 py-3 text-center">
      <p className="text-lg font-bold text-[color:var(--foreground)]">{value}</p>
      <p className="mt-1 text-[9px] font-semibold leading-4 tracking-[0.08em] text-[color:var(--text-muted)] uppercase">
        {label}
      </p>
    </div>
  );
}
