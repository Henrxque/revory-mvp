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
          REVORY Seller uses account, workspace, setup, import, booking assistance, billing,
          and product usage data only to operate the software, keep the workspace readable,
          support billing, and improve reliability. The product is not designed to resell clinic
          data or run hidden manual services behind the interface.
        </p>
        <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>
            Imported appointment and client data is used to generate booked proof, revenue reads,
            readiness states, suggested messages, and executive summaries inside the customer
            workspace.
          </p>
          <p>
            Access to REVORY Seller is authenticated. Billing, when enabled, is handled through
            Stripe. LLM-assisted suggestions are bounded to short booking assistance and should
            not be treated as a free-form conversation engine.
          </p>
          <p>
            For privacy questions or deletion requests, contact the REVORY operator through the
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
