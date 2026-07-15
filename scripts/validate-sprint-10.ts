import assert from "node:assert/strict";

import type { CanonicalRecordContract } from "../domain/revory/contracts";
import {
  buildGuardedSegmentation,
  buildWeeklyManagementDecision,
  type SegmentFinding,
} from "../domain/revory/growth-intelligence";

const provenance = { fileName: "fixture.csv", importedAt: "2026-07-13T12:00:00.000Z", rowNumber: 2, sourceHeaders: [] };
const record = (
  entityType: "ESTIMATE" | "JOB",
  externalId: string,
  payload: CanonicalRecordContract["payload"],
  workspaceId = "workspace-a",
): CanonicalRecordContract => ({
  entityType,
  externalId,
  occurredAt: null,
  payload: { externalId, ...payload },
  provenance,
  relationExternalIds: {},
  sourceSystem: "fixture",
  workspaceId,
});
const finding = (
  recordExternalId: string,
  valueCents: number | null,
  valueBasis: SegmentFinding["valueBasis"],
  currency = "USD",
  additive = true,
): SegmentFinding => ({ additive, currency, recordExternalId, valueBasis, valueCents });

const records = [
  ...Array.from({ length: 6 }, (_, index) => record("ESTIMATE", `E-${index + 1}`, { owner: "Alex", serviceType: "Roofing", source: "Referral" })),
  ...Array.from({ length: 5 }, (_, index) => record("JOB", `J-${index + 1}`, { owner: "Alex", serviceType: "Roofing", source: "Referral" })),
];
const segmentation = buildGuardedSegmentation({
  quoteFindings: [finding("E-1", 1_000_000, "ESTIMATED"), finding("E-1", 1_000_000, "ESTIMATED"), finding("E-2", 2_000_000, "ESTIMATED")],
  realizationFindings: [finding("J-1", 500_000, "CALCULATED"), finding("J-2", 700_000, "CALCULATED")],
  records,
});
const eligible = segmentation.segments.filter((segment) => segment.eligibleForRanking);
assert.ok(eligible.some((segment) => segment.layer === "QUOTE_RECOVERY" && segment.dimension === "SOURCE" && segment.label === "Referral"));
assert.ok(eligible.some((segment) => segment.layer === "REVENUE_REALIZATION" && segment.dimension === "SERVICE_TYPE" && segment.label === "Roofing"));
assert.equal(eligible.find((segment) => segment.layer === "QUOTE_RECOVERY" && segment.dimension === "SOURCE")?.financialValueCents, 3_000_000, "multiple rules on one estimate must not multiply its value");
assert.equal(eligible.find((segment) => segment.layer === "REVENUE_REALIZATION" && segment.dimension === "SOURCE")?.financialValueCents, 1_200_000);
const decision = buildWeeklyManagementDecision(segmentation);
assert.equal(decision.available, true);
assert.equal(decision.segment?.layer, "REVENUE_REALIZATION", "deterministic billing gaps take priority over modeled quote opportunity");

const thinRecords = buildGuardedSegmentation({
  quoteFindings: [finding("E-1", 1_000_000, "ESTIMATED"), finding("E-2", 2_000_000, "ESTIMATED")],
  realizationFindings: [],
  records: records.filter((item) => item.entityType !== "ESTIMATE" || Number(item.externalId.slice(2)) <= 4),
});
assert.ok(thinRecords.segments.filter((segment) => segment.layer === "QUOTE_RECOVERY").every((segment) => !segment.eligibleForRanking && segment.suppressionReason === "THIN_RECORD_SAMPLE"));

const thinFindings = buildGuardedSegmentation({
  quoteFindings: [finding("E-1", 1_000_000, "ESTIMATED")],
  realizationFindings: [],
  records,
});
assert.ok(thinFindings.segments.filter((segment) => segment.layer === "QUOTE_RECOVERY").every((segment) => !segment.eligibleForRanking && segment.suppressionReason === "THIN_FINDING_SAMPLE"));
assert.equal(buildWeeklyManagementDecision(thinFindings).available, false);

const mixedCurrency = buildGuardedSegmentation({
  quoteFindings: [finding("E-1", 1_000_000, "ESTIMATED", "USD"), finding("E-2", 2_000_000, "ESTIMATED", "EUR")],
  realizationFindings: [],
  records,
});
assert.ok(mixedCurrency.segments.filter((segment) => segment.layer === "QUOTE_RECOVERY").every((segment) => segment.suppressionReason === "MIXED_CURRENCY" && segment.financialValueCents === null));

const conflictingEstimateValue = buildGuardedSegmentation({
  quoteFindings: [finding("E-1", 1_000_000, "ESTIMATED"), finding("E-1", 1_500_000, "ESTIMATED"), finding("E-2", 2_000_000, "ESTIMATED")],
  realizationFindings: [],
  records,
});
assert.ok(conflictingEstimateValue.segments.filter((segment) => segment.layer === "QUOTE_RECOVERY").every((segment) => segment.suppressionReason === "VALUE_CONFLICT" && segment.financialValueCents === null));

assert.throws(
  () => buildGuardedSegmentation({ quoteFindings: [], realizationFindings: [], records: [...records, record("JOB", "OTHER", {}, "workspace-b")] }),
  /Cross-workspace/,
);

console.log("Sprint 10 guarded segmentation, separated value bases, thin-cohort suppression, mixed-currency suppression and tenant isolation: PASS");
