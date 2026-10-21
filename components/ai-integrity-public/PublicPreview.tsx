import Link from "next/link";

import { RevoryLogo } from "@/components/brand/RevoryLogo";

const demoHref = "/ai-integrity/demo";

export function PublicPreviewNav() {
  return (
    <header className="border-b border-[color:var(--border)] bg-[rgba(20,21,22,.86)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link aria-label="REVORY home" href="/"><RevoryLogo compact /></Link>
        <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[color:var(--text-muted)] sm:gap-6">
          <Link className="hover:text-[color:var(--accent)]" href={demoHref}>Synthetic demo</Link>
          <Link className="hover:text-[color:var(--accent)]" href="/ai-integrity/preview-policy">Preview scope</Link>
          <Link className="rev-button-secondary !min-h-9 !px-4 !py-2 !text-xs" href="/sign-in">Existing customer sign in</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicPreviewFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] px-5 py-8 text-xs text-[color:var(--text-subtle)] md:px-8">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4">
        <p>REVORY · Revenue &amp; AI Margin Integrity</p>
        <div className="flex flex-wrap gap-5">
          <Link className="hover:text-[color:var(--foreground)]" href={demoHref}>Synthetic demo</Link>
          <Link className="hover:text-[color:var(--foreground)]" href="/ai-integrity/preview-policy">Preview scope</Link>
          <Link className="hover:text-[color:var(--foreground)]" href="/sign-in">Existing customers</Link>
        </div>
        <p className="w-full text-[11px]">Public presentation only. Customer scans, connections and purchases are not available in this preview.</p>
      </div>
    </footer>
  );
}

const sources = [
  { number: "01", title: "Billing context", copy: "Stripe records can establish billing state and amounts for a defined period. They do not prove AI consumption." },
  { number: "02", title: "Internal usage", copy: "Your product ledger records who used what. Missing or duplicated events remain a data-quality question." },
  { number: "03", title: "Provider report", copy: "Provider usage and cost show what was reported. Shared projects do not identify a customer on their own." },
] as const;

export function AiIntegrityPublicLanding() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] [font-family:var(--font-dm-sans)]">
      <PublicPreviewNav />
      <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-14 md:px-8 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-28">
        <div>
          <p className="rev-kicker">REVORY · AI SaaS product preview</p>
          <h1 className="mt-6 max-w-2xl text-[clamp(3.4rem,6vw,5.6rem)] font-normal leading-[.97] tracking-[-.03em] [font-family:var(--font-instrument-serif)]">
            Understand your AI spend.<br /><span className="text-[color:var(--accent)]">Follow the evidence.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-[color:var(--text-muted)]">
            REVORY is being built for AI SaaS founders to compare billing context, internal usage and provider cost in one explainable read. See how an attribution gap and a usage difference would be presented.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rev-button-primary" href={demoHref}>Explore the synthetic demo ↗</Link>
            <a className="rev-button-secondary" href="#approach">See the approach</a>
          </div>
          <p className="mt-5 max-w-lg text-xs leading-6 text-[color:var(--text-subtle)]">
            This is a public presentation with fictional data. Customer scans, source connections and purchases are not available yet.
          </p>
        </div>
        <div className="rev-shell-hero rev-accent-mist rounded-[32px] p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="rev-kicker">Example read · August 2026</p><h2 className="mt-2 text-lg font-bold">Aster AI</h2></div>
            <span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-[10px] font-semibold text-[color:var(--accent)]">Synthetic only</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[["Billing", "Invoice context"], ["Internal ledger", "8.64M tokens"], ["Provider", "USD 2,455.75"]].map(([label, value]) => (
              <div className="min-w-0 rounded-xl border border-[color:var(--border)] bg-[color:var(--background-card)] p-3" key={label}>
                <p className="text-[10px] text-[color:var(--text-subtle)]">{label}</p><p className="mt-2 text-xs font-bold leading-5">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-[color:var(--border-accent)] bg-[color:var(--background-card)] p-5">
              <p className="text-xs text-[color:var(--text-muted)]">Reported spend without a reliable customer link</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--accent)]">USD 615.25</p>
              <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-subtle)]">Coverage gap in a fictional report. It is not confirmed loss.</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background-card)] p-5">
              <p className="text-xs text-[color:var(--text-muted)]">Comparable provider versus ledger usage</p>
              <p className="mt-2 text-xl font-semibold">+380,000 tokens</p>
              <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-subtle)]">A calculated difference to review, not a monetary claim.</p>
            </div>
          </div>
          <Link className="mt-5 inline-block text-xs font-semibold text-[color:var(--accent)]" href={demoHref}>Inspect this fictional example →</Link>
        </div>
      </section>
      <section className="border-y border-[color:var(--border)] px-5 py-18 md:px-8" id="approach">
        <div className="mx-auto max-w-[1176px]">
          <p className="rev-kicker">Three independent sources</p>
          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1fr]">
            <h2 className="text-4xl font-normal leading-tight [font-family:var(--font-instrument-serif)] md:text-5xl">A difference is useful when you can inspect why it exists.</h2>
            <p className="max-w-lg text-sm leading-8 text-[color:var(--text-muted)]">The planned Integrity Scan reviews a closed period, explicit identity links and data quality before showing findings. Unmatched records remain visible. A provider total alone cannot establish customer-level margin.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {sources.map((source) => <article className="rev-marketing-card rounded-[26px] p-6" key={source.number}>
              <p className="text-xs text-[color:var(--accent)]">{source.number}</p>
              <h3 className="mt-5 text-base font-bold">{source.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{source.copy}</p>
            </article>)}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1fr]">
        <div><p className="rev-kicker">What you can explore today</p><h2 className="mt-5 text-4xl font-normal leading-tight [font-family:var(--font-instrument-serif)] md:text-5xl">A sample report, with its limits in view.</h2></div>
        <div className="rev-shell-panel rounded-[28px] p-7">
          <p className="text-sm leading-8 text-[color:var(--text-muted)]">The demo uses fictional data to show source context, attribution coverage and two narrow review items. It does not upload files, connect accounts, run a customer scan or charge a card.</p>
          <Link className="rev-button-primary mt-6 inline-flex" href={demoHref}>Open the synthetic demo ↗</Link>
        </div>
      </section>
      <PublicPreviewFooter />
    </main>
  );
}
