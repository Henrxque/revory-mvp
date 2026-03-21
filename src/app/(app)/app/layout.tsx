import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 shadow-[0_18px_50px_rgba(32,26,24,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">
                REVORY App
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-[color:var(--foreground)] md:text-3xl">
                  {workspace.name}
                </h1>
                <p className="text-sm leading-6 text-black/65">
                  Signed in as {user.email}. The private area is ready for setup
                  and dashboard flows.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/80 p-1">
                <Link
                  href="/app/setup"
                  className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-white"
                >
                  Setup
                </Link>
                <Link
                  href="/app/dashboard"
                  className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/app/imports"
                  className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-white"
                >
                  Imports
                </Link>
              </nav>

              <UserButton />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">
                Workspace Status
              </p>
              <p className="mt-2 text-sm font-medium text-black/75">
                {workspace.status}
              </p>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">
                Current Step
              </p>
              <p className="mt-2 text-sm font-medium text-black/75">
                {currentStep.title}
              </p>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">
                Activation
              </p>
              <p className="mt-2 text-sm font-medium text-black/75">
                {activationSetup.isCompleted ? "Completed" : "In progress"}
              </p>
            </div>
          </div>
        </header>

        <section className="flex-1 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(32,26,24,0.06)] backdrop-blur md:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
