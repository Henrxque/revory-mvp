import Link from "next/link";
import { redirect } from "next/navigation";

import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAuthSession } from "@/auth";
import { getStripeAppUrl, isStripeBillingConfigured } from "@/services/billing/stripe-runtime";
import { syncWorkspaceBillingFromCheckoutSession } from "@/services/billing/stripe-sync";
import {
  getBillingPlanDefinition,
  getWorkspaceBillingSummary,
  normalizeBillingPlanKey,
} from "@/services/billing/workspace-billing";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

const billingPlans = ["BASIC", "GROWTH", "PREMIUM"] as const;

type StartPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function resolveSearchParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

function buildStartTarget(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();

  return query ? `/start?${query}` : "/start";
}

function getBillingMessage(
  state: string | null | undefined,
  checkoutState: string | null | undefined,
) {
  if (checkoutState === "cancel") {
    return {
      label: "Checkout canceled",
      text: "No charge was applied. You can pick the plan again whenever you're ready.",
      tone: "future" as const,
    };
  }

  if (checkoutState === "success") {
    return {
      label: "Payment received",
      text: "We are finalizing billing access and syncing the workspace now.",
      tone: "real" as const,
    };
  }

  switch (state) {
    case "unavailable":
      return {
        label: "Stripe unavailable",
        text: "Stripe envs are missing in this build, so checkout is not active yet.",
        tone: "future" as const,
      };
    case "error":
      return {
        label: "Checkout not created",
        text: "The checkout session did not open. Try again or confirm the Stripe config.",
        tone: "future" as const,
      };
    case "processing":
      return {
        label: "Sync in progress",
        text: "The payment passed, but the workspace is still waiting for billing confirmation.",
        tone: "neutral" as const,
      };
    default:
      return null;
  }
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedPlan =
    normalizeBillingPlanKey(resolveSearchParam(resolvedSearchParams.plan)) ?? null;
  const checkoutState = resolveSearchParam(resolvedSearchParams.checkout) ?? null;
  const sessionId = resolveSearchParam(resolvedSearchParams.session_id) ?? null;
  const billingState = resolveSearchParam(resolvedSearchParams.billing) ?? null;
  const session = await getAuthSession();

  if (!session?.user?.id) {
    const redirectTarget = buildStartTarget(
      new URLSearchParams(
        Object.entries(resolvedSearchParams).flatMap(([key, value]) =>
          Array.isArray(value)
            ? value.map((item) => [key, item])
            : value
              ? [[key, value]]
              : [],
        ),
      ),
    );

    redirect(buildSignUpRedirectPath(redirectTarget));
  }

  const user = await syncAuthenticatedUser();

  if (!user) {
    redirect(buildSignUpRedirectPath("/start"));
  }

  const workspace = await getOrCreateWorkspace(user);

  if (checkoutState === "success" && sessionId && isStripeBillingConfigured()) {
    await syncWorkspaceBillingFromCheckoutSession(sessionId);
  }

  const refreshedWorkspace = await getOrCreateWorkspace(user);
  const billingSummary = getWorkspaceBillingSummary(refreshedWorkspace);

  if (billingSummary.hasActiveAccess) {
    redirect("/app");
  }

  if (requestedPlan && !checkoutState && !billingState && isStripeBillingConfigured()) {
    redirect(`/api/billing/checkout?plan=${requestedPlan.toLowerCase()}`);
  }

  const billingMessage =
    getBillingMessage(
      checkoutState === "success" && !billingSummary.hasActiveAccess
        ? "processing"
        : billingState,
      checkoutState,
    );

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <section className="rev-shell-hero rev-accent-mist flex flex-col rounded-[36px] p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/">
              <RevoryLogo />
            </Link>
            <RevoryStatusBadge tone="accent">Seller billing</RevoryStatusBadge>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cfc7db]">
              Self-service checkout
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cfc7db]">
              Stripe portal
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cfc7db]">
              Workspace gating
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <p className="rev-kicker">Billing activation</p>
            <h1 className="rev-display-hero max-w-[32rem]">
              Start Seller with the{" "}
              <span className="italic text-[color:var(--accent-light)]">
                plan that fits your booking flow.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
              Stripe handles checkout, card updates, and cancellation. REVORY keeps
              the path narrow: one plan, one active subscription, one clean move into setup.
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.025)] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a39bb2]">
                  Workspace
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                  {workspace.name}
                </p>
              </div>
              <RevoryStatusBadge tone={billingSummary.hasStripeIdentity ? "neutral" : "future"}>
                {billingSummary.hasStripeIdentity ? "Stripe linked" : "Billing next"}
              </RevoryStatusBadge>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9f96ae]">
                  Current billing
                </p>
                <p className="mt-2 text-base font-semibold text-[color:var(--foreground)]">
                  {billingSummary.plan?.label ?? "No active plan"}
                </p>
                <p className="mt-1 text-sm leading-7 text-[#c6bfd2]">
                  Status: {billingSummary.billingStatus.toLowerCase().replaceAll("_", " ")}
                </p>
                {billingSummary.plan ? (
                  <p className="mt-2 text-sm font-medium leading-6 text-[#e3ddea]">
                    {billingSummary.plan.inAppSignal}
                  </p>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9f96ae]">
                  Stripe runtime
                </p>
                <p className="mt-2 text-base font-semibold text-[color:var(--foreground)]">
                  {isStripeBillingConfigured() ? "Checkout ready" : "Stripe env missing"}
                </p>
                <p className="mt-1 text-sm leading-7 text-[#c6bfd2]">
                  App URL: {getStripeAppUrl()}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rev-accent-mist-soft rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="rev-kicker">Plans</p>
              <h2 className="rev-display-panel max-w-[24rem]">
                Choose a REVORY Seller plan.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[#beb7ca]">
                The checkout stays inside Stripe. After payment, the workspace comes back
                here, syncs billing, and opens the protected app flow.
              </p>
            </div>

            <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f96ae]">
                Plan read
              </p>
              <p className="mt-2 text-sm leading-7 text-[#c6bfd2]">
                Every plan keeps the same narrow Seller model: one offer, one booking path,
                booked proof first, revenue read second. Higher plans do not widen the
                product. They only add more room once Seller value is already visible.
              </p>
            </div>

            {billingMessage ? (
              <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-[color:var(--foreground)]">
                    {billingMessage.label}
                  </p>
                  <RevoryStatusBadge tone={billingMessage.tone}>
                    {billingMessage.label}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2 text-sm leading-7 text-[#c6bfd2]">
                  {billingMessage.text}
                </p>
              </div>
            ) : null}

            <div className="grid gap-4">
              {billingPlans.map((planKey) => {
                const plan = getBillingPlanDefinition(planKey)!;
                const isCurrentPlan = billingSummary.planKey === planKey;

                return (
                  <div
                    key={planKey}
                    className={`rounded-[26px] border p-5 md:p-6 ${
                      planKey === "GROWTH"
                        ? "border-[rgba(194,9,90,0.45)] bg-[linear-gradient(180deg,rgba(194,9,90,0.08),rgba(255,255,255,0.02))]"
                        : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9f96ae]">
                            {plan.fitLabel}
                          </p>
                          {planKey === "BASIC" ? (
                            <RevoryStatusBadge tone="neutral">Lean core</RevoryStatusBadge>
                          ) : null}
                          {planKey === "PREMIUM" ? (
                            <RevoryStatusBadge tone="future">Best after proof</RevoryStatusBadge>
                          ) : null}
                        </div>
                        <p className="text-lg font-semibold text-[color:var(--foreground)]">
                          {plan.label}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-[#beb7ca]">
                          {plan.framing}
                        </p>
                        <p
                          className={`mt-3 text-sm font-medium leading-6 ${
                            planKey === "GROWTH"
                              ? "text-[color:var(--accent-light)]"
                              : "text-[#e3ddea]"
                          }`}
                        >
                          {plan.valueSignal}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {planKey === "GROWTH" ? (
                          <RevoryStatusBadge tone="accent">{plan.fitLabel}</RevoryStatusBadge>
                        ) : null}
                        {isCurrentPlan ? (
                          <RevoryStatusBadge tone="neutral">Selected</RevoryStatusBadge>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {plan.supportPoints.map((point) => (
                        <div
                          className="rounded-[16px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.018)] px-3 py-2.5"
                          key={point}
                        >
                          <p className="text-sm leading-6 text-[#d4cedd]">{point}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <a
                        className={planKey === "GROWTH" ? "rev-button-primary" : "rev-button-secondary"}
                        href={`/api/billing/checkout?plan=${planKey.toLowerCase()}`}
                      >
                        {isCurrentPlan ? "Continue with this plan" : plan.ctaLabel}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
