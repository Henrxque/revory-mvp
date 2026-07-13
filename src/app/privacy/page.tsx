import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Privacy</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
          REVORY Privacy Notice
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          REVORY uses account, workspace, setup, import, billing and product-usage data to operate the software, protect workspace access and improve reliability. It is not designed to resell customer data or hide manual analysis behind the interface.
        </p>
        <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
          <p>
            REVORY processes workspace-scoped contractor exports for Quote Recovery analysis. Historical internal migration structures are not presented as current product capability.
          </p>
          <p>
            Future estimate, customer, activity, job, invoice, change-order and cost imports must remain isolated by workspace and retain source provenance, external IDs and explicit matching evidence.
          </p>
          <p>
            When AI-assisted intake is enabled, it must receive only a bounded and sanitized profile sufficient for mapping or explanation, require human confirmation where appropriate, and preserve a deterministic fallback.
          </p>
          <p>
            Billing, when enabled and explicitly offered, is handled through Stripe. Workspace users can export current stored data and delete analysis data from settings. Configured retention removes expired analysis data; backup deletion and production restore behavior must still be verified in the deployment environment.
          </p>
          <p>
            REVORY uses data only to provide, secure and measure the product, process authorized billing, and meet legal obligations. It does not sell workspace exports. Requests for access, correction or deletion require a verified public privacy contact before paid launch.
          </p>
          <p className="text-xs text-[color:var(--text-subtle)]">Operational draft · updated July 13, 2026 · final legal entity, jurisdiction and privacy contact pending qualified review.</p>
        </div>
        <Link className="rev-action-button mt-8 inline-flex" href="/">
          Back to REVORY
        </Link>
      </section>
    </main>
  );
}
