import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app/AppSidebar";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getCsvUploadSources } from "@/services/imports/get-csv-upload-sources";
import { getOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";
import {
  getOnboardingStep,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

type PrivateAppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

function getAccountInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "R";
}

function resolveLeadSourcesStatus(
  onboardingSourceExists: boolean,
  hasSuccessfulImport: boolean,
) {
  if (hasSuccessfulImport) {
    return "Visible";
  }

  if (onboardingSourceExists) {
    return "Ready for upload";
  }

  return "Not configured";
}

export default async function PrivateAppLayout({
  children,
}: PrivateAppLayoutProps) {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  const { activationSetup, user, workspace } = appContext;
  const [onboardingSource, csvSources] = await Promise.all([
    getOnboardingDataSource(workspace.id),
    getCsvUploadSources(workspace.id),
  ]);
  const csvSourceList = Object.values(csvSources).filter(
    (source): source is NonNullable<(typeof csvSources)[keyof typeof csvSources]> =>
      Boolean(source),
  );
  const hasSuccessfulImport = csvSourceList.some(
    (source) =>
      (source.lastImportSuccessRowCount ?? 0) > 0 ||
      source.status === "IMPORTED" ||
      source.status === "CONNECTED",
  );
  const leadSourcesStatus = resolveLeadSourcesStatus(
    Boolean(onboardingSource),
    hasSuccessfulImport,
  );
  const currentStep = getOnboardingStep(
    resolveOnboardingStepKey(activationSetup.currentStep),
  );
  const currentStepTitle = activationSetup.isCompleted
    ? "Seller live"
    : currentStep.title;
  const workspaceSubtitle = activationSetup.isCompleted
    ? "Booking-first workspace"
    : `Seller setup in progress - ${currentStep.eyebrow}`;
  const accountInitial = getAccountInitial(user.email);

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[216px_minmax(0,1fr)]">
        <div className="relative z-50 shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AppSidebar
            activationLabel={activationSetup.isCompleted ? "Active" : "Setup"}
            currentStepTitle={currentStepTitle}
            leadSourcesStatus={leadSourcesStatus}
            userEmail={user.email}
            workspaceName={workspace.name}
            workspaceStatus={workspace.status}
          />
        </div>

        <div className="min-w-0 space-y-5 overflow-x-clip">
          <header className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.94)] px-5 py-3.5 shadow-[0_16px_60px_rgba(0,0,0,0.22)]">
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
                <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                    MedSpa-first
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
                    Booking-first
                  </span>
                  <RevoryStatusBadge tone={activationSetup.isCompleted ? "accent" : "neutral"}>
                    {activationSetup.isCompleted ? "Activated" : "In setup"}
                  </RevoryStatusBadge>
                  <span className="inline-flex min-h-8 items-center rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {workspace.status}
                  </span>
                </div>

                <div className="flex min-w-[17rem] items-center gap-3 rounded-[20px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-3 py-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.14)] text-sm font-semibold text-[color:var(--accent-light)]">
                    {accountInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Account
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

          <section className="min-w-0 overflow-x-clip rounded-[28px] border border-[color:var(--border)] bg-[rgba(17,16,24,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.2)] md:p-7">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
