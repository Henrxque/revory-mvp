import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isRevoryOfferConfigured } from "@/services/billing/revory-offers";

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
    offerKey: "QUOTE_RECOVERY_AUDIT" as const,
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
    offerKey: "STARTER" as const,
    price: "$399",
    priceNote: "monthly target",
    stage: "Recurring beta target",
  },
  {
    description:
      "Tier 2 findings and the executive report pass the local product gate; controlled access remains gated by independent review and commercial configuration.",
    features: [
      "Explicit record matching",
      "Unmatched and conflict review",
      "Deterministic billing reconciliation",
      "Evidence-first Tier 2 findings",
      "Full Revenue Leak executive report",
    ],
    label: "Full Revenue Leak Audit",
    offerKey: null,
    price: "$1,499",
    priceNote: "one-time future target",
    stage: "Commercial gate pending",
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
    <main className="rev-checkout-page min-h-screen px-4 py-3 font-[family:var(--font-app)] md:px-7 md:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1240px] flex-col">
        <header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[22px] px-5 py-2.5 backdrop-blur-xl">
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

        <section className="mx-auto max-w-4xl px-2 pb-7 pt-7 text-center md:pb-8 md:pt-9">
          <p className="rev-kicker">REVORY access</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-[clamp(2.25rem,4.2vw,4rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[color:var(--foreground)]">
            Choose the revenue leak read your data can support.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-6 text-[color:var(--text-muted)] md:text-sm">
            Quote Recovery is implemented as a self-service flow. Checkout activates only when the matching Stripe sandbox price is configured.
          </p>
        </section>

        <section className="grid flex-1 items-stretch gap-4 lg:grid-cols-3">
          {offers.map((offer) => (
            <article
              key={offer.label}
              className={`rev-checkout-card flex min-h-[390px] flex-col rounded-[26px] border p-5 md:p-6 ${
                "featured" in offer && offer.featured
                  ? "rev-checkout-card-primary border-[rgba(67,179,155,0.4)]"
                  : "border-[color:var(--border)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="rev-label">{offer.stage}</p>
                  <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[color:var(--foreground)]">
                    {offer.label}
                  </h2>
                </div>
                {"featured" in offer && offer.featured ? (
                  <RevoryStatusBadge tone="accent">Primary path</RevoryStatusBadge>
                ) : null}
              </div>

              <div className="mt-5">
                <p className="text-[clamp(2.7rem,4vw,3.75rem)] font-semibold leading-none tracking-[-0.055em] text-[color:var(--foreground)]">
                  {offer.price}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-[color:var(--text-subtle)]">
                  {offer.priceNote}
                </p>
              </div>

              <p className="mt-4 text-[13px] leading-6 text-[color:var(--text-muted)]">
                {offer.description}
              </p>

              <div className="my-4 h-px bg-[color:var(--border)]" />

              <ul className="space-y-2">
                {offer.features.map((feature) => (
                  <li className="flex items-start gap-3" key={feature}>
                    <CheckIcon />
                    <span className="text-[12px] leading-5 text-[color:var(--text-muted)]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                {offer.offerKey && isRevoryOfferConfigured(offer.offerKey) ? (
                  <form action={`/api/billing/checkout?offer=${offer.offerKey}`} method="post">
                    <button className="rev-button-primary w-full justify-center" type="submit">
                      {offer.offerKey === "QUOTE_RECOVERY_AUDIT" ? "Buy the $799 audit" : "Start Starter at $399/month"}
                    </button>
                  </form>
                ) : internalPreview && offer.offerKey === "QUOTE_RECOVERY_AUDIT" ? (
                  <Link className="rev-button-secondary w-full justify-center" href="/app/dashboard">Open internal workspace</Link>
                ) : (
                  <button
                    className="rev-action-button w-full cursor-not-allowed justify-center opacity-60"
                    disabled
                    type="button"
                  >
                    {offer.offerKey ? "Stripe sandbox price required" : "Roadmap gated"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-3 max-w-4xl rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-5 py-2 text-center">
          <p className="text-[12px] leading-6 text-[color:var(--text-muted)]">
            New audit and Starter entitlements use dedicated Stripe price IDs. Existing legacy prices are never reused for these offers.
          </p>
        </section>
      </div>
    </main>
  );
}
