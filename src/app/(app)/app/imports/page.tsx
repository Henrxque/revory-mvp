import { redirect } from "next/navigation";

import { ImportsFlowGrid } from "@/components/imports/ImportsFlowGrid";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getCsvUploadSources } from "@/services/imports/get-csv-upload-sources";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";

function toUploadSummary(
  source: {
    lastImportErrorRowCount: number;
    lastImportFileName: string | null;
    lastImportedAt: Date | null;
    lastImportSuccessRowCount: number;
    lastImportRowCount: number;
    status: string;
  } | null,
) {
  if (!source) {
    return null;
  }

  return {
    errorRows: source.lastImportErrorRowCount,
    fileName: source.lastImportFileName,
    importedAt: source.lastImportedAt?.toISOString() ?? null,
    successRows: source.lastImportSuccessRowCount,
    status: source.status,
    totalRows: source.lastImportRowCount,
  };
}

export default async function ImportsPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app/imports"));
  }

  if (!appContext.activationSetup.isCompleted) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const uploadSources = await getCsvUploadSources(appContext.workspace.id);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-card-soft relative overflow-hidden rounded-[30px] p-6 md:p-7">
        <div className="pointer-events-none absolute -left-12 top-0 h-32 w-32 rounded-full bg-[rgba(194,9,90,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute right-12 top-8 h-24 w-24 rounded-full bg-[rgba(224,16,106,0.07)] blur-3xl" />

        <div className="relative space-y-6">
          <div className="max-w-[880px] space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="rev-kicker">Imports & Mapping</p>
              <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
                Guided import
              </span>
            </div>

            <h1 className="max-w-[700px] font-[family:var(--font-display)] text-[clamp(2.3rem,4vw,3.8rem)] leading-[0.94] text-[color:var(--foreground)]">
              Review incoming columns before REVORY imports the file.
            </h1>

            <p className="max-w-[600px] text-sm leading-7 text-[color:var(--text-muted)] md:text-base">
              Upload the CSV you already have, review the detected headers, and
              confirm the final mapping before REVORY imports the file.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Official template",
                text: "Fastest when the exported file already matches the REVORY contract.",
              },
              {
                label: "Header review",
                text: "Headers are reviewed before anything is imported.",
              },
              {
                label: "Clear result",
                text: "Review items, blockers, and final confirmation stay explicit.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
              >
                <p className="rev-label">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ImportsFlowGrid
        appointmentsLastUpload={toUploadSummary(uploadSources.appointments)}
        clientsLastUpload={toUploadSummary(uploadSources.clients)}
      />
    </div>
  );
}
