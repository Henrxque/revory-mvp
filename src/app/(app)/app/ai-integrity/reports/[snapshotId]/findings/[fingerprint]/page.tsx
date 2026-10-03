import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/services/app/get-app-context";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { getAiIntegrityScan } from "@/services/ai-integrity/scan";
import { AiFindingEvidence } from "@/components/ai-integrity/AiIntegrityReport";
import { aiAmount, aiFindingTitle, aiMoney } from "@/components/ai-integrity/report-copy";

import { AiValidationReviewPanel } from "@/components/ai-integrity/AiValidationReviewPanel";
import { AiValidationReviewSummary } from "@/components/ai-integrity/AiValidationReviewSummary";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";

export default async function AiFindingPage({ params }: { params: Promise<{ snapshotId: string; fingerprint: string }> }) {
  const context = await getAppContext(); if (!context) redirect("/sign-in");
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) notFound();
  const { snapshotId, fingerprint } = await params;
  const scan = await getAiIntegrityScan(context.workspace.id, snapshotId); if (!scan) notFound();
  const finding = scan.result.findings.find((f) => f.fingerprint === fingerprint); if (!finding) notFound();
  return <div className="space-y-5"><Link className="text-xs font-semibold text-[color:var(--accent)]" href={`/app/ai-integrity/reports/${snapshotId}`}>← Back to report</Link><section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8"><p className="rev-kicker">Evidence review · {finding.valueBasis.toLowerCase()}</p><h1 className="rev-display-hero mt-4">{aiFindingTitle(finding.findingType)}</h1><p className="mt-5 text-2xl font-semibold text-[color:var(--accent)]">{finding.valueAmount !== null ? aiMoney(finding.valueAmount, finding.valueCurrency!) : `${aiAmount(String(finding.evidence.delta))} ${finding.evidence.unit}`}</p><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{finding.findingType === "UNATTRIBUTED_PROVIDER_SPEND" ? "A coverage gap in observed provider spend. Review the identity link before attributing this amount to a customer." : "A quantity difference in a comparable scope. Review its explanation before treating it as a metering defect."}</p></section><section className="rev-shell-panel rounded-[26px] p-6 md:p-8"><AiFindingEvidence finding={finding} /></section>{isAiIntegrityExperienceEnabled() ? <><AiValidationReviewSummary workspaceId={context.workspace.id} snapshotId={snapshotId} fingerprint={fingerprint} /><AiValidationReviewPanel snapshotId={snapshotId} fingerprint={fingerprint} /></> : null}</div>;
}
