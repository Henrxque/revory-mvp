import assert from "node:assert/strict";
import fs from "node:fs";

import {
  allImportDatasets,
  quoteRecoveryQuickStartDatasets,
  revenueRealizationAdvancedDatasets,
} from "../components/imports/import-dataset-catalog";

const panel = fs.readFileSync("components/imports/CanonicalImportPanel.tsx", "utf8");

assert.deepEqual(
  quoteRecoveryQuickStartDatasets.map(({ entityType, requirement }) => [entityType, requirement]),
  [["ESTIMATE", "required"], ["ACTIVITY", "recommended"], ["CUSTOMER", "optional"], ["LEAD", "optional"]],
  "Quick Start datasets must preserve the buyer-first order and honest requirement labels.",
);
assert.deepEqual(
  revenueRealizationAdvancedDatasets.map(({ entityType }) => entityType),
  ["JOB", "INVOICE", "CHANGE_ORDER", "COST"],
  "Advanced reconciliation datasets must remain available behind progressive disclosure.",
);
assert.equal(new Set(allImportDatasets.map(({ entityType }) => entityType)).size, 8, "All canonical datasets must remain uniquely available.");
assert.ok(panel.includes('data-testid="quote-recovery-quick-start"'));
assert.ok(panel.includes('data-testid="revenue-realization-advanced"'));
assert.ok(!/<details[^>]*data-testid="revenue-realization-advanced"[^>]*\sopen(?:=|\s|>)/.test(panel), "Advanced imports must be collapsed by default.");
assert.ok(panel.includes('accept=".csv,.xlsx"'), "CSV and XLSX support must remain visible.");
assert.ok(panel.includes("setMappingConfirmed(false)") && panel.includes("setSnapshotConfirmed(false)"), "File changes must invalidate previous mapping and snapshot approval.");
assert.ok(panel.includes("auditConsumptionConfirmed") && panel.includes("mappingConfirmed") && panel.includes("FULL_REPLACEMENT"), "Audit confirmation, explicit mapping and snapshot protections must remain intact.");
assert.ok(panel.includes("never invents underbilling or margin") && panel.includes("Estimates alone can create a first read"), "Quick Start must explain estimates-only limits and advanced financial honesty.");

console.log("Quote Recovery Quick Start progressive disclosure and intake safeguards: PASS");
