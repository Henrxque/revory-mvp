import assert from "node:assert/strict";

import type { CanonicalRecordContract } from "../domain/revory/contracts";
import type { RevenueRealizationFindingContract } from "../domain/revory/revenue-realization";
import { summarizeRevenueRealizationFindings, runRevenueRealizationFindingEngine } from "../services/revenue-realization/finding-engine";
import { buildRevenueRealizationRead } from "../services/revenue-realization/reconciliation-engine";

const provenance = (fileName: string, rowNumber: number) => ({ fileName, importedAt: "2026-07-13T12:00:00.000Z", rowNumber, sourceHeaders: [] });
const record = (
  entityType: CanonicalRecordContract["entityType"],
  externalId: string,
  payload: CanonicalRecordContract["payload"],
  relationExternalIds: Record<string, string> = {},
  workspaceId = "workspace-a",
): CanonicalRecordContract => ({ entityType, externalId, occurredAt: null, payload: { externalId, ...payload }, provenance: provenance(`${entityType.toLowerCase()}.csv`, 2), relationExternalIds, sourceSystem: "fixture", workspaceId });

const records: CanonicalRecordContract[] = [
  record("JOB", "J-1", { status: "completed", contractValueCents: 10_000_000, contractValueIncludesApprovedChanges: false, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: true, currency: "USD", targetGrossMarginBps: 4000 }),
  record("INVOICE", "I-1", { status: "issued", amountCents: 4_000_000, currency: "USD" }, { jobExternalId: "J-1" }),
  record("INVOICE", "I-2", { status: "paid", amountCents: 3_000_000, currency: "USD" }, { jobExternalId: "J-1" }),
  record("CHANGE_ORDER", "CO-1", { status: "approved", billingStatus: "unbilled", approvedAmountCents: 1_500_000, approvedAt: "2026-06-10T00:00:00.000Z", currency: "USD", description: "Approved cabinetry change" }, { jobExternalId: "J-1" }),
  record("COST", "C-1", { amountCents: 6_000_000, currency: "USD", category: "materials" }, { jobExternalId: "J-1" }),
  record("JOB", "J-2", { status: "completed", contractValueCents: 5_000_000, contractValueIncludesApprovedChanges: true, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: false, currency: "USD", scopeChangeFlag: true, notes: "Scope changed on site" }),
  record("INVOICE", "I-3", { status: "paid", amountCents: 5_000_000, currency: "USD" }, { jobExternalId: "J-2" }),
  record("JOB", "J-3", { status: "completed", contractValueCents: 4_000_000, contractValueIncludesApprovedChanges: true, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: false, currency: "USD", scopeChangeFlag: false, notes: "Customer requested additional work at the entry" }),
  record("INVOICE", "I-4", { status: "paid", amountCents: 4_000_000, currency: "USD" }, { jobExternalId: "J-3" }),
  record("JOB", "J-4", { status: "completed", contractValueCents: 3_000_000, contractValueIncludesApprovedChanges: true, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: false, currency: "USD", scopeChangeFlag: false, notes: "Extra care was taken during cleanup" }),
  record("INVOICE", "I-5", { status: "paid", amountCents: 3_000_000, currency: "USD" }, { jobExternalId: "J-4" }),
];

const reconciliation = buildRevenueRealizationRead(records);
const findings = runRevenueRealizationFindingEngine({ records, reconciliation, workspaceId: "workspace-a" });
const byType = Object.fromEntries(findings.map((finding) => [finding.type, finding])) as Partial<Record<RevenueRealizationFindingContract["type"], RevenueRealizationFindingContract>>;

assert.equal(byType.UNDERBILLING_GAP?.valueCents, 4_500_000);
assert.equal(byType.UNDERBILLING_GAP?.valueBasis, "CALCULATED");
assert.equal(byType.UNDERBILLING_GAP?.additiveToExecutiveGap, true);
assert.equal(byType.APPROVED_CHANGE_ORDER_NOT_BILLED?.valueCents, 1_500_000);
assert.equal(byType.APPROVED_CHANGE_ORDER_NOT_BILLED?.valueBasis, "OBSERVED");
assert.equal(byType.APPROVED_CHANGE_ORDER_NOT_BILLED?.additiveToExecutiveGap, false);
assert.equal(byType.MARGIN_AT_RISK?.valueCents, 1_800_000);
assert.equal(byType.MARGIN_AT_RISK?.calculationInputs.observedGrossProfitCents, 1_000_000);
assert.equal(byType.SUSPECTED_MISSING_CHANGE_ORDER?.valueCents, null);
assert.equal(byType.SUSPECTED_MISSING_CHANGE_ORDER?.valueBasis, "OPERATIONAL");
assert.equal(byType.SCOPE_CREEP_REVIEW_CANDIDATE?.confidence, "MEDIUM");
assert.ok(!findings.some((finding) => finding.jobExternalId === "J-4"), "generic extra wording must not trigger a candidate");
assert.ok(findings.every((finding) => finding.evidence.every((item) => item.provenance.fileName && item.provenance.rowNumber > 0)));

const summary = summarizeRevenueRealizationFindings(findings);
assert.equal(summary.calculatedUnderbillingCents, 4_500_000, "only the underbilling gap is additive");
assert.equal(summary.approvedChangeOrderReviewCents, 1_500_000);
assert.equal(summary.marginAtRiskCents, 1_800_000);
assert.equal(summary.currency, "USD");

const secondRun = runRevenueRealizationFindingEngine({ records, reconciliation, workspaceId: "workspace-a" });
assert.deepEqual(secondRun, findings, "unchanged evidence must produce stable deterministic findings");
const previousAiFlag = process.env.REVORY_LLM_ENABLED;
process.env.REVORY_LLM_ENABLED = "true";
assert.deepEqual(
  runRevenueRealizationFindingEngine({ records, reconciliation, workspaceId: "workspace-a" }),
  findings,
  "AI-on and AI-off output must be equivalent because core Tier 2 rules are deterministic",
);
process.env.REVORY_LLM_ENABLED = previousAiFlag;

const linkedInvoiceChange = records.map((item) => item.externalId === "CO-1"
  ? { ...item, relationExternalIds: { ...item.relationExternalIds, invoiceExternalId: "I-1" } }
  : item);
const linkedRead = buildRevenueRealizationRead(linkedInvoiceChange);
assert.ok(!runRevenueRealizationFindingEngine({ records: linkedInvoiceChange, reconciliation: linkedRead, workspaceId: "workspace-a" }).some((finding) => finding.type === "APPROVED_CHANGE_ORDER_NOT_BILLED"), "an explicitly matched invoice must suppress the unbilled change-order finding");

const duplicateJob = { ...records[0], sourceSystem: "conflicting-source", provenance: provenance("other-jobs.csv", 2) };
const ambiguousRecords = [...records, duplicateJob];
const ambiguousRead = buildRevenueRealizationRead(ambiguousRecords);
assert.ok(!runRevenueRealizationFindingEngine({ records: ambiguousRecords, reconciliation: ambiguousRead, workspaceId: "workspace-a" }).some((finding) => finding.jobExternalId === "J-1" && finding.category === "FINANCIAL"), "ambiguous job links must suppress financial findings");

const eurRecords = [
  record("JOB", "J-EUR", { status: "completed", contractValueCents: 2_000_000, contractValueIncludesApprovedChanges: true, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: false, currency: "EUR" }),
  record("INVOICE", "I-EUR", { status: "issued", amountCents: 1_000_000, currency: "EUR" }, { jobExternalId: "J-EUR" }),
];
const mixedRecords = [...records, ...eurRecords];
const mixedFindings = runRevenueRealizationFindingEngine({ records: mixedRecords, reconciliation: buildRevenueRealizationRead(mixedRecords), workspaceId: "workspace-a" });
const mixedSummary = summarizeRevenueRealizationFindings(mixedFindings);
assert.equal(mixedSummary.hasMixedCurrencies, true);
assert.equal(mixedSummary.calculatedUnderbillingCents, null, "incompatible currencies must never be summed");

assert.throws(
  () => runRevenueRealizationFindingEngine({ records: records.map((item, index) => index === 0 ? { ...item, workspaceId: "workspace-b" } : item), reconciliation, workspaceId: "workspace-a" }),
  /Cross-workspace/,
);

console.log("Sprint 9 Tier 2 findings, false-positive guards, AI-off equivalence, non-additive totals and tenant isolation: PASS");
