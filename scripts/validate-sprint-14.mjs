import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const landing = read("src/app/page.tsx");
const start = read("src/app/start/page.tsx");
const styles = read("src/app/globals.css");
const labels = read("domain/revory/display-labels.ts");
const importPanel = read("components/imports/CanonicalImportPanel.tsx");
const dataQuality = read("src/app/(app)/app/data-quality/page.tsx");
const realization = read("src/app/(app)/app/revenue-realization/page.tsx");
const history = read("src/app/(app)/app/history/page.tsx");
const settings = read("src/app/(app)/app/settings/page.tsx");
const importActions = read("src/app/(app)/app/imports/canonical-actions.ts");

assert.ok(
  styles.includes("overflow-x: clip") && styles.includes("overflow-y: visible"),
  "Landing must clip horizontal decoration without becoming a broken scroll container.",
);
assert.ok(
  landing.includes('href="/demo"') &&
    landing.includes("View sample demo") &&
    landing.includes("Synthetic") === false,
  "Homepage must expose an obvious buyer-friendly sample-data demo path.",
);
for (const copy of [
  "Guided CSV/XLSX import and column review",
  "Prioritized Quote Recovery opportunities",
  "Executive PDF and CSV exports",
  "New, persistent, worsening and resolved movement",
  "Entry condition: a completed Quote Recovery Audit.",
]) {
  assert.ok(landing.includes(copy), `Landing pricing explanation is missing: ${copy}`);
}
assert.ok(
  start.includes("Start with the Audit. Continue only when recurring reviews are useful.") &&
    start.includes("View future Growth, Pro and advanced Audit paths") &&
    start.includes("Not available for purchase yet."),
  "Start must keep one actionable Audit-to-Starter path and collapse future offers.",
);
assert.ok(
  labels.includes('amountcents: "Estimate amount"') &&
    labels.includes('nextfollowupat: "Next follow-up date"') &&
    labels.includes("formatBuyerFieldLabel"),
  "Buyer-facing field label dictionary is incomplete.",
);
assert.ok(
  importPanel.includes("formatBuyerFieldLabel(field)") &&
    dataQuality.includes("formatBuyerFieldLabel(issue.relationField)") &&
    realization.includes("formatEnumLabel(finding.findingType)"),
  "Readable field and status labels are not wired through customer review surfaces.",
);

for (const [source, forbidden] of [
  [realization, "local gated preview"],
  [realization, "Sprint 9 local product gate"],
  [realization, "Refresh deterministic findings"],
  [history, "internal preview"],
  [history, "committed state"],
  [settings, "Review Sprint 12 launch evidence"],
  [settings, "canonical imports"],
  [importActions, "could not profile these files safely"],
  [importActions, "committed snapshot should consume"],
]) {
  assert.ok(!source.includes(forbidden), `Internal product language remains customer-facing: ${forbidden}`);
}

assert.ok(
  landing.includes("Quote Recovery Audit") && landing.includes("Starter") &&
    !landing.includes("QuoteSignal") && !landing.includes("MedSpa"),
  "Public packaging must remain REVORY-only and Quote-Recovery-first.",
);

console.log("Sprint 14 buyer language, sample proof, commercial hierarchy and scroll-container guards: PASS");
