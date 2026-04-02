import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app/AppSidebar";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
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

function formatWorkspaceStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Live";
    case "DRAFT":
      return "Draft";
    case "PAUSED":
      return "Paused";
    default:
      return status
        .toLowerCase()
        .split("_")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
  }
}

function resolveBookingInputsStatus(
  activationCompleted: boolean,
  hasBookedProofVisible: boolean,
) {
  if (hasBookedProofVisible) {
    return "Proof active";
  }

  if (activationCompleted) {
    return "Proof ready";
  }

  return "Proof next";
}

export default async function PrivateAppLayout({
  children,
}: PrivateAppLayoutProps) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  const { activationSetup, user, workspace } = appContext;
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
    ? "Seller live"
    : currentStep.title;
  const activationStatus = activationSetup.isCompleted ? "Activated" : "Activating";
  const activationBadgeLabel = activationStatus;
  const workspaceSubtitle = activationSetup.isCompleted
    ? hasBookedProofVisible
      ? "Seller workspace live with booked proof"
      : "Seller workspace live, booked proof next"
    : `Activation in progress: ${currentStep.eyebrow}`;
  const accountInitial = getAccountInitial(user.email);

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[228px_minmax(0,1fr)]">
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
          <header className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.94)] px-4 py-2 shadow-[0_16px_60px_rgba(0,0,0,0.22)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[color:var(--foreground)]">
                  {workspace.name}
                </p>
                <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                  {workspaceSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 xl:flex-nowrap">
                <div className="flex flex-wrap items-center gap-1.5 rounded-[13px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-1.5 py-1.5">
                  <RevoryStatusBadge tone={activationSetup.isCompleted ? "accent" : "neutral"}>
                    {activationBadgeLabel}
                  </RevoryStatusBadge>
                  <span className="inline-flex min-h-6 items-center rounded-[11px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-2.5 py-[0.35rem] text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {formatWorkspaceStatus(workspace.status)}
                  </span>
                </div>

                <div className="flex min-w-[12.25rem] items-center gap-2 rounded-[15px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-2 py-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.14)] text-[12px] font-semibold text-[color:var(--accent-light)]">
                    {accountInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Account
                    </span>
                    <p className="max-w-[10.5rem] truncate text-[13px] font-semibold text-[color:var(--foreground)]">
                      {user.email}
                    </p>
                  </div>
                  <AuthSignOutButton compact />
                </div>
              </div>
            </div>
          </header>

          <section className="min-w-0 overflow-x-clip rounded-[28px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.2)] md:p-7">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
