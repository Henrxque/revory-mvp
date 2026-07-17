import type { RevoryOfferKey } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { hasCompletedQuoteRecoveryBaseline } from "@/services/billing/commercial-readiness";
import { getWorkspaceEntitlements } from "@/services/billing/entitlements";
import { isPaidCheckoutReleaseEnabled, isRevoryOfferConfigured } from "@/services/billing/revory-offers";

type BillingOffer = {
  badge: string;
  description: string;
  entryCondition: string;
  features: readonly string[];
  featured?: boolean;
  label: string;
  offerKey: RevoryOfferKey | null;
  price: string;
  priceNote: "paid once" | "per month";
  stage: string;
};

const starterPlan: BillingOffer =
  {
    badge: "Continue monthly",
    description:
      "Refresh Quote Recovery evidence as new exports arrive and see what is new, persistent, worsening or resolved.",
    entryCondition: "Available after your first Quote Recovery Audit is complete.",
    features: [
      "Recurring export refreshes",
      "Saved mapping reuse",
      "Movement between reads",
      "Recurring access and billing portal",
    ],
    label: "Starter",
    offerKey: "STARTER",
    price: "US$399",
    priceNote: "per month",
    stage: "Quote Recovery continuity",
  };

const quoteRecoveryAudit: BillingOffer =
  {
    badge: "One-time option",
    description:
      "Create the first evidence-backed read of estimates and follow-ups before deciding whether recurring monitoring is useful.",
    entryCondition: "Paid once. Continue with Starter only if repeated reviews are useful.",
    features: [
      "Structured export intake",
      "Data Quality and column review",
      "Prioritized Quote Recovery findings",
      "Executive CSV and PDF exports",
    ],
    label: "Quote Recovery Audit",
    offerKey: "QUOTE_RECOVERY_AUDIT",
    price: "US$799",
    priceNote: "paid once",
    stage: "Your first REVORY read",
  };

const growthPlan: BillingOffer =
  {
    badge: "Recommended",
    description:
      "Build a recurring management rhythm with longer movement history, segmentation and one focused weekly decision.",
    entryCondition: "Starts as a monthly subscription. No one-time Audit is added automatically.",
    features: [
      "Recurring Quote Recovery access",
      "Twelve-month movement history",
      "Source, owner and service segmentation",
      "Weekly management read and PDF",
    ],
    featured: true,
    label: "Growth",
    offerKey: "GROWTH",
    price: "US$799",
    priceNote: "per month",
    stage: "Main recurring plan",
  };

const futureOffers: readonly BillingOffer[] = [
  {
    badge: "Coming later",
    description:
      "Add Revenue Realization, change-order, underbilling and margin review with higher-volume controls.",
    entryCondition: "Not available for purchase yet.",
    features: [
      "Quote Recovery and Growth intelligence",
      "Change-order and underbilling review",
      "Margin-basis intelligence",
      "Higher-volume controls",
    ],
    label: "Pro",
    offerKey: "PRO",
    price: "US$1,499",
    priceNote: "per month",
    stage: "Revenue Realization recurring",
  },
  {
    badge: "Coming later",
    description:
      "Establish an advanced estimate-to-job, invoice and change-order baseline only when the imported evidence supports it.",
    entryCondition: "Not available for purchase yet.",
    features: [
      "Explicit record matching",
      "Unmatched and conflict review",
      "Deterministic billing reconciliation",
      "Full Revenue Leak executive report",
    ],
    label: "Full Revenue Leak Audit",
    offerKey: null,
    price: "US$1,499",
    priceNote: "paid once",
    stage: "Advanced Revenue Realization baseline",
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

function OfferCard({
  activeOfferKeys,
  compact = false,
  hasQuoteRecoveryBaseline,
  internalPreview,
  offer,
}: {
  activeOfferKeys: ReadonlySet<RevoryOfferKey>;
  compact?: boolean;
  hasQuoteRecoveryBaseline: boolean;
  internalPreview: boolean;
  offer: BillingOffer;
}) {
  const isActive = offer.offerKey ? activeOfferKeys.has(offer.offerKey) : false;
  const needsQuoteRecoveryBaseline = offer.offerKey === "STARTER" && !hasQuoteRecoveryBaseline;
  const checkoutConfigured = offer.offerKey ? isRevoryOfferConfigured(offer.offerKey) : false;

  return (
    <article
      className={`rev-checkout-card flex flex-col rounded-[26px] border p-5 md:p-6 ${
        compact ? "min-h-[360px]" : "min-h-[390px]"
      } ${offer.featured ? "rev-checkout-card-primary border-[rgba(67,179,155,0.4)]" : "border-[color:var(--border)]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rev-label">{offer.stage}</p>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[color:var(--foreground)]">
            {offer.label}
          </h3>
        </div>
        <RevoryStatusBadge tone={offer.featured ? "accent" : "future"}>{offer.badge}</RevoryStatusBadge>
      </div>

      <div className="mt-5">
        <p className="text-[clamp(2.45rem,3.5vw,3.35rem)] font-semibold leading-none tracking-[-0.055em] text-[color:var(--foreground)]">
          {offer.price}
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--accent-light)]">
          {offer.priceNote}
        </p>
      </div>

      <p className="mt-4 text-[13px] leading-6 text-[color:var(--text-muted)]">{offer.description}</p>

      <div className="my-4 h-px bg-[color:var(--border)]" />

      <ul className="space-y-2">
        {offer.features.map((feature) => (
          <li className="flex items-start gap-3" key={feature}>
            <CheckIcon />
            <span className="text-[12px] leading-5 text-[color:var(--text-muted)]">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <p className="mb-3 text-[11px] font-semibold leading-5 text-[color:var(--text-subtle)]">
          {offer.entryCondition}
        </p>
        {isActive ? (
          <Link className="rev-button-primary w-full justify-center" href="/app/dashboard">
            Open your REVORY workspace
          </Link>
        ) : needsQuoteRecoveryBaseline ? (
          <button className="rev-action-button w-full cursor-not-allowed justify-center opacity-60" disabled type="button">
            Complete the US$799 Audit first
          </button>
        ) : checkoutConfigured && offer.offerKey ? (
          <form action={`/api/billing/checkout?offer=${offer.offerKey}`} method="post">
            <button className="rev-button-primary w-full justify-center" type="submit">
              {offer.offerKey === "QUOTE_RECOVERY_AUDIT" ? "Buy the US$799 Audit once" : `Continue with ${offer.label}`}
            </button>
          </form>
        ) : internalPreview && offer.offerKey === "QUOTE_RECOVERY_AUDIT" ? (
          <Link className="rev-button-secondary w-full justify-center" href="/app/dashboard">
            Open REVORY workspace
          </Link>
        ) : (
          <button className="rev-action-button w-full cursor-not-allowed justify-center opacity-60" disabled type="button">
            Not available yet
          </button>
        )}
      </div>
    </article>
  );
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const internalPreview = isInternalMigrationPreviewEnabled();
  const paidCheckoutEnabled = isPaidCheckoutReleaseEnabled();
  const session = await getAuthSession();
  const params = await searchParams;

  if (!session?.user?.id && !internalPreview) {
    redirect("/sign-in?redirect_url=%2Fstart");
  }

  const appContext = session?.user?.id ? await getAppContext() : null;
  const [activeEntitlements, hasQuoteRecoveryBaseline] = appContext
    ? await Promise.all([
        getWorkspaceEntitlements(appContext.workspace.id),
        hasCompletedQuoteRecoveryBaseline(appContext.workspace.id),
      ])
    : [[], false];
  const activeOfferKeys = new Set(activeEntitlements.map((entitlement) => entitlement.offerKey));

  return (
    <main className="rev-checkout-page min-h-screen px-4 py-3 font-[family:var(--font-app)] md:px-7 md:py-4">
      <div className="mx-auto max-w-[1240px]">
        <header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[22px] px-5 py-2.5 backdrop-blur-xl">
          <Link className="inline-flex items-center" href="/">
            <RevoryLogo compact />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <RevoryStatusBadge tone="accent">Quote Recovery path</RevoryStatusBadge>
            <RevoryStatusBadge tone={paidCheckoutEnabled ? "accent" : "future"}>
              {paidCheckoutEnabled ? "Secure checkout" : "Activation pending"}
            </RevoryStatusBadge>
            {session?.user?.id ? <AuthSignOutButton callbackUrl="/" compact /> : null}
          </div>
        </header>

        <section className="grid gap-7 py-7 lg:min-h-[calc(100svh-92px)] lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-8 lg:py-4">
          <div className="px-2 lg:pr-2">
            <p className="rev-kicker">Recurring revenue intelligence</p>
            <h1 className="mt-3 max-w-[36rem] text-balance text-[clamp(2.4rem,4.2vw,4rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-[color:var(--foreground)]">
              Make Growth your recurring revenue-leak management rhythm.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[color:var(--text-muted)]">
              Growth is the main REVORY plan for teams that want history, segmentation and a focused weekly management decision.
            </p>
            <p className="mt-3 max-w-xl text-xs font-semibold leading-5 text-[color:var(--accent-light)]">
              US$799 per month. A one-time Audit is never added automatically.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.06)] px-4 py-3">
                <p className="rev-label">01 · Main recurring plan</p>
                <p className="mt-1 text-sm font-bold">Growth · US$799 per month</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3">
                <p className="rev-label">02 · Lighter continuity</p>
                <p className="mt-1 text-sm font-bold">Starter · US$399 per month after the Audit</p>
              </div>
            </div>
            {params.billing === "baseline-required" ? (
              <p className="mt-4 max-w-xl rounded-2xl border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.08)] px-4 py-3 text-xs font-semibold text-[color:var(--accent-light)]">
                Complete your Quote Recovery Audit before starting Starter.
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <p className="rev-kicker">Monthly plans</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]" id="quote-recovery-path-title">
                  Choose your recurring plan
                </h2>
              </div>
              <p className="max-w-xs text-xs leading-5 text-[color:var(--text-subtle)]">
                Growth is the recommended path. Starter requires the completed one-time Audit.
              </p>
            </div>
            <div aria-labelledby="quote-recovery-path-title" className="grid items-stretch gap-3 md:grid-cols-2">
              {[growthPlan, starterPlan].map((offer) => (
                <OfferCard
                  activeOfferKeys={activeOfferKeys}
                  compact
                  hasQuoteRecoveryBaseline={hasQuoteRecoveryBaseline}
                  internalPreview={internalPreview}
                  key={offer.label}
                  offer={offer}
                />
              ))}
            </div>

            <details className="rev-checkout-future mt-3 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.014)]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-[color:var(--text-muted)] transition hover:text-[color:var(--foreground)]">
                <span>View one-time Audit and advanced Pro options</span>
                <span aria-hidden="true" className="text-lg text-[color:var(--accent-light)]">+</span>
              </summary>
              <div className="grid gap-3 border-t border-[color:var(--border)] p-3 lg:grid-cols-3">
                {[quoteRecoveryAudit, ...futureOffers].map((offer) => (
                  <OfferCard
                    activeOfferKeys={activeOfferKeys}
                    compact
                    hasQuoteRecoveryBaseline={hasQuoteRecoveryBaseline}
                    internalPreview={internalPreview}
                    key={offer.label}
                    offer={offer}
                  />
                ))}
              </div>
            </details>
            <p className="mt-3 text-center text-[11px] leading-5 text-[color:var(--text-subtle)]">
              {paidCheckoutEnabled
                ? "Checkout uses Stripe. Subscriptions renew monthly until canceled from billing."
                : "Checkout activation is pending final Stripe verification. No charge can be made from this screen yet."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
