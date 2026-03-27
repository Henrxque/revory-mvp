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

type PrivateAppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

function formatModeChipLabel(modeKey: string) {
  switch (modeKey) {
    case "MODE_A":
      return "Mode A";
    case "MODE_B":
      return "Mode B";
    case "MODE_C":
      return "Mode C";
    default:
      return modeKey;
  }
}

function getOperatorInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "R";
}

export default async function PrivateAppLayout({
  children,
}: PrivateAppLayoutProps) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  const { activationSetup, user, workspace } = appContext;
  const currentStep = getOnboardingStep(
    resolveOnboardingStepKey(activationSetup.currentStep),
  );
  const currentStepTitle = activationSetup.isCompleted
    ? "Workspace active"
    : currentStep.title;
  const workspaceSubtitle = activationSetup.isCompleted
    ? "Revenue recovery workspace"
    : `Activation in progress - ${currentStep.eyebrow}`;
  const operatorInitial = getOperatorInitial(user.email);

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="relative z-50 shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AppSidebar
            activationLabel={activationSetup.isCompleted ? "Active" : "Setup"}
            currentStepTitle={currentStepTitle}
            userEmail={user.email}
            workspaceName={workspace.name}
            workspaceStatus={workspace.status}
          />
        </div>

        <div className="min-w-0 space-y-4 overflow-x-clip">
          <header className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.94)] px-5 py-4 shadow-[0_16px_60px_rgba(0,0,0,0.22)]">
            <div className="flex flex-wrap items-start justify-between gap-4 xl:items-center">
              <div className="min-w-0">
                <p className="truncate text-[1rem] font-semibold text-[color:var(--foreground)]">
                  {workspace.name}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {workspaceSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-start justify-end gap-3">
                <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                    MedSpa-first
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                    {formatModeChipLabel(workspace.activeModeKey)}
                  </span>
                  <RevoryStatusBadge tone={activationSetup.isCompleted ? "accent" : "neutral"}>
                    {activationSetup.isCompleted ? "Activated" : "In setup"}
                  </RevoryStatusBadge>
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {workspace.status}
                  </span>
                </div>

                <div className="flex min-w-[18rem] items-center gap-3 rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-3 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.14)] text-sm font-semibold text-[color:var(--accent-light)]">
                    {operatorInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Operator
                    </span>
                    <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                      {user.email}
                    </p>
                  </div>
                  <AuthSignOutButton compact />
                </div>
              </div>
            </div>
          </header>

          <section className="min-w-0 overflow-x-clip rounded-[28px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.2)] md:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
