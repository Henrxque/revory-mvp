import Link from "next/link";
import { redirect } from "next/navigation";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { formatWorkspaceMoney } from "@/domain/revory/currency";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getQuoteRecoveryRead, type QuoteRecoveryReadFilter } from "@/services/quote-recovery/read-model";

const filters: Array<[QuoteRecoveryReadFilter, string]> = [
  ["ACTIVE", "To review"],
  ["FINANCIAL", "With value"],
  ["OPERATIONAL", "Process gaps"],
  ["HIGH_PRIORITY", "High priority"],
  ["RESOLVED", "Resolved"],
  ["DISMISSED", "Dismissed"],
];

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OpportunitiesPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/revenue-leaks"));
  const params = searchParams ? await searchParams : {};
  const filter = filters.some(([key]) => key === params.filter)
    ? params.filter as QuoteRecoveryReadFilter
    : "ACTIVE";
  const read = await getQuoteRecoveryRead(context.workspace.id, filter);

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="rev-kicker">Quote Recovery opportunities</p>
            <h1 className="rev-display-hero mt-3">Prioritize the estimates worth reviewing first.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Opportunities with an estimate amount, process gaps and import limitations stay visibly separate.
            </p>
          </div>
          <a className="rev-button-secondary shrink-0 self-start whitespace-nowrap" href="/app/quote-recovery/export">
            Export current findings
          </a>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="To review" value={read.summary.activeCount} />
          <Metric label="Resolved" value={read.summary.resolvedCount} />
          <Metric label="Dismissed" value={read.summary.dismissedCount} />
        </div>
      </section>

      <nav aria-label="Opportunity filters" className="flex flex-wrap gap-2">
        {filters.map(([key, text]) => (
          <Link
            className={filter === key ? "rev-button-primary !min-h-9 !px-4 !py-2" : "rev-button-secondary !min-h-9 !px-4 !py-2"}
            href={`/app/revenue-leaks?filter=${key}`}
            key={key}
          >
            {text}
          </Link>
        ))}
      </nav>

      <section className="space-y-3">
        {read.findings.length ? read.findings.map((finding) => (
          <Link
            className="rev-card-hover block rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,.02)] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            href={`/app/revenue-leaks/${finding.id}`}
            key={finding.id}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <RevoryStatusBadge tone={finding.valueBasis === "OPERATIONAL" ? "neutral" : "accent"}>{label(finding.findingType)}</RevoryStatusBadge>
                  <RevoryStatusBadge tone={finding.severity === "HIGH" || finding.severity === "CRITICAL" ? "future" : "neutral"}>{finding.severity.toLowerCase()}</RevoryStatusBadge>
                </div>
                <h2 className="mt-3 text-lg font-bold">Estimate {finding.estimateExternalId}</h2>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">{finding.reason}</p>
              </div>
              <div className="md:text-right">
                <p className="text-xl font-bold">{finding.valueCents === null ? "Process gap" : formatWorkspaceMoney(finding.valueCents, finding.currency)}</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {finding.valueBasis === "OPERATIONAL" ? "No financial value assigned" : `${label(finding.confidence)} confidence`}
                </p>
                <p className="mt-3 text-xs font-semibold text-[color:var(--accent-light)]">Review evidence →</p>
              </div>
            </div>
          </Link>
        )) : (
          <div className="rounded-[24px] border border-dashed border-[color:var(--border)] p-8 text-center">
            <p className="font-bold">No findings in this view.</p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Change the filter or import a current estimate export.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(20,21,22,.7)] p-4">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
