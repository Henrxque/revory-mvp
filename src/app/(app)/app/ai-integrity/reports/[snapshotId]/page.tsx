import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/services/app/get-app-context";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { getAiIntegrityScan } from "@/services/ai-integrity/scan";
import { AiIntegrityReport } from "@/components/ai-integrity/AiIntegrityReport";

import { AiValidationReviewPanel } from "@/components/ai-integrity/AiValidationReviewPanel";
import { AiValidationReviewSummary } from "@/components/ai-integrity/AiValidationReviewSummary";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";

export default async function AiReportPage({ params }: { params: Promise<{ snapshotId: string }> }) {
  const context = await getAppContext(); if (!context) redirect("/sign-in");
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) notFound();
  const { snapshotId } = await params;
  const scan = await getAiIntegrityScan(context.workspace.id, snapshotId); if (!scan) notFound();
  return <div className="space-y-5"><Link className="text-sm font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/dashboard">← Home & reports</Link><AiIntegrityReport snapshotId={snapshotId} result={scan.result} />{isAiIntegrityExperienceEnabled() ? <details className="rev-shell-panel rounded-[26px] p-6"><summary className="cursor-pointer text-sm font-semibold">Review progress & optional feedback on this example</summary><div className="mt-5 space-y-5"><AiValidationReviewSummary workspaceId={context.workspace.id} snapshotId={snapshotId} /><AiValidationReviewPanel snapshotId={snapshotId} /></div></details> : null}</div>;
}
