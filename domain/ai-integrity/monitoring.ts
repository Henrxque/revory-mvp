import { canonicalAiJson } from "./contracts";
import { AI_INTEGRITY_RULE_VERSION, aiDecimal, aiDecimalString, aiDigest, aiTimestamp, reconcileAiIntegrity, type AiScanInput, type AiScanResult } from "./reconciliation";

export const AI_MONITOR_VERSION = "ai-monitor/rehearsal-v1";
export const AI_MONITOR_MODE = "SYNTHETIC_REHEARSAL";
export type AiMovement = "NEW" | "PERSISTENT" | "RESOLVED" | "SUPPRESSED";
export type AiMonitorSignal = {
  key: string; kind: "UNATTRIBUTED_PROVIDER_SPEND" | "LEDGER_PROVIDER_USAGE_MISMATCH";
  scope: string; unit: string; movement: AiMovement;
  previous: string | null; current: string | null; change: string | null;
  previousFingerprint: string | null; currentFingerprint: string | null; reason: string | null;
};
type Signal = Omit<AiMonitorSignal, "movement" | "previous" | "current" | "change" | "reason" | "previousFingerprint" | "currentFingerprint"> & { value: string | null; fingerprint: string | null };
const abs = (n: bigint) => n < BigInt(0) ? -n : n;
const normalizedProvider = (value: string | null) => value?.trim().toLowerCase() ?? "";

function usageIdentity(input: AiScanInput, row: Record<string, unknown>) {
  return [normalizedProvider(String(row.provider)), row.organizationId ?? null, row.projectId ?? null,
    row.model ?? null, row.internalCustomerExternalId ?? null, row.unit,
    aiTimestamp(String(row.windowStart)) - aiTimestamp(input.batches[0].windowStart),
    aiTimestamp(String(row.windowEnd)) - aiTimestamp(input.batches[0].windowStart)];
}
function sourceShape(input: AiScanInput) {
  const start = aiTimestamp(input.batches[0].windowStart);
  return {
    sources: input.batches.map((b) => [b.sourceKind, b.sourceSystem, b.sourceTimezone]).sort((a, b) => canonicalAiJson(a).localeCompare(canonicalAiJson(b))),
    buckets: input.buckets.map((b) => [normalizedProvider(b.provider), b.organizationId, b.projectId, b.model,
      b.costBasis, b.costCurrency, b.usageUnit, b.adjustmentKind,
      aiTimestamp(b.windowStart) - start, aiTimestamp(b.windowEnd) - start]).sort((a, b) => canonicalAiJson(a).localeCompare(canonicalAiJson(b))),
  };
}
function signals(input: AiScanInput, result: AiScanResult) {
  const rows = new Map<string, Signal>();
  for (const group of result.coverage.groups) {
    const key = aiDigest(["cost", group.provider, group.currency]);
    const finding = result.findings.find((f) => f.findingType === "UNATTRIBUTED_PROVIDER_SPEND" && f.evidence.provider === group.provider && f.valueCurrency === group.currency);
    // Every cost row in this provider/currency must remain eligible. A smaller denominator is not a resolution.
    const monetary = result.coverage.rows.filter((r) => r.provider === group.provider && r.currency === group.currency);
    rows.set(key, { key, kind: "UNATTRIBUTED_PROVIDER_SPEND", scope: group.provider, unit: group.currency,
      value: monetary.length && monetary.every((r) => r.inDenominator) ? group.unattributedCost : null,
      fingerprint: finding?.fingerprint ?? null });
  }
  for (const comparison of result.comparisons) {
    const key = aiDigest(["usage", ...usageIdentity(input, comparison)]);
    if (rows.has(key)) throw new Error("Ambiguous repeated monitoring scope.");
    const finding = result.findings.find((f) => f.findingType === "LEDGER_PROVIDER_USAGE_MISMATCH" && f.evidence.bucketId === comparison.bucketId);
    rows.set(key, { key, kind: "LEDGER_PROVIDER_USAGE_MISMATCH", scope: [comparison.provider, comparison.projectId, comparison.model].filter(Boolean).join(" / "),
      unit: String(comparison.unit), value: String(comparison.delta), fingerprint: finding?.fingerprint ?? null });
  }
  return rows;
}

export function compareAiIntegrityPeriods(baseline: AiScanInput, current: AiScanInput) {
  if (baseline.workspaceId !== current.workspaceId) throw new Error("Reports must belong to the same workspace.");
  if (baseline.ruleVersion !== AI_INTEGRITY_RULE_VERSION || current.ruleVersion !== AI_INTEGRITY_RULE_VERSION) throw new Error("Unsupported monitoring rule version.");
  const before = reconcileAiIntegrity(baseline), after = reconcileAiIntegrity(current);
  const from = aiTimestamp(before.windowStart), through = aiTimestamp(before.windowEnd);
  const nextFrom = aiTimestamp(after.windowStart), nextThrough = aiTimestamp(after.windowEnd);
  let limit: string | null = null;
  if (through !== nextFrom || through - from !== nextThrough - nextFrom) limit = "ADJACENT_EQUAL_DURATION_WINDOWS_REQUIRED";
  else if (baseline.lagHours !== current.lagHours) limit = "CONSOLIDATION_LAG_CHANGED";
  else if (canonicalAiJson(sourceShape(baseline)) !== canonicalAiJson(sourceShape(current))) limit = "SOURCE_OR_BUCKET_SCOPE_CHANGED";
  else if ([baseline, current].some((input) => input.batches.some((b) => Number(b.dataQualityJson.rejectedRows ?? 0) > 0))) limit = "EXCLUDED_SOURCE_ROWS";
  else if ([baseline, current].some((input) => input.sourceReviews.some((r) => aiTimestamp(r.completeThrough) < aiTimestamp(input.batches[0].windowEnd)
    || aiTimestamp(r.exportedAt) < aiTimestamp(input.batches[0].windowEnd) + input.lagHours * 3600000))) limit = "SOURCE_CLOSURE_INCOMPLETE";
  const previous = signals(baseline, before), latest = signals(current, after);
  const keys = [...new Set([...previous.keys(), ...latest.keys()])].sort();
  const movements: AiMonitorSignal[] = [];
  for (const key of keys) {
    const a = previous.get(key), b = latest.get(key), row = b ?? a!;
    // Zero values require an affirmative eligible comparison; missing evidence never means zero.
    if (!a?.fingerprint && !b?.fingerprint) continue;
    const reason = limit ?? (!a || !b || a.value === null || b.value === null ? "COMPARABLE_EVIDENCE_MISSING" : null);
    const oldValue = reason ? null : a!.value, newValue = reason ? null : b!.value;
    const oldNumber = oldValue === null ? null : aiDecimal(oldValue), newNumber = newValue === null ? null : aiDecimal(newValue);
    const movement: AiMovement = reason ? "SUPPRESSED" : oldNumber === BigInt(0) ? "NEW" : newNumber === BigInt(0) ? "RESOLVED" : "PERSISTENT";
    movements.push({ key, kind: row.kind, scope: row.scope, unit: row.unit, movement, previous: oldValue, current: newValue,
      change: oldNumber !== null && newNumber !== null ? aiDecimalString(newNumber - oldNumber) : null,
      previousFingerprint: a?.fingerprint ?? null, currentFingerprint: b?.fingerprint ?? null, reason });
  }
  const limited = limit !== null || movements.some((row) => row.movement === "SUPPRESSED");
  const candidates = movements.filter((row) => row.movement === "NEW" || (row.movement === "PERSISTENT" && abs(aiDecimal(row.current!)) > abs(aiDecimal(row.previous!))));
  const alerts = candidates.slice(0, 19).map((row) => ({ key: row.key, kind: row.movement === "NEW" ? "NEW_DIFFERENCE" : "DIFFERENCE_INCREASED", signalKey: row.key }));
  if (limited) alerts.push({ key: aiDigest(["quality", limit, movements.filter((r) => r.reason).map((r) => r.key)]), kind: "COMPARISON_LIMITED", signalKey: "" });
  return { mode: AI_MONITOR_MODE, monitorVersion: AI_MONITOR_VERSION, ruleVersion: AI_INTEGRITY_RULE_VERSION,
    baselineWindow: { start: before.windowStart, end: before.windowEnd }, currentWindow: { start: after.windowStart, end: after.windowEnd },
    comparable: !limited, comparisonLimit: limit, movements, alerts, omittedAlerts: Math.max(0, candidates.length - 19),
    counts: { new: movements.filter((r) => r.movement === "NEW").length, persistent: movements.filter((r) => r.movement === "PERSISTENT").length,
      noLongerObserved: movements.filter((r) => r.movement === "RESOLVED").length, suppressed: movements.filter((r) => r.movement === "SUPPRESSED").length },
    limitations: ["Synthetic rehearsal; no real provider connection or scheduled reads.", "No longer observed describes a comparable later period; it does not prove remediation or recovered money.",
      "Periods must be adjacent, equal duration and use the same source/bucket scopes. Changed or missing evidence suppresses movement.", "Cost and usage movements remain separate; no monetary conversion of usage or combined at-risk total.", "Alerts are local review prompts, not delivered emails or a monitoring subscription."] };
}
export type AiMonitorArtifact = ReturnType<typeof compareAiIntegrityPeriods>;
