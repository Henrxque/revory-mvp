import Link from "next/link";
import { redirect } from "next/navigation";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

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
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="rev-kicker">Executive Quote Recovery read</p>
            <h1 className="rev-display-hero mt-3">See what may still be recoverable - and why.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Estimated opportunities remain separate from operational and data-quality risks.
              Every finding is traceable to imported evidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="rev-button-secondary" href="/app/quote-recovery/export">
              Export CSV
            </a>
            <a className="rev-button-secondary" href="/app/dashboard/report.pdf">
              Export executive PDF
            </a>
            <Link className="rev-button-primary" href="/app/revenue-leaks">
              Review opportunities
            </Link>
          </div>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <Metric
            label="Estimated recoverable"
            note="Modeled opportunity, not guaranteed revenue"
            value={money(read.summary.estimatedValueCents)}
          />
          <Metric label="Active findings" note="Open and acknowledged" value={String(read.summary.activeCount)} />
          <Metric label="Financial findings" note="Estimate value available" value={String(read.summary.financialCount)} />
          <Metric label="Operational risks" note="Never counted as financial loss" value={String(read.summary.operationalCount)} />
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
                        {finding.valueCents === null ? "Operational" : money(finding.valueCents)}
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

function Metric({ label, note, value }: { label: string; note: string; value: string }) {
  return (
    <div className="rev-card-hover rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.76)] p-4" data-testid="executive-metric">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{note}</p>
    </div>
  );
}

function Empty() {
  return (
    <section className="rounded-[26px] border border-dashed border-[color:var(--border-accent)] p-8 text-center">
      <h2 className="text-xl font-bold">Import estimate evidence to create the first read.</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">
        REVORY will not display synthetic metrics or financial claims before Data Quality accepts a canonical import.
      </p>
      <Link className="rev-button-primary mt-5" href="/app/imports">
        Open secure imports
      </Link>
    </section>
  );
}

type QualityTone = "danger" | "success" | "warning";

function DataQuality({ read }: { read: Awaited<ReturnType<typeof getQuoteRecoveryRead>>["dataQuality"] }) {
  const eligible = Object.values(read.eligibility).filter((rule) => rule.eligible).length;
  const hasConflicts = read.linkCoverage.conflicting > 0 || read.issues.length > 0;
  return (
    <aside className="rev-shell-panel rounded-[26px] p-5">
      <p className="rev-label">Data Quality</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Evidence coverage</h2>
        <Link className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--accent-light)] hover:underline" href="/app/data-quality">
          Inspect
        </Link>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <QualityRow href="/app/data-quality#records" label="Canonical records" tone={read.recordCount > 0 ? "success" : "danger"} value={String(read.recordCount)} />
        <QualityRow href="/app/data-quality#links" label="Explicit links" tone={read.linkCoverage.linked > 0 ? "success" : "warning"} value={String(read.linkCoverage.linked)} />
        <QualityRow href="/app/data-quality#links" label="Unmatched links" tone={read.linkCoverage.unmatched > 0 ? "warning" : "success"} value={String(read.linkCoverage.unmatched)} />
        <QualityRow href="/app/data-quality#eligibility" label="Eligible rules" tone={eligible > 0 ? "success" : "danger"} value={String(eligible)} />
      </div>
      {hasConflicts ? (
        <Link className="mt-4 block text-xs leading-5 text-[color:var(--danger)] hover:underline" href="/app/data-quality#issues">
          {read.issues.length + read.linkCoverage.conflicting} blocking or conflicting issue(s) need inspection.
        </Link>
      ) : read.linkCoverage.unmatched > 0 ? (
        <Link className="mt-4 block text-xs leading-5 text-[color:var(--warning)] hover:underline" href="/app/data-quality#links">
          Unmatched evidence remains visible. Click to inspect which records need an explicit link.
        </Link>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[color:var(--success)]">
          No blocking import issues in the latest committed batch.
        </p>
      )}
    </aside>
  );
}

const qualityStyles: Record<QualityTone, string> = {
  danger: "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  success: "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success)]",
  warning: "border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
};

function QualityRow({ href, label, tone, value }: { href: string; label: string; tone: QualityTone; value: string }) {
  return (
    <Link
      className={`rev-card-hover flex items-center justify-between rounded-xl border px-3 py-2 ${qualityStyles[tone]}`}
      href={href}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_12px_currentColor]" />
        <span className="text-[color:var(--foreground)]">{label}</span>
      </span>
      <strong>{value}</strong>
    </Link>
  );
}
