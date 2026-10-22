import Link from "next/link";
import { AiMarketingFooter, AiMarketingNav } from "@/components/ai-integrity/AiMarketing";
import { isAiCommercialRuntimeEnabled } from "@/services/ai-integrity/commercial-runtime";

const integrityScope = [
  ["Supported sources", "The current connected scope is Stripe invoice billing context, OpenAI usage/reported costs and your internal usage ledger. The ledger requires a reviewed CSV/XLSX export; Monitor also supports authorized delivery from your backend. Other AI providers are outside the current offer."],
  ["One-time scan", "An Integrity Scan includes one immutable report for one closed period in one workspace. It does not create a subscription. A failed report attempt does not consume an unused scan; a completed report can contain limitations or no findings."],
  ["Current findings", "The deterministic rules surface comparable ledger/provider usage differences and reported provider spend without a confirmed customer link. Each finding retains source evidence, calculation, eligibility and limitations."],
  ["Attribution", "Customer-level interpretation requires justified identity links. Shared or conflicting projects, missing identifiers and incomplete internal usage can prevent attribution. REVORY does not silently match customers by approximate names or amounts."],
  ["Financial interpretation", "Stripe invoices are billing context, not net receipts. Reported cost, calculated usage difference and unattributed spend are distinct. A usage difference is not automatically a monetary loss; unattributed spend is not automatically waste. The current report does not establish customer margin, credit balances or recovered revenue."],
  ["Coverage and comparability", "Comparisons depend on compatible units, scope, currency and closed periods. Data quality, source read limits, consolidation delays, refunds, credits and missing records can suppress findings or limit a result. Missing data is never assumed to be zero."],
  ["Monitoring", "Monitor supports daily or weekly closed UTC periods with at least 24 hours for consolidation and up to 10,000 internal ledger rows per period, subject to source limits and availability. Each period requires a complete internal ledger and current source authorization. Missing data can pause that comparison. Pausing reads does not cancel billing."],
  ["Investigation and action", "New, persistent and no longer observed differences require comparable periods. A finding that disappears is not proof of correction, savings or recovery. You decide what to investigate; REVORY does not change customer billing, enforce credits or run model-generation requests."],
  ["Early access", "The product is in early access. Real customer validation is still in progress, and no number of findings, savings, recovery or timing SLA is guaranteed. Review your data readiness, the purchase terms and the cancellation/refund policy before buying."],
];

export default function LimitationsPage() {
  if (isAiCommercialRuntimeEnabled()) return <main className="ai-integrity-experience min-h-screen bg-[color:var(--background)] [font-family:var(--font-dm-sans)]">
    <AiMarketingNav />
    <section className="mx-auto max-w-4xl px-5 py-14 md:px-8 md:py-20"><p className="rev-kicker">Scope &amp; limitations · Early access</p><h1 className="mt-5 text-[clamp(2.8rem,5vw,4.5rem)] font-normal leading-[1.02] [font-family:var(--font-instrument-serif)]">Know what your evidence<br /><em className="text-[color:var(--accent-light)]">can support.</em></h1><p className="mt-6 max-w-2xl text-sm leading-8 text-[color:var(--text-muted)]">REVORY helps you inspect differences between your product records and provider reports, with Stripe billing context alongside. The quality and coverage of those sources determine what can be concluded.</p>
      <div className="mt-10 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">{integrityScope.map(([title, copy]) => <section key={title} className="py-6"><h2 className="text-base font-bold">{title}</h2><p className="mt-3 text-sm leading-8 text-[color:var(--text-muted)]">{copy}</p></section>)}</div>
      <div className="mt-8 flex flex-wrap gap-3"><Link className="rev-button-primary" href="/#pricing">Review plans &amp; pricing</Link><Link className="rev-button-secondary" href="/demo">Explore an example report</Link><Link className="rev-button-ghost" href="/refunds">Cancellation &amp; refunds</Link></div>
    </section><AiMarketingFooter />
  </main>;
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Product limitations</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">What REVORY does not claim.</h1>
        <ul className="mt-7 list-disc space-y-3 pl-5 text-sm leading-7 text-[color:var(--text-muted)]">
          <li>CSV/XLSX exports are the launch input; native source-system connectors are not promised.</li>
          <li>Quote Recovery values are estimated opportunities, not confirmed accounting loss or guaranteed recovery.</li>
          <li>Underbilling and margin values appear only when explicit job-level completeness, matching, currency and temporal evidence pass. Otherwise financial output is suppressed.</li>
          <li>Text can create a human review candidate; it cannot prove approval, performed scope or a dollar gap.</li>
          <li>REVORY does not replace a CRM, field-service platform, inbox, accounting suite, job-costing system, project-management suite or professional advisor.</li>
          <li>Starter and Growth are current Quote Recovery offers. Advanced Revenue Realization remains gated until its release evidence passes.</li>
        </ul>
        <Link className="rev-action-button mt-8 inline-flex" href="/">Back to REVORY</Link>
      </section>
    </main>
  );
}
