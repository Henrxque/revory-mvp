import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import {
  getStripeAppUrl,
  isStripeBillingConfigured,
  isStripeCheckoutConfiguredForPlan,
} from "@/services/billing/stripe-runtime";
import { syncWorkspaceBillingFromCheckoutSession } from "@/services/billing/stripe-sync";
import {
  getBillingPlanDefinition,
  getWorkspaceBillingSummary,
  normalizeBillingPlanKey,
} from "@/services/billing/workspace-billing";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

const primaryBillingPlan = "GROWTH" as const;
const orderedBillingPlans = ["BASIC", primaryBillingPlan, "PREMIUM"] as const;

const planPresentation = {
  BASIC: {
    ctaHref: "/api/billing/checkout?plan=basic",
    features: [
      "Dashboard leak read",
      "Revenue Leaks Page",
      "Daily Leak Brief",
      "AI-assisted CSV review + Data Quality Check",
      "No Manual Quick Add",
      "No Executive Summary copy/share/print",
    ],
    headerTone: "text-[#f3eef9]",
    price: "$370",
    toneClass:
      "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))]",
  },
  GROWTH: {
    ctaHref: "/api/billing/checkout?plan=growth",
    features: [
      "Complete Launch V1 Revenue Leak Detector",
      "Dashboard leak read and Revenue Leaks Page",
      "AI-assisted CSV review + Data Quality Check",
      "Daily Leak Brief and bounded action guidance",
      "Manual Quick Add for one-off evidence",
      "Executive Revenue Leak Summary with copy, share, and print",
    ],
    headerTone: "text-white",
    price: "$570",
    toneClass:
      "border-[rgba(194,9,90,0.36)] bg-[linear-gradient(145deg,rgba(25,22,32,0.98),rgba(194,9,90,0.05))] shadow-[0_0_40px_rgba(194,9,90,0.12)]",
  },
  PREMIUM: {
    ctaHref: null,
    features: [
      "Future tier placeholder",
      "Not available for checkout yet",
      "No manual fit review today",
      "No CRM, inbox, automation, or BI expansion",
      "Must stay inside the narrow Revenue Leak Detector model",
    ],
    headerTone: "text-[#f3eef9]",
    price: "Later",
    toneClass:
      "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))]",
  },
} as const;

const planCopy = {
  BASIC: getBillingPlanDefinition("BASIC"),
  GROWTH: getBillingPlanDefinition("GROWTH"),
  PREMIUM: getBillingPlanDefinition("PREMIUM"),
} as const;

function getPlanCopy(planKey: keyof typeof planPresentation) {
  const copy = planCopy[planKey];

  if (!copy) {
    throw new Error(`Missing billing plan copy for ${planKey}.`);
  }

  return copy;
}

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
    case "basic-fit":
      return {
        label: "Basic is limited",
        text: "Basic is an entry plan with checkout, but it does not include Growth's manual evidence add or Executive Summary copy/share/print.",
        tone: "neutral" as const,
      };
    case "premium-future":
    case "premium-fit":
      return {
        label: "Premium is coming later",
        text: "Premium is not available for checkout and does not open a manual fit motion today.",
        tone: "future" as const,
      };
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

  if (
    (requestedPlan === "BASIC" || requestedPlan === primaryBillingPlan) &&
    !checkoutState &&
    !billingState &&
    isStripeCheckoutConfiguredForPlan(requestedPlan)
  ) {
    redirect(`/api/billing/checkout?plan=${requestedPlan.toLowerCase()}`);
  }

  const checkoutPlanUnavailable =
    !checkoutState &&
    !billingState &&
    (requestedPlan === "BASIC" || requestedPlan === primaryBillingPlan) &&
    !isStripeCheckoutConfiguredForPlan(requestedPlan)
      ? "unavailable"
      : null;
  const fitBillingState =
    !checkoutState && !billingState && requestedPlan === "PREMIUM"
      ? "premium-future"
      : checkoutPlanUnavailable ?? billingState;

  const billingMessage =
    getBillingMessage(
      checkoutState === "success" && !billingSummary.hasActiveAccess
        ? "processing"
        : fitBillingState,
      checkoutState,
    );

  return (
    <main className="min-h-screen px-4 py-3 md:px-6 md:py-4 xl:px-8">
      <div className="mx-auto max-w-[1360px]">
        <div className="mx-auto mb-3 flex max-w-[1360px] flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,18,26,0.72)] px-4 py-2 backdrop-blur md:px-5">
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
            <RevoryStatusBadge tone="accent">REVORY plan</RevoryStatusBadge>
            <RevoryStatusBadge tone={billingSummary.hasStripeIdentity ? "neutral" : "future"}>
              {billingSummary.hasStripeIdentity ? "Stripe linked" : "Billing next"}
            </RevoryStatusBadge>
            <RevoryStatusBadge tone={isStripeBillingConfigured() ? "real" : "future"}>
              {isStripeBillingConfigured() ? "Checkout ready" : "Stripe env missing"}
            </RevoryStatusBadge>
            <AuthSignOutButton callbackUrl="/" compact />
          </div>
        </div>

        <section className="mx-auto max-w-[980px] pb-8 text-center md:pb-10">
          <p className="rev-kicker">Pricing</p>
          <h1 className="mt-1.5 font-[family:var(--font-display)] text-[clamp(1.95rem,3.1vw,3.35rem)] leading-[0.94] tracking-[-0.06em] text-white">
            Choose your REVORY plan.
          </h1>
          <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-5 text-[#a9a2b6]">
            Growth is the complete self-service plan. Basic is a lighter entry plan. Premium is not available yet.
          </p>
        </section>

        {billingMessage && billingMessage.label !== "Checkout not created" ? (
          <div className="mx-auto mb-3 flex max-w-[1360px] flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-[#c6bfd2]">
                <span className="font-semibold text-[color:var(--foreground)]">
                  {billingMessage.label}
                </span>
                <span className="mx-2 text-[#6f687d]">/</span>
                {billingMessage.text}
              </p>
            </div>
            <RevoryStatusBadge tone={billingMessage.tone}>
              {billingMessage.label}
            </RevoryStatusBadge>
          </div>
        ) : null}

        <section className="mx-auto max-w-[1360px]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.06fr)_minmax(0,0.98fr)] lg:items-start xl:gap-6">
            {orderedBillingPlans.map((planKey) => {
              const presentation = planPresentation[planKey];
              const copy = getPlanCopy(planKey);
              const isCurrentPlan = billingSummary.planKey === planKey;
              const isPrimaryPlan = planKey === primaryBillingPlan;
              const isFuturePlan = planKey === "PREMIUM";

              return (
                <div
                  key={planKey}
                  className={`flex h-full flex-col rounded-[26px] border px-5 py-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.2)] md:px-6 ${isPrimaryPlan ? "lg:-mt-1 lg:pb-5" : ""} ${presentation.toneClass}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      {isPrimaryPlan ? (
                        <span className="inline-flex rounded-full border border-[rgba(255,110,170,0.36)] bg-[rgba(194,9,90,0.18)] px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          {copy.fitLabel}
                        </span>
                      ) : (
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-[#8d88a1]">
                          {copy.fitLabel}
                        </p>
                      )}
                      <p className={isPrimaryPlan ? "mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8d88a1]" : "mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8d88a1]"}>
                        {copy.label}
                      </p>
                    </div>
                    <RevoryStatusBadge tone={isFuturePlan ? "future" : isPrimaryPlan ? "accent" : "neutral"}>
                      {isFuturePlan ? "Coming later" : isPrimaryPlan ? "Best fit" : "Entry"}
                    </RevoryStatusBadge>
                  </div>

                  <div className="mt-3">
                    <p
                      className={`font-[family:var(--font-display)] text-[clamp(2.45rem,3.4vw,3.45rem)] leading-none tracking-[-0.055em] ${presentation.headerTone}`}
                    >
                      {presentation.price}
                    </p>
                    <p className="mt-1.5 text-[0.8rem] leading-5 text-[#9b94aa]">
                      {isFuturePlan ? "future tier" : "per month"}
                    </p>
                    <p className="mt-3 text-[0.84rem] leading-6 text-[#c7bfce]">
                      {copy.framing}
                    </p>
                  </div>

                  <div className="mt-3.5 h-px bg-[rgba(255,255,255,0.08)]" />

                  <div className="mt-3.5 space-y-2">
                    {presentation.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <PlanCheckIcon />
                        <p className="text-[0.78rem] leading-5 text-[#aaa2b6]">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4">
                    {presentation.ctaHref ? (
                      <a
                        className={isPrimaryPlan ? "rev-button-primary w-full justify-center" : "rev-button-secondary w-full justify-center"}
                        href={presentation.ctaHref}
                      >
                        {isCurrentPlan ? `Continue with ${copy.label}` : copy.ctaLabel}
                      </a>
                    ) : (
                      <button
                        className="rev-action-button w-full cursor-not-allowed justify-center opacity-60"
                        disabled
                        type="button"
                      >
                        {isCurrentPlan ? `Current ${copy.label}` : copy.ctaLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-3 grid max-w-[1360px] gap-2 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.018)] px-5 py-2 text-left md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="text-sm leading-6 text-[#8f879d]">
              {getPlanCopy("GROWTH").valueSignal} Basic is the limited entry plan.
              Premium is a future tier and is not available today.
              </p>
              <p className="text-xs leading-5 text-[#7f798f]">
              Stripe handles checkout, card updates, and cancellation. The paid account
              returns directly into the protected app flow for {workspace.name}.
              </p>
            </div>
            <p className="text-xs leading-5 text-[#6f6a7d]">
              App URL: {getStripeAppUrl()}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
