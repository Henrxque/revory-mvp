import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";

const offers = [
  {
    description:
      "One focused estimate and follow-up review with prioritized evidence and an executive export.",
    features: [
      "Structured export intake",
      "Data Quality and mapping review",
      "Prioritized Quote Recovery findings",
      "Executive result export",
    ],
    featured: true,
    label: "Quote Recovery Audit",
    price: "$799",
    priceNote: "one-time target",
    stage: "Earliest eligible offer",
  },
  {
    description:
      "A recurring Quote Recovery control loop after the audit workflow and second-read gate pass.",
    features: [
      "Everything in the audit flow",
      "Saved mapping refresh",
      "New and persistent finding movement",
      "Billing portal and recurring access",
    ],
    label: "Starter",
    price: "$399",
    priceNote: "monthly target",
    stage: "Recurring beta target",
  },
  {
    description:
      "Estimate-to-realized-revenue reconciliation after jobs, invoices and change-order gates pass.",
    features: [
      "Explicit record matching",
      "Unmatched and conflict review",
      "Deterministic billing reconciliation",
      "Change-order and margin evidence",
    ],
    label: "Full Revenue Leak Audit",
    price: "$1,499",
    priceNote: "one-time future target",
    stage: "Roadmap gated",
  },
] as const;

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-light)]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default async function StartPage() {
  const internalPreview = isInternalMigrationPreviewEnabled();
  const session = await getAuthSession();

  if (!session?.user?.id && !internalPreview) {
    redirect("/sign-in?redirect_url=%2Fstart");
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 font-[family:var(--font-app)] md:px-7 md:py-6">
      <div className="mx-auto max-w-[1380px]">
        <header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[26px] px-5 py-3.5 backdrop-blur-xl">
          <Link className="inline-flex items-center" href="/">
            <RevoryLogo compact />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <RevoryStatusBadge tone="accent">Checkout restored</RevoryStatusBadge>
            <RevoryStatusBadge tone={internalPreview ? "real" : "future"}>
              {internalPreview ? "Internal preview" : "Commercial gate pending"}
            </RevoryStatusBadge>
            {session?.user?.id ? (
              <AuthSignOutButton callbackUrl="/" compact />
            ) : null}
          </div>
        </header>

        <section className="rev-accent-mist mx-auto max-w-4xl px-2 pb-10 pt-14 text-center md:pt-20">
          <p className="rev-kicker">REVORY access</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-[color:var(--foreground)]">
            Choose the revenue leak read your data can support.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[color:var(--text-muted)]">
            The proven checkout and entitlement shell is back. Prices remain validation targets, and no charge is enabled until the matching product gate passes.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {offers.map((offer) => (
            <article
              key={offer.label}
              className={`flex min-h-[520px] flex-col rounded-[32px] border p-6 shadow-[0_28px_80px_rgba(0,0,0,0.22)] md:p-7 ${
                "featured" in offer && offer.featured
                  ? "border-[rgba(67,179,155,0.4)] bg-[linear-gradient(155deg,rgba(67,179,155,0.11),color-mix(in_srgb,#252729_42%,#141516))]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="rev-label">{offer.stage}</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[color:var(--foreground)]">
                    {offer.label}
                  </h2>
                </div>
                {"featured" in offer && offer.featured ? (
                  <RevoryStatusBadge tone="accent">Primary path</RevoryStatusBadge>
                ) : null}
              </div>

              <div className="mt-7">
                <p className="text-[clamp(3rem,5vw,4.5rem)] font-semibold leading-none tracking-[-0.06em] text-[color:var(--foreground)]">
                  {offer.price}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-[color:var(--text-subtle)]">
                  {offer.priceNote}
                </p>
              </div>

              <p className="mt-6 text-sm leading-7 text-[color:var(--text-muted)]">
                {offer.description}
              </p>

              <div className="my-6 h-px bg-[color:var(--border)]" />

              <ul className="space-y-3">
                {offer.features.map((feature) => (
                  <li className="flex items-start gap-3" key={feature}>
                    <CheckIcon />
                    <span className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                {internalPreview ? (
                  <Link className="rev-button-primary w-full justify-center" href="/app/dashboard">
                    Open restored workspace
                  </Link>
                ) : (
                  <button
                    className="rev-action-button w-full cursor-not-allowed justify-center opacity-60"
                    disabled
                    type="button"
                  >
                    Checkout opens after validation
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-6 max-w-4xl rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-5 py-4 text-center">
          <p className="text-[12px] leading-6 text-[color:var(--text-muted)]">
            Stripe checkout, customer sync, webhooks, portal and entitlement plumbing remain preserved. Existing MedSpa prices are not reused for the new REVORY offers.
          </p>
        </section>
      </div>
    </main>
  );
}
