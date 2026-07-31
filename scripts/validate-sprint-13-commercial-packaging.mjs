import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/start/page.tsx");
const landing = read("src/app/page.tsx");
const checkout = read("src/app/api/billing/checkout/route.ts");
const offers = read("services/billing/revory-offers.ts");
const source = read("docs/source-of-truth.md");

assert.ok(page.includes("One focused Audit. No subscription.") && page.indexOf("offer={quoteRecoveryAudit}") < page.indexOf("[starterPlan, growthPlan]"), "Audit must be the first visual decision.");
for (const contract of ['price: `US$${getRevoryOffer("QUOTE_RECOVERY_AUDIT").priceUsd}`', 'price: `US$${getRevoryOffer("STARTER").priceUsd}`', 'price: `US$${getRevoryOffer("GROWTH").priceUsd}`']) assert.ok(page.includes(contract), `Missing catalog-driven contract: ${contract}`);
assert.ok(page.includes("[starterPlan, growthPlan]") && !page.includes("[growthPlan, starterPlan, proPlan]") && !page.includes("fullRevenueLeakAudit"), "Only Audit, Starter and Growth may be listed publicly.");
assert.ok(!checkout.includes("hasCompletedQuoteRecoveryBaseline") && !checkout.includes("baseline-required"), "Audit must not be a technical checkout prerequisite.");
assert.ok(offers.includes("amountCents: 39900") && offers.includes("amountCents: 59900") && offers.includes('PRO: { amountCents: 149900, commerciallyAvailable: false') && offers.includes('FULL_REVENUE_LEAK_AUDIT: { amountCents: 149900, commerciallyAvailable: false'), "Canonical catalog values or legacy commercial gates are wrong.");
assert.ok(landing.includes("Get your Quote Recovery Audit — $399 once") && landing.includes("View the sample audit") && landing.includes("No sales call. No CRM migration. No subscription required."), "Landing CTA hierarchy is incomplete.");
assert.ok(source.includes("Superseding commercial decision — 2026-07-30"), "Superseding commercial decision is missing.");
console.log("Current Audit-first commercial packaging: PASS");
