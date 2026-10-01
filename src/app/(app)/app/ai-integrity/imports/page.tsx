import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
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
        <h1 className="rev-display-hero mt-3 max-w-[50rem]">Review three sources before any financial read.</h1>
        <p className="mt-4 max-w-[50rem] text-sm leading-7 text-[color:var(--text-muted)]">
          Upload one CSV or XLSX export at a time: Stripe revenue, your internal usage ledger, or a provider usage and cost report. Confirm column matches, inspect excluded rows, then store evidence. No scan, attribution, margin or revenue finding is generated here.
        </p>
        <p className="mt-3 text-xs leading-6 text-[color:var(--text-subtle)]">{experience ? "Synthetic test data only. Use the same closed period for all three sources; import each file after reviewing its columns and exclusions." : "Internal development access only. This page is unavailable in production and does not offer customer analysis."}</p>
        <Link className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/attribution">Review identity and coverage →</Link>
      </section>
      <AiIntegrityImportPanel syntheticSamples={experience} />
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
