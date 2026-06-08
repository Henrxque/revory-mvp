import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="mx-auto max-w-3xl rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(19,18,26,0.94),rgba(12,11,17,0.96))] p-6 shadow-[var(--shadow-soft)] md:p-9">
        <p className="rev-kicker">Terms</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
          REVORY Terms
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          REVORY is provided as narrow revenue leak detection software for premium MedSpas,
          based on structured clinic data. It is not a CRM, inbox, scheduling system,
          healthcare BI suite, revenue cycle management platform, clinical or diagnostic
          software, or managed consulting service.
        </p>
        <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>
            Customers are responsible for providing accurate workspace, appointment, client,
            billing, and setup information. REVORY reads the available data and surfaces bounded
            revenue leak, data quality and guidance outputs based on that information.
          </p>
          <p>
            Revenue at risk is an estimate based on imported or connected data, not a confirmed
            accounting loss. Operational and data-quality risks may indicate issues to review,
            but they are not counted as financial loss unless deterministic financial evidence
            supports that estimate.
          </p>
          <p>
            AI-assisted CSV review is advisory and requires user review. AI does not import data,
            create revenue leaks, calculate confirmed revenue loss, or override deterministic
            validation. Unsupported datasets, including payments and lead-shaped files, may be
            profiled when visible in the product but are not imported unless the current product
            flow explicitly supports them.
          </p>
          <p>
            Summaries and guidance outputs are not guarantees of conversion, revenue, attribution,
            clinical outcomes, legal outcomes, or business results. REVORY does not provide
            medical, clinical, legal, accounting, or billing advice.
          </p>
          <p>
            If billing is active, subscription access, card updates, and cancellation are handled
            through the configured billing flow. These terms may be updated as the product and
            commercial motion mature.
          </p>
        </div>
        <Link className="rev-action-button mt-8 inline-flex" href="/">
          Back to REVORY
        </Link>
      </section>
    </main>
  );
}
