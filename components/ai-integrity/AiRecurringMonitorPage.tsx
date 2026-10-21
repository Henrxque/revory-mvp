import { isAiCommercialRuntimeEnabled, monitorLiveMode } from "@/services/ai-integrity/commercial-runtime";
import { prisma } from "@/db/prisma";
import { AiRecurringMonitor, type RecurringView } from "./AiRecurringMonitor";
import { getMonitorDateSuggestions, type MonitorRun, type MonitorSchedule } from "@/services/ai-integrity/recurring-access";
import type { AiMonitorSignal } from "@/domain/ai-integrity/monitoring";

export async function AiRecurringMonitorPage({ workspaceId }: { workspaceId: string }) {
  const [history, ledgers, notes, configuration] = await Promise.all([
    prisma.aiIntegrityMonitorState.findMany({ where: { workspaceId, kind: { in: ["RUN", "INVESTIGATION", "NOTICE"] } }, orderBy: { updatedAt: "desc" }, take: 150 }),
    prisma.aiIntegrityImportBatch.findMany({ where: { workspaceId, sourceKind: "INTERNAL_LEDGER", dataQualityJson: { path: ["mode"], equals: "AUTHORIZED_LEDGER_PREVIEW" } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, windowStart: true, windowEnd: true } }),
    prisma.workspaceAuditEvent.findMany({ where: { workspaceId, action: "AI_RECURRING_INVESTIGATION_UPDATED" }, orderBy: { createdAt: "desc" }, take: 50, select: { metadataJson: true } }),
    prisma.aiIntegrityMonitorState.findMany({ where: { workspaceId, kind: { in: ["SCHEDULE", "SUBSCRIPTION"] } } }),
  ]);
  const states = [...configuration, ...history];
  const schedule = states.find(s => s.kind === "SCHEDULE"), subscription = states.find(s => s.kind === "SUBSCRIPTION");
  const config = schedule?.dataJson as unknown as MonitorSchedule | undefined;
  const billing = subscription?.dataJson as { paidThrough?: string; cancelAt?: string | null } | undefined;
  const view: RecurringView = {
    runtime: isAiCommercialRuntimeEnabled() ? monitorLiveMode() ? "LIVE" : "SANDBOX" : "LOCAL", workspaceId, subscription: subscription ? { status: subscription.status, paidThrough: billing?.paidThrough, cancelAt: billing?.cancelAt } : null,
    schedule: schedule && config ? { status: schedule.status, nextStart: config.nextStart, consentUntil: config.consentUntil, lagHours: config.lagHours, periodDays: config.periodDays, emailEnabled: config.emailEnabled } : null,
    ledgers: ledgers.map(b => ({ id: b.id, label: b.windowStart.toISOString().slice(0, 10) + " to " + b.windowEnd.toISOString().slice(0, 10) + " UTC" })),
    runs: states.filter(s => s.kind === "RUN").slice(0, 30).map(s => { const data = s.dataJson as unknown as MonitorRun; return { id: s.id, status: s.status, start: data.start, end: data.end, snapshotId: data.snapshotId, comparisonId: data.comparisonId, errorCode: data.errorCode }; }),
    investigations: states.filter(s => s.kind === "INVESTIGATION").slice(0, 50).map(s => { const data = s.dataJson as unknown as { signal: AiMonitorSignal; comparisonId: string; snapshotId: string }; return { id: s.id, status: s.status, revision: s.revision, ...data.signal, comparisonId: data.comparisonId, snapshotId: data.snapshotId }; }),
    notes: notes.map(row => row.metadataJson as { investigationId: string; status: string; note: string }).map(n => ({ id: n.investigationId, status: n.status, note: n.note })),
    notices: states.filter(s => s.kind === "NOTICE").slice(0, 10).map(s => ({ id: s.id, status: s.status, kind: (s.dataJson as { kind: string }).kind })),
    dates: getMonitorDateSuggestions(),
  };
  return <AiRecurringMonitor view={view} />;
}
