import Link from "next/link";
import type { ReactNode } from "react";
import { AI_SCAN_OFFER } from "@/domain/ai-integrity/scan-offer";
import { MONITOR_OFFER, usdPrice } from "@/domain/ai-integrity/commercial-offers";
import { monitorLiveMode } from "@/services/ai-integrity/commercial-runtime";
import { AiLandingEvidence } from "./AiLandingEvidence";
import { AiMarketingFooter, AiMarketingNav } from "./AiMarketing";

const sources = [
  { number: "01", source: "Stripe", role: "What was billed", copy: "Invoice records and billing status give your report financial context. They are kept separate from net receipts and AI usage." },
  { number: "02", source: "Your product", role: "What you recorded", copy: "Your internal usage ledger connects customers, projects and activity. Upload a CSV/XLSX export for the period you want to review." },
  { number: "03", source: "OpenAI", role: "What the provider reported", copy: "Authorized usage and reported costs show consumption by project, model and period. Shared projects keep their attribution limits." },
];
const steps = [
  ["01", "Bring one closed period", "Choose your scan or Monitor plan. Connect Stripe and OpenAI with read-only credentials, then add your internal usage ledger for the same period."],
  ["02", "Review the links and coverage", "Confirm exact customer and project identities. Check excluded rows, shared projects and missing data before creating a report."],
  ["03", "Inspect the evidence", "Open each difference, its calculation and source records. Export the report. With Monitor, review how findings change in the next comparable period."],
];
const findings = [
  { label: "Calculated · Usage", title: "Usage that doesn't reconcile", copy: "See where your product's recorded usage differs from OpenAI usage across a comparable project, model, unit and closed period.", note: "A quantity difference stays a quantity difference. It is not automatically a dollar loss." },
  { label: "Observed · Coverage", title: "Spend without a customer link", copy: "See reported provider spend that cannot be linked to a customer with the available evidence, alongside your attribution coverage.", note: "Missing attribution is a question to investigate. It does not prove wasted spend." },
  { label: "Monitor · Across periods", title: "Changes worth following", copy: "Separate new, persistent and no longer observed differences. Keep investigation notes and check the next comparable reading.", note: "Missing or delayed data limits the comparison. A disappearing finding is not proof of recovered revenue." },
];
const questions = [
  ["Is REVORY a fit for my SaaS?", "The current scope is AI SaaS using Stripe and OpenAI, with an internal usage ledger you can export. You need a closed period, compatible usage units and enough identity evidence to review customer/project links. Shared projects can limit attribution. This is early access, and validation with real customer datasets is still in progress."],
  ["Do I connect APIs or upload files?", "Connect Stripe and OpenAI through restricted read-only credentials. Your internal ledger comes from a reviewed CSV/XLSX export. Monitor also supports authorized ledger delivery from your backend, using a dedicated token. REVORY does not run model requests or change your Stripe billing."],
  ["What exactly will the report tell me?", "The current rules surface comparable usage differences and reported spend without a confirmed customer link. Each finding keeps its calculation, sources and limitations. Stripe invoices provide billing context. The report does not establish net revenue, customer margin, credit balances, lost money or recovered revenue."],
  ["Do I have to buy a scan before Monitor?", "No. You can start with one US$99 Integrity Scan or choose Monitor directly. The scan is one payment for one report and never creates a subscription. Monitor is a separate monthly purchase with its own explicit confirmation."],
  ["What happens if my data is incomplete?", "REVORY keeps data-quality and coverage limits visible. A missing source or incompatible scope can prevent a useful comparison; missing data is never treated as zero usage. A failed report attempt does not consume an unused scan. A completed report may contain limitations or no findings, and no minimum number of findings is guaranteed."],
  ["How are my credentials and data handled?", "Source credentials are encrypted in server-side storage and access is scoped to your workspace. You authorize read-only collection and can revoke a connection. REVORY does not need access to prompts or model responses for the supported usage/cost comparison. Our Security, Privacy, Subprocessor and Data Processing pages describe the current controls and limits."],
  ["Can I cancel Monitor?", "Yes. Cancel through the subscription portal to stop the next renewal; access normally continues through the paid period. Pausing data reads does not cancel your subscription. Monitor has no free trial. The cancellation and refund policy explains eligibility and applicable rights."],
];

function SectionHeading({ eyebrow, children, body, centered = false }: { eyebrow: string; children: ReactNode; body?: string; centered?: boolean }) {
  return <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
    <p className="rev-kicker">{eyebrow}</p>
    <h2 className="mt-4 text-balance text-[clamp(2.5rem,4.1vw,3.8rem)] font-normal leading-[1.02] tracking-[-0.02em] [font-family:var(--font-instrument-serif)]">{children}</h2>
    {body ? <p className={`mt-5 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] ${centered ? "mx-auto" : ""}`}>{body}</p> : null}
  </div>;
}

export function AiMonitorLanding() {
  const scanPrice = usdPrice(AI_SCAN_OFFER.amountMinor);
  const monitorPrice = usdPrice(MONITOR_OFFER.amountMinor);
  return <main id="top" className="rev-landing-page rev-ai-landing ai-integrity-experience min-h-screen [font-family:var(--font-dm-sans)]">
    <a className="rev-ai-skip-link" href="#main-content">Skip to content</a>
    <AiMarketingNav landing />
    {!monitorLiveMode() ? <p role="status" className="border-b border-[color:var(--border-accent)] bg-[color:var(--success-soft)] px-5 py-2.5 text-center text-xs leading-6 text-[color:var(--accent-light)]">Sandbox environment. Checkout uses Stripe test mode; no real payment is collected.</p> : null}

    <section id="main-content" className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-12 pt-14 md:px-8 md:pb-16 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div>
        <p className="rev-hero-badge !text-[9px] sm:!text-[10px]">Revenue &amp; AI Margin Integrity · Early access</p>
        <h1 className="mt-7 max-w-2xl text-balance text-[clamp(3.2rem,5.4vw,5rem)] font-normal leading-[0.99] tracking-[-0.025em] [font-family:var(--font-instrument-serif)]">Know where your AI usage <em className="text-[color:var(--accent-light)]">stops adding up.</em></h1>
        <p className="mt-7 max-w-lg text-base leading-8 text-[color:var(--text-muted)]">Compare what your product recorded with what OpenAI reported. Keep Stripe billing context beside the evidence, so you know which differences deserve a closer look.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="rev-button-primary" href="/start?plan=scan">Start with a {scanPrice} scan</Link><Link className="rev-button-secondary" href="/demo">Explore an example report</Link></div>
        <p className="mt-5 text-xs leading-6 text-[color:var(--text-subtle)]">One period. One report. No subscription starts.<br />Self-service · Read-only sources · No sales call</p>
        <a className="rev-nav-link mt-5 inline-block text-xs font-semibold text-[color:var(--accent-light)]" href="#pricing">Need ongoing reviews? Monitor is {monitorPrice}/month.</a>
      </div>
      <AiLandingEvidence />
    </section>

    <div className="mx-auto max-w-[1240px] px-5 pb-16 md:px-8 md:pb-20">
      <div className="rev-trust-strip grid overflow-hidden rounded-[24px] sm:grid-cols-2 lg:grid-cols-4">{[["Read-only by design", "Your source systems stay untouched."], ["Three sources, one period", "Billing context, internal usage and AI cost."], ["Evidence you can inspect", "Calculations, source records and explicit limits."], ["Built for a small team", "No call or stack migration required."]].map(([title, text]) => <div key={title} className="rev-trust-item"><p className="text-xs font-bold">{title}</p><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{text}</p></div>)}</div>
    </div>

    <section id="how" className="rev-section-band scroll-mt-28 px-5 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1176px]">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16"><SectionHeading eyebrow="How it works">Three records of your business.<br /><em className="text-[color:var(--accent-light)]">One explainable report.</em></SectionHeading><p className="max-w-lg text-sm leading-8 text-[color:var(--text-muted)]">Your billing, product and AI provider each hold part of the picture. REVORY brings the same closed period into view and keeps uncertainty visible, so your team can investigate with context.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">{sources.map(item => <article key={item.source} className="rev-marketing-card rounded-[24px] border border-[color:var(--border)] p-6"><div className="flex items-center justify-between gap-4"><p className="text-xs font-bold text-[color:var(--accent-light)]">{item.source}</p><span className="text-[11px] text-[color:var(--text-subtle)]">{item.number}</span></div><h3 className="mt-6 text-lg font-bold">{item.role}</h3><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{item.copy}</p></article>)}</div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">{steps.map(([number, title, copy]) => <article key={number} className="rev-step-card"><span className="rev-step-number" aria-hidden="true">{number}</span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{copy}</p></div></article>)}</div>
      </div>
    </section>

    <section id="evidence" className="mx-auto max-w-[1240px] scroll-mt-28 px-5 py-16 md:px-8 md:py-20">
      <SectionHeading eyebrow="What you get" body="A focused review of usage and attribution, with the source evidence close to every finding. A difference gives you a place to investigate; the data determines what you can conclude.">A clearer question.<br /><em className="text-[color:var(--accent-light)]">A traceable answer.</em></SectionHeading>
      <div className="mt-10 grid gap-4 md:grid-cols-3">{findings.map(item => <article key={item.title} className="rev-marketing-card flex flex-col rounded-[24px] border border-[color:var(--border)] p-6"><p className="rev-kicker !text-[9px]">{item.label}</p><h3 className="mt-5 text-xl font-bold leading-7">{item.title}</h3><p className="mt-3 flex-1 text-sm leading-7 text-[color:var(--text-muted)]">{item.copy}</p><p className="mt-6 border-t border-[color:var(--border)] pt-4 text-xs leading-6 text-[color:var(--text-subtle)]">{item.note}</p></article>)}</div>
      <div className="mt-6 flex flex-col justify-between gap-5 rounded-[22px] border border-[color:var(--border)] px-6 py-5 sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold">Keep the report. Share the evidence.</h3><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">Immutable reports with JSON evidence and CSV findings, ready for your own review.</p></div><Link className="rev-button-secondary shrink-0" href="/demo">Inspect the sample report</Link></div>
      <div className="mt-8 grid gap-6 border-t border-[color:var(--border)] pt-8 md:grid-cols-[1fr_1.5fr]"><div><h3 className="text-sm font-bold">Clear boundaries for your data.</h3><Link className="rev-nav-link mt-2 inline-block text-xs font-semibold text-[color:var(--accent-light)]" href="/security">Read our security practices</Link></div><p className="text-xs leading-7 text-[color:var(--text-muted)]">Restricted source permissions, encrypted credential storage and workspace-scoped access. You authorize collection and can revoke a connection. REVORY does not change your billing or run AI requests. Review our <Link className="underline underline-offset-4" href="/privacy">Privacy Notice</Link> and <Link className="underline underline-offset-4" href="/subprocessors">Subprocessor Notice</Link> before connecting.</p></div>
    </section>

    <section id="pricing" className="rev-section-band scroll-mt-28 px-5 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1056px]">
        <SectionHeading eyebrow="Simple, separate purchases" centered body="Start with one defined report, or choose ongoing monitoring directly. Each purchase has its own confirmation and scope.">One useful first read.<br /><em className="text-[color:var(--accent-light)]">A reason to keep reviewing.</em></SectionHeading>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rev-shell-panel rev-accent-mist flex flex-col rounded-[28px] p-7 md:p-8">
            <p className="rev-kicker">Start with one period</p><h3 className="mt-4 text-2xl font-bold">Integrity Scan</h3>
            <p className="mt-6 text-5xl font-semibold tracking-[-0.045em]">{scanPrice}<span className="ml-2 text-sm font-normal tracking-normal text-[color:var(--text-muted)]">once</span></p>
            <p className="mt-4 min-h-14 text-sm leading-7 text-[color:var(--text-muted)]">One immutable report for one closed period in one workspace. Review your evidence before deciding on ongoing monitoring.</p>
            <ul className="my-7 flex-1 space-y-3 text-xs leading-6 text-[color:var(--text-muted)]">{["Authorized Stripe and OpenAI reads", "Your reviewed internal CSV/XLSX usage ledger", "Customer links, data quality and attribution coverage", "Comparable usage differences with source evidence", "JSON evidence report and CSV findings"].map(item => <li className="flex gap-3" key={item}><span aria-hidden="true" className="text-[color:var(--accent)]">✓</span><span>{item}</span></li>)}</ul>
            <Link className="rev-button-primary w-full" href="/start?plan=scan">Review &amp; buy one scan</Link><p className="mt-4 text-[11px] leading-6 text-[color:var(--text-subtle)]">One payment. No renewal or automatic upgrade. A failed report attempt keeps the unused scan available.</p>
          </article>
          <article className="rev-shell-panel flex flex-col rounded-[28px] p-7 md:p-8">
            <p className="rev-kicker">Continue across periods</p><h3 className="mt-4 text-2xl font-bold">Monitor</h3>
            <p className="mt-6 text-5xl font-semibold tracking-[-0.045em]">{monitorPrice}<span className="ml-2 text-sm font-normal tracking-normal text-[color:var(--text-muted)]">/ month</span></p>
            <p className="mt-4 min-h-14 text-sm leading-7 text-[color:var(--text-muted)]">Ongoing evidence for one workspace. Follow differences across comparable periods and keep your investigation history.</p>
            <ul className="my-7 flex-1 space-y-3 text-xs leading-6 text-[color:var(--text-muted)]">{["Scheduled Stripe and OpenAI reads", "Daily or weekly closed periods with at least 24h for consolidation", `Up to ${MONITOR_OFFER.maxLedgerRows.toLocaleString("en-US")} internal ledger rows per period`, "Ledger upload or authorized delivery from your backend", "New, persistent and no longer observed differences", "Investigation notes, exports and optional email notices"].map(item => <li className="flex gap-3" key={item}><span aria-hidden="true" className="text-[color:var(--accent)]">✓</span><span>{item}</span></li>)}</ul>
            <Link className="rev-button-secondary w-full" href="/start?plan=monitor">Review the Monitor plan</Link><p className="mt-4 text-[11px] leading-6 text-[color:var(--text-subtle)]">Billed monthly in USD. No trial. Cancel in the subscription portal; access continues through the paid period.</p>
          </article>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-7 text-[color:var(--text-subtle)]">Both offers require your authorized sources and internal ledger. Source read limits, shared projects and incomplete data can limit results. No minimum findings or savings are guaranteed. See <Link className="underline underline-offset-4" href="/limitations">product limitations</Link> and our <Link className="underline underline-offset-4" href="/refunds">cancellation &amp; refund policy</Link>.</p>
      </div>
    </section>

    <section id="faq" className="mx-auto grid max-w-[1240px] scroll-mt-28 gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <div><SectionHeading eyebrow="Before you connect">A few things<br /><em className="text-[color:var(--accent-light)]">worth knowing.</em></SectionHeading><p className="mt-5 max-w-sm text-sm leading-7 text-[color:var(--text-muted)]">Clear scope, clear inputs and a purchase you understand before you make it.</p><Link className="rev-nav-link mt-4 inline-block text-xs font-semibold text-[color:var(--accent-light)]" href="/limitations">Read the full product limitations</Link></div>
      <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">{questions.map(([question, answer]) => <details key={question} className="group py-5"><summary className="rev-ai-faq-summary flex min-h-8 cursor-pointer items-center justify-between gap-5 text-sm font-bold leading-6">{question}</summary><p className="pt-4 text-sm leading-7 text-[color:var(--text-muted)]">{answer}</p></details>)}</div>
    </section>

    <section className="mx-auto max-w-[1240px] px-5 pb-16 md:px-8 md:pb-20">
      <div className="rev-shell-hero rev-accent-mist rounded-[30px] px-6 py-12 text-center md:px-12 md:py-16"><p className="rev-kicker">A focused first step</p><h2 className="mx-auto mt-5 max-w-3xl text-balance text-[clamp(2.7rem,4.8vw,4.4rem)] font-normal leading-[1.01] tracking-[-0.02em] [font-family:var(--font-instrument-serif)]">Start with one period.<br /><em className="text-[color:var(--accent-light)]">Keep what you learn.</em></h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[color:var(--text-muted)]">Bring your internal usage, review the source evidence and leave with a clearer view of the differences worth investigating.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="rev-button-primary" href="/start?plan=scan">Start with a {scanPrice} scan</Link><Link className="rev-button-secondary" href="/demo">See the report first</Link></div><p className="mt-4 text-[11px] leading-6 text-[color:var(--text-subtle)]">The public example uses fictional data. Your own data requires a separate paid purchase.</p></div>
    </section>
    <AiMarketingFooter />
  </main>;
}
