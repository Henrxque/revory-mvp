import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app/AppSidebar";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import {
  getOnboardingStep,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

type PrivateAppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function PrivateAppLayout({
  children,
}: PrivateAppLayoutProps) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
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
    : `Activation in progress · ${currentStep.eyebrow}`;

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[200px_1fr]">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AppSidebar
            activationLabel={activationSetup.isCompleted ? "Active" : "Setup"}
            currentStepTitle={currentStepTitle}
            userEmail={user.email}
            workspaceName={workspace.name}
            workspaceStatus={workspace.status}
          />
        </div>

        <div className="space-y-4">
          <header className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.94)] px-5 py-4 shadow-[0_16px_60px_rgba(0,0,0,0.22)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[1rem] font-medium text-[color:var(--foreground)]">
                  {workspace.name}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {workspaceSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--background-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                  MedSpa-first
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--background-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                  {workspace.activeModeKey}
                </div>
                <RevoryStatusBadge tone={activationSetup.isCompleted ? "accent" : "neutral"}>
                  {activationSetup.isCompleted ? "Activated" : "In setup"}
                </RevoryStatusBadge>
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--background-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                  {workspace.status}
                </div>
                <UserButton />
              </div>
            </div>
          </header>

          <section className="rounded-[28px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.2)] md:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
