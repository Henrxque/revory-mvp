import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CanonicalEntityType } from "@/domain/revory/contracts";
import { detectSourceSystem } from "@/domain/revory/source-systems";
import { buildCanonicalMappingReview } from "@/services/canonical-intake/assisted-mapping";
import { buildSecureIntakePlan, type IntakeFile } from "@/services/canonical-intake/secure-intake";
import { runQuoteRecoveryEngine } from "@/services/quote-recovery/engine";

const root = path.join(process.cwd(), "test-data", "vendor-simulations");
const vendors = [
  ["manual-export", "manual", null],
  ["buildertrend", "buildertrend", "buildertrend"],
  ["jobber", "jobber", "jobber"],
  ["servicetitan", "servicetitan", "servicetitan"],
  ["housecall-pro", "housecall-pro", "housecall-pro"],
  ["jobtread", "jobtread", "jobtread"],
  ["acculynx", "acculynx", "acculynx"],
  ["procore", "procore", "procore"],
  ["quickbooks", "quickbooks", "quickbooks"],
  ["other-system-export", "other-system", null],
] as const;

async function intakeFile(folder: string, token: string, name: string, entityType: CanonicalEntityType) {
  const fileName = `${token}-${name}.csv`;
  const bytes = new Uint8Array(await readFile(path.join(root, folder, fileName)));
  const review = await buildCanonicalMappingReview({ bytes, entityType, fileName });
  assert(review.acceptedForReview, `${folder}/${fileName} should be reviewable: ${review.issues.join("; ")}`);
  return { bytes, entityType, fileName, mapping: review.mapping, mimeType: "text/csv", review };
}

for (const [folder, token, expectedSource] of vendors) {
  const customers = await intakeFile(folder, token, "customers", "CUSTOMER");
  const estimates = await intakeFile(folder, token, "estimates", "ESTIMATE");
  const activities = await intakeFile(folder, token, "activities", "ACTIVITY");
  const detected = detectSourceSystem([customers.review, estimates.review, activities.review]);
  assert.equal(detected.sourceSystem, expectedSource, `${folder} source suggestion mismatch`);
  const sourceSystem = expectedSource ?? folder;
  const files: IntakeFile[] = [customers, estimates, activities].map((file) => ({
    bytes: file.bytes,
    entityType: file.entityType,
    fileName: file.fileName,
    mapping: file.mapping,
    mimeType: file.mimeType,
    sourceSystem,
  }));
  const defaultCurrency = folder === "manual-export" || folder === "other-system-export" ? "CAD" : "USD";
  const plan = await buildSecureIntakePlan({ workspaceId: `qa-${folder}`, files, defaultCurrency });
  assert(plan.accepted, `${folder} intake should pass: ${plan.issues.map((issue) => issue.message).join("; ")}`);
  const estimateCurrencies = new Set(plan.records.filter((record) => record.entityType === "ESTIMATE").map((record) => record.payload.currency));
  assert.deepEqual([...estimateCurrencies], [defaultCurrency], `${folder} should use the expected currency`);
  const findings = runQuoteRecoveryEngine({ workspaceId: `qa-${folder}`, records: plan.records, now: new Date("2026-07-14T12:00:00Z"), defaultCurrency });
  assert(findings.length >= 8, `${folder} should produce a meaningful Quote Recovery read`);
}

const manualCustomers = await intakeFile("manual-export", "manual", "customers", "CUSTOMER");
const manualEstimates = await intakeFile("manual-export", "manual", "estimates", "ESTIMATE");
const manualActivities = await intakeFile("manual-export", "manual", "activities", "ACTIVITY");
const manualFiles: IntakeFile[] = [manualCustomers, manualEstimates, manualActivities].map((file) => ({
  bytes: file.bytes,
  entityType: file.entityType,
  fileName: file.fileName,
  mapping: file.mapping,
  mimeType: file.mimeType,
  sourceSystem: "manual-export",
}));
const usdPlan = await buildSecureIntakePlan({ workspaceId: "qa-currency", files: manualFiles, defaultCurrency: "USD" });
const cadPlan = await buildSecureIntakePlan({ workspaceId: "qa-currency", files: manualFiles, defaultCurrency: "CAD" });
assert.notEqual(usdPlan.idempotencyKey, cadPlan.idempotencyKey, "Currency changes must create a distinct semantic snapshot");

console.log(JSON.stringify({ checkedSources: vendors.length, status: "ok" }));
