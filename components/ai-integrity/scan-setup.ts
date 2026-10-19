export const scanSources = ["STRIPE_REVENUE", "INTERNAL_LEDGER", "PROVIDER_REPORT"] as const;
export type ScanSource = typeof scanSources[number];
export type ScanSetupBatch = { id: string; sourceKind: string; fileName: string; windowStart: string; windowEnd: string; duplicateCount: number; apiFetchedAt?: string };

// Only preselect unambiguous originals from one identical period. URL values
// must resolve to the workspace-scoped batches supplied by the server.
export function initialScanSelection(batches: ScanSetupBatch[], requested: Partial<Record<ScanSource, string>> = {}) {
  const selection: Record<string, string> = {};
  for (const source of scanSources) {
    const candidates = batches.filter((batch) => batch.sourceKind === source && !batch.duplicateCount);
    const explicit = candidates.find((batch) => batch.id === requested[source]);
    if (explicit) selection[source] = explicit.id;
    else if (candidates.length === 1 && requested[source] === undefined) selection[source] = candidates[0].id;
  }
  const selected = scanSources.map((source) => batches.find((batch) => batch.id === selection[source]));
  if (selected.every(Boolean) && !selected.every((batch) => batch?.windowStart === selected[0]?.windowStart && batch?.windowEnd === selected[0]?.windowEnd)) return {};
  return selection;
}

// The calendar controls explicitly display UTC. Do not interpret their values
// in the computer's local timezone.
export function scanUtcTimestamp(value: string) {
  return value ? `${value.length === 16 ? `${value}:00` : value}Z` : "";
}
