import assert from "node:assert/strict";

import { evaluateAiAttributionCoverage, type CoverageBucket, type CoverageMapping, type CoverageUsage } from "../domain/ai-integrity/attribution";
import { providerProjectMappingKey, stripeCustomerMappingKey } from "../domain/ai-integrity/mapping-key";

const date = (value: string) => new Date(value);
const start = date("2026-08-01T00:00:00Z");
const end = date("2026-09-01T00:00:00Z");
const bucket = (id: string, projectId: string | null, costAmount: string, overrides: Partial<CoverageBucket> = {}): CoverageBucket => ({
  id, provider: "openai", organizationId: "org_a", projectId, model: "gpt-4.1", windowStart: date("2026-08-10T00:00:00Z"),
  windowEnd: date("2026-08-11T00:00:00Z"), costAmount, costCurrency: "USD", costBasis: "REPORTED", adjustmentKind: null, ...overrides,
});
const usage = (projectId: string, customer: string | null): CoverageUsage => ({ provider: "openai", providerProjectId: projectId,
  internalCustomerExternalId: customer, occurredAt: date("2026-08-10T12:00:00Z") });
const mapping = (projectId: string, customer: string, overrides: Partial<CoverageMapping> = {}): CoverageMapping => ({
  id: `map_${projectId}_${customer}`, kind: "PROVIDER_PROJECT", externalId: providerProjectMappingKey("openai", "org_a", projectId),
  internalCustomerExternalId: customer, validFrom: start, validUntil: end, status: "CONFIRMED", confirmationMethod: "EXCLUSIVE_PROJECT_VERIFIED", ...overrides,
});
const evaluate = (buckets: CoverageBucket[], records: CoverageUsage[], mappings: CoverageMapping[], knownUsage = records) =>
  evaluateAiAttributionCoverage({ providerWindowStart: start, providerWindowEnd: end, ledgerWindowStart: start, ledgerWindowEnd: end,
    buckets, usage: records, knownUsage, mappings });

assert.notEqual(providerProjectMappingKey("openai", "org_a", "proj_1"), providerProjectMappingKey("anthropic", "org_a", "proj_1"));
assert.notEqual(stripeCustomerMappingKey("stripe-a", "cus_1"), stripeCustomerMappingKey("stripe-b", "cus_1"));

const basic = evaluate([bucket("b1", "proj_a", "10.50"), bucket("b2", "proj_b", "20.50")],
  [usage("proj_a", "customer_a"), usage("proj_b", "customer_a"), usage("proj_b", "customer_b")],
  [mapping("proj_a", "customer_a"), mapping("proj_b", "customer_a")]);
assert.equal(basic.groups[0].reportedComparableCost, "31");
assert.equal(basic.groups[0].attributedCost, "10.5");
assert.equal(basic.groups[0].unattributedCost, "20.5");
assert.equal(basic.groups[0].coverageBps, 3387);
assert.equal(basic.rows.find((row) => row.bucketId === "b2")?.reason, "SHARED_OR_UNATTRIBUTED_PROJECT");
assert.deepEqual(basic.groups[0].denominatorBucketIds, ["b1", "b2"]);
assert.deepEqual(basic.groups[0].attributedBucketIds, ["b1"]);

const contradiction = evaluate([bucket("b1", "proj_a", "10")], [usage("proj_a", "customer_a")],
  [mapping("proj_a", "customer_a")], [usage("proj_a", "customer_a"), usage("proj_a", "customer_b")]);
assert.equal(contradiction.groups[0].attributedCost, "0", "Other imported ledger evidence must suppress customer attribution.");
assert.equal(evaluate([bucket("b1", "proj_a", "10")], [usage("proj_a", "customer_a")],
  [mapping("proj_a", "customer_a", { status: "CONFLICTED" })]).rows[0].reason, "CONFLICTING_PROJECT_MAPPING");
assert.equal(evaluate([bucket("b1", "proj_a", "10")], [usage("proj_a", null)],
  [mapping("proj_a", "customer_a")]).groups[0].attributedCost, "0");
assert.equal(evaluate([bucket("b1", "proj_a", "10")], [usage("proj_a", "customer_a")],
  [mapping("proj_a", "customer_a", { validFrom: date("2026-08-10T12:00:00Z") })]).groups[0].attributedCost, "0");
const acrossOrganizations = evaluate([
  bucket("org_a", "proj_a", "10"), bucket("org_b", "proj_a", "20", { organizationId: "org_b" }),
], [usage("proj_a", "customer_a")], [mapping("proj_a", "customer_a")]);
assert(acrossOrganizations.rows.every((row) => row.reason === "PROJECT_ACROSS_ORGANIZATIONS"));
assert.equal(acrossOrganizations.groups[0].attributedCost, "0");
const differentProvider = evaluate([bucket("anthropic", "proj_a", "10", { provider: "anthropic" })],
  [{ ...usage("proj_a", "customer_a"), provider: "anthropic" }], [mapping("proj_a", "customer_a")]);
assert.equal(differentProvider.rows[0].reason, "NO_EXCLUSIVE_PROJECT_MAPPING");

const overlap = evaluate([bucket("b1", "proj_a", "10"), bucket("b2", "proj_a", "9")],
  [usage("proj_a", "customer_a")], [mapping("proj_a", "customer_a")]);
assert.equal(overlap.groups.length, 0);
assert(overlap.rows.every((row) => row.reason === "OVERLAPPING_PROVIDER_BUCKETS"));
const mixed = evaluate([
  bucket("reported", "proj_a", "10"),
  bucket("estimated", "proj_b", "5", { costBasis: "ESTIMATED" }),
  bucket("adjustment", "proj_c", "-2", { adjustmentKind: "CREDIT" }),
  bucket("eur", "proj_d", "4", { costCurrency: "EUR" }),
], [usage("proj_a", "customer_a")], [mapping("proj_a", "customer_a")]);
assert.equal(mixed.groups.length, 2);
assert.equal(mixed.groups.find((group) => group.currency === "USD")?.reportedComparableCost, "10");
assert.equal(mixed.groups.find((group) => group.currency === "EUR")?.coverageBps, 0);
assert(mixed.rows.find((row) => row.bucketId === "estimated")?.inDenominator === false);
assert.equal(evaluateAiAttributionCoverage({ providerWindowStart: start, providerWindowEnd: end,
  ledgerWindowStart: date("2026-08-02T00:00:00Z"), ledgerWindowEnd: end,
  buckets: [bucket("b1", "proj_a", "10")], usage: [usage("proj_a", "customer_a")], mappings: [mapping("proj_a", "customer_a")] }).rows[0].reason, "LEDGER_WINDOW_INCOMPLETE");

console.log("AI Integrity Sprint 3 explicit mapping keys, shared project suppression, temporal boundaries and auditable coverage: PASS");
