import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { CanonicalEntityType } from "../domain/revory/contracts";
import { summarizeQuoteRecoveryFinancialExposure } from "../domain/revory/quote-recovery-financial-summary";
import { buildSecureIntakePlan, type IntakeFile } from "../services/canonical-intake/secure-intake";
import { runQuoteRecoveryEngine } from "../services/quote-recovery/engine";

const fixtureRoot = path.join(
  process.cwd(),
  "docs",
  "testing",
  "manual-test-csvs",
  "revory-contractor-qa",
  "quote-recovery-baseline",
);
const sourceSystem = "revory-manual-qa-2026-07";

function fixture(
  fileName: string,
  entityType: CanonicalEntityType,
  mapping: Record<string, string>,
): IntakeFile {
  return {
    bytes: new Uint8Array(fs.readFileSync(path.join(fixtureRoot, fileName))),
    entityType,
    fileName,
    mapping,
    sourceSystem,
  };
}

const files = [
  fixture("01-customers.csv", "CUSTOMER", {
    externalId: "externalId",
    name: "name",
    email: "email",
    phone: "phone",
  }),
  fixture("02-leads.csv", "LEAD", {
    externalId: "externalId",
    customerExternalId: "customerExternalId",
    createdAt: "createdAt",
    status: "status",
    owner: "owner",
    source: "source",
  }),
  fixture("03-estimates.csv", "ESTIMATE", {
    externalId: "externalId",
    customerExternalId: "customerExternalId",
    leadExternalId: "leadExternalId",
    jobExternalId: "jobExternalId",
    status: "status",
    estimateAmount: "amountCents",
    createdAt: "createdAt",
    sentAt: "sentAt",
    closedAt: "closedAt",
    lostAt: "lostAt",
    lastActivityAt: "lastActivityAt",
    nextFollowUpAt: "nextFollowUpAt",
    owner: "owner",
    source: "source",
    serviceType: "serviceType",
    nextStep: "nextStep",
    currency: "currency",
  }),
  fixture("04-activities.csv", "ACTIVITY", {
    externalId: "externalId",
    customerExternalId: "customerExternalId",
    leadExternalId: "leadExternalId",
    estimateExternalId: "estimateExternalId",
    jobExternalId: "jobExternalId",
    occurredAt: "occurredAt",
    activityType: "activityType",
    outcome: "outcome",
    nextStep: "nextStep",
  }),
];

const plan = await buildSecureIntakePlan({
  defaultCurrency: "USD",
  files,
  workspaceId: "workspace-financial-summary",
});
assert.equal(plan.accepted, true, JSON.stringify(plan.issues));
assert.equal(plan.records.length, 21);
assert.deepEqual(plan.linkCoverage, { conflicting: 0, linked: 27, unmatched: 0 });

const findings = runQuoteRecoveryEngine({
  defaultCurrency: "USD",
  now: new Date("2026-07-14T12:00:00.000Z"),
  records: plan.records,
  workspaceId: "workspace-financial-summary",
});
assert.equal(findings.length, 11);

const naiveFindingTotal = findings.reduce(
  (total, finding) => total + (finding.valueBasis === "ESTIMATED" ? finding.valueCents ?? 0 : 0),
  0,
);
assert.equal(naiveFindingTotal, 15_490_000, "the acceptance kit must keep exposing the former double-count regression");

const summary = summarizeQuoteRecoveryFinancialExposure(findings, "USD");
assert.equal(summary.estimatedValueCents, 7_420_000, "each estimate exposure must be counted once");
assert.equal(summary.financialCount, 4, "the count must represent unique estimates with value, not financial rules");
assert.equal(summary.hasConflictingEstimateValues, false);
assert.equal(summary.hasMixedCurrencies, false);
assert.equal(summary.reportingCurrency, "USD");
assert.equal(summary.annotations.filter((annotation) => annotation.countedInEstimatedTotal).length, 4);
assert.equal(
  summary.annotations.reduce((total, annotation) => total + (annotation.estimatedTotalContributionCents ?? 0), 0),
  7_420_000,
);

const firstFinancial = findings.find((finding) => finding.valueBasis === "ESTIMATED");
assert.ok(firstFinancial);
const conflicting = summarizeQuoteRecoveryFinancialExposure([
  ...findings,
  { ...firstFinancial, fingerprint: "conflicting-value", valueCents: (firstFinancial.valueCents ?? 0) + 1 },
]);
assert.equal(conflicting.estimatedValueCents, null, "conflicting values for one estimate must suppress the aggregate");
assert.equal(conflicting.hasConflictingEstimateValues, true);

const mixed = summarizeQuoteRecoveryFinancialExposure([
  ...findings,
  { ...firstFinancial, currency: "EUR", estimateExternalId: "EST-QA-EUR", fingerprint: "mixed-currency" },
]);
assert.equal(mixed.estimatedValueCents, null, "incompatible currencies must not be summed");
assert.equal(mixed.hasMixedCurrencies, true);

assert.throws(
  () => runQuoteRecoveryEngine({
    records: plan.records.map((record, index) => index === 0 ? { ...record, workspaceId: "workspace-other" } : record),
    workspaceId: "workspace-financial-summary",
  }),
  /Cross-workspace/,
);

const exportRoute = fs.readFileSync("src/app/(app)/app/quote-recovery/export/route.ts", "utf8");
assert.match(exportRoute, /counted_in_estimated_total/);
assert.match(exportRoute, /estimated_total_contribution_cents/);

console.log("Quote Recovery unique estimate exposure, suppression, export annotations and tenant isolation: PASS");
