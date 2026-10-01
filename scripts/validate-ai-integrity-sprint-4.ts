import assert from "node:assert/strict";
import { aiDecimal, aiDecimalString, aiDigest, reconcileAiIntegrity, type AiScanInput } from "../domain/ai-integrity/reconciliation";
import { readScanRequest } from "../services/ai-integrity/scan-request";
import { sprint4Fixture } from "./fixtures/ai-saas/sprint-4";

let checks = 0;
function test(name: string, run: () => void) { run(); checks++; console.log(`PASS ${name}`); }
const mismatch = (input: AiScanInput) => reconcileAiIntegrity(input).findings.filter((f) => f.findingType === "LEDGER_PROVIDER_USAGE_MISMATCH");
const suppresses = (input: AiScanInput, code: string) => assert.ok(reconcileAiIntegrity(input).suppressions.some((s) => s.code === code), code);
const addUsage = (input: AiScanInput, change: Partial<AiScanInput["usage"][number]>) => {
  input.usage.push({ ...input.usage[0], id: "usage_b", externalId: "usage_b", recordHash: "hash_b", providerRequestId: "req_b", ...change });
  const batch = input.batches.find((b) => b.id === "ledger")!; batch.rowCount++; batch.insertedCount++;
};
test("two honest finding families, separate monetary and quantity values", () => {
  const result = reconcileAiIntegrity(sprint4Fixture());
  assert.equal(result.findings.length, 2); assert.equal(result.comparisons.length, 1);
  assert.deepEqual(result.coverage.groups.map((g) => [g.reportedComparableCost, g.attributedCost, g.unattributedCost, g.coverageBps]), [["3.75", "2.5", "1.25", 6666]]);
  const delta = result.findings.find((f) => f.findingType === "LEDGER_PROVIDER_USAGE_MISMATCH")!;
  assert.equal(delta.valueAmount, null); assert.equal(delta.evidence.delta, "20"); assert.equal(delta.evidence.unit, "tokens");
});
test("deterministic output under input permutation and JSON replay", () => {
  const input = sprint4Fixture(), expected = aiDigest(reconcileAiIntegrity(input));
  const copy = JSON.parse(JSON.stringify(input)) as AiScanInput;
  copy.batches.reverse(); copy.sourceReviews.reverse(); copy.buckets.reverse(); copy.knownBuckets.reverse();
  assert.equal(aiDigest(reconcileAiIntegrity(copy)), expected);
});
test("exact decimals including beyond Number precision", () => {
  assert.equal(aiDecimalString(aiDecimal("999999999999999999.000000000001") + aiDecimal("0.000000000009")), "999999999999999999.00000000001");
  const input = sprint4Fixture(); input.usage[0].quantity = "0.1"; input.buckets[0].usageQuantity = "0.3";
  addUsage(input, { quantity: "0.2" }); assert.equal(mismatch(input).length, 0);
});
test("open source and consolidation lag suppress claims", () => {
  const input = sprint4Fixture(); input.sourceReviews.forEach((r) => r.exportedAt = "2026-09-01T01:00:00Z");
  assert.equal(reconcileAiIntegrity(input).findings.length, 0); suppresses(input, "SOURCE_OPEN_OR_CONSOLIDATION_LAG");
});
test("stale provider bucket suppressed despite operator review", () => {
  const input = sprint4Fixture(); input.buckets[0].reportedAt = "2026-08-31T00:00:00Z";
  assert.equal(mismatch(input).length, 0); suppresses(input, "PROVIDER_BUCKET_NOT_FINAL");
});
test("report time later than declared export is suppressed", () => {
  const input = sprint4Fixture(); input.buckets[0].reportedAt = input.asOf;
  suppresses(input, "PROVIDER_BUCKET_NOT_FINAL");
});
test("refunds and credits cannot produce margin", () => {
  const input = sprint4Fixture(); input.revenue[0].eventKind = "REFUND"; input.revenue[0].amountMinor = "-8000"; input.revenue[0].parentExternalId = "charge_parent";
  input.usage[0].creditsDelta = "900";
  assert.deepEqual(reconcileAiIntegrity(input).findings, reconcileAiIntegrity(sprint4Fixture()).findings);
  suppresses(input, "REVENUE_MARGIN_AND_CREDIT_RULES_NOT_IMPLEMENTED");
});
test("provider credit excludes adjustment without manufacturing loss", () => {
  const input = sprint4Fixture(); input.buckets[1].costAmount = "-1.25"; input.buckets[1].adjustmentKind = "CREDIT";
  const result = reconcileAiIntegrity(input); assert.equal(result.coverage.groups[0].reportedComparableCost, "2.5");
  assert.ok(!result.findings.some((f) => f.findingType === "UNATTRIBUTED_PROVIDER_SPEND")); suppresses(input, "ADJUSTMENT_EXCLUDED");
});
test("currencies remain separate and never receive implicit FX", () => {
  const input = sprint4Fixture(); input.buckets[1].costCurrency = "EUR";
  const groups = reconcileAiIntegrity(input).coverage.groups;
  assert.equal(groups.length, 2); assert.equal(groups.find((g) => g.currency === "EUR")!.unattributedCost, "1.25");
});
test("explicit timezone offsets describe the same UTC interval", () => {
  const input = sprint4Fixture(); input.batches[0].windowStart = "2026-07-31T21:00:00-03:00"; input.batches[0].windowEnd = "2026-08-31T21:00:00-03:00";
  input.usage[0].occurredAt = "2026-08-10T09:00:00-03:00";
  assert.equal(mismatch(input)[0].evidence.delta, "20");
});
test("half-open provider interval excludes event at exact end", () => {
  const input = sprint4Fixture(); input.usage[0].occurredAt = input.buckets[0].windowEnd;
  assert.equal(mismatch(input).length, 0); suppresses(input, "NO_CORROBORATING_LEDGER_USAGE");
});
test("unit mismatch suppressed without conversion", () => {
  const input = sprint4Fixture(); input.usage[0].unit = "requests";
  assert.equal(mismatch(input).length, 0); suppresses(input, "USAGE_UNIT_NOT_COMPARABLE");
});
test("aggregate/detail cost overlap excludes both", () => {
  const input = sprint4Fixture(); input.buckets[1].projectId = null; input.buckets[1].model = null;
  const result = reconcileAiIntegrity(input); assert.equal(result.coverage.groups.length, 0); assert.equal(result.findings.length, 0);
  suppresses(input, "OVERLAPPING_PROVIDER_BUCKETS");
});
test("usage buckets across currencies cannot reuse ledger events", () => {
  const input = sprint4Fixture(); input.buckets[1].projectId = "proj_a"; input.buckets[1].costCurrency = "EUR";
  assert.equal(mismatch(input).length, 0); suppresses(input, "OVERLAPPING_USAGE_BUCKETS");
});
test("duplicate import membership blocks instead of understating totals", () => {
  const input = sprint4Fixture(); input.batches[0].duplicateCount = 1;
  assert.throws(() => reconcileAiIntegrity(input), /membership/);
});
test("same external ID with conflicting provider versions excluded", () => {
  const input = sprint4Fixture(); input.knownBuckets = [...input.buckets, { ...input.buckets[0], id: "other", importBatchId: "other_batch", recordHash: "changed" }];
  assert.equal(mismatch(input).length, 0); suppresses(input, "CONFLICTING_PROVIDER_RECORD_VERSION");
});
test("same external ID with conflicting ledger versions suppresses delta", () => {
  const input = sprint4Fixture(); input.knownUsage = [...input.usage, { ...input.usage[0], id: "other", recordHash: "changed", quantity: "300" }];
  assert.equal(mismatch(input).length, 0); suppresses(input, "CONFLICTING_LEDGER_RECORD_VERSION");
});
test("duplicate provider request under different event IDs suppressed", () => {
  const input = sprint4Fixture(); addUsage(input, { providerRequestId: "req_a" });
  assert.equal(mismatch(input).length, 0); suppresses(input, "DUPLICATE_PROVIDER_REQUEST");
});
test("mapping conflict suppresses customer comparison", () => {
  const input = sprint4Fixture(); input.mappings[0].status = "CONFLICTED";
  assert.equal(mismatch(input).length, 0); assert.equal(reconcileAiIntegrity(input).coverage.groups[0].attributedCost, "0");
});
test("expired mapping cannot attribute a full bucket", () => {
  const input = sprint4Fixture(); input.mappings[0].validUntil = "2026-08-20T00:00:00Z";
  assert.equal(mismatch(input).length, 0); suppresses(input, "NO_EXCLUSIVE_PROJECT_MAPPING");
});
test("another import revealing shared project invalidates strong attribution", () => {
  const input = sprint4Fixture(); input.knownUsage = [...input.usage, { ...input.usage[0], id: "other", internalCustomerExternalId: "customer_b" }];
  assert.equal(reconcileAiIntegrity(input).coverage.groups[0].attributedCost, "0"); suppresses(input, "SHARED_OR_UNATTRIBUTED_PROJECT");
});
test("same project observed in another organization suppresses attribution", () => {
  const input = sprint4Fixture(); input.knownBuckets = [...input.buckets, { ...input.buckets[0], id: "other", externalId: "other", organizationId: "org_b" }];
  const result = reconcileAiIntegrity(input); assert.equal(result.coverage.groups[0].attributedCost, "0"); assert.equal(mismatch(input).length, 0);
});
test("estimated and unavailable costs never counted as observed", () => {
  const input = sprint4Fixture(); input.buckets[0].costBasis = "ESTIMATED"; input.buckets[1].costBasis = "UNAVAILABLE";
  assert.equal(reconcileAiIntegrity(input).coverage.groups.length, 0);
  assert.ok(reconcileAiIntegrity(input).findings.every((f) => f.valueAmount === null));
});
test("usage-only provider report can reconcile without fabricating a cost", () => {
  const input = sprint4Fixture(); input.buckets[0].costBasis = "UNAVAILABLE"; input.buckets[0].costAmount = null; input.buckets[0].costCurrency = null;
  assert.equal(mismatch(input)[0].evidence.delta, "20"); assert.equal(mismatch(input)[0].valueAmount, null);
});
test("aggregate monetary precision overflow is blocked explicitly", () => {
  const input = sprint4Fixture(); input.buckets.forEach((b) => b.costAmount = "999999999999999999");
  assert.throws(() => reconcileAiIntegrity(input), /decimal precision/);
});
test("zero cost produces no fake coverage percent or spend finding", () => {
  const input = sprint4Fixture(); input.buckets.forEach((b) => b.costAmount = "0");
  const result = reconcileAiIntegrity(input); assert.equal(result.coverage.groups[0].coverageBps, null);
  assert.ok(!result.findings.some((f) => f.findingType === "UNATTRIBUTED_PROVIDER_SPEND"));
});
test("partially imported ledger suppresses comparisons and attribution", () => {
  const input = sprint4Fixture(); input.batches.find((b) => b.id === "ledger")!.dataQualityJson = { rejectedRows: 1 };
  assert.equal(mismatch(input).length, 0); assert.equal(reconcileAiIntegrity(input).coverage.groups[0].attributedCost, "0");
});
test("missing provider/project/model dimensions suppress delta", () => {
  for (const field of ["provider", "providerProjectId", "model"] as const) {
    const input = sprint4Fixture(); input.usage[0][field] = null; assert.equal(mismatch(input).length, 0, field);
  }
});
test("negative ledger quantity requires adjustment review", () => {
  const input = sprint4Fixture(); input.usage[0].quantity = "-1";
  assert.equal(mismatch(input).length, 0); suppresses(input, "USAGE_ADJUSTMENT_REQUIRES_REVIEW");
  const negativeCost = sprint4Fixture(); negativeCost.buckets[0].costAmount = "-2.5";
  assert.equal(mismatch(negativeCost).length, 0); suppresses(negativeCost, "USAGE_ADJUSTMENT_REQUIRES_REVIEW");
});
test("future or contradictory source reviews rejected", () => {
  const input = sprint4Fixture(); input.sourceReviews[0].exportedAt = "2026-09-05T00:00:00Z";
  assert.throws(() => reconcileAiIntegrity(input), /closure/);
});
test("incompatible source windows rejected", () => {
  const input = sprint4Fixture(); input.batches[0].windowStart = "2026-08-02T00:00:00Z";
  assert.throws(() => reconcileAiIntegrity(input), /same UTC interval/);
});
const body = { batchIds: ["revenue", "ledger", "provider"], asOf: "2026-09-04T00:00:00Z", lagHours: 24, sourceReviews: sprint4Fixture().sourceReviews, syntheticDataConfirmed: true, closureReviewed: true };
const request = (value: unknown) => new Request("http://localhost/api/ai-integrity/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
assert.equal((await readScanRequest(request(body))).syntheticDataConfirmed, true);
await assert.rejects(() => readScanRequest(request({ ...body, syntheticDataConfirmed: false })), /Confirm/);
await assert.rejects(() => readScanRequest(request({ ...body, extra: "x".repeat(8192) })), /8 KB/);
console.log(`AI Integrity Sprint 4: ${checks} deterministic/adversarial cases + bounded request validation PASS`);
