import Link from "next/link";
import { AiMarketingFooter, AiMarketingNav } from "./AiMarketing";
import { monitorLiveMode } from "@/services/ai-integrity/commercial-runtime";
import { MONITOR_OFFER, usdPrice } from "@/domain/ai-integrity/commercial-offers";

const steps = [
  ["01", "Connect read-only sources", "Connect your Stripe account and OpenAI organization with restricted credentials. REVORY cannot change your billing or run model requests."],
  ["02", "Bring your product’s usage", "Upload a reviewed CSV/XLSX ledger, or send it from your backend. Confirm exact customer and project links before comparing."],
  ["03", "Review what changed", "Follow new, persistent and no longer observed differences across comparable periods. Inspect the evidence and record your investigation."],
];

export function AiMonitorLanding() {
  return <main className="ai-integrity-experience min-h-screen overflow-x-clip bg-[color:var(--background)] [font-family:var(--font-dm-sans)]">
    <AiMarketingNav />
    {!monitorLiveMode() ? <p role="status" className="mx-auto max-w-[1240px] px-5 pt-6 text-sm text-[color:var(--accent)] md:px-8">Sandbox environment. Checkout uses Stripe test mode; no real payment is collected.</p> : null}
    <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="rev-kicker">Revenue &amp; AI Margin Integrity · Early access</p>
        <h1 className="mt-6 text-[clamp(3.3rem,5.5vw,5rem)] font-normal leading-[0.99] tracking-[-0.025em] [font-family:var(--font-instrument-serif)]">Know what changed.<br /><span className="text-[color:var(--accent)]">Keep the evidence.</span></h1>
        <p className="mt-7 max-w-lg text-base leading-8 text-[color:var(--text-muted)]">Compare your product’s usage ledger with OpenAI usage and reported cost, alongside Stripe billing context. See which differences deserve investigation and follow them into the next period.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="rev-button-primary" href="/start?plan=scan">Start with a US$99 scan</Link><Link className="rev-button-secondary" href="/demo">Explore an example report</Link></div>
        <p className="mt-5 text-xs leading-6 text-[color:var(--text-subtle)]">Self-service · Read-only connections · No call required<br />Example reports use synthetic data. No savings or recovery guarantee.</p>
      </div>
      <section aria-labelledby="scan-offer" className="rev-shell-panel rounded-[32px] p-7 md:p-9">
        <p className="rev-kicker">Start with one period · Pay once</p>
        <h2 id="scan-offer" className="mt-4 text-2xl font-bold">REVORY Integrity Scan</h2>
        <p className="mt-5 text-5xl font-semibold tracking-[-0.05em]">US$99<span className="ml-2 text-sm font-normal tracking-normal text-[color:var(--text-muted)]">once</span></p>
        <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">One payment. One report for one closed period. No subscription or automatic upgrade.</p>
        <ul className="mt-7 space-y-4 text-sm leading-6 text-[color:var(--text-muted)]">
          {["Authorized Stripe and OpenAI reads for your period", "Your reviewed internal CSV/XLSX usage ledger", "Explicit customer links and coverage limitations", "Comparable usage differences and source evidence", "An immutable report with JSON/CSV exports"].map(item => <li className="flex gap-3" key={item}><span aria-hidden="true" className="text-[color:var(--accent)]">✓</span>{item}</li>)}
        </ul>
        <Link className="rev-button-primary mt-8 w-full" href="/start?plan=scan">Review the setup &amp; buy one scan</Link>
        <p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">Stripe invoices provide billing context, not net revenue. Missing ledgers, shared projects and incomplete source data limit results. Source read limits also apply.</p>
      </section>
    </section>
    <section id="pricing" aria-labelledby="monitor-offer" className="mx-auto max-w-[1240px] px-5 pb-16 md:px-8">
      <div className="rev-shell-panel grid gap-8 rounded-[32px] p-7 md:p-9 lg:grid-cols-2"><div><p className="rev-kicker">Keep reviewing · Purchased separately</p><h2 id="monitor-offer" className="mt-4 text-2xl font-bold">REVORY Monitor</h2><p className="mt-5 text-5xl font-semibold tracking-[-0.05em]">{usdPrice(MONITOR_OFFER.amountMinor)}<span className="ml-2 text-sm font-normal tracking-normal text-[color:var(--text-muted)]">/ month</span></p><p className="mt-4 max-w-md text-sm leading-7 text-[color:var(--text-muted)]">Follow new, persistent and no longer observed differences across comparable periods. Keep investigation history and receive optional email notices.</p><Link href="/start?plan=monitor" className="rev-button-secondary mt-6">Review the Monitor plan</Link><p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">Billed in USD monthly until canceled. No trial. Cancel through your subscription settings; access continues through the paid period. A scan never starts this subscription automatically.</p></div><ul className="space-y-4 self-center text-sm leading-7 text-[color:var(--text-muted)]">{["Scheduled Stripe and OpenAI reads for closed periods", "Daily or weekly periods with at least 24h for consolidation", "Up to 10,000 internal ledger rows per period", "Ledger upload or authorized delivery from your backend", "Source evidence, comparison exports and investigation history"].map(item => <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-[color:var(--accent)]">✓</span>{item}</li>)}</ul></div>
    </section>
    <section className="border-y border-[color:var(--border)] bg-[color:var(--background-secondary)] px-5 py-16 md:px-8"><div className="mx-auto max-w-[1176px]">
      <p className="rev-kicker">A clear path from connection to evidence</p><h2 className="mt-5 text-4xl font-normal leading-tight [font-family:var(--font-instrument-serif)]">Three sources. A review you can follow.</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">{steps.map(([step, title, copy]) => <article key={step} className="rev-marketing-card rounded-[26px] p-6"><p className="text-xs text-[color:var(--accent)]">{step}</p><h3 className="mt-5 text-base font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{copy}</p></article>)}</div>
      <p className="mt-8 max-w-3xl text-xs leading-7 text-[color:var(--text-subtle)]">REVORY does not fix billing, calculate customer margin without justified attribution, or prove recovered money. A difference no longer observed means only that it was absent from the next comparable read.</p>
    </div></section>
    <AiMarketingFooter />
  </main>;
}
