import assert from "node:assert/strict";
import fs from "node:fs";

import type { CanonicalRecordContract } from "../domain/revory/contracts";
import { buildCanonicalMappingReview } from "../services/canonical-intake/assisted-mapping";
import { buildSecureIntakePlan, type IntakeFile } from "../services/canonical-intake/secure-intake";
import { buildRevenueRealizationRead } from "../services/revenue-realization/reconciliation-engine";

const encoder = new TextEncoder();
const files: IntakeFile[] = [
  {
    bytes: encoder.encode("Project ID;Project Status;Contract Amount;Includes Approved Changes;Invoice Export Complete;Change Order Export Complete;Cost Export Complete;Currency;Completion Date\nJ-1;completed;100000;false;true;true;true;USD;2026-07-01"),
    entityType: "JOB" as const,
    fileName: "jobs.csv",
    mapping: {
      "Completion Date": "completedAt",
      "Contract Amount": "contractValueCents",
      Currency: "currency",
      "Includes Approved Changes": "contractValueIncludesApprovedChanges",
      "Invoice Export Complete": "invoiceExportComplete",
      "Change Order Export Complete": "changeOrderExportComplete",
      "Cost Export Complete": "costExportComplete",
      "Project ID": "externalId",
      "Project Status": "status",
    },
    sourceSystem: "fixture",
  },
  {
    bytes: encoder.encode("Invoice Number,Project ID,Billing Status,Invoice Total,Currency,Invoice Date\nI-1,J-1,issued,40000,USD,2026-06-01\nI-2,J-1,paid,30000,USD,2026-06-15"),
    entityType: "INVOICE" as const,
    fileName: "invoices.csv",
    mapping: { "Billing Status": "status", Currency: "currency", "Invoice Date": "issuedAt", "Invoice Number": "externalId", "Invoice Total": "amountCents", "Project ID": "jobExternalId" },
    sourceSystem: "fixture",
  },
  {
    bytes: encoder.encode("CO ID,Project ID,Approval Status,Approved Value,Currency,Approval Date\nCO-1,J-1,approved,15000,USD,2026-05-15"),
    entityType: "CHANGE_ORDER" as const,
    fileName: "changes.csv",
    mapping: { "Approval Date": "approvedAt", "Approval Status": "status", "Approved Value": "approvedAmountCents", "CO ID": "externalId", Currency: "currency", "Project ID": "jobExternalId" },
    sourceSystem: "fixture",
  },
  {
    bytes: encoder.encode("Expense ID,Project ID,Actual Cost,Currency,Expense Date,Expense Category\nC-1,J-1,20000,USD,2026-06-10,materials"),
    entityType: "COST" as const,
    fileName: "costs.csv",
    mapping: { "Actual Cost": "amountCents", Currency: "currency", "Expense Category": "category", "Expense Date": "incurredAt", "Expense ID": "externalId", "Project ID": "jobExternalId" },
    sourceSystem: "fixture",
  },
];

for (const file of files) {
  const review = await buildCanonicalMappingReview(file);
  assert.equal(review.acceptedForReview, true, `${file.entityType} alternate headers should be reviewable`);
  assert.equal(review.entityType, file.entityType);
}

for (const [entityType, templateName] of [
  ["JOB", "revory-jobs.csv"],
  ["INVOICE", "revory-invoices.csv"],
  ["CHANGE_ORDER", "revory-change-orders.csv"],
  ["COST", "revory-costs.csv"],
] as const) {
  const review = await buildCanonicalMappingReview({
    bytes: new Uint8Array(fs.readFileSync(`public/templates/${templateName}`)),
    entityType,
    fileName: templateName,
  });
  assert.equal(review.acceptedForReview, true, `${templateName} must remain directly importable`);
}

const plan = await buildSecureIntakePlan({ files, workspaceId: "workspace-a" });
assert.equal(plan.accepted, true);
assert.equal(plan.records.length, 5);
assert.equal(plan.eligibility.JOB_BILLING_RECONCILIATION.eligible, true);
assert.equal(plan.eligibility.APPROVED_CHANGE_ORDER_BASIS.eligible, true);
assert.equal(plan.eligibility.COST_REVENUE_BASIS.eligible, true);
const rerun = await buildSecureIntakePlan({ files, workspaceId: "workspace-a" });
assert.equal(rerun.idempotencyKey, plan.idempotencyKey);

const read = buildRevenueRealizationRead(plan.records);
assert.equal(read.summary.eligibleJobs, 1);
assert.equal(read.summary.conflictLinks, 0);
const row = read.reconciliations[0];
assert.equal(row.expectedBillingCents, 11_500_000);
assert.equal(row.invoicedCents, 7_000_000);
assert.equal(row.calculatedGapCents, 4_500_000);
assert.equal(row.observedCostCents, 2_000_000);
assert.equal(row.billedLessObservedCostCents, 5_000_000);
assert.equal(row.valueBasis, "CALCULATED");
assert.equal(row.invoiceIds.length, 2, "one-to-many invoices must aggregate deterministically");
assert.ok(row.inputEvidence.every((input) => input.provenance.fileName && input.provenance.rowNumber > 1));
assert.deepEqual(buildRevenueRealizationRead(plan.records), read, "unchanged reruns must not drift");

const jobOnly = plan.records.filter((record) => record.entityType === "JOB");
const partialRead = buildRevenueRealizationRead(jobOnly);
assert.equal(partialRead.reconciliations[0].state, "ELIGIBLE");
assert.equal(partialRead.reconciliations[0].invoicedCents, 0, "explicitly complete empty invoice export is a supported zero");

const conflictingJob: CanonicalRecordContract = {
  ...jobOnly[0],
  provenance: { ...jobOnly[0].provenance, fileName: "other-jobs.csv" },
  sourceSystem: "other-source",
};
const invoice = plan.records.find((record) => record.entityType === "INVOICE");
assert.ok(invoice);
const conflictRead = buildRevenueRealizationRead([jobOnly[0], conflictingJob, invoice]);
assert.ok(conflictRead.matches.some((match) => match.state === "CONFLICT"));
assert.ok(conflictRead.reconciliations.every((candidate) => candidate.state === "SUPPRESSED"));

const currencyConflict = plan.records.map((record) =>
  record.entityType === "INVOICE" ? { ...record, payload: { ...record.payload, currency: "EUR" } } : record,
);
assert.equal(buildRevenueRealizationRead(currencyConflict).reconciliations[0].state, "SUPPRESSED");

const unmatchedInvoice: CanonicalRecordContract = {
  ...invoice,
  externalId: "I-UNMATCHED",
  payload: { ...invoice.payload, externalId: "I-UNMATCHED", jobExternalId: "J-MISSING" },
  relationExternalIds: { ...invoice.relationExternalIds, jobExternalId: "J-MISSING" },
};
const unmatchedRead = buildRevenueRealizationRead([jobOnly[0], unmatchedInvoice]);
assert.ok(unmatchedRead.matches.some((match) => match.state === "UNMATCHED"));
assert.equal(unmatchedRead.reconciliations[0].state, "ELIGIBLE", "an unrelated unmatched invoice does not invalidate an explicitly complete job invoice snapshot");

assert.throws(
  () => buildRevenueRealizationRead([jobOnly[0], { ...invoice, workspaceId: "workspace-b" }]),
  /exactly one authorized workspace/,
);

console.log("Sprints 7-8 Revenue Realization ingestion, explicit matching, reconciliation, ambiguity suppression and isolation: PASS");
