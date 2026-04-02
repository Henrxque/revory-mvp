import { redirect } from "next/navigation";

import { ImportsFlowGrid } from "@/components/imports/ImportsFlowGrid";
import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { applyImportsIntentClassification } from "@/services/decision-support/apply-intent-classification";
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from "@/services/imports/get-csv-upload-sources";
import { requestBoundedIntentClassification } from "@/services/llm/request-bounded-intent-classification";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import { getBookedProofRead } from "@/services/proof/get-booked-proof-read";
import type { RevoryIntentCode, RevoryObjectionCode } from "@/types/intent-classification";

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
  const hasBookedProofVisible = bookedProofRead.hasBookedProofVisible;
  const hasAppointmentsSourceReady = hasLiveCsvUploadSource(uploadSources.appointments);
  const hasLeadBaseVisible = hasLiveCsvUploadSource(uploadSources.clients);
  const quickState = [
    {
      label: "Booked proof",
      note: hasBookedProofVisible
        ? "Live in revenue view"
        : hasAppointmentsSourceReady
          ? "Source present, outcomes still not visible"
          : "Required for revenue",
      tone: hasBookedProofVisible ? "real" : "future",
      value: hasBookedProofVisible ? "Live" : hasAppointmentsSourceReady ? "Review" : "Pending",
    },
    {
      label: "Lead base",
      note: hasLeadBaseVisible ? "Context visible" : "Optional support",
      tone: hasLeadBaseVisible ? "real" : "neutral",
      value: hasLeadBaseVisible ? "Live" : "Ready",
    },
  ] as const;
  const isRevenueSupported = hasBookedProofVisible;
  const heroTitle = hasBookedProofVisible
    ? "Keep revenue proof clean."
    : "Start revenue proof.";
  const heroSummary = hasBookedProofVisible
    ? "Proof first. Lead support second."
    : hasAppointmentsSourceReady
      ? "Proof source is present, but booked outcomes still need a clean pass."
      : "Upload proof first. Lead support second.";
  const nextMove = hasBookedProofVisible
    ? hasLeadBaseVisible
      ? {
          headline: "Refresh booked proof",
          note: "Update files when booked data changes.",
        }
      : {
          headline: "Add lead base",
          note: "Optional support after proof is live.",
        }
    : hasAppointmentsSourceReady
      ? {
          headline: "Review booked proof",
          note: "The appointments source is present, but booked outcomes still are not supporting revenue.",
        }
      : {
          headline: "Start booked proof",
          note: "Upload appointments file first.",
        };
  const allowedIntents: readonly RevoryIntentCode[] = hasBookedProofVisible
    ? hasLeadBaseVisible
      ? ["REFRESH_BOOKED_PROOF", "ADD_LEAD_BASE_SUPPORT", "OPEN_REVENUE_VIEW"]
      : ["ADD_LEAD_BASE_SUPPORT", "OPEN_REVENUE_VIEW", "REFRESH_BOOKED_PROOF"]
    : hasAppointmentsSourceReady
      ? ["REVIEW_BOOKED_PROOF", "START_BOOKED_PROOF"]
      : ["START_BOOKED_PROOF"];
  const allowedObjections: readonly RevoryObjectionCode[] = hasBookedProofVisible
    ? hasLeadBaseVisible
      ? ["NO_ACTIVE_BLOCKER", "SUPPORT_SHOULD_STAY_SECONDARY"]
      : ["NO_ACTIVE_BLOCKER"]
    : hasAppointmentsSourceReady
      ? ["PROOF_SOURCE_NEEDS_REVIEW", "PROOF_NOT_VISIBLE"]
      : hasLeadBaseVisible
        ? ["LEAD_BASE_ONLY", "PROOF_NOT_VISIBLE"]
        : ["PROOF_NOT_VISIBLE"];
  const classification = await requestBoundedIntentClassification({
    allowedIntents,
    allowedObjections,
    context: {
      hasAppointmentsSourceReady,
      hasBookedProofVisible,
      hasLeadBaseVisible,
      isRevenueSupported,
    },
    useCase: "imports",
  });
  const classifiedHero = applyImportsIntentClassification(
    {
      heroCtaLabel: hasBookedProofVisible ? "Open Revenue View" : hasAppointmentsSourceReady ? "Review booked proof" : "Start booked proof",
      heroSummary,
      heroTitle,
      nextMoveHeadline: nextMove.headline,
      nextMoveNote: nextMove.note,
    },
    classification,
  );
  const heroCta = hasBookedProofVisible
    ? {
        className: "rev-button-primary",
        href: "/app/dashboard",
        label: classifiedHero.heroCtaLabel,
      }
    : {
        className: "rev-button-secondary",
        href: "#booking-inputs-flow",
        label: classifiedHero.heroCtaLabel,
      };
  const stateSnapshot = [
    ...quickState,
    {
      label: "Revenue read",
      note: isRevenueSupported ? "Ready now" : "Opens after proof",
      tone: isRevenueSupported ? "real" : "future",
      value: isRevenueSupported ? "Ready" : "Pending",
    },
  ] as const;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-4">
            <div className="max-w-[38rem] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="rev-kicker">Booking Inputs</p>
                <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-2.5 py-[0.3rem] text-[9px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent-light)]">
                  Booked proof
                </span>
                <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-[0.3rem] text-[9px] font-medium uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                  {isRevenueSupported ? "Revenue read supported" : "Revenue read next"}
                </span>
              </div>

              <h1 className="rev-display-hero max-w-[22rem]">{classifiedHero.heroTitle}</h1>

              <p className="max-w-[30rem] text-sm leading-[1.5] text-[color:var(--text-muted)]">
                {classifiedHero.heroSummary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {quickState.map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-2.5 py-1.5"
                >
                  <span className="text-[10px] font-medium text-[color:var(--foreground)]">
                    {item.label}
                  </span>
                  <RevoryStatusBadge tone={item.tone}>{item.value}</RevoryStatusBadge>
                </div>
              ))}
              <span className="inline-flex min-h-7 items-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-2.5 py-[0.35rem] text-[10px] text-[color:var(--text-muted)]">
                {isRevenueSupported ? "Revenue read ready" : "Revenue read pending"}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <DocumentNavigationLink
                className={heroCta.className}
                href={heroCta.href}
              >
                {heroCta.label}
              </DocumentNavigationLink>
            </div>
          </div>

          <aside className="rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4.5">
            <p className="rev-label">Current support</p>
            <div className="mt-3 space-y-2">
              {stateSnapshot.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[14px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.015)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-[color:var(--foreground)]">{item.label}</p>
                    <RevoryStatusBadge tone={item.tone}>{item.value}</RevoryStatusBadge>
                  </div>
                  <p className="mt-1 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-[color:var(--border)] pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Next move
              </p>
              <p className="mt-1.5 text-sm font-semibold text-[color:var(--foreground)]">
                {classifiedHero.nextMoveHeadline}
              </p>
              <p className="mt-1 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
                {classifiedHero.nextMoveNote}
              </p>
            </div>
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
