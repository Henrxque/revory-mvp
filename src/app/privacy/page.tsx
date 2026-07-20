import Link from "next/link";

import { REVORY_LEGAL } from "@/content/revory-legal";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Privacy</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">
          REVORY Privacy Notice
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          {REVORY_LEGAL.legalName}, CNPJ {REVORY_LEGAL.taxId}, operates REVORY.
          We act as controller for account, security, billing and product-usage data,
          and generally as processor for business exports a customer submits for its
          workspace analysis.
        </p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-[color:var(--text-muted)]">
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Data we process</h2>
            <p className="mt-2">Account and authentication details; workspace settings; customer-authorized CSV/XLSX exports; saved column matches; analysis findings and dispositions; security and audit events; product telemetry; support communications; and billing identifiers supplied by Stripe. REVORY does not store full payment-card details.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Why we process it</h2>
            <p className="mt-2">To perform the contract, provide and secure the service, respond to requests, process authorized billing, prevent abuse, maintain evidence integrity, comply with legal obligations and improve reliability. Where consent is required, it may be withdrawn without affecting prior lawful processing.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Workspace evidence</h2>
            <p className="mt-2">Contractor exports remain scoped to the authorized workspace and preserve source provenance and external IDs. Ambiguous records remain visible and are not silently linked by approximate name or amount. Optional AI receives only a bounded, sanitized column profile for mapping or explanation and does not receive raw customer rows in that provider boundary.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Sharing and international transfers</h2>
            <p className="mt-2">We use only the providers listed on the Subprocessors page for hosting, database, authentication, email, optional bounded AI and billing. Some processing occurs outside Brazil. Contractual, technical and organizational safeguards must be maintained for applicable international transfers.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Retention and deletion</h2>
            <p className="mt-2">Workspace users can export current stored data and request deletion from settings. Configured retention removes expired analysis data, while limited account, security, billing, legal and backup records may remain for their required period. The production restore drill and final retention schedule remain launch evidence, not a certification claim.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Your rights</h2>
            <p className="mt-2">Subject to applicable law and identity verification, you may request confirmation, access, correction, portability where applicable, information about sharing, objection, restriction, anonymization or deletion. Workspace end-customer requests should normally be directed first to the REVORY customer that controls the imported data.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">Privacy contact</h2>
            <p className="mt-2">Send privacy requests to <a className="text-[color:var(--accent-light)] underline" href={`mailto:${REVORY_LEGAL.privacyEmail}`}>{REVORY_LEGAL.privacyEmail}</a>. Do not email imported files, passwords, recovery codes or payment-card data. The registered business address is {REVORY_LEGAL.address}.</p>
          </section>
        </div>
        <p className="mt-8 text-xs text-[color:var(--text-subtle)]">
          Effective {REVORY_LEGAL.effectiveDate} · Operational version pending final
          review by qualified counsel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rev-action-button inline-flex" href="/">Back to REVORY</Link>
          <Link className="rev-button-ghost inline-flex" href="/subprocessors">View subprocessors</Link>
        </div>
      </section>
    </main>
  );
}
