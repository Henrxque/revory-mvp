import Link from "next/link";

import { REVORY_LEGAL } from "@/content/revory-legal";

const sections = [
  [
    "1. Provider and acceptance",
    `REVORY is operated by ${REVORY_LEGAL.legalName}, CNPJ ${REVORY_LEGAL.taxId}, from ${REVORY_LEGAL.address}. By creating an account, submitting data or purchasing an available offer, you agree to these Terms and the linked Privacy Notice and Cancellation and Refund Policy.`,
  ],
  [
    "2. Service scope",
    "REVORY is narrow, self-service revenue leak intelligence for high-ticket service businesses. It is not a CRM, inbox, autonomous follow-up agent, field-service system, accounting platform, project-management suite or managed consulting service. Only an offer explicitly marked available and connected to its matching checkout and entitlement is for sale.",
  ],
  [
    "3. Accounts and authorized use",
    "You must provide accurate account information, protect access credentials and use REVORY only for a business or workspace you are authorized to represent. You are responsible for users invited to your workspace and for the lawful collection and upload of customer, estimate and activity data.",
  ],
  [
    "4. Customer data and instructions",
    "You retain ownership of uploaded business data. You grant REVORY the limited right to process it only to provide, secure, support and measure the service, comply with law and prevent abuse. Workspace exports remain isolated by workspace. You must not upload data you lack authority to process or content that is unlawful, malicious or outside the supported product scope.",
  ],
  [
    "5. Analysis and AI limits",
    "REVORY distinguishes observed amounts, deterministic calculations, estimated opportunities, process gaps and data-quality risks. AI-assisted mapping or explanation is optional, bounded and subject to review; AI does not create confirmed leaks, calculate final financial values, send follow-ups or override deterministic validation.",
  ],
  [
    "6. Prices, renewals and taxes",
    "One-time Audits are charged once. Recurring plans renew monthly until canceled. Prices and billing cadence are shown before payment, and taxes may apply. You authorize Stripe to process the selected charge. Subscription cancellation and refund eligibility follow the published Cancellation and Refund Policy.",
  ],
  [
    "7. Availability and changes",
    "REVORY may maintain, improve, limit or discontinue features to protect security, evidence integrity or product focus. We do not promise uninterrupted service, but we will use commercially reasonable care and communicate material changes when practical. Roadmap, preview and gated capabilities are not purchased services.",
  ],
  [
    "8. No guaranteed outcome",
    "Outputs are decision-support signals, not guarantees of recovery, revenue, accounting conclusions, legal outcomes or business results. REVORY does not provide legal, accounting, tax or billing advice. Your team remains responsible for verifying source records and deciding whether and how to act.",
  ],
  [
    "9. Intellectual property",
    "REVORY and its software, design, methods, documentation and brand are owned by the provider or its licensors. These Terms grant only a limited, non-exclusive, non-transferable right to use the service during the applicable access period. You may not reverse engineer, resell, scrape or misuse the service except where law expressly permits.",
  ],
  [
    "10. Suspension and termination",
    "We may suspend access when reasonably necessary to address nonpayment, unlawful use, security risk, abuse or a material breach. You may stop using the service at any time. Data export and deletion options are described in the product and Privacy Notice, subject to security, legal and backup-retention limits.",
  ],
  [
    "11. Liability boundary",
    "To the maximum extent permitted by law, REVORY is provided without a guarantee of a particular financial result. Neither party excludes liability that cannot legally be excluded. Any negotiated liability cap, warranty or indemnity for an enterprise customer must be stated in a separate signed agreement; qualified counsel must approve the final production version of this clause before public paid launch.",
  ],
  [
    "12. Governing law and contact",
    `These Terms are governed by Brazilian law. Courts in Sao Paulo, SP, Brazil have jurisdiction, without limiting any mandatory consumer venue or other non-waivable right. Questions may be sent to ${REVORY_LEGAL.supportEmail}.`,
  ],
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Terms</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">
          REVORY Terms of Service
        </h1>
        <div className="mt-8 space-y-7 text-sm leading-7 text-[color:var(--text-muted)]">
          {sections.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-lg font-bold text-[color:var(--foreground)]">{title}</h2>
              <p className="mt-2">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-xs text-[color:var(--text-subtle)]">
          Effective {REVORY_LEGAL.effectiveDate} · Operational version pending final
          review by qualified counsel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rev-action-button inline-flex" href="/">
            Back to REVORY
          </Link>
          <Link className="rev-button-ghost inline-flex" href="/refunds">
            Cancellation and refunds
          </Link>
        </div>
      </section>
    </main>
  );
}
