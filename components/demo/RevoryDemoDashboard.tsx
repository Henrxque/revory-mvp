import Link from "next/link";

import { AppSidebar } from "@/components/app/AppSidebar";
import { DailyLeakBrief } from "@/components/briefs/DailyLeakBrief";
import { RevenueLeakDashboardHero } from "@/components/dashboard/RevenueLeakDashboardHero";
import { DataQualityCheckCard } from "@/components/imports/DataQualityCheckCard";
import { ExecutiveRevenueLeakSummaryCard } from "@/components/proof/ExecutiveRevenueLeakSummaryCard";
import { RevenueLeakList } from "@/components/revenue-leaks/RevenueLeakList";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { REVORY_PUBLIC_OFFER } from "@/services/billing/public-offer";
import {
  REVORY_DEMO_DAILY_BRIEF_READ,
  REVORY_DEMO_DASHBOARD_READ,
  REVORY_DEMO_DATA_QUALITY_TRIAGE,
  REVORY_DEMO_EXECUTIVE_READ,
  REVORY_DEMO_LEAK_ITEMS,
} from "@/services/demo/revory-demo-adapter";
import type { buildRevoryDemoRead } from "@/services/demo/revory-demo-fixture";

type RevoryDemoRead = ReturnType<typeof buildRevoryDemoRead>;

type RevoryDemoDashboardProps = Readonly<{
  read: RevoryDemoRead;
}>;

function DemoSummaryTile({
  label,
  note,
  value,
}: Readonly<{
  label: string;
  note: string;
  value: number;
}>) {
  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.022)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <p className="rev-label">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-[12px] leading-5 text-[color:var(--text-muted)]">
        {note}
      </p>
    </div>
  );
}

export function RevoryDemoDashboard({ read }: RevoryDemoDashboardProps) {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="relative z-50 shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AppSidebar
            activationStatus="Demo"
            bookingInputsStatus="Sample data"
            currentStepTitle="Fictional data"
            demoMode
            userEmail="Read-only public sample"
            workspaceName="Asteria Aesthetics"
            workspaceStatus="SAMPLE"
          />
        </div>

        <div className="min-w-0 space-y-5 overflow-x-clip">
          <header className="rev-shell-panel rounded-[26px] px-5 py-3.5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold tracking-[-0.035em] text-[color:var(--foreground)]">
                  REVORY Demo
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[color:var(--text-muted)]">
                  This demo uses fictional appointment data.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <RevoryStatusBadge tone="accent">Read-only demo</RevoryStatusBadge>
                <RevoryStatusBadge tone="neutral">
                  Sample data — not a live clinic account
                </RevoryStatusBadge>
              </div>
            </div>
          </header>

          <section className="min-w-0 overflow-x-clip rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(19,18,26,0.86),rgba(13,12,18,0.86))] p-5 shadow-[var(--shadow-soft)] md:p-7">
            <div className="space-y-5" id="demo-dashboard">
              <DailyLeakBrief
                detailHref="#demo-leaks"
                detailLabel="Review sample Revenue Leaks"
                read={REVORY_DEMO_DAILY_BRIEF_READ}
              />

              <RevenueLeakDashboardHero
                actionArea={
                  <div className="space-y-2">
                    <a
                      className="rev-button-primary w-full justify-center px-5 py-3 text-sm"
                      href="#demo-leaks"
                    >
                      Review sample Revenue Leaks
                    </a>
                    <p className="text-center text-[10px] leading-4 text-[color:var(--text-subtle)]">
                      Read-only sample. A paid workspace unlocks your clinic&apos;s own leak read.
                    </p>
                  </div>
                }
                evidenceCopy="REVORY reads structured sample evidence and keeps operational risks separate from estimated financial value."
                id="demo-revenue-view"
                monthLabel="Jul 2026"
                read={REVORY_DEMO_DASHBOARD_READ}
              />

              <section className="space-y-5 pt-1" id="demo-leaks">
                <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <RevoryStatusBadge tone="accent">Leak evidence</RevoryStatusBadge>
                        <RevoryStatusBadge tone="neutral">
                          Estimate, not accounting loss
                        </RevoryStatusBadge>
                      </div>

                      <h2 className="mt-4 text-[34px] font-semibold tracking-[-0.065em] text-[color:var(--foreground)] md:text-[46px]">
                        Revenue Leaks
                      </h2>
                      <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[color:var(--text-muted)]">
                        Review the revenue risks REVORY detected from this fictional clinic-data fixture.
                      </p>
                    </div>

                    <RevoryStatusBadge tone="neutral">No live actions</RevoryStatusBadge>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <DemoSummaryTile
                      label="Active signals"
                      note="Open fictional evidence"
                      value={REVORY_DEMO_LEAK_ITEMS.length}
                    />
                    <DemoSummaryTile
                      label="Financial leaks"
                      note="Included only with financial basis"
                      value={read.financialLeaks.length}
                    />
                    <DemoSummaryTile
                      label="Operational / data quality"
                      note="Kept outside the financial total"
                      value={read.operationalRisks.length + read.dataQualityRisks.length}
                    />
                  </div>
                </section>

                <RevenueLeakList
                  activeFilter="ALL_ACTIVE"
                  items={REVORY_DEMO_LEAK_ITEMS}
                />
              </section>

              <section id="demo-data">
                <DataQualityCheckCard
                  readOnlySample
                  triage={REVORY_DEMO_DATA_QUALITY_TRIAGE}
                />
              </section>

              <section className="space-y-3">
                <div>
                  <p className="rev-label">Executive surface</p>
                  <p className="mt-1 text-[12px] leading-5 text-[color:var(--text-muted)]">
                    The paid workspace uses this same executive summary composition.
                  </p>
                </div>
                <ExecutiveRevenueLeakSummaryCard
                  read={REVORY_DEMO_EXECUTIVE_READ}
                  workspaceName={read.clinicName}
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]" id="demo-cta">
                <div className="rev-card rounded-[26px] p-6 md:p-7">
                  <p className="rev-kicker">Sample CSV</p>
                  <h2 className="rev-display-panel mt-2">Inspect the source format</h2>
                  <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">
                    Download the exact fictional file behind this read. The demo never submits, parses or reuses it.
                  </p>
                  <a
                    className="rev-button-secondary mt-6"
                    download
                    href="/demo/revory-demo-appointments.csv"
                  >
                    Download sample CSV
                  </a>
                </div>

                <div className="rev-shell-hero rounded-[26px] p-6 md:p-8">
                  <p className="rev-kicker">See your clinic&apos;s first leak read</p>
                  <h2 className="mt-3 max-w-[680px] font-[family:var(--font-display)] text-[clamp(2rem,4vw,3.6rem)] leading-[0.94] tracking-[-0.05em] text-white">
                    Activate the same REVORY experience for your clinic.
                  </h2>
                  <p className="mt-4 max-w-[690px] text-sm leading-6 text-[color:var(--text-muted)]">
                    Your real clinic read becomes available after activating REVORY. The current public offer is {REVORY_PUBLIC_OFFER.monthlyPriceLabel}.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      className="rev-button-primary"
                      href={REVORY_PUBLIC_OFFER.checkoutHref}
                    >
                      {REVORY_PUBLIC_OFFER.ctaLabel}
                    </Link>
                    <span className="text-xs leading-5 text-[color:var(--text-subtle)]">
                      Subscribe first, then review and import your own clinic data inside the protected app.
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.07)] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--warning)]">
                  Product truth
                </p>
                <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[color:var(--text-muted)]">
                  This public page uses fictional, static evidence. Revenue at risk is estimated, operational and data-quality risks are not counted as financial loss, and no demo interaction writes data.
                </p>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
