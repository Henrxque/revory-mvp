import { notFound, redirect } from "next/navigation";

import { prisma } from "@/db/prisma";
import { summarizeQuoteRecoveryFinancialExposure } from "@/domain/revory/quote-recovery-financial-summary";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";

type SnapshotFinding = {
  currency?: string;
  estimateExternalId: string;
  findingType: string;
  fingerprint?: string;
  id: string;
  reason: string;
  recommendedAction: string;
  valueBasis: string;
  valueCents: number | null;
};

function money(cents: number | null, currency: string) {
  if (cents === null) return "Suppressed";
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/history"));
  const { id } = await params;
  const run = await prisma.quoteRecoveryAnalysisRun.findFirst({
    where: { id, workspaceId: context.workspace.id },
  });
  if (!run) notFound();

  const findings = Array.isArray(run.findingSnapshotJson)
    ? run.findingSnapshotJson as SnapshotFinding[]
    : [];
  const financialSummary = summarizeQuoteRecoveryFinancialExposure(
    findings,
    context.workspace.defaultCurrency,
  );
  const financialNote = financialSummary.hasConflictingEstimateValues
    ? "Suppressed until conflicting values for the same estimate are reviewed."
    : financialSummary.hasMixedCurrencies
      ? "Suppressed because currencies remain separate and no conversion was applied."
      : "Each estimate is counted once; modeled opportunity, not guaranteed revenue.";

  return (
    <main className="mx-auto max-w-5xl space-y-6 bg-white p-8 font-sans text-[#141516] print:p-0">
      <header className="border-b border-[#d8dddc] pb-6">
        <p className="text-sm font-bold tracking-widest text-[#318b78] uppercase">REVORY · Quote Recovery Audit</p>
        <h1 className="mt-3 text-4xl font-bold">Executive recovery read</h1>
        <p className="mt-2 text-sm text-[#53605d]">
          Generated from committed source evidence on {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(run.createdAt)}.
        </p>
      </header>
      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#eef5f3] p-5">
          <p className="text-xs font-bold tracking-wider uppercase">Estimated recoverable</p>
          <p className="mt-2 text-3xl font-bold">
            {money(financialSummary.estimatedValueCents, financialSummary.reportingCurrency)}
          </p>
          <p className="mt-1 text-xs text-[#53605d]">{financialNote}</p>
        </div>
        <div className="rounded-xl bg-[#f1f2f2] p-5">
          <p className="text-xs font-bold tracking-wider uppercase">Active findings</p>
          <p className="mt-2 text-3xl font-bold">{run.activeCount}</p>
          <p className="mt-1 text-xs text-[#53605d]">Financial and operational bases remain separate.</p>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold">Priority findings</h2>
        <div className="mt-4 space-y-3">
          {findings.slice(0, 25).map((finding, index) => (
            <article className="break-inside-avoid rounded-xl border border-[#d8dddc] p-4" key={finding.id}>
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#318b78]">{index + 1}. {finding.findingType.replaceAll("_", " ")}</p>
                  <h3 className="mt-1 font-bold">Estimate {finding.estimateExternalId}</h3>
                </div>
                <strong>
                  {finding.valueCents === null
                    ? "Operational"
                    : money(finding.valueCents, finding.currency ?? financialSummary.reportingCurrency)}
                </strong>
              </div>
              <p className="mt-2 text-sm text-[#53605d]">{finding.reason}</p>
              <p className="mt-2 text-sm"><b>Review next:</b> {finding.recommendedAction}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="border-t border-[#d8dddc] pt-4 text-xs text-[#53605d]">
        REVORY findings support review decisions. They do not represent confirmed accounting loss or guaranteed recovered revenue.
      </footer>
    </main>
  );
}
