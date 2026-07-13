import Link from "next/link";
import { redirect } from "next/navigation";

import { RevenueRealizationFindingIcon } from "@/components/revenue-realization/RevenueRealizationFindingIcon";
import type { RevenueRealizationFindingType } from "@/domain/revory/revenue-realization";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import {
  getRevenueRealizationFindingRead,
  getRevenueRealizationRead,
} from "@/services/revenue-realization/get-revenue-realization-read";

function money(valueCents: number | null, currency: string | null) {
  if (valueCents === null || !currency) return "Suppressed";
  return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(valueCents / 100);
}

export default async function FullRevenueLeakReportPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/revenue-realization/report"));
  const [read, findingRead] = await Promise.all([
    getRevenueRealizationRead(context.workspace.id),
    getRevenueRealizationFindingRead(context.workspace.id),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-7 rounded-[28px] bg-[#f5f7f6] p-6 font-[family:var(--font-app)] text-[#141516] md:p-9 print:rounded-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[#d5ddda] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#318b78]">REVORY · Full Revenue Leak Audit</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em]">Executive Revenue Realization read</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#53605d]">Generated from explicit, workspace-scoped imported evidence. This report supports review decisions; it does not certify accounting loss or guarantee recovery.</p>
        </div>
        <Link className="rounded-full border border-[#b8c9c4] px-4 py-2 text-xs font-bold print:hidden" href="/app/revenue-realization">Back to workspace</Link>
      </header>

      {findingRead.summary.hasMixedCurrencies ? <div className="rounded-xl border border-[#d4b96f] bg-[#fff8df] p-4 text-sm font-bold">Financial totals are suppressed because active findings use multiple currencies.</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#e7f2ef] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#53605d]">Calculated billing gap</p><p className="mt-2 text-3xl font-bold">{money(findingRead.summary.calculatedUnderbillingCents, findingRead.summary.currency)}</p><p className="mt-2 text-xs text-[#53605d]">Only additive executive gap.</p></div>
        <div className="rounded-2xl bg-[#edf0ef] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#53605d]">Approved CO review</p><p className="mt-2 text-3xl font-bold">{money(findingRead.summary.approvedChangeOrderReviewCents, findingRead.summary.currency)}</p><p className="mt-2 text-xs text-[#53605d]">Observed separately; not added again.</p></div>
        <div className="rounded-2xl bg-[#edf0ef] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#53605d]">Margin basis at risk</p><p className="mt-2 text-3xl font-bold">{money(findingRead.summary.marginAtRiskCents, findingRead.summary.currency)}</p><p className="mt-2 text-xs text-[#53605d]">Calculated separately from billing gap.</p></div>
        <div className="rounded-2xl bg-[#edf0ef] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#53605d]">Review candidates</p><p className="mt-2 text-3xl font-bold">{findingRead.summary.operationalCount}</p><p className="mt-2 text-xs text-[#53605d]">No unsupported financial value.</p></div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#318b78]">Priority findings</p><h2 className="mt-2 text-2xl font-bold">What deserves review first</h2></div><p className="text-xs text-[#53605d]">{findingRead.summary.activeCount} active findings</p></div>
        <div className="mt-4 space-y-3">{findingRead.findings.map((finding, index) => (
          <article className="break-inside-avoid rounded-2xl border border-[#d5ddda] bg-white p-5" key={finding.id}>
            <div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f2ef] text-[#318b78]"><RevenueRealizationFindingIcon type={finding.findingType as RevenueRealizationFindingType}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#318b78]">{index + 1}. {finding.findingType.replaceAll("_", " ")}</p><h3 className="mt-1 font-bold">Job {finding.jobExternalId}</h3></div><strong>{money(finding.valueCents, finding.currency)}</strong></div><p className="mt-3 text-sm leading-6 text-[#53605d]">{finding.reason}</p><p className="mt-2 text-sm"><b>Review next:</b> {finding.recommendedAction}</p><p className="mt-3 text-[11px] uppercase tracking-wider text-[#6f7b78]">{finding.valueBasis} · {finding.confidence} confidence · priority {finding.priority} · {finding.additiveToExecutiveGap ? "additive gap" : "non-additive"}</p></div></div>
          </article>
        ))}</div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#d5ddda] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#318b78]">Eligible jobs</p><p className="mt-2 text-2xl font-bold">{read?.summary.eligibleJobs ?? 0}</p></div>
        <div className="rounded-2xl border border-[#d5ddda] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#318b78]">Suppressed jobs</p><p className="mt-2 text-2xl font-bold">{read?.summary.suppressedJobs ?? 0}</p></div>
        <div className="rounded-2xl border border-[#d5ddda] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#318b78]">Links needing review</p><p className="mt-2 text-2xl font-bold">{(read?.summary.unmatchedLinks ?? 0) + (read?.summary.conflictLinks ?? 0)}</p></div>
      </section>

      <footer className="border-t border-[#d5ddda] pt-5 text-xs leading-5 text-[#53605d]">Calculated billing gap, observed approved-change review and calculated margin basis are intentionally not summed together. Customer confirmation, independent logic review and commercial configuration remain separate release evidence.</footer>
    </main>
  );
}
