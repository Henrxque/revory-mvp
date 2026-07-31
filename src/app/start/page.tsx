import type { RevoryOfferKey } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { getWorkspaceEntitlements } from "@/services/billing/entitlements";
import { getRevoryOffer, isPaidCheckoutReleaseEnabled, isRevoryOfferConfigured } from "@/services/billing/revory-offers";
import { isStripeBillingConfigured } from "@/services/billing/stripe-runtime";

type BillingOffer = {
  badge: string;
  description: string;
  entryCondition?: string;
  features: readonly string[];
  featured?: boolean;
  label: string;
  offerKey: RevoryOfferKey;
  price: string;
  priceNote: "paid once" | "per month";
  stage: string;
};

const starterPlan: BillingOffer =
  {
    badge: "Monthly continuity",
    description:
      "Refresh Quote Recovery evidence as new exports arrive and see what is new, persistent, worsening or resolved.",
    entryCondition: "Start directly. A one-time Audit is optional and is never added automatically.",
    features: [
      "Recurring export refreshes",
      "Saved mapping reuse",
      "Movement between reads",
      "Recurring access and billing portal",
    ],
    label: "Starter",
    offerKey: "STARTER",
    price: `US$${getRevoryOffer("STARTER").priceUsd}`,
    priceNote: "per month",
    stage: "Quote Recovery continuity",
  };

const quoteRecoveryAudit: BillingOffer =
  {
    badge: "Recommended first read",
    description:
      "Create the first evidence-backed read of estimates and follow-ups before deciding whether recurring monitoring is useful.",
    entryCondition: "Paid once. Choose a monthly plan later only if recurring monitoring is useful.",
    features: [
      "Structured export intake",
      "Data Quality and column review",
      "Prioritized Quote Recovery findings",
      "Executive CSV and PDF exports",
    ],
    label: "Quote Recovery Audit",
    offerKey: "QUOTE_RECOVERY_AUDIT",
    featured: true,
    price: `US$${getRevoryOffer("QUOTE_RECOVERY_AUDIT").priceUsd}`,
    priceNote: "paid once",
    stage: "Your first REVORY read",
  };

const growthPlan: BillingOffer =
  {
    badge: "Management upgrade",
    description:
      "Build a recurring management rhythm with longer movement history, segmentation and one focused weekly decision.",
    features: [
      "Recurring Quote Recovery access",
      "Twelve-month movement history",
      "Source, owner and service segmentation",
      "Weekly management read and PDF",
    ],
    label: "Growth",
    offerKey: "GROWTH",
    price: `US$${getRevoryOffer("GROWTH").priceUsd}`,
    priceNote: "per month",
    stage: "Main recurring plan",
  };

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
  internalPreview,
  offer,
}: {
  activeOfferKeys: ReadonlySet<RevoryOfferKey>;
  compact?: boolean;
  internalPreview: boolean;
  offer: BillingOffer;
}) {
  const isActive = activeOfferKeys.has(offer.offerKey);
  const checkoutConfigured = isRevoryOfferConfigured(offer.offerKey);

  return (
    <article
      className={`rev-checkout-card flex flex-col rounded-[26px] border p-5 md:p-6 ${
        compact ? "min-h-[350px]" : "min-h-[390px]"
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
        {offer.entryCondition ? (
          <p className="mb-3 text-[11px] font-semibold leading-5 text-[color:var(--text-subtle)]">
            {offer.entryCondition}
          </p>
        ) : null}
        {isActive ? (
          <Link className="rev-button-primary w-full justify-center" href="/app/dashboard">
            Open your REVORY workspace
          </Link>
        ) : checkoutConfigured ? (
          <form action={`/api/billing/checkout?offer=${offer.offerKey}`} method="post">
            <button className="rev-button-primary w-full justify-center" type="submit">
              {offer.priceNote === "paid once" ? `Buy ${offer.label} once` : `Continue with ${offer.label}`}
            </button>
          </form>
        ) : internalPreview && offer.priceNote === "paid once" ? (
          <Link className="rev-button-secondary w-full justify-center" href="/app/dashboard">
            Open REVORY workspace
          </Link>
        ) : (
          <button className="rev-action-button w-full cursor-not-allowed justify-center opacity-60" disabled type="button">
            Activation pending
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
  const paidCheckoutEnabled = isPaidCheckoutReleaseEnabled() && isStripeBillingConfigured();
  const session = await getAuthSession();
  const params = await searchParams;

  if (!session?.user?.id && !internalPreview) {
    redirect("/sign-in?redirect_url=%2Fstart");
  }

  const appContext = session?.user?.id ? await getAppContext() : null;
  const activeEntitlements = appContext
    ? await getWorkspaceEntitlements(appContext.workspace.id)
    : [];
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

        <div className="py-9 md:py-12">
          <section className="mx-auto max-w-3xl px-2 text-center">
            <p className="rev-kicker">REVORY plans</p>
            <h1 className="mt-3 text-balance text-[clamp(2.5rem,5vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.055em] text-[color:var(--foreground)]">
              Choose how you want REVORY to review your revenue.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)] md:text-base md:leading-7">
              Begin with one focused read, or choose ongoing monitoring directly. Every purchase is explicit.
            </p>
            {params.billing === "unavailable" ? (
              <p className="mx-auto mt-5 max-w-xl rounded-2xl border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.08)] px-4 py-3 text-xs font-semibold text-[color:var(--accent-light)]">
                This checkout is temporarily unavailable. Please try again or contact support@revory.app.
              </p>
            ) : null}
          </section>

          <section className="mx-auto mt-10 max-w-4xl" aria-labelledby="audit-title">
            <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="rev-kicker">Recommended first step</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] md:text-3xl" id="audit-title">
                  One focused Audit. No subscription.
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-[color:var(--text-subtle)]">
                Pay once for a defined evidence-backed read. Starter and Growth remain available without it.
              </p>
            </div>
            <OfferCard activeOfferKeys={activeOfferKeys} compact internalPreview={internalPreview} offer={quoteRecoveryAudit} />
          </section>

          <section className="mx-auto mt-12 max-w-5xl" aria-labelledby="monthly-plans-title">
            <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="rev-kicker">Ongoing monitoring</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] md:text-3xl" id="monthly-plans-title">
                  Continue with Starter or upgrade to Growth.
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-[color:var(--text-subtle)]">
                Both monthly plans can be purchased directly. Neither includes or adds an Audit automatically.
              </p>
            </div>
            <div aria-labelledby="monthly-plans-title" className="grid items-stretch gap-4 md:grid-cols-2">
              {[starterPlan, growthPlan].map((offer) => (
                <OfferCard
                  activeOfferKeys={activeOfferKeys}
                  compact
                  internalPreview={internalPreview}
                  key={offer.label}
                  offer={offer}
                />
              ))}
            </div>
          </section>

          <div className="mx-auto mt-7 max-w-4xl border-t border-[color:var(--border)] pt-5">
            <p className="text-center text-[11px] leading-5 text-[color:var(--text-subtle)]">
              {paidCheckoutEnabled
                ? "Checkout uses Stripe. Subscriptions renew monthly until canceled from billing."
                : "Checkout activation is pending final Stripe verification. No charge can be made from this screen yet."}
            </p>
            <p className="mt-1 text-center text-[10px] leading-5 text-[color:var(--text-subtle)]">
              By continuing to checkout, you agree to the{" "}
              <Link className="underline decoration-[rgba(67,179,155,0.45)] underline-offset-4 hover:text-[color:var(--foreground)]" href="/terms">
                Terms
              </Link>
              ,{" "}
              <Link className="underline decoration-[rgba(67,179,155,0.45)] underline-offset-4 hover:text-[color:var(--foreground)]" href="/privacy">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link className="underline decoration-[rgba(67,179,155,0.45)] underline-offset-4 hover:text-[color:var(--foreground)]" href="/refunds">
                Cancellation &amp; Refund Policy
              </Link>
              . For recurring plans, Stripe charges the displayed US-dollar price
              monthly until cancellation; cancellation takes effect at the end of
              the paid period. The one-time Audit is charged once and is consumed
              only after you confirm the reviewed mapping and analysis use.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
