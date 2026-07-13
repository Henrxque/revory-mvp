import assert from "node:assert/strict";
import fs from "node:fs";

import type { CanonicalRecordContract } from "../domain/revory/contracts";
import { runRevenueRealizationFindingEngine } from "../services/revenue-realization/finding-engine";
import { buildRevenueRealizationRead } from "../services/revenue-realization/reconciliation-engine";
import { buildSecureIntakePlan, type IntakeFile } from "../services/canonical-intake/secure-intake";

const provenance = { fileName: "fixture.csv", importedAt: "2026-07-13T12:00:00.000Z", rowNumber: 2, sourceHeaders: [] };
function record(entityType: CanonicalRecordContract["entityType"], externalId: string, payload: CanonicalRecordContract["payload"], relations: Record<string, string> = {}, sourceSystem = "fixture"): CanonicalRecordContract {
  return { workspaceId: "workspace-a", entityType, sourceSystem, externalId, relationExternalIds: relations, provenance, payload: { externalId, ...payload }, occurredAt: null };
}
const completeJob = (extra: CanonicalRecordContract["payload"] = {}) => ({ status: "completed", contractValueCents: 1_000_000, contractValueIncludesApprovedChanges: true, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: true, currency: "USD", ...extra });

const incomplete = [
  record("JOB", "J-A", { status: "completed", contractValueCents: 1_000_000, contractValueIncludesApprovedChanges: true, currency: "USD" }),
  record("JOB", "J-B", completeJob()),
  record("INVOICE", "I-B", { status: "paid", amountCents: 1_000_000, currency: "USD" }, { jobExternalId: "J-B" }),
];
const incompleteRead = buildRevenueRealizationRead(incomplete, new Date("2026-07-13T13:00:00Z"));
assert.equal(incompleteRead.reconciliations.find((row) => row.jobExternalId === "J-A")?.state, "SUPPRESSED", "another job's invoice must not establish completeness");

const invalidBooleanFile: IntakeFile = {
  bytes: new TextEncoder().encode("id,status,value,includes,invoices,changes,costs,currency\nJ-1,completed,10000,maybe,true,true,true,USD"),
  entityType: "JOB",
  fileName: "invalid-boolean.csv",
  sourceSystem: "system-a",
  mapping: { id: "externalId", status: "status", value: "contractValueCents", includes: "contractValueIncludesApprovedChanges", invoices: "invoiceExportComplete", changes: "changeOrderExportComplete", costs: "costExportComplete", currency: "currency" },
};
const invalidBooleanPlan = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [invalidBooleanFile] });
assert.equal(invalidBooleanPlan.accepted, false);
assert.ok(invalidBooleanPlan.issues.some((issue) => issue.code === "INVALID_VALUE"));

const sourceA = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [{ ...invalidBooleanFile, bytes: new TextEncoder().encode("id,status\nJ-1,completed"), mapping: { id: "externalId", status: "status" }, sourceSystem: "system-a" }] });
const sourceB = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [{ ...invalidBooleanFile, bytes: new TextEncoder().encode("id,status\nJ-1,completed"), mapping: { status: "status", id: "externalId" }, sourceSystem: "system-b" }] });
assert.notEqual(sourceA.idempotencyKey, sourceB.idempotencyKey, "source system is part of semantic idempotency");

const duplicatePlan = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: [
  { ...invalidBooleanFile, bytes: new TextEncoder().encode("id,status\nJ-1,completed"), mapping: { id: "externalId", status: "status" }, sourceSystem: "system-a", fileName: "jobs-a.csv" },
  { ...invalidBooleanFile, bytes: new TextEncoder().encode("id,status\nJ-1,completed"), mapping: { id: "externalId", status: "status" }, sourceSystem: "system-b", fileName: "jobs-b.csv" },
] });
assert.equal(duplicatePlan.accepted, false, "same entity external ID across sources must conflict");

const mixedCosts = [
  record("JOB", "J-COST", completeJob({ targetGrossMarginBps: 4000 })),
  record("INVOICE", "I-COST", { status: "paid", amountCents: 1_000_000, currency: "USD" }, { jobExternalId: "J-COST" }),
  record("COST", "C-USD", { amountCents: 700_000, currency: "USD" }, { jobExternalId: "J-COST" }),
  record("COST", "C-EUR", { amountCents: 100_000, currency: "EUR" }, { jobExternalId: "J-COST" }),
];
const mixedCostRead = buildRevenueRealizationRead(mixedCosts, new Date("2026-07-13T13:00:00Z"));
assert.equal(mixedCostRead.reconciliations[0].marginEligible, false);
assert.ok(mixedCostRead.reconciliations[0].marginIssues.some((issue) => issue.includes("currency")));
assert.ok(!runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: mixedCosts, reconciliation: mixedCostRead }).some((finding) => finding.type === "MARGIN_AT_RISK"));

const invalidInvoiceLink = [
  record("JOB", "J-CO", completeJob()),
  record("JOB", "J-OTHER", completeJob()),
  record("INVOICE", "I-VOID", { status: "void", amountCents: 500_000, currency: "USD" }, { jobExternalId: "J-OTHER" }),
  record("CHANGE_ORDER", "CO-1", { status: "approved", billingStatus: "unbilled", approvedAmountCents: 250_000, approvedAt: "2026-07-01T00:00:00Z", currency: "USD" }, { jobExternalId: "J-CO", invoiceExternalId: "I-VOID" }),
];
const invalidLinkRead = buildRevenueRealizationRead(invalidInvoiceLink, new Date("2026-07-13T13:00:00Z"));
assert.ok(runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: invalidInvoiceLink, reconciliation: invalidLinkRead }).some((finding) => finding.type === "APPROVED_CHANGE_ORDER_NOT_BILLED"), "void invoice from another job must not suppress review");

const zeroInvoiceLink = [
  record("JOB", "J-ZERO", completeJob()),
  record("INVOICE", "I-ZERO", { status: "paid", amountCents: 0, currency: "USD" }, { jobExternalId: "J-ZERO" }),
  record("CHANGE_ORDER", "CO-ZERO", { status: "approved", billingStatus: "unbilled", approvedAmountCents: 200_000, approvedAt: "2026-07-01T00:00:00Z", currency: "USD" }, { jobExternalId: "J-ZERO", invoiceExternalId: "I-ZERO" }),
];
const zeroInvoiceRead = buildRevenueRealizationRead(zeroInvoiceLink, new Date("2026-07-13T13:00:00Z"));
assert.ok(runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: zeroInvoiceLink, reconciliation: zeroInvoiceRead }).some((finding) => finding.type === "APPROVED_CHANGE_ORDER_NOT_BILLED"), "a zero-value invoice must not hide an explicitly unbilled approved change order");

const changedRecords = invalidInvoiceLink.map((item) => item.externalId === "J-CO" ? { ...item, payload: { ...item.payload, contractValueCents: 2_000_000 } } : item);
assert.throws(() => runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: changedRecords, reconciliation: invalidLinkRead }), /do not match/);
const tamperedRead = structuredClone(invalidLinkRead);
tamperedRead.reconciliations[0].calculatedGapCents = 9_000_000;
assert.throws(() => runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: invalidInvoiceLink, reconciliation: tamperedRead }), /integrity/, "reconciliation values cannot drift away from their signed deterministic state");

const evidenceBoundary = [
  record("JOB", "J-EVIDENCE", completeJob()),
  record("INVOICE", "I-ELIGIBLE", { status: "paid", amountCents: 500_000, currency: "USD" }, { jobExternalId: "J-EVIDENCE" }),
  record("INVOICE", "I-DRAFT", { status: "draft", amountCents: 300_000, currency: "USD" }, { jobExternalId: "J-EVIDENCE" }),
  record("CHANGE_ORDER", "CO-NONCONTRIB", { status: "approved", billingStatus: "billed", approvedAmountCents: 200_000, approvedAt: "2026-07-01T00:00:00Z", currency: "USD" }, { jobExternalId: "J-EVIDENCE" }),
];
const evidenceRead = buildRevenueRealizationRead(evidenceBoundary, new Date("2026-07-13T13:00:00Z"));
const evidenceFinding = runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: evidenceBoundary, reconciliation: evidenceRead }).find((finding) => finding.type === "UNDERBILLING_GAP");
assert.ok(evidenceFinding);
assert.ok(evidenceFinding.evidence.some((item) => item.field === "invoiceExportComplete" && item.value === true));
assert.ok(!evidenceFinding.evidence.some((item) => item.externalId === "I-DRAFT"), "excluded invoices must not appear as if they contributed to the calculation");
assert.ok(!evidenceFinding.evidence.some((item) => item.externalId === "CO-NONCONTRIB"), "approved changes already included in contract value must not appear as gap contributors");
assert.equal(evidenceFinding.calculationInputs.approvedChangeOrderCents, undefined);

const negatedScope = [
  record("JOB", "J-NO", completeJob({ scopeChangeFlag: false, notes: "Customer requested the final receipt. No scope change occurred." })),
];
const negatedRead = buildRevenueRealizationRead(negatedScope, new Date("2026-07-13T13:00:00Z"));
assert.ok(!runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: negatedScope, reconciliation: negatedRead }).some((finding) => finding.type === "SCOPE_CREEP_REVIEW_CANDIDATE"));

for (const [jobId, notes, expected] of [
  ["J-ADDRESS", "Customer requested change of billing address.", false],
  ["J-WARRANTY", "Warranty replacement is out of scope for this agreement.", false],
  ["J-SKYLIGHT", "Customer requested a change to add a skylight.", true],
  ["J-NO-CREEP", "No scope creep was found.", false],
  ["J-NO-ADDED", "There was no added scope.", false],
  ["J-DECLINED", "Customer declined added scope.", false],
  ["J-NOT-PERFORMED", "Potential additional work was not performed.", false],
] as const) {
  const scopeRecords = [record("JOB", jobId, completeJob({ notes, scopeChangeFlag: false }))];
  const scopeRead = buildRevenueRealizationRead(scopeRecords, new Date("2026-07-13T13:00:00Z"));
  assert.equal(runRevenueRealizationFindingEngine({ workspaceId: "workspace-a", records: scopeRecords, reconciliation: scopeRead }).some((finding) => finding.type === "SCOPE_CREEP_REVIEW_CANDIDATE"), expected, notes);
}

const future = [record("JOB", "J-FUTURE", completeJob({ completedAt: "2099-01-01T00:00:00Z" }))];
assert.equal(buildRevenueRealizationRead(future, new Date("2026-07-13T13:00:00Z")).reconciliations[0].state, "SUPPRESSED");

const persistence = fs.readFileSync("services/canonical-intake/persist-intake.ts", "utf8");
assert.match(persistence, /isActive: false/);
assert.match(persistence, /supersededAt/);
assert.match(persistence, /snapshotMode: "FULL_REPLACEMENT"/);
const importPanel = fs.readFileSync("components/imports/CanonicalImportPanel.tsx", "utf8");
assert.match(importPanel, /snapshot-confirmation/);
assert.match(importPanel, /Omitted records will leave the active read/);
const sync = fs.readFileSync("services/revenue-realization/sync-findings.ts", "utf8");
assert.match(sync, /existing\?\.status === "DISMISSED"/);
assert.doesNotMatch(sync, /existing\?\.status === "RESOLVED" \|\| existing\?\.status === "DISMISSED"/);

console.log("Sprint 12.1 adversarial completeness, identity, currency, lifecycle, temporal and state-integrity corpus: PASS");
