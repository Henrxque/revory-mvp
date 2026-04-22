import { redirect } from "next/navigation";
import Link from "next/link";

import { AppSidebar } from "@/components/app/AppSidebar";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getWorkspaceBillingSummary } from "@/services/billing/workspace-billing";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import {
  getOnboardingStep,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import { getBookedProofRead } from "@/services/proof/get-booked-proof-read";

type PrivateAppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

function getAccountInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "R";
}

function getPlanBadgeTone(planKey: string | null | undefined) {
  if (planKey === "GROWTH") {
    return "accent" as const;
  }

  if (planKey === "PREMIUM") {
    return "future" as const;
  }

  return "neutral" as const;
}

function resolveBookingInputsStatus(
  activationCompleted: boolean,
  hasBookedProofVisible: boolean,
) {
  if (hasBookedProofVisible) {
    return "Proof visible";
  }

  if (activationCompleted) {
    return "Proof next";
  }

  return "Proof pending";
}

export default async function PrivateAppLayout({
  children,
}: PrivateAppLayoutProps) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  const { activationSetup, user, workspace } = appContext;
  const billingSummary = getWorkspaceBillingSummary(workspace);

  if (!billingSummary.hasActiveAccess) {
    redirect("/start");
  }

  const bookedProofRead = await getBookedProofRead(workspace.id);
  const hasBookedProofVisible = bookedProofRead.hasBookedProofVisible;
  const bookingInputsStatus = resolveBookingInputsStatus(
    activationSetup.isCompleted,
    hasBookedProofVisible,
  );
  const currentStep = getOnboardingStep(
    resolveOnboardingStepKey(activationSetup.currentStep),
  );
  const currentStepTitle = activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Revenue ready"
      : "Booked proof next"
    : currentStep.title;
  const activationStatus = activationSetup.isCompleted ? "Activated" : "Activating";
  const workspaceSubtitle = activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Booked proof is live and revenue is ready."
      : "Activation is live. Add booked proof to open revenue."
    : `Activation is in progress. ${currentStep.title} comes next.`;
  const currentPlanSignal =
    billingSummary.plan?.inAppSignal ?? "Billing keeps Seller live.";
  const accountInitial = getAccountInitial(user.email);

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="relative z-50 shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AppSidebar
            activationStatus={activationStatus}
            bookingInputsStatus={bookingInputsStatus}
            currentStepTitle={currentStepTitle}
            userEmail={user.email}
            workspaceName={workspace.name}
            workspaceStatus={workspace.status}
          />
        </div>

        <div className="min-w-0 space-y-5 overflow-x-clip">
          <header className="rev-shell-panel rounded-[26px] px-5 py-3.5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold tracking-[-0.035em] text-[color:var(--foreground)]">
                  {workspace.name}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[color:var(--text-muted)]">
                  {workspaceSubtitle}
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2.5">
                <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(224,16,106,0.18)] bg-[rgba(194,9,90,0.11)] text-[11px] font-semibold text-[color:var(--accent-light)]">
                    {accountInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[color:var(--foreground)]">
                      {user.email}
                    </p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                      {billingSummary.plan ? (
                        <RevoryStatusBadge
                          className="min-h-6 rounded-full border-[rgba(224,16,106,0.12)] bg-[rgba(194,9,90,0.08)] px-2.5 py-[0.28rem] text-[9px] tracking-[0.12em] text-[color:var(--accent-light)]"
                          tone={getPlanBadgeTone(billingSummary.planKey)}
                        >
                          {billingSummary.plan.label}
                        </RevoryStatusBadge>
                      ) : null}
                      <p className="min-w-0 text-[10px] leading-5 text-[color:var(--text-muted)]">
                        {currentPlanSignal}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    className="rev-action-button min-h-8 px-3.5 py-1.5 text-[12px]"
                    href="/app/setup"
                  >
                    Setup
                  </Link>
                  <AuthSignOutButton
                    className="min-h-8 border-transparent bg-transparent px-2.5 py-1.5 text-[12px] text-[#9690a2] hover:border-transparent hover:bg-[rgba(255,255,255,0.016)] hover:text-[color:var(--foreground)]"
                    compact
                  />
                </div>
              </div>
            </div>
          </header>

          <section className="min-w-0 overflow-x-clip rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(19,18,26,0.86),rgba(13,12,18,0.86))] p-5 shadow-[var(--shadow-soft)] md:p-7">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
