import { redirect } from "next/navigation";

import { ImportsFlowGrid } from "@/components/imports/ImportsFlowGrid";
import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from "@/services/imports/get-csv-upload-sources";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import { getBookedProofRead } from "@/services/proof/get-booked-proof-read";

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

  const [uploadSources, bookedProofRead] = await Promise.all([
    getCsvUploadSources(appContext.workspace.id),
    getBookedProofRead(appContext.workspace.id),
  ]);
  const hasAppointmentsSource = hasLiveCsvUploadSource(uploadSources.appointments);
  const hasClientSource = hasLiveCsvUploadSource(uploadSources.clients);
  const hasAppointmentEvidence = bookedProofRead.hasBookedProofVisible;
  const heroTitle = hasAppointmentEvidence
    ? "Keep the leak read current with clean clinic data."
    : hasAppointmentsSource
      ? "Strengthen the evidence behind your first leak read."
      : "Upload clinic data for your first leak read.";
  const heroSummary = hasAppointmentEvidence
    ? "Fresh appointment evidence keeps estimated revenue at risk, confidence, and recommended actions trustworthy."
    : hasAppointmentsSource
      ? "Review status, dates, and value fields so REVORY can separate financial leaks from operational and data-quality risks."
      : "Start with appointment CSV data. REVORY checks data quality, confirms mapping, and runs the deterministic leak read after import.";

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-4">
            <div className="max-w-[42rem] space-y-3">
              <p className="rev-kicker">Clinic data</p>
              <h1 className="rev-display-hero max-w-[30rem]">{heroTitle}</h1>
              <p className="max-w-[38rem] text-sm leading-[1.6] text-[color:var(--text-muted)]">
                {heroSummary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RevoryStatusBadge tone={hasAppointmentsSource ? "real" : "future"}>
                Appointment CSV {hasAppointmentsSource ? "imported" : "needed"}
              </RevoryStatusBadge>
              <RevoryStatusBadge tone={hasClientSource ? "neutral" : "future"}>
                Client context {hasClientSource ? "available" : "optional"}
              </RevoryStatusBadge>
              <RevoryStatusBadge tone={hasAppointmentEvidence ? "accent" : "neutral"}>
                Leak evidence {hasAppointmentEvidence ? "ready" : "pending"}
              </RevoryStatusBadge>
            </div>

            <div className="flex flex-wrap gap-3">
              <DocumentNavigationLink
                className="rev-button-primary"
                href={hasAppointmentEvidence ? "/app/dashboard" : "#booking-inputs-flow"}
              >
                {hasAppointmentEvidence ? "Go to dashboard" : "Start with appointment data"}
              </DocumentNavigationLink>
              {hasAppointmentEvidence ? (
                <DocumentNavigationLink
                  className="rev-button-secondary"
                  href="/app/revenue-leaks"
                >
                  View revenue leaks
                </DocumentNavigationLink>
              ) : null}
            </div>
          </div>

          <aside className="rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5">
            <p className="rev-label">Short guided flow</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--text-muted)]">
              <li><span className="font-semibold text-[color:var(--foreground)]">1. CSV</span> — choose the appointment or client template.</li>
              <li><span className="font-semibold text-[color:var(--foreground)]">2. Data Quality</span> — review coverage and missing fields.</li>
              <li><span className="font-semibold text-[color:var(--foreground)]">3. First Leak Read</span> — see risk, evidence, confidence, and limits.</li>
              <li><span className="font-semibold text-[color:var(--foreground)]">4. Dashboard</span> — continue with the highest-priority leak.</li>
            </ol>
          </aside>
        </div>
      </section>

      <section id="booking-inputs-flow">
        <ImportsFlowGrid
          appointmentsLastUpload={toUploadSummary(uploadSources.appointments)}
          clientsLastUpload={toUploadSummary(uploadSources.clients)}
        />
      </section>
    </div>
  );
}
