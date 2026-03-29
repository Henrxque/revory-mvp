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
  const hasBookedProofVisible = hasLiveCsvUploadSource(uploadSources.appointments);
  const hasLeadBaseVisible = hasLiveCsvUploadSource(uploadSources.clients);
  const quickState = [
    {
      label: "Booked proof",
      note: hasBookedProofVisible
        ? "Visible in revenue read"
        : "Needed for revenue read",
      tone: hasBookedProofVisible ? "real" : "future",
      value: hasBookedProofVisible ? "Visible" : "Next",
    },
    {
      label: "Lead base",
      note: hasLeadBaseVisible ? "Supporting context" : "Optional after proof",
      tone: hasLeadBaseVisible ? "real" : "neutral",
      value: hasLeadBaseVisible ? "Visible" : "Optional now",
    },
  ] as const;
  const isRevenueSupported = hasBookedProofVisible;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-5">
            <div className="max-w-[41rem] space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="rev-kicker">Booking Inputs</p>
                <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
                  Booked proof
                </span>
                <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  {isRevenueSupported ? "Revenue read supported" : "Revenue read next"}
                </span>
              </div>

              <h1 className="rev-display-hero max-w-[30rem]">
                {hasBookedProofVisible
                  ? "Keep booked proof clean behind revenue."
                  : "Bring booked proof behind revenue."}
              </h1>

              <p className="max-w-[35rem] text-sm leading-6 text-[color:var(--text-muted)] md:text-[15px]">
                {hasBookedProofVisible
                  ? "Use this page to refresh booked visibility while keeping Seller narrow, premium, and commercially clear."
                  : "This is the shortest bridge from a live Seller workspace to a revenue read that feels real."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {quickState.map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
                >
                  <span className="text-[11px] font-medium text-[color:var(--foreground)]">
                    {item.label}
                  </span>
                  <RevoryStatusBadge tone={item.tone}>{item.value}</RevoryStatusBadge>
                </div>
              ))}
              <span className="inline-flex min-h-8 items-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-[color:var(--text-muted)]">
                {isRevenueSupported ? "Revenue context is grounded" : "Revenue context opens after proof"}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <DocumentNavigationLink
                className={hasBookedProofVisible ? "rev-button-primary" : "rev-button-secondary"}
                href="/app/dashboard"
              >
                Open Revenue View
              </DocumentNavigationLink>
            </div>
          </div>

          <aside className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5">
            <p className="rev-label">Current booking-input state</p>
            <div className="mt-4 space-y-3">
              {quickState.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.015)] px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[color:var(--foreground)]">{item.label}</p>
                    <RevoryStatusBadge tone={item.tone}>{item.value}</RevoryStatusBadge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">{item.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[color:var(--border)] pt-4 text-xs leading-6 text-[color:var(--text-muted)]">
              Keep this page narrow: booked proof first, lead-base support second.
            </p>
          </aside>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              {
                label: "Booked proof first",
                text: "Start with appointments. This is what makes Seller commercially real from session one.",
              },
              {
                label: "Guided matching",
                text: "Headers are reviewed before any row is allowed to shape booked visibility.",
              },
              {
                label: "Lead-base support",
                text: hasLeadBaseVisible
                  ? "Client records are already supporting the lead base behind the revenue read."
                  : "Lead-base data can come right after booked proof when you need stronger context.",
              },
              {
                label: "Revenue handoff",
                text: "Value per booking is what turns booked proof into the dashboard revenue read.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="min-h-[8.75rem] rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
              >
                <p className="rev-label">{item.label}</p>
                <p className="mt-3 max-w-[27rem] text-sm leading-6 text-[color:var(--text-muted)]">
                  {item.text}
                </p>
              </div>
            ))}
        </div>
      </section>

      <ImportsFlowGrid
        appointmentsLastUpload={toUploadSummary(uploadSources.appointments)}
        clientsLastUpload={toUploadSummary(uploadSources.clients)}
      />
    </div>
  );
}
