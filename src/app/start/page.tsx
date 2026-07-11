import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";
import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import {
  isStripeBillingConfigured,
  isStripeCheckoutConfiguredForPlan,
} from "@/services/billing/stripe-runtime";
import {
  REVORY_PUBLIC_OFFER,
  REVORY_PUBLIC_OFFER_FEATURES,
} from "@/services/billing/public-offer";
import { syncWorkspaceBillingFromCheckoutSession } from "@/services/billing/stripe-sync";
import { getWorkspaceBillingSummary } from "@/services/billing/workspace-billing";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

const publicBillingPlan = REVORY_PUBLIC_OFFER.planKey;

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
      text: "No charge was applied. You can restart checkout whenever you are ready.",
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
        text: "Checkout is not active in this environment yet.",
        tone: "future" as const,
      };
    case "error":
      return {
        label: "Checkout not created",
        text: "The checkout session did not open. Try again or confirm the Stripe configuration.",
        tone: "future" as const,
      };
    case "processing":
      return {
        label: "Sync in progress",
        text: "Payment passed, but the workspace is still waiting for billing confirmation.",
        tone: "neutral" as const,
      };
    default:
      return null;
  }
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
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

  const billingMessage = getBillingMessage(
    checkoutState === "success" && !billingSummary.hasActiveAccess
      ? "processing"
      : billingState,
    checkoutState,
  );
  const checkoutReady = isStripeCheckoutConfiguredForPlan(publicBillingPlan);

  return (
    <main className="min-h-screen px-4 py-3 md:px-6 md:py-4 xl:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1360px] flex-col">
        <div className="mx-auto mb-5 flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,18,26,0.72)] px-4 py-2 backdrop-blur md:px-5">
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
            <RevoryStatusBadge tone="accent">REVORY access</RevoryStatusBadge>
            <RevoryStatusBadge tone={checkoutReady ? "real" : "future"}>
              {checkoutReady ? "Checkout ready" : "Stripe env missing"}
            </RevoryStatusBadge>
            <AuthSignOutButton callbackUrl="/" compact />
          </div>
        </div>

        <section className="mx-auto w-full max-w-[860px] pb-6 text-center">
          <p className="rev-kicker">Founding clinic launch price</p>
          <h1 className="mt-2 font-[family:var(--font-display)] text-[clamp(2.2rem,4vw,4rem)] leading-[0.94] tracking-[-0.06em] text-white">
            Get your first leak read.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#a9a2b6]">
            One self-service REVORY offer for premium MedSpas, from structured clinic data to an evidence-backed revenue-risk read.
          </p>
        </section>

        {billingMessage ? (
          <div className="mx-auto mb-5 flex w-full max-w-[760px] flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-3">
            <p className="min-w-0 flex-1 text-sm leading-6 text-[#c6bfd2]">
              <span className="font-semibold text-[color:var(--foreground)]">
                {billingMessage.label}
              </span>
              <span className="mx-2 text-[#6f687d]">/</span>
              {billingMessage.text}
            </p>
            <RevoryStatusBadge tone={billingMessage.tone}>
              {billingMessage.label}
            </RevoryStatusBadge>
          </div>
        ) : null}

        <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center pb-5">
          <div className="rounded-[30px] border border-[rgba(194,9,90,0.36)] bg-[linear-gradient(145deg,rgba(25,22,32,0.98),rgba(194,9,90,0.05))] px-6 py-6 text-left shadow-[0_0_44px_rgba(194,9,90,0.13)] md:px-8 md:py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-[rgba(255,110,170,0.36)] bg-[rgba(194,9,90,0.18)] px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white">
                  Founding clinic launch price
                </span>
                <p className="mt-4 text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-[#9b94aa]">
                  REVORY
                </p>
              </div>
              <RevoryStatusBadge tone="accent">First 10 active clinics</RevoryStatusBadge>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="font-[family:var(--font-display)] text-[clamp(3.1rem,7vw,5rem)] leading-none tracking-[-0.06em] text-white">
                ${REVORY_PUBLIC_OFFER.monthlyPriceUsd}
              </p>
              <p className="pb-1 text-sm text-[#9b94aa]">/ month</p>
            </div>
            <p className="mt-4 max-w-[40rem] text-sm leading-6 text-[#c7bfce]">
              Available to the first 10 active clinics. Your price stays locked while your subscription remains active.
            </p>

            <div className="my-5 h-px bg-[rgba(255,255,255,0.08)]" />

            <div className="grid gap-3 md:grid-cols-2 md:gap-x-6">
              {REVORY_PUBLIC_OFFER_FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-2.5">
                  <PlanCheckIcon />
                  <p className="text-[0.82rem] leading-5 text-[#aaa2b6]">{feature}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <a
                className="rev-button-primary w-full justify-center"
                href="/api/billing/checkout"
              >
                Get your first leak read
              </a>
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-[650px] text-center text-xs leading-5 text-[#7f798f]">
            Stripe handles the subscription and billing portal. REVORY returns you to the protected self-service flow after checkout.
          </p>
        </section>
      </div>
    </main>
  );
}
