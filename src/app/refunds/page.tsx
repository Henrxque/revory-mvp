import Link from "next/link";

import { REVORY_LEGAL } from "@/content/revory-legal";

export default function RefundsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-3xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Cancellation and refunds</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">
          A clear policy for every REVORY offer.
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
          This policy applies to eligible purchases from {REVORY_LEGAL.legalName},
          CNPJ {REVORY_LEGAL.taxId}. It does not limit mandatory rights that apply
          under consumer or other applicable law.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[color:var(--text-muted)]">
          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">
              One-time Audits
            </h2>
            <p className="mt-2">
              You may request a full refund before the Audit analysis begins. Once
              you confirm the imported files and use the one-time analysis capacity,
              the purchase is generally final because the contracted digital service
              has started. We still refund duplicate or unauthorized charges, a
              verified failure by REVORY to provide the purchased service, and any
              amount required by applicable law.
            </p>
            <p className="mt-2">
              An Audit is a review of supported evidence, not a promise that the data
              contains a recoverable opportunity. Finding no supported opportunity is
              not, by itself, a service failure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">
              Monthly subscriptions
            </h2>
            <p className="mt-2">
              You can cancel a recurring plan at any time through the secure billing
              portal. Cancellation normally takes effect at the end of the current
              paid billing period, and no later renewal is charged. Current-period
              fees are not prorated or refunded solely because the subscription is
              canceled early, except when required by law or when a duplicate,
              unauthorized or incorrect charge is confirmed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">
              Statutory withdrawal rights
            </h2>
            <p className="mt-2">
              A customer who qualifies as a consumer under Brazilian law may have a
              seven-day statutory right to withdraw from an online purchase. REVORY
              honors that and any other non-waivable right that applies to the
              transaction, regardless of the commercial rules above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[color:var(--foreground)]">
              How to request a cancellation or refund
            </h2>
            <p className="mt-2">
              Email{" "}
              <a className="text-[color:var(--accent-light)] underline" href={`mailto:${REVORY_LEGAL.billingEmail}`}>
                {REVORY_LEGAL.billingEmail}
              </a>{" "}
              from the account owner&apos;s address and include the workspace name,
              purchase date and reason. Do not send card numbers or imported customer
              data. Approved refunds return to the original payment method; bank or
              card processing time is outside REVORY&apos;s control.
            </p>
          </section>
        </div>

        <p className="mt-8 text-xs text-[color:var(--text-subtle)]">
          Effective {REVORY_LEGAL.effectiveDate} · Operational version pending final
          review by qualified counsel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rev-action-button inline-flex" href="/">
            Back to REVORY
          </Link>
          <Link className="rev-button-ghost inline-flex" href="/terms">
            Read Terms
          </Link>
        </div>
      </section>
    </main>
  );
}
