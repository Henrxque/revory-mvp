import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AiIntegrityScanPanel } from "@/components/ai-integrity/AiIntegrityScanPanel";
import { prisma } from "@/db/prisma";
import { AI_INTEGRITY_RULE_VERSION } from "@/domain/ai-integrity/reconciliation";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { getAiIntegrityScan } from "@/services/ai-integrity/scan";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { isAiIntegrityExperienceEnabled, isAiIntegrityRemoteSyntheticPreviewEnabled } from "@/services/ai-integrity/experience";
import { AiScanSteps } from "@/components/ai-integrity/AiScanSteps";

export default async function AiIntegrityScansPage({ searchParams }: { searchParams: Promise<{ snapshot?: string }> }) {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/scans"));
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) notFound();
  const experience = isAiIntegrityExperienceEnabled();
  const remote = isAiIntegrityRemoteSyntheticPreviewEnabled();
  const { snapshot: snapshotId } = await searchParams;
  const [batches, history, scan, grants] = await Promise.all([
    prisma.aiIntegrityImportBatch.findMany({ where: { workspaceId: context.workspace.id }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, sourceKind: true, fileName: true, windowStart: true, windowEnd: true, duplicateCount: true } }),
    prisma.aiIntegritySnapshot.findMany({ where: { workspaceId: context.workspace.id, ruleVersion: AI_INTEGRITY_RULE_VERSION }, orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, createdAt: true, windowStart: true, windowEnd: true, _count: { select: { findings: true } } } }),
    snapshotId ? getAiIntegrityScan(context.workspace.id, snapshotId) : null,
    experience ? prisma.aiIntegrityScanGrant.findMany({ where: { workspaceId: context.workspace.id, status: "ACTIVE", consumedAt: null, order: { status: "PAID" } }, orderBy: { createdAt: "asc" }, select: { id: true, createdAt: true } }) : [],
  ]);
  if (snapshotId && !scan) notFound();
  if (experience && snapshotId && scan) redirect(`/app/ai-integrity/reports/${scan.snapshot.id}`);
  return <div className="min-w-0 space-y-6">
    {experience ? <AiScanSteps current="scan" /> : null}
    <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
      <p className="rev-kicker">{experience ? "Step 3 · Review & create your report" : "Internal AI Integrity · Sprint 4 · Synthetic data"}</p>
      <h1 className="rev-display-hero mt-3">Reconcile with evidence.</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">Inspect reported spend without customer attribution and comparable usage differences. Each snapshot preserves the exact inputs, mapping decisions and rule version used in its calculation.</p>
      <div className="mt-4 flex flex-wrap gap-5 text-xs font-semibold text-[color:var(--accent)]"><Link href="/app/ai-integrity/imports">Evidence imports</Link><Link href="/app/ai-integrity/attribution">Review identity and coverage</Link></div>
    </section>
    {scan ? <section className="rev-shell-panel space-y-5 rounded-[26px] p-5 md:p-6">
      <h2 className="[font-family:var(--font-app)] text-lg font-semibold">Snapshot results</h2>
      <p className="break-all text-xs leading-6 text-[color:var(--text-muted)]">{scan.snapshot.id} · {scan.result.ruleVersion}<br />{scan.result.windowStart} to {scan.result.windowEnd} · {scan.result.findings.length} findings · {scan.result.comparisons.length} eligible usage comparisons</p>
      <div className="flex flex-wrap gap-5 text-sm text-[color:var(--accent)]"><a href={`/api/ai-integrity/scans/${scan.snapshot.id}/export`}>Download evidence JSON</a><a href={`/api/ai-integrity/scans/${scan.snapshot.id}/export?format=csv`}>Download findings CSV</a></div>
      <div className="grid gap-3 md:grid-cols-2">{scan.result.coverage.groups.map((g) => <div key={`${g.provider}-${g.currency}`} className="rounded-2xl border border-[color:var(--border)] p-4"><p className="text-xs text-[color:var(--accent)]">{g.provider} · {g.currency}</p><p className="mt-2 text-xl font-semibold">{g.unattributedCost} unattributed</p><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">Comparable reported cost {g.reportedComparableCost}; attributed {g.attributedCost}; coverage {g.coverageBps === null ? "unavailable" : `${g.coverageBps / 100}%`}. This is a coverage gap, not proven loss.</p></div>)}</div>
      {!scan.result.findings.length ? <p className="text-sm text-[color:var(--text-muted)]">No eligible findings. Review exclusions below; absence of findings does not prove complete reconciliation.</p> : null}
      {scan.result.findings.map((finding) => <article key={finding.fingerprint} className="space-y-3 rounded-2xl border border-[color:var(--border)] p-4">
        <h3 className="text-sm font-semibold">{finding.findingType === "UNATTRIBUTED_PROVIDER_SPEND" ? "Provider spend without attribution" : "Ledger ↔ provider usage difference"}</h3>
        <p className="text-sm text-[color:var(--accent)]">{finding.valueAmount !== null ? `${finding.valueAmount} ${finding.valueCurrency}` : `${String(finding.evidence.delta)} ${String(finding.evidence.unit)}`} · {finding.valueBasis.toLowerCase()}</p>
        <p className="text-xs leading-6 text-[color:var(--text-muted)]">{finding.recommendedReview}</p>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-6 text-[color:var(--text-subtle)]">{finding.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        <details><summary className="cursor-pointer text-xs text-[color:var(--accent)]">Formula, inputs and eligibility</summary><p className="mt-3 break-all text-xs">{finding.formula}</p><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(finding.evidence, null, 2)}</pre></details>
      </article>)}
      <details><summary className="cursor-pointer text-sm text-[color:var(--accent)]">Data Quality and suppressions ({scan.result.suppressions.length})</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ dataQuality: scan.result.dataQuality, suppressions: scan.result.suppressions }, null, 2)}</pre></details>
      <p className="text-xs leading-6 text-[color:var(--text-subtle)]">Currencies and usage units are kept separate. No combined loss or at-risk total. CSV summarizes findings; JSON includes reproducible inputs and exclusions.</p>
    </section> : null}
    {experience && !grants.length ? <section className="rev-shell-panel rounded-[26px] p-6"><p className="text-sm leading-7 text-[color:var(--text-muted)]">Your existing reports remain in history. A new report needs an available {remote ? "synthetic scan grant" : "one-time test scan"}.</p><Link className="rev-button-primary mt-4" href="/start">{remote ? "Review rehearsal access" : "Review scan purchase"} →</Link></section> : <AiIntegrityScanPanel batches={batches.map((b) => ({ ...b, windowStart: b.windowStart.toISOString(), windowEnd: b.windowEnd.toISOString() }))} initialAsOf={new Date().toISOString()} grants={experience ? grants.map((g) => ({ id: g.id, label: remote ? `Synthetic scan · granted ${g.createdAt.toISOString().slice(0, 10)}` : `Test scan · confirmed ${g.createdAt.toISOString().slice(0, 10)}` })) : undefined} remoteSyntheticPreview={remote} />}
    <section className="rev-shell-panel rounded-[26px] p-5 md:p-6"><h2 className="text-lg font-semibold">Recent internal snapshots</h2><div className="mt-4 space-y-3">{history.length ? history.map((run) => <Link key={run.id} className="block break-all text-xs leading-6 text-[color:var(--accent)]" href={`/app/ai-integrity/scans?snapshot=${run.id}`}>{run.createdAt.toISOString()} · {run.windowStart.toISOString().slice(0, 10)} → {run.windowEnd.toISOString().slice(0, 10)} · {run._count.findings} findings</Link>) : <p className="text-sm text-[color:var(--text-muted)]">No scans yet.</p>}</div></section>
  </div>;
}
