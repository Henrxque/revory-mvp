import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { isAiMonitorRehearsalEnabled } from "@/services/ai-integrity/monitoring";
import { AI_MONITOR_MODE, type AiMonitorArtifact } from "@/domain/ai-integrity/monitoring";
import { AI_INTEGRITY_RULE_VERSION, aiDigest } from "@/domain/ai-integrity/reconciliation";
import { AiMonitorControls, AiMonitorAcknowledge } from "@/components/ai-integrity/AiMonitorControls";

const movementLabels = { NEW: "New difference", PERSISTENT: "Still observed", RESOLVED: "No longer observed", SUPPRESSED: "Comparison limited" };
const alertLabels: Record<string, string> = { NEW_DIFFERENCE: "New difference to review", DIFFERENCE_INCREASED: "Difference magnitude increased", COMPARISON_LIMITED: "Comparison needs better evidence" };
export default async function AiMonitoringPage() {
  if (!isAiMonitorRehearsalEnabled()) notFound();
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/monitoring"));
  const workspaceId = context.workspace.id;
  const [reports, comparisons, alerts] = await Promise.all([
    prisma.aiIntegritySnapshot.findMany({ where: { workspaceId, ruleVersion: AI_INTEGRITY_RULE_VERSION }, orderBy: { windowStart: "desc" }, take: 40, select: { id: true, windowStart: true, windowEnd: true } }),
    prisma.aiIntegrityMonitorComparison.findMany({ where: { workspaceId, mode: AI_MONITOR_MODE }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.aiIntegrityMonitorAlert.findMany({ where: { workspaceId, comparison: { mode: AI_MONITOR_MODE } }, orderBy: { createdAt: "desc" }, take: 80 }),
  ]);
  const checkedArtifacts = new Map(comparisons.filter((c) => aiDigest(c.artifactJson) === c.artifactHash).map((c) => [c.id, c.artifactJson as unknown as AiMonitorArtifact]));
  return <div className="min-w-0 space-y-6">
    <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
      <p className="rev-kicker">Monitoring · Synthetic rehearsal</p><h1 className="rev-display-hero mt-3 max-w-[48rem]">See what changed. Keep the evidence.</h1>
      <p className="mt-4 max-w-[48rem] text-sm leading-7 text-[color:var(--text-muted)]">Follow differences between two comparable reports. New, persistent and no longer observed findings stay linked to their original periods.</p>
      <p className="mt-3 text-xs leading-6 text-[color:var(--text-subtle)]">Local alerts only. Real OpenAI connection, scheduled reads, email delivery and recurring billing are unavailable. A disappearing finding does not prove recovered money.</p>
    </section>
    <AiMonitorControls reports={reports.map((r) => ({ id: r.id, label: `${r.windowStart.toISOString().slice(0, 10)} → ${r.windowEnd.toISOString().slice(0, 10)} UTC · ${r.id.slice(-6)}` }))} />
    <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
      <h2 className="text-lg font-semibold">Local review alerts</h2><p className="mt-2 text-xs leading-6 text-[color:var(--text-subtle)]">Latest 80 alerts. Acknowledgment records review, without changing findings or source evidence.</p>
      <div className="mt-5 space-y-3">{alerts.length ? alerts.map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] p-4">
        <div><p className="text-sm font-semibold">{alertLabels[alert.kind]}</p><p className="mt-2 text-[10px] text-[color:var(--text-subtle)]">{alert.createdAt.toISOString().slice(0, 10)} UTC · {alert.status === "ACKNOWLEDGED" ? "Acknowledged" : "Review pending"}</p><a className="mt-2 inline-block text-xs text-[color:var(--accent)]" href={`/api/ai-integrity/monitoring/${alert.comparisonId}/export`}>Open comparison evidence →</a></div>
        <p className="break-words text-xs text-[color:var(--text-muted)]">{(() => { const signal = checkedArtifacts.get(alert.comparisonId)?.movements.find((r) => r.key === alert.signalKey); return signal ? `${signal.scope} · ${signal.unit}` : "Review the linked comparison and its limits."; })()}</p>
        {alert.status === "OPEN" ? <AiMonitorAcknowledge alertId={alert.id} /> : <span className="text-xs text-[color:var(--text-muted)]">Acknowledged</span>}
      </div>) : <p className="text-sm text-[color:var(--text-muted)]">No local alerts yet. Create a comparison to review meaningful changes.</p>}</div>
    </section>
    <section className="space-y-4"><h2 className="px-1 text-lg font-semibold">Comparison history</h2>{comparisons.length ? comparisons.map((comparison) => {
      if (aiDigest(comparison.artifactJson) !== comparison.artifactHash) return <p key={comparison.id} role="alert" className="rev-shell-panel rounded-2xl p-5 text-sm">Comparison evidence is unavailable: integrity check failed.</p>;
      const artifact = comparison.artifactJson as unknown as AiMonitorArtifact;
      return <article key={comparison.id} className="rev-shell-panel rounded-[26px] p-5 md:p-6">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="text-sm font-semibold">{artifact.baselineWindow.start.slice(0, 10)} → {artifact.currentWindow.end.slice(0, 10)} UTC</h3><span className="text-xs text-[color:var(--accent)]">{artifact.comparable ? "Comparable evidence" : "Comparison limited"}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[["New", artifact.counts.new], ["Still observed", artifact.counts.persistent], ["No longer observed", artifact.counts.noLongerObserved], ["Limited", artifact.counts.suppressed]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[color:var(--border)] p-3"><p className="text-[10px] text-[color:var(--text-muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}</div>
        {artifact.comparisonLimit ? <p className="mt-4 break-words text-xs leading-6 text-[color:var(--text-muted)]">Limit: {artifact.comparisonLimit}</p> : null}
        <div className="mt-4 space-y-3">{artifact.movements.slice(0, 20).map((row) => <div key={row.key} className="rounded-2xl border border-[color:var(--border)] p-4">
          <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold">{row.kind === "UNATTRIBUTED_PROVIDER_SPEND" ? "Unattributed reported spend" : "Ledger / provider usage difference"}</p><span className="text-[10px] text-[color:var(--accent)]">{movementLabels[row.movement]}</span></div>
          <p className="mt-2 break-words text-xs text-[color:var(--text-muted)]">{row.scope} · {row.unit}</p><p className="mt-2 text-xs">{row.previous === null ? "Insufficient comparable evidence" : `${row.previous} → ${row.current} ${row.unit} · change ${row.change}`}</p>
          {row.reason ? <p className="mt-2 break-words text-[10px] text-[color:var(--text-subtle)]">{row.reason}</p> : null}
        </div>)}</div>
        <p className="mt-4 text-[10px] leading-6 text-[color:var(--text-subtle)]">{artifact.movements.length > 20 ? "Showing the first 20 movements; full details are in the export. " : ""}{artifact.omittedAlerts ? `${artifact.omittedAlerts} additional change alerts omitted by the per-comparison limit. ` : ""}Cost and usage are separate. No monetary recovery or automatic remediation is inferred.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[color:var(--accent)]"><Link href={`/app/ai-integrity/reports/${comparison.baselineSnapshotId}`}>Baseline report →</Link><Link href={`/app/ai-integrity/reports/${comparison.currentSnapshotId}`}>Later report →</Link><a href={`/api/ai-integrity/monitoring/${comparison.id}/export`}>Download comparison JSON →</a></div>
      </article>;
    }) : <div className="rev-shell-panel rounded-[26px] p-6"><p className="text-sm text-[color:var(--text-muted)]">Your comparison history will appear here. No scheduled monitoring is running.</p></div>}</section>
  </div>;
}
