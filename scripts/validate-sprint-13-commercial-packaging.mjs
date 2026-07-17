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
  page.includes("Make Growth your recurring revenue-leak management rhythm."),
  "The Growth-first recurring commercial path is missing.",
);
assert.ok(
  page.indexOf("const growthPlan") < page.indexOf("const futureOffers"),
  "The recurring Growth plan must be defined before future offers.",
);
assert.ok(
  page.includes('label: "Growth"') &&
    page.includes('price: "US$799"') &&
    page.includes('priceNote: "per month"') &&
    page.includes("featured: true"),
  "The US$799/month Growth plan must be the highlighted recurring offer.",
);
assert.ok(
  page.includes('label: "Starter"') &&
    page.includes('price: "US$399"') &&
    page.includes('priceNote: "per month"') &&
    page.includes("Available after your first Quote Recovery Audit is complete."),
  "Starter must be the US$399 monthly continuation after the Audit.",
);
assert.ok(
  page.includes("Complete the US$799 Audit first") &&
    page.includes("Starter requires the completed one-time Audit"),
  "The Starter prerequisite must be visible and unambiguous.",
);
assert.ok(
  page.includes("View one-time Audit and advanced Pro options") &&
    page.includes("Not available for purchase yet."),
  "One-time and gated advanced offers must remain secondary.",
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
assert.match(offers, /GROWTH:\s*\{ commerciallyAvailable: true,[\s\S]*?priceEnv: "STRIPE_REVORY_GROWTH_MONTHLY_PRICE_ID" \}/);
assert.ok(!offers.includes('priceEnv: "STRIPE_GROWTH_PRICE_ID"'), "Legacy Growth price key must not be reused.");
assert.match(offers, /PRO:\s*\{ commerciallyAvailable: false,[\s\S]*?priceEnv: null \}/);
assert.ok(
  page.includes("rev-checkout-page") && page.includes("rev-checkout-card-primary"),
  "The premium billing visual contract must be preserved.",
);
assert.ok(
  landing.includes("View sample demo") && landing.includes("Start with Growth") &&
    landing.includes("Guided CSV/XLSX import and column review") &&
    landing.includes("Entry condition: a completed Quote Recovery Audit."),
  "The landing must offer a sample-data proof path and explain both commercial offers.",
);
assert.ok(
  !page.includes("Everything in the audit flow") && !page.includes("QuoteSignal") && !page.includes("MedSpa"),
  "Misleading or historical public packaging language remains.",
);
assert.ok(
  sourceOfTruth.includes("not a three-tier price ladder") && sourceOfTruth.includes("Growth at US$799/month is the recommended recurring REVORY plan") &&
    sprint.includes("One-time audits") && sprint.includes("Recurring subscriptions"),
  "Living product truth must retain the Audit/subscription distinction.",
);

console.log("Commercial cadence plus Growth-first recurring presentation: PASS");
