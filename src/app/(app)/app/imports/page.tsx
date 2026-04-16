import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ImportsFlowGrid } from "@/components/imports/ImportsFlowGrid";
import { LeadBookingOpportunityList } from "@/components/lead-booking/LeadBookingOpportunityList";
import { DocumentNavigationLink } from "@/components/navigation/DocumentNavigationLink";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { applyImportsIntentClassification } from "@/services/decision-support/apply-intent-classification";
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from "@/services/imports/get-csv-upload-sources";
import { getLeadIntakeRoutingRead } from "@/services/lead-booking/get-lead-intake-routing-read";
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

function formatLeadOpportunitySummaryTone(value: string) {
  switch (value) {
    case "ready":
      return "real" as const;
    case "blocked":
      return "future" as const;
    case "booked":
      return "neutral" as const;
    default:
      return "accent" as const;
  }
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

  const [uploadSources, bookedProofRead, leadIntakeRead] = await Promise.all([
    getCsvUploadSources(appContext.workspace.id),
    getBookedProofRead(appContext.workspace.id),
    getLeadIntakeRoutingRead(appContext.workspace.id),
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
  const assistanceValueProof = [
    {
      label: "Ready reads",
      note: "Can move on the current path",
      tone: "real" as const,
      value: leadIntakeRead.summary.ready,
    },
    {
      label: "Handoffs opened",
      note: "Seller participation already visible",
      tone: "accent" as const,
      value: leadIntakeRead.summary.handoffsOpened,
    },
    {
      label: "Already booked",
      note: "Resolved outside active booking work",
      tone: "neutral" as const,
      value: leadIntakeRead.summary.booked,
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

      <section className="rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] p-5 md:p-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rev-kicker">Booking assistance</p>
              <RevoryStatusBadge tone="neutral">Ready read visible</RevoryStatusBadge>
              <RevoryStatusBadge tone="neutral">Blocked reason visible</RevoryStatusBadge>
              <RevoryStatusBadge tone="neutral">Suggested message bounded</RevoryStatusBadge>
              <RevoryStatusBadge tone="neutral">Path assist visible</RevoryStatusBadge>
            </div>
            <h2 className="max-w-[34rem] text-[1.85rem] font-semibold leading-[0.98] tracking-[-0.04em] text-[color:var(--foreground)]">
              Keep booking assistance premium, bounded, and tied to the current path.
            </h2>
            <p className="max-w-[38rem] text-sm leading-[1.6] text-[color:var(--text-muted)]">
              Seller shows what can move now, what is blocked, and which short next step fits the current booking path. Suggested message and assisted handoff stay visible only when the current read truly supports them.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,1fr))]">
            <div className="rounded-[24px] border border-[rgba(194,9,90,0.26)] bg-[linear-gradient(180deg,rgba(194,9,90,0.09),rgba(255,255,255,0.02))] px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="rev-label">Ready now</p>
                <RevoryStatusBadge tone={formatLeadOpportunitySummaryTone("ready")}>
                  Can open path
                </RevoryStatusBadge>
              </div>
              <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.05em] text-[color:var(--foreground)]">
                {leadIntakeRead.summary.ready}
              </p>
              <p className="mt-2 max-w-[16rem] text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                Opportunities already clear enough to use the current booking path with assisted guidance.
              </p>
            </div>

            <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="rev-label">Blocked now</p>
                <RevoryStatusBadge tone={formatLeadOpportunitySummaryTone("blocked")}>
                  Needs a fix
                </RevoryStatusBadge>
              </div>
              <p className="mt-3 text-[1.5rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
                {leadIntakeRead.summary.blocked}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                Blocked opportunities stay visible with an explicit reason and a narrow next move.
              </p>
            </div>

            <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="rev-label">Handoffs opened</p>
                <RevoryStatusBadge tone="neutral">Seller signal</RevoryStatusBadge>
              </div>
              <p className="mt-3 text-[1.5rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
                {leadIntakeRead.summary.handoffsOpened}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                Seller records when the current booking path was opened without pretending thread or follow-up.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.018))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[34rem]">
                <p className="rev-label">Assistance value proof</p>
                <p className="mt-1 text-base font-semibold text-[color:var(--foreground)]">
                  Seller now shows booking participation without pretending broader sales automation.
                </p>
                <p className="mt-2 text-[11px] leading-[1.6] text-[color:var(--text-muted)]">
                  This layer stays narrow on purpose: it shows what can move now, when Seller already opened the current booking path, and which leads are already booked instead of still being treated like active booking work.
                </p>
              </div>
              <RevoryStatusBadge tone="neutral">Executive proof layer</RevoryStatusBadge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {assistanceValueProof.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="rev-label">{item.label}</p>
                    <RevoryStatusBadge tone={item.tone}>{item.note}</RevoryStatusBadge>
                  </div>
                  <p className="mt-2 text-[1.4rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--foreground)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3 py-1.5 text-[10px] font-medium text-[color:var(--text-muted)]">
                {leadIntakeRead.summary.blocked} blocked reads stay visible with an explicit reason.
              </span>
              <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-3 py-1.5 text-[10px] font-medium text-[color:var(--text-muted)]">
                Suggested message stays bounded to the current booking step.
              </span>
            </div>
          </div>

          <aside className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
              <div className="space-y-4">
                <div>
                  <p className="rev-label">Booking assistance surface</p>
                  <p className="mt-1 text-base font-semibold text-[color:var(--foreground)]">
                    Priority booking reads
                  </p>
                  <p className="mt-2 text-[11px] leading-[1.55] text-[color:var(--text-muted)]">
                    Seller keeps the list short, prioritizes what is most actionable, and avoids turning this area into CRM, inbox, or broad sales-automation surface.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    {
                      label: "Main offer",
                      note: "Workspace anchor",
                      tone: "accent" as const,
                      value: leadIntakeRead.mainOfferLabel,
                    },
                    {
                      label: "Booking path",
                      note: "Current path",
                      tone: "neutral" as const,
                      value: leadIntakeRead.bookingPathLabel,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="rev-label">{item.label}</p>
                        <RevoryStatusBadge tone={item.tone}>{item.note}</RevoryStatusBadge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.016)] p-4.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="rev-label">Priority booking list</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                      Current booking assistance snapshot
                    </p>
                  </div>
                  <RevoryStatusBadge tone="neutral">
                    {leadIntakeRead.opportunities.length} items shown
                  </RevoryStatusBadge>
                </div>
                <LeadBookingOpportunityList opportunities={leadIntakeRead.opportunities} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
