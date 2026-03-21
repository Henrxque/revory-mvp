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

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[250px_1fr]">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AppSidebar
            activationLabel={activationSetup.isCompleted ? "Active" : "Setup"}
            currentStepTitle={currentStep.title}
            userEmail={user.email}
            workspaceName={workspace.name}
            workspaceStatus={workspace.status}
          />
        </div>

        <div className="space-y-4">
          <header className="rev-shell-hero rounded-[30px] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="rev-kicker">
                  REVORY Workspace
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-[family:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)] md:text-[2.5rem]">
                    {workspace.name}
                  </h1>
                  <RevoryStatusBadge tone="accent">
                    {activationSetup.isCompleted ? "Activated" : "In setup"}
                  </RevoryStatusBadge>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
                  The MVP shell now mirrors the imported state of the workspace
                  while keeping future automation layers clearly separated.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    Current step: {currentStep.title}
                  </div>
                  <div className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    Status: {workspace.status}
                  </div>
                  <UserButton />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rev-card-soft rounded-[22px] px-4 py-3">
                    <p className="rev-label">Activation</p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                      {activationSetup.isCompleted ? "Completed" : "In progress"}
                    </p>
                  </div>
                  <div className="rev-card-soft rounded-[22px] px-4 py-3">
                    <p className="rev-label">Mode</p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                      {workspace.activeModeKey ?? "Pending"}
                    </p>
                  </div>
                  <div className="rev-card-soft rounded-[22px] px-4 py-3">
                    <p className="rev-label">Operator</p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="rev-shell-panel rounded-[30px] p-5 md:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
