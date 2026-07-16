import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const page = read("src/app/start/page.tsx");
const landing = read("src/app/page.tsx");
const checkout = read("src/app/api/billing/checkout/route.ts");
const readiness = read("services/billing/commercial-readiness.ts");
const offers = read("services/billing/revory-offers.ts");
const sourceOfTruth = read("docs/source-of-truth.md");
const sprint = read("docs/sprints/SPRINT_13_COMMERCIAL_PACKAGING_AND_PRICING_CLARITY.md");

assert.ok(
  page.includes("Start with the Audit. Continue only when recurring reviews are useful."),
  "The Audit-to-Starter commercial path is missing.",
);
assert.ok(
  page.indexOf("const quoteRecoveryAudit") < page.indexOf("const futureOffers"),
  "The first Quote Recovery baseline must be defined before future offers.",
);
assert.ok(
  page.includes('label: "Quote Recovery Audit"') &&
    page.includes('price: "$799"') &&
    page.includes('priceNote: "paid once"') &&
    page.includes("featured: true"),
  "The one-time US$799 Audit must remain the highlighted first offer.",
);
assert.ok(
  page.includes('label: "Starter"') &&
    page.includes('price: "$399"') &&
    page.includes('priceNote: "per month"') &&
    page.includes("Available after your first Quote Recovery Audit is complete."),
  "Starter must be the US$399 monthly continuation after the Audit.",
);
assert.ok(
  page.includes("Complete the $799 Audit first") &&
    page.includes("Starter never replaces it"),
  "The Starter prerequisite must be visible and unambiguous.",
);
assert.ok(
  page.includes("View future Growth, Pro and advanced Audit paths") &&
    page.includes("Not available for purchase yet."),
  "Future offers must remain collapsed and non-purchasable.",
);

for (const annualPrice of ["$3,990", "$7,990", "$14,990"]) {
  assert.ok(!page.includes(annualPrice), `Unimplemented annual price leaked into the UI: ${annualPrice}.`);
}
assert.ok(!page.includes("billingInterval"), "No unimplemented annual billing control may appear.");

assert.match(
  checkout,
  /offerKey === "STARTER" && !\(await hasCompletedQuoteRecoveryBaseline\(workspace\.id\)\)/,
  "The checkout route must enforce the Starter baseline prerequisite server-side.",
);
assert.ok(
  readiness.includes('offerKey: "QUOTE_RECOVERY_AUDIT"') && readiness.includes('status: "COMPLETED"'),
  "Commercial readiness must require a completed Audit read.",
);
assert.match(offers, /GROWTH:\s*\{ commerciallyAvailable: false,[\s\S]*?priceEnv: null \}/);
assert.match(offers, /PRO:\s*\{ commerciallyAvailable: false,[\s\S]*?priceEnv: null \}/);
assert.ok(
  page.includes("rev-checkout-page") && page.includes("rev-checkout-card-primary"),
  "The premium billing visual contract must be preserved.",
);
assert.ok(
  landing.includes("View demo with sample data") &&
    landing.includes("Guided CSV/XLSX import and column review") &&
    landing.includes("Entry condition: a completed Quote Recovery Audit."),
  "The landing must offer a sample-data proof path and explain both commercial offers.",
);
assert.ok(
  !page.includes("Everything in the audit flow") && !page.includes("QuoteSignal") && !page.includes("MedSpa"),
  "Misleading or historical public packaging language remains.",
);
assert.ok(
  sourceOfTruth.includes("not a three-tier price ladder") &&
    sprint.includes("One-time audits") && sprint.includes("Recurring subscriptions"),
  "Living product truth must retain the Audit/subscription distinction.",
);

console.log("Sprint 13 commercial cadence plus Sprint 14 Audit-to-Starter presentation: PASS");
