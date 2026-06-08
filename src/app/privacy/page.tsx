import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="mx-auto max-w-3xl rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(19,18,26,0.94),rgba(12,11,17,0.96))] p-6 shadow-[var(--shadow-soft)] md:p-9">
        <p className="rev-kicker">Privacy</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
          REVORY Privacy Notice
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          REVORY uses account, workspace, setup, import, billing and product usage data only
          to operate the software, keep the workspace readable, support billing and improve
          reliability. The product is not designed to resell clinic data or run hidden manual
          services behind the interface.
        </p>
        <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>
            Structured appointment, client and import data may be processed to support revenue
            leak reads, estimated revenue at risk, data quality checks, bounded AI intake,
            triage and explanation support, and executive summaries inside the customer workspace.
          </p>
          <p>
            Access to REVORY is authenticated. Billing, when enabled, is handled through Stripe.
            LLM-assisted outputs are bounded to intake, triage, explanation and guidance support;
            they should not be treated as a free-form conversation engine or managed service.
          </p>
          <p>
            For AI-assisted CSV review, REVORY sends only a bounded, sanitized profile such as
            column names, field types, fill-rate signals and limited sample shapes. The full CSV
            file is not sent to the AI provider, and AI review does not import rows, create revenue
            leaks, or calculate confirmed revenue loss.
          </p>
          <p>
            For privacy questions or deletion requests, contact REVORY support through the
            support channel provided during purchase or onboarding.
          </p>
        </div>
        <Link className="rev-action-button mt-8 inline-flex" href="/">
          Back to REVORY
        </Link>
      </section>
    </main>
  );
}
