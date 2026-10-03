import type { Metadata } from "next";
import Link from "next/link";

import { PublicPreviewFooter, PublicPreviewNav } from "@/components/ai-integrity-public/PublicPreview";

export const metadata: Metadata = {
  title: "REVORY — Synthetic AI spend demo",
  description: "Explore a fictional example of AI spend attribution and comparable usage evidence. No customer data is accepted.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "REVORY — Synthetic AI spend demo",
    description: "A fictional example of an evidence-led read for AI SaaS.",
    type: "website",
  },
};

const example = {
  providerCostCents: 245575,
  attributedCostCents: 184050,
  providerTokens: 9020000,
  ledgerTokens: 8640000,
} as const;
const unattributedCostCents = example.providerCostCents - example.attributedCostCents;
const usageDifference = example.providerTokens - example.ledgerTokens;
const coverage = (example.attributedCostCents / example.providerCostCents) * 100;
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);

export default function AiIntegritySyntheticDemoPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] [font-family:var(--font-dm-sans)]">
      <PublicPreviewNav />
      <div className="mx-auto max-w-[1180px] space-y-8 px-5 py-10 md:px-8 md:py-14">
        <div className="rounded-2xl border border-[color:var(--border-accent)] bg-[color:var(--background-card)] px-5 py-4 text-xs leading-6 text-[color:var(--text-muted)]">
          <strong className="text-[color:var(--foreground)]">Fictional example.</strong> This static presentation does not run a scan, upload files, save data, connect accounts or accept payment. Figures illustrate how evidence and limits can be shown.
        </div>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="rev-kicker">Synthetic Integrity Scan · August 2026 UTC</p><h1 className="mt-3 text-5xl font-normal leading-none [font-family:var(--font-instrument-serif)] md:text-6xl">Aster AI · example read</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">Three source views for one closed period. Revenue remains billing context; the findings below are about reported provider spend and comparable usage.</p></div>
          <Link className="rev-button-secondary" href="/">Back to REVORY</Link>
        </header>
        <section aria-labelledby="sources-title" className="space-y-4">
          <h2 className="text-xl font-bold" id="sources-title">Sources in this example</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <SourceCard title="Stripe billing context" value="Paid invoice" detail="in_example_001 · USD · customer ID available. This invoice is not counted as AI margin." />
            <SourceCard title="Internal usage ledger" value={`${number(example.ledgerTokens)} tokens`} detail="Customer-linked usage events in a fictional closed period." />
            <SourceCard title="Provider usage and cost" value={money(example.providerCostCents)} detail={`${number(example.providerTokens)} tokens · reported cost · one shared project remains unattributed.`} />
          </div>
        </section>
        <section aria-labelledby="coverage-title" className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="rev-kicker">Attribution coverage</p><h2 className="mt-2 text-2xl font-bold" id="coverage-title">Only supported links count.</h2></div><p className="text-3xl font-semibold text-[color:var(--accent)]">{coverage.toFixed(2)}%</p></div>
          <div aria-label="Attributed share of provider cost" aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(coverage)} className="mt-6 h-2 overflow-hidden rounded-full bg-[color:var(--brand-surface)]" role="progressbar"><div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${coverage}%` }} /></div>
          <div className="mt-5 grid gap-3 text-xs sm:grid-cols-3"><p>Reported provider cost<br /><strong className="mt-1 block text-base text-[color:var(--foreground)]">{money(example.providerCostCents)}</strong></p><p>Linked to an exclusive project<br /><strong className="mt-1 block text-base text-[color:var(--foreground)]">{money(example.attributedCostCents)}</strong></p><p>Without a reliable customer link<br /><strong className="mt-1 block text-base text-[color:var(--foreground)]">{money(unattributedCostCents)}</strong></p></div>
          <p className="mt-5 text-xs leading-6 text-[color:var(--text-muted)]">This fraction covers the fictional provider report shown here. It is not a claim about all AI costs or customer margin.</p>
        </section>
        <section aria-labelledby="findings-title" className="space-y-4"><div><p className="rev-kicker">Review items</p><h2 className="mt-2 text-2xl font-bold" id="findings-title">Two differences, two separate meanings.</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rev-marketing-card rounded-[26px] p-6"><p className="text-xs text-[color:var(--accent)]">Observed cost · coverage gap</p><h3 className="mt-3 text-lg font-bold">Spend without a customer link</h3><p className="mt-4 text-3xl font-semibold">{money(unattributedCostCents)}</p><p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">Reported provider cost minus cost linked to an exclusive project: {money(example.providerCostCents)} − {money(example.attributedCostCents)}. A shared project cannot identify the consuming customer. Review mappings before attribution.</p><p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">Not confirmed loss, waste or underbilling.</p></article>
            <article className="rev-marketing-card rounded-[26px] p-6"><p className="text-xs text-[color:var(--accent)]">Calculated quantity · comparison</p><h3 className="mt-3 text-lg font-bold">Usage differs between sources</h3><p className="mt-4 text-3xl font-semibold">+{number(usageDifference)} tokens</p><p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">Provider tokens minus internal ledger tokens: {number(example.providerTokens)} − {number(example.ledgerTokens)} in the same fictional period and unit. Check logging, retries and period closure before treating this as a defect.</p><p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">No dollar exposure is calculated from this token difference.</p></article>
          </div>
        </section>
        <section className="rev-shell-panel rounded-[26px] p-6 md:p-8"><h2 className="text-lg font-bold">What remains unknown</h2><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">This example does not establish net collected revenue, customer-level AI cost, credits, margin or financial leakage. The real product is still being validated. Customer-data scans and connected monitoring are unavailable in this public preview.</p><Link className="mt-5 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/ai-integrity/preview-policy">Read the preview scope →</Link></section>
      </div>
      <PublicPreviewFooter />
    </main>
  );
}

function SourceCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <article className="rev-marketing-card rounded-[24px] p-6"><h3 className="text-sm font-bold">{title}</h3><p className="mt-5 text-xl font-semibold">{value}</p><p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">{detail}</p></article>;
}
