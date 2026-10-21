import { isAiConnectedReportsEnabled, requireConnectedReportAccess } from "@/services/ai-integrity/connected-report-access";
import { getAiCustomerSourceSuggestedPeriod, listAiCustomerSources } from "@/services/ai-integrity/customer-sources";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAiIntegrityExperienceEnabled, isAiIntegrityRemoteSyntheticPreviewEnabled } from "@/services/ai-integrity/experience";
import { hasAiScanPreparationAccess } from "@/services/ai-integrity/purchase";
import { AiScanSteps } from "@/components/ai-integrity/AiScanSteps";

import { AiIntegrityImportPanel } from "@/components/ai-integrity/AiIntegrityImportPanel";
import { prisma } from "@/db/prisma";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";

export default async function AiIntegrityImportsPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/imports"));
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) notFound();
  const experience = isAiIntegrityExperienceEnabled();
  const connected = isAiConnectedReportsEnabled();
  if (connected) { try { await requireConnectedReportAccess(context.workspace.id, context.user.id); } catch { redirect("/start"); } }
  const connections = connected ? await listAiCustomerSources(context.workspace.id, context.user.id) : [];
  const prepared = connected ? await prisma.aiIntegrityImportBatch.findMany({ where: { workspaceId: context.workspace.id, sourcePromotion: { isNot: null } }, orderBy: { createdAt: "desc" }, take: 20, select: { sourceKind: true, windowStart: true, windowEnd: true } }) : [];
  const periods = [...new Set(prepared.map((batch) => `${batch.windowStart.toISOString().slice(0, 10)}|${batch.windowEnd.toISOString().slice(0, 10)}`))];
  const suggestedPeriod = periods.length === 1 ? { start: periods[0].split("|")[0], end: periods[0].split("|")[1] } : getAiCustomerSourceSuggestedPeriod();
  if (experience && !(await hasAiScanPreparationAccess(context.workspace.id))) redirect("/start");
  const recent = await prisma.aiIntegrityImportBatch.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, sourceKind: true, sourceSystem: true, fileName: true, rowCount: true, insertedCount: true, duplicateCount: true, dataQualityJson: true, createdAt: true },
  });
  return (
    <div className="min-w-0 space-y-6">
      {experience ? <AiScanSteps current="sources" /> : null}
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
        <p className="rev-kicker">{experience ? "Step 1 · Prepare your sources" : "Internal AI Integrity intake · Sprint 2"}</p>
        <h1 className="rev-display-hero mt-3 max-w-[50rem]">Add the three pieces of your analysis.</h1>
        <p className="mt-4 max-w-[50rem] text-sm leading-7 text-[color:var(--text-muted)]">
          {connected ? "Connect Stripe and OpenAI, read the same closed period and use each completed read in your report. Upload only the internal usage file from your product below. Review the three sources before creating a report." : "Start with Stripe payments, your product’s recorded usage and your AI provider’s report. Add one file at a time for the same period. We’ll help you check the columns and show any rows that cannot be used."}
        </p>
        <p className="mt-3 text-xs leading-6 text-[color:var(--text-subtle)]">{connected ? "Connected-report preparation requires paid access. API pagination does not establish total account completeness; review each source’s coverage." : isAiIntegrityRemoteSyntheticPreviewEnabled() ? "Protected rehearsal: only the three bundled synthetic CSV samples are accepted. Do not upload customer data." : experience ? "Synthetic test data only. Use the same closed period for all three sources; import each file after reviewing its columns and exclusions." : "Internal development access only. This page is unavailable in production and does not offer customer analysis."}</p>
        <Link className="mt-4 inline-block text-sm font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/attribution">Already added your files? Next: link customers</Link>
      </section>
      {connected ? <section className="rev-shell-panel rounded-[26px] p-6"><h2 className="text-lg font-semibold">Your three sources</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{["STRIPE", "OPENAI"].map((provider) => { const source = connections.find((item) => item.provider === provider); const ready = source?.status === "ACTIVE" && source.syncs.some((sync) => sync.generation === source.generation && sync.promotions.length > 0); return <div key={provider} className="rounded-2xl border border-[color:var(--border)] p-4"><h3 className="font-semibold">{provider === "STRIPE" ? "Stripe · API" : "OpenAI · API"}</h3><p className="mt-2 text-sm text-[color:var(--text-muted)]">{ready ? "Prepared · review coverage and period" : source?.status === "REVOKED" ? "Disconnected · authorize again" : source?.completeThrough ? "Read saved · use it in your report" : source ? "Saved · read the authorized period" : "Not connected"}</p></div>; })}<div className="rounded-2xl border border-[color:var(--border)] p-4"><h3 className="font-semibold">Your product usage · file</h3><p className="mt-2 text-sm text-[color:var(--text-muted)]">{recent.some((batch) => batch.sourceKind === "INTERNAL_LEDGER") ? "File saved · check its period and quality" : "Add your CSV or XLSX below"}</p></div></div><Link className="rev-button-secondary mt-5" href="/app/ai-integrity/connections">Manage API sources</Link><p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">Source reads and files stay saved in this workspace. No scan runs until you review the inputs and confirm report creation.</p></section> : null}
      <AiIntegrityImportPanel syntheticSamples={experience && !connected} connectedLedger={connected} suggestedPeriod={connected ? suggestedPeriod : undefined} />
      <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
        <h2 className="[font-family:var(--font-app)] text-lg font-semibold">Recent evidence imports</h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">Raw source records remain separate. Reimported rows may be deduplicated or preserved as revisions; none are automatically summed.</p>
        <div className="mt-4 space-y-2">
          {recent.length ? recent.map((batch) => {
            const quality = batch.dataQualityJson && typeof batch.dataQualityJson === "object" && !Array.isArray(batch.dataQualityJson) ? batch.dataQualityJson as Record<string, unknown> : {};
            return <div key={batch.id} className="rev-shell-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs">
              <div><p className="font-semibold text-[color:var(--foreground)]">{batch.sourceKind.replaceAll("_", " ")} · {batch.fileName}</p><p className="mt-1 text-[color:var(--text-muted)]">{batch.sourceSystem} · {batch.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p></div>
              <p className="text-[color:var(--text-muted)]">{batch.insertedCount} new · {batch.duplicateCount} repeated · {Number(quality.rejectedRows ?? 0)} excluded</p>
            </div>;
          }) : <p className="text-sm text-[color:var(--text-muted)]">No AI Integrity evidence imported yet.</p>}
        </div>
      </section>
    </div>
  );
}
