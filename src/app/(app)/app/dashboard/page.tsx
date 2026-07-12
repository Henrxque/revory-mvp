import Link from "next/link";
import { redirect } from "next/navigation";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }
function title(type: string) { return type.toLowerCase().split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "); }

export default async function DashboardPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/dashboard"));
  const read = await getQuoteRecoveryRead(context.workspace.id);
  const top = read.findings.slice(0, 3);
  return <div className="space-y-6">
    <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl"><p className="rev-kicker">Executive Quote Recovery read</p><h1 className="rev-display-hero mt-3">See what may still be recoverable — and why.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">Estimated opportunities remain separate from operational and data-quality risks. Every finding is traceable to imported evidence.</p></div><div className="flex gap-2"><a className="rev-button-secondary" href="/app/quote-recovery/export">Export CSV</a><Link className="rev-button-primary" href="/app/revenue-leaks">Review opportunities</Link></div></div>
      <div className="mt-7 grid gap-3 md:grid-cols-4"><Metric label="Estimated recoverable" value={money(read.summary.estimatedValueCents)} note="Modeled opportunity, not guaranteed revenue" /><Metric label="Active findings" value={String(read.summary.activeCount)} note="Open and acknowledged" /><Metric label="Financial findings" value={String(read.summary.financialCount)} note="Estimate value available" /><Metric label="Operational risks" value={String(read.summary.operationalCount)} note="Never counted as financial loss" /></div>
    </section>
    {!read.dataQuality.hasImport ? <Empty /> : <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="rev-shell-panel rounded-[26px] p-5"><div className="flex items-center justify-between"><div><p className="rev-label">Priority review</p><h2 className="mt-2 text-xl font-bold">Top opportunities</h2></div><RevoryStatusBadge tone="accent">{top.length} prioritized</RevoryStatusBadge></div><div className="mt-4 space-y-3">{top.map((finding, index) => <Link className="block rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,.02)] p-4 transition hover:border-[color:var(--border-accent)]" href={`/app/revenue-leaks/${finding.id}`} key={finding.id}><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold text-[color:var(--accent-light)]">0{index + 1} · {title(finding.findingType)}</p><p className="mt-2 font-bold">Estimate {finding.estimateExternalId}</p><p className="mt-1 text-sm text-[color:var(--text-muted)]">{finding.reason}</p></div><div className="text-right"><p className="text-lg font-bold">{finding.valueCents === null ? "Operational" : money(finding.valueCents)}</p><p className="text-xs text-[color:var(--text-muted)]">{finding.valueBasis.toLowerCase()} · {finding.confidence.toLowerCase()} confidence</p></div></div></Link>)}</div></div><DataQuality read={read.dataQuality} /></section>
    </>}
  </div>;
}

function Metric({ label, note, value }: { label: string; note: string; value: string }) { return <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(20,21,22,.76)] p-4"><p className="rev-label">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{note}</p></div>; }
function Empty() { return <section className="rounded-[26px] border border-dashed border-[color:var(--border-accent)] p-8 text-center"><h2 className="text-xl font-bold">Import estimate evidence to create the first read.</h2><p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">REVORY will not display synthetic metrics or financial claims before Data Quality accepts a canonical import.</p><Link className="rev-button-primary mt-5" href="/app/imports">Open secure imports</Link></section>; }
function DataQuality({ read }: { read: Awaited<ReturnType<typeof getQuoteRecoveryRead>>["dataQuality"] }) { const eligible = Object.values(read.eligibility).filter((rule) => rule.eligible).length; return <aside className="rev-shell-panel rounded-[26px] p-5"><p className="rev-label">Data Quality</p><h2 className="mt-2 text-lg font-bold">Evidence coverage</h2><div className="mt-4 space-y-3 text-sm"><Row label="Canonical records" value={String(read.recordCount)} /><Row label="Explicit links" value={String(read.linkCoverage.linked)} /><Row label="Unmatched links" value={String(read.linkCoverage.unmatched)} /><Row label="Eligible rules" value={String(eligible)} /></div>{read.issues.length ? <p className="mt-4 text-xs leading-5 text-[color:var(--warning)]">{read.issues.length} import issue(s) remain visible for review.</p> : <p className="mt-4 text-xs leading-5 text-[color:var(--text-muted)]">No blocking import issues in the latest committed batch.</p>}</aside>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between rounded-xl border border-[color:var(--border)] px-3 py-2"><span className="text-[color:var(--text-muted)]">{label}</span><strong>{value}</strong></div>; }
