import assert from "node:assert/strict";
import { compareAiIntegrityPeriods } from "../domain/ai-integrity/monitoring";
import { sprint8Fixture } from "./fixtures/ai-saas/sprint-8";
import { providerProjectMappingKey } from "../domain/ai-integrity/mapping-key";

const a = sprint8Fixture(1), b = sprint8Fixture(2, "140", "2.5");
const persistent = compareAiIntegrityPeriods(a, b);
assert.equal(persistent.comparable, true); assert.equal(persistent.counts.persistent, 2); assert.equal(persistent.alerts.length, 2);
const usage = persistent.movements.find((r) => r.kind === "LEDGER_PROVIDER_USAGE_MISMATCH")!;
assert.equal(usage.previous, "20"); assert.equal(usage.current, "40"); assert.equal(usage.change, "20"); assert.equal(usage.unit, "tokens");
assert.notEqual(usage.previousFingerprint, usage.currentFingerprint, "Temporal identity must not rely on evidence fingerprint");
const cost = persistent.movements.find((r) => r.kind === "UNATTRIBUTED_PROVIDER_SPEND")!;
assert.equal(cost.previous, "1.25"); assert.equal(cost.current, "2.5"); assert.equal(cost.change, "1.25"); assert.equal(cost.unit, "USD");
const resolved = compareAiIntegrityPeriods(a, sprint8Fixture(2, "100", "0"));
assert.equal(resolved.counts.noLongerObserved, 2); assert.equal(resolved.alerts.length, 0);
assert.equal(compareAiIntegrityPeriods(sprint8Fixture(1, "100", "0"), b).counts.new, 2);
const negative = compareAiIntegrityPeriods(sprint8Fixture(1, "90"), sprint8Fixture(2, "70"));
assert.equal(negative.alerts.filter((r) => r.kind === "DIFFERENCE_INCREASED").length, 1, "Use magnitude for signed usage differences");
const gap = compareAiIntegrityPeriods(a, sprint8Fixture(3)); assert.equal(gap.comparable, false); assert.equal(gap.counts.noLongerObserved, 0);
assert.equal(compareAiIntegrityPeriods(a, a).comparisonLimit, "ADJACENT_EQUAL_DURATION_WINDOWS_REQUIRED");
const changedUnit = sprint8Fixture(2); changedUnit.buckets[0].usageUnit = "requests";
assert.equal(compareAiIntegrityPeriods(a, changedUnit).comparisonLimit, "SOURCE_OR_BUCKET_SCOPE_CHANGED");
const changedCurrency = sprint8Fixture(2); changedCurrency.buckets[1].costCurrency = "EUR";
assert.equal(compareAiIntegrityPeriods(a, changedCurrency).counts.noLongerObserved, 0);
const partial = sprint8Fixture(2, "100", "0"); partial.sourceReviews[1].completeThrough = partial.batches[0].windowStart;
assert.equal(compareAiIntegrityPeriods(a, partial).comparisonLimit, "SOURCE_CLOSURE_INCOMPLETE");
const rejected = sprint8Fixture(2); rejected.batches[0].dataQualityJson.rejectedRows = 1;
assert.equal(compareAiIntegrityPeriods(a, rejected).comparisonLimit, "EXCLUDED_SOURCE_ROWS");
const lagged = sprint8Fixture(2); lagged.lagHours = 48;
assert.equal(compareAiIntegrityPeriods(a, lagged).comparisonLimit, "CONSOLIDATION_LAG_CHANGED");
const stale = sprint8Fixture(2, "100", "0"); stale.buckets[1].reportedAt = stale.buckets[1].windowEnd;
assert.equal(compareAiIntegrityPeriods(a, stale).movements.find((r) => r.kind === "UNATTRIBUTED_PROVIDER_SPEND")?.movement, "SUPPRESSED");
const missing = sprint8Fixture(2); missing.buckets.pop(); missing.batches.find((r) => r.sourceKind === "PROVIDER_REPORT")!.rowCount = 1; missing.batches.find((r) => r.sourceKind === "PROVIDER_REPORT")!.insertedCount = 1;
assert.equal(compareAiIntegrityPeriods(a, missing).counts.noLongerObserved, 0);
const reassigned = sprint8Fixture(2); reassigned.mappings[0].internalCustomerExternalId = "different_customer"; reassigned.usage[0].internalCustomerExternalId = "different_customer";
assert.equal(compareAiIntegrityPeriods(a, reassigned).movements.filter((r) => r.kind === "LEDGER_PROVIDER_USAGE_MISMATCH").every((r) => r.movement === "SUPPRESSED"), true);
assert.throws(() => compareAiIntegrityPeriods(a, { ...b, workspaceId: "other_workspace" }), /workspace/);
assert.deepEqual(compareAiIntegrityPeriods({ ...a, buckets: [...a.buckets].reverse() }, b), persistent);
assert.equal(persistent.limitations.some((r) => r.includes("recovered money")), true);
function many(day: number, quantity: string) {
  const input = sprint8Fixture(day, quantity);
  for (let i = 1; i <= 20; i++) {
    const project = `proj_extra_${i}`;
    input.usage.push({ ...input.usage[0], id: `usage_${day}_${i}`, externalId: `usage_${day}_${i}`, providerProjectId: project, providerRequestId: `req_${day}_${i}` });
    input.buckets.push({ ...input.buckets[0], id: `bucket_${day}_${i}`, externalId: `bucket_${day}_${i}`, projectId: project });
    input.mappings.push({ ...input.mappings[0], id: `mapping_${day}_${i}`, externalId: providerProjectMappingKey("openai", "org_a", project) });
  }
  for (const batch of input.batches) {
    batch.rowCount = batch.insertedCount = batch.sourceKind === "INTERNAL_LEDGER" ? input.usage.length : batch.sourceKind === "PROVIDER_REPORT" ? input.buckets.length : input.revenue.length;
  }
  return input;
}
const bounded = compareAiIntegrityPeriods(many(1, "120"), many(2, "140"));
assert.equal(bounded.alerts.length, 19); assert.equal(bounded.omittedAlerts, 2);
console.log("Sprint 8 contracts PASS: temporal identity, new/persistent/no-longer-observed, signed exact deltas, no combined financial totals, scope/unit/currency/lag/closure/denominator suppression and stable replay.");
