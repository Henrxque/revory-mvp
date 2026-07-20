import Link from "next/link";

import { REVORY_LEGAL } from "@/content/revory-legal";

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Data Processing Addendum</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">DPA status: legal review required.</h1>
        <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>{REVORY_LEGAL.legalName}, CNPJ {REVORY_LEGAL.taxId}, generally acts as a processor for workspace exports submitted by a customer and as a controller for account, billing, security and product-evidence data.</p>
          <p>The final DPA must identify the parties, subject matter, duration, data categories, documented instructions, confidentiality, security measures, subprocessors, international transfer mechanism, deletion/return obligations and audit terms.</p>
          <p>This page is a transparent status notice, not an executable DPA. A customer that requires a DPA should contact <a className="text-[color:var(--accent-light)] underline" href={`mailto:${REVORY_LEGAL.privacyEmail}`}>{REVORY_LEGAL.privacyEmail}</a>. Do not open a paid beta that requires an executed DPA until qualified counsel approves the final document.</p>
        </div>
        <p className="mt-8 text-xs text-[color:var(--text-subtle)]">Updated {REVORY_LEGAL.effectiveDate}.</p>
        <Link className="rev-action-button mt-8 inline-flex" href="/">Back to REVORY</Link>
      </section>
    </main>
  );
}
