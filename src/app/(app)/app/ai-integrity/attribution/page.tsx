import Link from "next/link";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { hasAiScanPreparationAccess } from "@/services/ai-integrity/purchase";
import { AiScanSteps } from "@/components/ai-integrity/AiScanSteps";
import { notFound, redirect } from "next/navigation";

import { AiIdentityMappingPanel } from "@/components/ai-integrity/AiIdentityMappingPanel";
import { prisma } from "@/db/prisma";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { getAiAttributionCoverage } from "@/services/ai-integrity/identity";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";

type Params = { provider?: string; ledger?: string; revenue?: string };

export default async function AiIntegrityAttributionPage({ searchParams }: { searchParams: Promise<Params> }) {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/attribution"));
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) notFound();
  const experience = isAiIntegrityExperienceEnabled();
  if (experience && !(await hasAiScanPreparationAccess(context.workspace.id))) redirect("/start");
  const params = await searchParams;
  const batches = await prisma.aiIntegrityImportBatch.findMany({ where: { workspaceId: context.workspace.id },
    orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, sourceKind: true, sourceSystem: true, fileName: true, windowStart: true, windowEnd: true, createdAt: true } });
  const providers = batches.filter((batch) => batch.sourceKind === "PROVIDER_REPORT");
  const ledgers = batches.filter((batch) => batch.sourceKind === "INTERNAL_LEDGER");
  const revenues = batches.filter((batch) => batch.sourceKind === "STRIPE_REVENUE");
  const providerBatch = params.provider === undefined ? providers[0] : providers.find((batch) => batch.id === params.provider);
  const ledgerBatch = params.ledger === undefined ? ledgers[0] : ledgers.find((batch) => batch.id === params.ledger);
  const revenueBatch = params.revenue === undefined ? revenues[0] : revenues.find((batch) => batch.id === params.revenue);
  const sharedWindow = (source: typeof providerBatch) => {
    if (!source || !ledgerBatch) return { start: "", end: "" };
    const start = Math.max(source.windowStart.valueOf(), ledgerBatch.windowStart.valueOf());
    const end = Math.min(source.windowEnd.valueOf(), ledgerBatch.windowEnd.valueOf());
    return start < end ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : { start: "", end: "" };
  };
  const [mappings, stripeRows, usageRows, projectRows, coverage] = await Promise.all([
    prisma.aiIntegrityMapping.findMany({ where: { workspaceId: context.workspace.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    revenueBatch ? prisma.aiIntegrityRevenueRecord.findMany({ where: { workspaceId: context.workspace.id, importBatchId: revenueBatch.id, stripeCustomerExternalId: { not: null } }, select: { stripeCustomerExternalId: true }, take: 1000 }) : [],
    ledgerBatch ? prisma.aiIntegrityUsageRecord.findMany({ where: { workspaceId: context.workspace.id, importBatchId: ledgerBatch.id }, select: { internalCustomerExternalId: true }, take: 1000 }) : [],
    providerBatch ? prisma.aiIntegrityProviderBucket.findMany({ where: { workspaceId: context.workspace.id, importBatchId: providerBatch.id, projectId: { not: null } }, select: { provider: true, organizationId: true, projectId: true }, take: 1000 }) : [],
    providerBatch && ledgerBatch ? getAiAttributionCoverage(context.workspace.id, providerBatch.id, ledgerBatch.id) : null,
  ]);
  const inputClass = "min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 text-sm text-[color:var(--foreground)]";
  return <div className="min-w-0 space-y-6">
    {experience ? <AiScanSteps current="identity" /> : null}
    <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
      <p className="rev-kicker">{experience ? "Step 2 · Customer identity & coverage" : "Internal AI Integrity · Sprint 3"}</p>
      <h1 className="rev-display-hero mt-3 max-w-[53rem]">Only explicit identity earns attribution.</h1>
      <p className="mt-4 max-w-[52rem] text-sm leading-7 text-[color:var(--text-muted)]">Review exact IDs and their effective period. Shared projects, conflicting links and missing customer IDs stay unattributed. This page measures coverage of selected evidence; it does not calculate margin or generate financial findings.</p>
      <Link className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/imports">← Back to evidence imports</Link>
      <Link className="ml-5 mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/scans">{experience ? "Review & create your test report →" : "Run internal synthetic scan →"}</Link>
    </section>
    <form method="get" className="rev-shell-panel grid gap-4 rounded-[26px] p-5 md:grid-cols-3 md:p-6">
      {([ ["provider", "Provider report", providers, providerBatch], ["ledger", "Internal ledger", ledgers, ledgerBatch], ["revenue", "Stripe revenue", revenues, revenueBatch] ] as const).map(([name, label, options, selected]) =>
        <label key={name} className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">{label}
          <select className={inputClass} name={name} defaultValue={selected?.id ?? ""}><option value="">No batch</option>{options.map((batch) => <option key={batch.id} value={batch.id}>{batch.fileName} · {batch.createdAt.toISOString().slice(0, 10)}</option>)}</select>
        </label>)}
      <div className="md:col-span-3"><button className="rev-action-button px-5 py-3 text-sm" type="submit">Review selected evidence</button></div>
      <p className="text-xs leading-5 text-[color:var(--text-subtle)] md:col-span-3">One batch per source is selected. The denominator never combines repeated imports or different currencies. Selection is local to this view.</p>
    </form>
    <AiIdentityMappingPanel
      sourceBatchIds={{ provider: providerBatch?.id ?? null, ledger: ledgerBatch?.id ?? null, revenue: revenueBatch?.id ?? null }}
      defaultWindows={{ provider: sharedWindow(providerBatch), revenue: sharedWindow(revenueBatch) }}
      stripeCustomers={[...new Set(stripeRows.map((row) => row.stripeCustomerExternalId).filter((value): value is string => Boolean(value)))]}
      internalCustomers={[...new Set(usageRows.map((row) => row.internalCustomerExternalId).filter((value): value is string => Boolean(value)))]}
      projects={[...new Map(projectRows.filter((row) => row.projectId).map((row) => [`${row.provider}|${row.organizationId ?? ""}|${row.projectId}`, { provider: row.provider, organizationId: row.organizationId, projectId: row.projectId! }])).values()]}
      mappings={mappings.map((mapping) => ({ id: mapping.id, kind: mapping.kind, externalId: mapping.externalId, internalCustomerExternalId: mapping.internalCustomerExternalId, status: mapping.status, validFrom: mapping.validFrom.toISOString(), validUntil: mapping.validUntil?.toISOString() ?? null, provenance: mapping.provenanceJson as Record<string, unknown> }))}
    />
    <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
      <h2 className="[font-family:var(--font-app)] text-lg font-semibold">Attribution coverage</h2>
      {!coverage ? <p className="mt-3 text-sm text-[color:var(--text-muted)]">Import and select both a provider report and an internal ledger to inspect coverage.</p> : <>
        <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">Scope: {coverage.providerBatch.fileName} + {coverage.ledgerBatch.fileName}; provider window {coverage.scope.providerWindowStart} to {coverage.scope.providerWindowEnd}. Ledger covers window: {coverage.scope.ledgerCoversWindow ? "yes" : "no"}. Denominator: reported, nonnegative, non-overlapping provider cost without adjustments, grouped by provider and currency.</p>
        {coverage.groups.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{coverage.groups.map((group) => <div key={`${group.provider}-${group.currency}`} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background-card)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--accent)]">{group.provider} · {group.currency}</p><p className="mt-3 [font-family:var(--font-app)] text-2xl font-semibold">{group.coverageBps === null ? "—" : `${(group.coverageBps / 100).toFixed(2)}%`}</p><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">Attributed {group.attributedCost} / comparable reported {group.reportedComparableCost}; unattributed {group.unattributedCost}. {group.attributedBucketIds.length} of {group.denominatorBucketIds.length} buckets attributed.</p></div>)}</div> : <p className="mt-4 text-sm text-[color:var(--text-muted)]">No comparable reported provider cost in this selected batch. Coverage percentage is unavailable.</p>}
        <div className="mt-5 max-h-80 space-y-2 overflow-y-auto">{coverage.rows.map((row) => <div key={row.bucketId} className="flex flex-wrap justify-between gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-muted)]"><span>{row.bucketId} · {row.provider} · {row.amount ?? "—"} {row.currency ?? ""}</span><span>{row.attributionClass} · {row.reason}{row.internalCustomerExternalId ? ` · ${row.internalCustomerExternalId}` : ""}{!row.inDenominator ? " · excluded from denominator" : ""}</span></div>)}</div>
        <p className="mt-4 text-xs leading-6 text-[color:var(--text-subtle)]">Exact, Mapped and Estimated cost attribution are unavailable with the current aggregate provider exports. Strong requires a confirmed exclusive provider project plus corroborating ledger usage throughout the selected window. Zero attributed cost is a data coverage result, not a revenue leak.</p>
      </>}
    </section>
  </div>;
}
