import assert from "node:assert/strict";
import { initialScanSelection, scanSources, scanUtcTimestamp, type ScanSetupBatch } from "../components/ai-integrity/scan-setup";

const batches: ScanSetupBatch[] = scanSources.map((sourceKind, index) => ({ id: `batch-${index}`, sourceKind, fileName: `${index}.csv`, windowStart: "2026-05-01T00:00:00.000Z", windowEnd: "2026-06-01T00:00:00.000Z", duplicateCount: 0 }));
assert.deepEqual(initialScanSelection(batches), { STRIPE_REVENUE: "batch-0", INTERNAL_LEDGER: "batch-1", PROVIDER_REPORT: "batch-2" });
assert.deepEqual(initialScanSelection([batches[0], batches[1], { ...batches[2], windowEnd: "2026-07-01T00:00:00.000Z" }]), {}, "Different periods must require a new choice");
assert.equal(initialScanSelection([...batches, { ...batches[2], id: "another-provider" }]).PROVIDER_REPORT, undefined, "Ambiguous imports must not be silently chosen");
assert.equal(initialScanSelection(batches, { PROVIDER_REPORT: "other-workspace-batch" }).PROVIDER_REPORT, undefined, "Unknown IDs must not fall back to another file");
assert.equal(initialScanSelection(batches, { PROVIDER_REPORT: "batch-0" }).PROVIDER_REPORT, undefined, "A source must not accept another kind's file");
assert.equal(initialScanSelection([{ ...batches[2], duplicateCount: 1 }], { PROVIDER_REPORT: "batch-2" }).PROVIDER_REPORT, undefined, "Repeated imports must not be selected");
assert.equal(scanUtcTimestamp("2026-06-03T09:30"), "2026-06-03T09:30:00Z");
assert.equal(scanUtcTimestamp("2026-06-03T09:30:12"), "2026-06-03T09:30:12Z");
assert.equal(scanUtcTimestamp(""), "");
console.log("UX setup checks passed: unambiguous same-period selection, scoped IDs, duplicate exclusion and explicit UTC.");
