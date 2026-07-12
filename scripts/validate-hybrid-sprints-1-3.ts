import assert from "node:assert/strict";
import ExcelJS from "exceljs";

import type { CanonicalRecordContract } from "../domain/revory/contracts";
import { buildSecureIntakePlan } from "../services/canonical-intake/secure-intake";
import { runQuoteRecoveryEngine } from "../services/quote-recovery/engine";

const encoder = new TextEncoder();
const mapping = { estimate_id: "externalId", status: "status", amount: "amountCents", created_at: "createdAt", follow_up: "nextFollowUpAt", owner: "owner", next_step: "nextStep", lost_at: "lostAt" };
const csv = `estimate_id,status,amount,created_at,follow_up,owner,next_step,lost_at\nE-1,open,15000,2026-05-01,2026-06-30,,,\nE-2,lost,22000,2026-06-01,,Mia,Call customer,2026-07-01\n`;
const plan = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [{ bytes: encoder.encode(csv), entityType: "ESTIMATE", fileName: "estimates.csv", sourceSystem: "fixture", mapping }] });
assert.equal(plan.accepted, true);
assert.equal(plan.records.length, 2);
assert.equal(plan.records[0].payload.amountCents, 1_500_000);
assert.equal(plan.eligibility.HIGH_VALUE_STALE_QUOTE.eligible, true);

const rerunPlan = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [{ bytes: encoder.encode(csv), entityType: "ESTIMATE", fileName: "estimates.csv", sourceSystem: "fixture", mapping }] });
assert.equal(rerunPlan.idempotencyKey, plan.idempotencyKey);

const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Estimates");
sheet.addRow(["estimate_id", "status", "amount", "created_at"]); sheet.addRow(["E-X", "open", { formula: "1+1", result: 2 }, "2026-06-01"]);
const formulaBytes = new Uint8Array(await workbook.xlsx.writeBuffer());
const formulaPlan = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [{ bytes: formulaBytes, entityType: "ESTIMATE", fileName: "estimates.xlsx", sourceSystem: "fixture", mapping: { estimate_id: "externalId", status: "status", amount: "amountCents", created_at: "createdAt" } }] });
assert.equal(formulaPlan.accepted, false); assert.ok(formulaPlan.issues.some((issue) => issue.code === "FORMULA_REJECTED"));

const now = new Date("2026-07-12T12:00:00.000Z");
const findings = runQuoteRecoveryEngine({ workspaceId: "workspace-a", records: plan.records, now });
for (const type of ["OVERDUE_FOLLOW_UP", "HIGH_VALUE_STALE_QUOTE", "OPEN_ESTIMATE_NO_ACTIVITY", "ESTIMATE_AGING_RISK", "MISSING_OWNER_OR_NEXT_STEP", "RECOVERABLE_LOST_QUOTE"]) assert.ok(findings.some((finding) => finding.type === type), `Missing ${type}`);
assert.equal(findings.find((finding) => finding.type === "MISSING_OWNER_OR_NEXT_STEP")?.valueBasis, "OPERATIONAL");
assert.equal(findings.find((finding) => finding.type === "RECOVERABLE_LOST_QUOTE")?.valueBasis, "ESTIMATED");
assert.deepEqual(runQuoteRecoveryEngine({ workspaceId: "workspace-a", records: plan.records, now }), findings);
assert.equal(new Set(findings.map((finding) => finding.fingerprint)).size, findings.length);

const healthy: CanonicalRecordContract = { ...plan.records[0], externalId: "E-HEALTHY", payload: { externalId: "E-HEALTHY", status: "won", amountCents: 2_000_000, createdAt: "2026-01-01T00:00:00.000Z", owner: "Sam", nextStep: "Schedule" } };
assert.equal(runQuoteRecoveryEngine({ workspaceId: "workspace-a", records: [healthy], now }).length, 0);
assert.throws(() => runQuoteRecoveryEngine({ workspaceId: "workspace-b", records: plan.records, now }), /Cross-workspace/);

const thinCsv = `estimate_id,status,created_at\nE-3,open,2026-07-10\n`;
const thinPlan = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [{ bytes: encoder.encode(thinCsv), entityType: "ESTIMATE", fileName: "thin.csv", sourceSystem: "fixture", mapping: { estimate_id: "externalId", status: "status", created_at: "createdAt" } }] });
assert.equal(thinPlan.eligibility.HIGH_VALUE_STALE_QUOTE.eligible, false);
assert.ok(runQuoteRecoveryEngine({ workspaceId: "workspace-a", records: thinPlan.records, now }).every((finding) => finding.valueCents === null));

const volumeRows = Array.from({ length: 2500 }, (_, index) => ({ ...plan.records[0], externalId: `V-${index}`, payload: { ...plan.records[0].payload, externalId: `V-${index}` } }));
assert.ok(runQuoteRecoveryEngine({ workspaceId: "workspace-a", records: volumeRows, now }).length >= 2500);
console.log("Sprints 1-3 hybrid contracts, secure intake and Quote Recovery engine: PASS");
