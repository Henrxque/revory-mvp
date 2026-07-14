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
import { isRevoryOfferConfigured } from "@/services/billing/revory-offers";

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

const ongoingPlans: readonly BillingOffer[] = [
  {
    badge: "First ongoing plan",
    description:
      "Refresh Quote Recovery evidence as new exports arrive and see what is new, persistent, worsening or resolved.",
    entryCondition: "Requires a completed Quote Recovery Audit.",
    features: [
      "Recurring export refreshes",
      "Saved mapping reuse",
      "Movement between reads",
      "Recurring access and billing portal",
    ],
    featured: true,
    label: "Starter",
    offerKey: "STARTER",
    price: "$399",
    priceNote: "per month",
    stage: "Quote Recovery continuity",
  },
  {
    badge: "Release gated",
    description:
      "Add 12-month history, guarded segmentation and one bounded weekly management decision when the Growth gate passes.",
    entryCondition: "Requires advanced evidence and the Growth release gate.",
    features: [
      "Recurring Quote Recovery access",
      "Twelve-month movement",
      "Source, owner and service segmentation",
      "Weekly management read and PDF",
    ],
    label: "Growth",
    offerKey: "GROWTH",
    price: "$799",
    priceNote: "per month",
    stage: "Advanced recurring intelligence",
  },
  {
    badge: "Release gated",
    description:
      "Add Revenue Realization, change-order, underbilling and margin intelligence with higher-volume controls when Pro is released.",
    entryCondition: "Requires a Full Revenue Leak Audit and the Pro release gate.",
    features: [
      "Quote Recovery and Growth intelligence",
      "Change-order and underbilling review",
      "Margin-basis intelligence",
      "Higher-volume controls",
    ],
    label: "Pro",
    offerKey: "PRO",
    price: "$1,499",
    priceNote: "per month",
    stage: "Revenue Realization recurring",
  },
] as const;

const audits: readonly BillingOffer[] = [
  {
    badge: "Required baseline",
    description:
      "Create the first evidence-backed read of estimates and follow-ups before deciding whether recurring monitoring is useful.",
    entryCondition: "Leads to Starter monthly continuity after completion.",
    features: [
      "Structured export intake",
      "Data Quality and mapping review",
      "Prioritized Quote Recovery findings",
      "Executive result export",
    ],
    featured: true,
    label: "Quote Recovery Audit",
    offerKey: "QUOTE_RECOVERY_AUDIT",
    price: "$799",
    priceNote: "paid once",
    stage: "Start Quote Recovery here",
  },
  {
    badge: "Release gated",
    description:
      "Establish an advanced estimate-to-job, invoice and change-order baseline only when the imported evidence supports it.",
    entryCondition: "Leads to Growth or Pro only after their separate release gates pass.",
    features: [
      "Explicit record matching",
      "Unmatched and conflict review",
      "Deterministic billing reconciliation",
      "Full Revenue Leak executive report",
    ],
    label: "Full Revenue Leak Audit",
    offerKey: null,
    price: "$1,499",
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
        compact ? "min-h-[350px]" : "min-h-[410px]"
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
        <p className="text-[clamp(2.7rem,4vw,3.75rem)] font-semibold leading-none tracking-[-0.055em] text-[color:var(--foreground)]">
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
            Complete the $799 Audit first
          </button>
        ) : checkoutConfigured && offer.offerKey ? (
          <form action={`/api/billing/checkout?offer=${offer.offerKey}`} method="post">
            <button className="rev-button-primary w-full justify-center" type="submit">
              {offer.offerKey === "QUOTE_RECOVERY_AUDIT" ? "Buy the $799 Audit once" : `Continue with ${offer.label}`}
            </button>
          </form>
        ) : internalPreview && offer.offerKey === "QUOTE_RECOVERY_AUDIT" ? (
          <Link className="rev-button-secondary w-full justify-center" href="/app/dashboard">
            Open internal workspace
          </Link>
        ) : (
          <button className="rev-action-button w-full cursor-not-allowed justify-center opacity-60" disabled type="button">
            Closed until the release gate passes
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
            <RevoryStatusBadge tone="accent">Commercial model clarified</RevoryStatusBadge>
            <RevoryStatusBadge tone={internalPreview ? "real" : "future"}>
              {internalPreview ? "Internal preview" : "Release gates preserved"}
            </RevoryStatusBadge>
            {session?.user?.id ? <AuthSignOutButton callbackUrl="/" compact /> : null}
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-2 pb-8 pt-8 text-center md:pb-10 md:pt-12">
          <p className="rev-kicker">REVORY access</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-[clamp(2.25rem,4.2vw,4rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[color:var(--foreground)]">
            Choose how often you want REVORY working for you.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[13px] leading-6 text-[color:var(--text-muted)] md:text-sm">
            Begin with a paid one-time Audit to establish a trusted baseline. Add an ongoing plan only when refreshed evidence and recurring decisions are useful.
          </p>
          {params.billing === "baseline-required" ? (
            <p className="mx-auto mt-4 max-w-xl rounded-full border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.08)] px-4 py-2 text-xs font-semibold text-[color:var(--accent-light)]">
              Complete your Quote Recovery Audit before starting the recurring Starter plan.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="ongoing-plans-title">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="rev-kicker">Primary commercial model</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]" id="ongoing-plans-title">
                Ongoing plans
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)] md:text-right">
              Every ongoing plan starts with the matching one-time Audit, so your first recurring read has a verified baseline.
            </p>
          </div>
          <div className="grid items-stretch gap-4 lg:grid-cols-3">
            {ongoingPlans.map((offer) => (
              <OfferCard
                activeOfferKeys={activeOfferKeys}
                hasQuoteRecoveryBaseline={hasQuoteRecoveryBaseline}
                internalPreview={internalPreview}
                key={offer.label}
                offer={offer}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs leading-6 text-[color:var(--text-subtle)]">
            Annual billing is not offered yet. Monthly/annual controls remain hidden until dedicated Stripe prices, renewal behavior and billing gates are verified.
          </p>
        </section>

        <section aria-labelledby="audit-plans-title" className="pb-4 pt-16 md:pt-20">
          <div className="mx-auto mb-6 max-w-4xl text-center">
            <p className="rev-kicker">Paid baseline reads</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]" id="audit-plans-title">
              Start with an Audit
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
              Audits are paid once. They establish the initial trusted baseline; subscriptions pay for refreshed evidence, movement and recurring decisions.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl items-stretch gap-4 md:grid-cols-2">
            {audits.map((offer) => (
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
        </section>

        <section className="mx-auto my-4 max-w-4xl rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-5 py-3 text-center">
          <p className="text-[12px] leading-6 text-[color:var(--text-muted)]">
            Target prices remain packaging hypotheses. Growth, Pro, annual billing and the Full Revenue Leak Audit stay closed until their separate evidence, security, Stripe and commercial release gates pass.
          </p>
        </section>
      </div>
    </main>
  );
}
