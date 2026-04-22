import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getStripeAppUrl, isStripeBillingConfigured } from "@/services/billing/stripe-runtime";
import { syncWorkspaceBillingFromCheckoutSession } from "@/services/billing/stripe-sync";
import {
  getWorkspaceBillingSummary,
  normalizeBillingPlanKey,
} from "@/services/billing/workspace-billing";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

const billingPlans = ["BASIC", "GROWTH", "PREMIUM"] as const;

const planPresentation = {
  BASIC: {
    ctaLabel: "Get Started",
    features: [
      "1 main offer",
      "1 booking path",
      "Lower lead volume",
      "Revenue-first dashboard",
      "Contained booking lane",
      "Light async support",
    ],
    headerTone: "text-[#f3eef9]",
    name: "Basic",
    price: "$370",
    toneClass:
      "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))]",
  },
  GROWTH: {
    ctaLabel: "Start Your Booking Flow ->",
    features: [
      "Higher lead volume",
      "Better result visibility",
      "Stronger booking playbook",
      "Stronger booking lane",
      "Revenue-first dashboard",
      "Best-fit core plan",
      "Priority async support",
    ],
    headerTone: "text-white",
    name: "Growth",
    price: "$570",
    toneClass:
      "border-[rgba(194,9,90,0.36)] bg-[linear-gradient(145deg,rgba(25,22,32,0.98),rgba(194,9,90,0.05))] shadow-[0_0_40px_rgba(194,9,90,0.12)]",
  },
  PREMIUM: {
    ctaLabel: "Review Premium Fit",
    features: [
      "For higher lead volume already proving fit",
      "Priority async support",
      "More room inside the same narrow model",
      "Stronger attribution support",
      "Stronger renewal read",
      "Best once Seller value is already clear",
    ],
    headerTone: "text-[#f3eef9]",
    name: "Premium",
    price: "$999+",
    toneClass:
      "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))]",
  },
} as const;

function PlanCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-1 h-4 w-4 shrink-0 text-[color:var(--accent-light)]"
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

type StartPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function resolveSearchParam(value: string | string[] | undefined) {
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
    <main className="min-h-screen px-5 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[1260px]">
        <div className="mx-auto mb-8 flex max-w-[1260px] flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,18,26,0.72)] px-5 py-3.5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="inline-flex shrink-0 items-center">
              <RevoryLogo />
            </Link>
            <div className="hidden h-10 w-px bg-[rgba(255,255,255,0.08)] md:block" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f96ae]">
                Workspace
              </p>
              <p className="mt-1 truncate text-sm font-medium text-[color:var(--foreground)]">
                {workspace.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <RevoryStatusBadge tone="accent">Seller billing</RevoryStatusBadge>
            <RevoryStatusBadge tone={billingSummary.hasStripeIdentity ? "neutral" : "future"}>
              {billingSummary.hasStripeIdentity ? "Stripe linked" : "Billing next"}
            </RevoryStatusBadge>
            <RevoryStatusBadge tone={isStripeBillingConfigured() ? "real" : "future"}>
              {isStripeBillingConfigured() ? "Checkout ready" : "Stripe env missing"}
            </RevoryStatusBadge>
            <AuthSignOutButton callbackUrl="/" compact />
          </div>
        </div>

        <section className="mx-auto max-w-[1260px] pb-4 text-center">
          <p className="rev-kicker">Pricing</p>
        </section>

        {billingMessage ? (
          <div className="mx-auto mb-6 max-w-[860px] rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
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

        <section className="mx-auto max-w-[1260px]">
          <div className="grid gap-5 xl:grid-cols-3">
            {billingPlans.map((planKey) => {
              const presentation = planPresentation[planKey];
              const isCurrentPlan = billingSummary.planKey === planKey;

              return (
                <div
                  key={planKey}
                  className={`flex h-full flex-col rounded-[30px] border px-7 py-8 text-left shadow-[0_24px_70px_rgba(0,0,0,0.2)] ${presentation.toneClass}`}
                >
                  <div className="min-h-10">
                    {planKey === "GROWTH" ? (
                      <span className="inline-flex rounded-full border border-[rgba(255,110,170,0.36)] bg-[rgba(194,9,90,0.18)] px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        Best Fit
                      </span>
                    ) : (
                      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-[#8d88a1]">
                        {presentation.name}
                      </p>
                    )}
                  </div>

                  <div className="mt-1">
                    {planKey === "GROWTH" ? (
                      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-[#8d88a1]">
                        {presentation.name}
                      </p>
                    ) : null}
                    <p
                      className={`mt-3 font-[family:var(--font-display)] text-[clamp(2.8rem,3.2vw,3.65rem)] leading-none tracking-[-0.04em] ${presentation.headerTone}`}
                    >
                      {presentation.price}
                    </p>
                    <p className="mt-2.5 text-[0.92rem] leading-7 text-[#8f8aa4]">
                      per month
                    </p>
                  </div>

                  <div className="mt-6 h-px bg-[rgba(255,255,255,0.08)]" />

                  <div className="mt-6 space-y-3.5">
                    {presentation.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <PlanCheckIcon />
                        <p className="text-[0.93rem] leading-8 text-[#908aa3]">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-7">
                    <a
                      className={`w-full ${planKey === "GROWTH" ? "rev-button-primary" : "rev-button-secondary"}`}
                      href={`/api/billing/checkout?plan=${planKey.toLowerCase()}`}
                    >
                      {isCurrentPlan ? "Continue with this plan" : presentation.ctaLabel}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-6 max-w-[760px] text-center">
            <p className="text-sm leading-7 text-[#7f798f]">
              Stripe handles checkout, card updates, and cancellation. The paid account
              returns directly into the protected app flow for {workspace.name}.
            </p>
            <p className="mt-2 text-xs leading-6 text-[#6f6a7d]">
              App URL: {getStripeAppUrl()}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
