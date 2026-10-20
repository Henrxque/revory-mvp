export type RecurringView = {
  runtime: "LOCAL" | "SANDBOX" | "LIVE"; workspaceId: string; subscription: { status: string; paidThrough?: string } | null;
  schedule: { status: string; nextStart: string; consentUntil: string; periodDays: number; lagHours: number; emailEnabled: boolean } | null;
  ledgers: { id: string; label: string }[];
  runs: { id: string; status: string; start: string; end: string; snapshotId?: string; comparisonId?: string; errorCode?: string }[];
  investigations: { id: string; status: string; revision: number; kind: string; scope: string; movement: string; previous: string | null; current: string | null; unit: string; reason: string | null; comparisonId: string; snapshotId: string }[];
  notes: { id: string; status: string; note: string }[];
  notices: { id: string; status: string; kind: string }[];
  dates: { start: string; until: string };
};
export const inputClass = "mt-2 block min-h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm";
export const buttonClass = "monitor-control-button min-h-11 rounded-xl border border-[color:var(--border-accent)] px-4 py-3 text-sm text-[color:var(--accent)] disabled:opacity-50";
export const labels: Record<string, string> = { LIMITED: "Incomplete data", SETUP_REQUIRED: "Setup required", ACTIVE: "Active", PAUSED: "Paused", READY: "Ready", WAITING_LEDGER: "Waiting for your ledger", RUNNING: "Reading sources", RETRY: "Retry scheduled", NEEDS_ATTENTION: "Needs your attention", COMPLETED: "Report ready", NEW: "New difference", PERSISTENT: "Still observed", RESOLVED: "No longer observed", SUPPRESSED: "Comparison limited", VERIFYING: "Awaiting next-period verification", OPEN: "Open", EXPECTED: "Expected difference", INVESTIGATING: "Investigating", NO_LONGER_OBSERVED: "Not observed in the next comparable period" };
