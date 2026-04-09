import { redirect } from "next/navigation";
import { Suspense } from "react";

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

type ImportsHeroFallback = Readonly<{
  heroCtaLabel: string;
  heroSummary: string;
  heroTitle: string;
  nextMoveHeadline: string;
  nextMoveNote: string;
}>;

type ImportsNextMoveInput = Readonly<{
  fallback: ImportsHeroFallback;
  hasAppointmentsSourceReady: boolean;
  hasBookedProofVisible: boolean;
  hasLeadBaseVisible: boolean;
  isRevenueSupported: boolean;
}>;

function ImportsNextMoveSection({
  headline,
  note,
}: Readonly<{
  headline: string;
  note: string;
}>) {
  return (
    <div className="mt-3 border-t border-[color:var(--border)] pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
        Next move
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[color:var(--foreground)]">
        {headline}
      </p>
      <p className="mt-1 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
        {note}
      </p>
    </div>
  );
}

async function ImportsNextMoveSectionAsync({
  fallback,
  hasAppointmentsSourceReady,
  hasBookedProofVisible,
  hasLeadBaseVisible,
  isRevenueSupported,
}: ImportsNextMoveInput) {
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
  const classifiedHero = applyImportsIntentClassification(fallback, classification);

  return (
    <ImportsNextMoveSection
      headline={classifiedHero.nextMoveHeadline}
      note={classifiedHero.nextMoveNote}
    />
  );
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
        ? "Primary proof lane is live"
        : hasAppointmentsSourceReady
          ? "Appointments file is in, proof still needs review"
          : "Start here for revenue",
      tone: hasBookedProofVisible ? "real" : "future",
      value: hasBookedProofVisible ? "Live" : hasAppointmentsSourceReady ? "Review" : "Pending",
    },
    {
      label: "Lead base support",
      note: hasLeadBaseVisible ? "Secondary support is visible" : "Add only when needed",
      tone: hasLeadBaseVisible ? "real" : "neutral",
      value: hasLeadBaseVisible ? "Live" : "Ready",
    },
  ] as const;
  const isRevenueSupported = hasBookedProofVisible;
  const heroTitle = hasBookedProofVisible
    ? "Keep proof clean behind revenue."
    : hasAppointmentsSourceReady
      ? "Turn this file into booked proof."
      : "Start with booked appointments.";
  const heroSummary = hasBookedProofVisible
    ? "Booked proof stays first. Lead-base support stays secondary."
    : hasAppointmentsSourceReady
      ? "The appointments file is in. Review booked outcomes so revenue can read real bookings."
      : "Upload booked appointments first so Seller can turn paid demand into visible booked proof.";
  const nextMove = hasBookedProofVisible
    ? hasLeadBaseVisible
      ? {
          headline: "Refresh booked proof",
          note: "Update booked appointments when the revenue picture changes.",
        }
      : {
          headline: "Add lead base",
          note: "Add lead context after booked proof is already live.",
        }
    : hasAppointmentsSourceReady
      ? {
          headline: "Review booked proof",
          note: "The appointments file is present, but booked outcomes still are not supporting revenue.",
        }
      : {
          headline: "Start booked proof",
          note: "Upload booked appointments first.",
        };
  const fallbackHero = {
    heroCtaLabel: hasBookedProofVisible
      ? "Open Revenue View"
      : hasAppointmentsSourceReady
        ? "Review booked proof"
        : "Start booked proof",
    heroSummary,
    heroTitle,
    nextMoveHeadline: nextMove.headline,
    nextMoveNote: nextMove.note,
  };
  const heroCta = hasBookedProofVisible
    ? {
        className: "rev-button-primary",
        href: "/app/dashboard",
        label: fallbackHero.heroCtaLabel,
      }
    : {
        className: "rev-button-secondary",
        href: "#booking-inputs-flow",
        label: fallbackHero.heroCtaLabel,
      };
  const stateSnapshot = [
    ...quickState,
    {
      label: "Revenue view",
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
                  Proof first
                </span>
                <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-[0.3rem] text-[9px] font-medium uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                  {hasLeadBaseVisible ? "Lead support live" : "Lead support optional"}
                </span>
              </div>

              <h1 className="rev-display-hero max-w-[22rem]">{fallbackHero.heroTitle}</h1>

              <p className="max-w-[30rem] text-sm leading-[1.5] text-[color:var(--text-muted)]">
                {fallbackHero.heroSummary}
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
                {isRevenueSupported ? "Revenue ready" : "Revenue pending"}
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
              <p className="rev-label">Input snapshot</p>
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
            <Suspense
              fallback={
                <ImportsNextMoveSection
                  headline={fallbackHero.nextMoveHeadline}
                  note={fallbackHero.nextMoveNote}
                />
              }
            >
              <ImportsNextMoveSectionAsync
                fallback={fallbackHero}
                hasAppointmentsSourceReady={hasAppointmentsSourceReady}
                hasBookedProofVisible={hasBookedProofVisible}
                hasLeadBaseVisible={hasLeadBaseVisible}
                isRevenueSupported={isRevenueSupported}
              />
            </Suspense>
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
