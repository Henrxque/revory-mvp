import assert from "node:assert/strict";
import fs from "node:fs";

import type { GuardedSegmentation } from "../domain/revory/growth-intelligence";
import { buildWeeklyManagementDecision } from "../domain/revory/growth-intelligence";
import { evaluatePackagingEvidence } from "../services/evidence/launch-evidence";

const thin: GuardedSegmentation = { minimumRecords: 5, minimumFindingRecords: 2, segments: [] };
assert.equal(buildWeeklyManagementDecision(thin).available, false);

const segmentation: GuardedSegmentation = { minimumRecords: 5, minimumFindingRecords: 2, segments: [{ dimension: "SERVICE_TYPE", layer: "REVENUE_REALIZATION", label: "Roofing", recordCount: 10, findingRecordCount: 4, findingRateBps: 4000, financialValueCents: 2_000_000, financialValuePerFindingRecordCents: 500_000, operationalFindingCount: 0, currency: "USD", eligibleForRanking: true, suppressionReason: null }] };
const decision = buildWeeklyManagementDecision(segmentation);
assert.equal(decision.available, true);
assert.match(decision.rationale, /40%/);
assert.deepEqual(buildWeeklyManagementDecision(segmentation), decision, "weekly decision must be deterministic for unchanged evidence");

const noEvidence = evaluatePackagingEvidence([]);
assert.ok(noEvidence.every((item) => item.decision === "DELAY"), "missing customer evidence can only delay packaging");
const retained = evaluatePackagingEvidence(Array.from({ length: 5 }, (_, index) => ({ metric: "WEEKLY_DECISION_USEFUL" as const, offerKey: "GROWTH" as const, booleanValue: true, integerValue: null, amountCents: null, index })));
assert.equal(retained.find((item) => item.offerKey === "GROWTH")?.decision, "RETAIN");
const repackaged = evaluatePackagingEvidence(Array.from({ length: 5 }, (_, index) => ({ metric: "WEEKLY_DECISION_USEFUL" as const, offerKey: "GROWTH" as const, booleanValue: index === 0, integerValue: null, amountCents: null })));
assert.equal(repackaged.find((item) => item.offerKey === "GROWTH")?.decision, "REPACKAGE");

const feedback = fs.readFileSync("src/app/(app)/app/history/actions.ts", "utf8");
assert.match(feedback, /WEEKLY_DECISION_USEFUL/);
assert.match(feedback, /stateFingerprint/);
const runs = fs.readFileSync("services/quote-recovery/analysis-runs.ts", "utf8");
assert.match(runs, /FIRST_VALUE_SECONDS/);
assert.match(runs, /SECOND_READ/);

console.log("Sprint 12 evidence instrumentation, guarded weekly-decision feedback and independent packaging decisions: PASS (real customer evidence intentionally pending)");
