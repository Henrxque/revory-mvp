import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Terms</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
          REVORY Terms
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          REVORY is being developed as narrow, self-service revenue leak intelligence for high-ticket service businesses. It is not a CRM, inbox, autonomous follow-up agent, field-service system, accounting platform, project-management suite or managed consulting service.
        </p>
        <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>
            No contractor-native audit or subscription is currently offered from this migration build. Documented pricing, change-order, invoice, underbilling and margin capabilities remain hypotheses until their release gates pass.
          </p>
          <p>
            When analysis becomes available, customers will remain responsible for the accuracy and authority of uploaded data. REVORY will distinguish observed amounts, deterministic calculations, estimated opportunities, operational risks and data-quality risks.
          </p>
          <p>
            AI-assisted mapping or explanation is advisory, bounded and subject to user review. AI does not create confirmed leaks, calculate final financial values, send follow-ups or override deterministic validation.
          </p>
          <p>
            Outputs are not guarantees of recovery, revenue, accounting treatment, legal outcomes or business results. REVORY does not provide legal, accounting, tax or billing advice.
          </p>
        </div>
        <Link className="rev-action-button mt-8 inline-flex" href="/">
          Back to REVORY
        </Link>
      </section>
    </main>
  );
}
