import Link from "next/link";
import { AiMarketingFooter, AiMarketingNav } from "./AiMarketing";
import { monitorLiveMode } from "@/services/ai-integrity/commercial-runtime";

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
        <div className="mt-8 flex flex-wrap gap-3"><Link className="rev-button-primary" href="/start">Set up monitoring</Link><Link className="rev-button-secondary" href="/demo">Explore an example report</Link></div>
        <p className="mt-5 text-xs leading-6 text-[color:var(--text-subtle)]">Self-service · Read-only connections · No call required<br />Example reports use synthetic data. No savings or recovery guarantee.</p>
      </div>
      <section aria-labelledby="monitor-offer" className="rev-shell-panel rounded-[32px] p-7 md:p-9">
        <p className="rev-kicker">One workspace · Monthly subscription</p>
        <h2 id="monitor-offer" className="mt-4 text-2xl font-bold">REVORY Monitor</h2>
        <p className="mt-5 text-5xl font-semibold tracking-[-0.05em]">US$399<span className="text-sm font-normal tracking-normal text-[color:var(--text-muted)]"> / month</span></p>
        <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">Billed in USD every month until canceled. No trial. Cancel through your subscription settings; access continues through the paid period.</p>
        <ul className="mt-7 space-y-4 text-sm leading-6 text-[color:var(--text-muted)]">
          {["Scheduled Stripe and OpenAI reads for closed periods", "Daily or weekly periods, with at least 24 hours for consolidation", "Up to 10,000 internal ledger rows per period", "Comparable differences, source evidence and exports", "Investigation history and optional email notifications"].map(item => <li className="flex gap-3" key={item}><span aria-hidden="true" className="text-[color:var(--accent)]">✓</span>{item}</li>)}
        </ul>
        <Link className="rev-button-primary mt-8 w-full" href="/start">Review the setup &amp; subscribe</Link>
        <p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">Stripe invoices provide billing context, not net revenue. Missing ledgers, shared projects and incomplete source data limit results. Source read limits also apply.</p>
      </section>
    </section>
    <section className="border-y border-[color:var(--border)] bg-[color:var(--background-secondary)] px-5 py-16 md:px-8"><div className="mx-auto max-w-[1176px]">
      <p className="rev-kicker">A clear path from connection to evidence</p><h2 className="mt-5 text-4xl font-normal leading-tight [font-family:var(--font-instrument-serif)]">Three sources. A review you can follow.</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">{steps.map(([step, title, copy]) => <article key={step} className="rev-marketing-card rounded-[26px] p-6"><p className="text-xs text-[color:var(--accent)]">{step}</p><h3 className="mt-5 text-base font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{copy}</p></article>)}</div>
      <p className="mt-8 max-w-3xl text-xs leading-7 text-[color:var(--text-subtle)]">REVORY does not fix billing, calculate customer margin without justified attribution, or prove recovered money. A difference no longer observed means only that it was absent from the next comparable read.</p>
    </div></section>
    <AiMarketingFooter />
  </main>;
}
