import assert from "node:assert/strict";
import fs from "node:fs";
import { currentPublicOfferJourney, revoryCommercialOfferContracts } from "../domain/revory/commercial-offers.ts";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/start/page.tsx");
const landing = read("src/app/page.tsx");
const checkout = read("src/app/api/billing/checkout/route.ts");
const offers = read("services/billing/revory-offers.ts");
const source = read("docs/source-of-truth.md");

assert.deepEqual(currentPublicOfferJourney, ["QUOTE_RECOVERY_AUDIT", "STARTER", "GROWTH"], "Audit must be the first recommended visual decision.");
assert.deepEqual(
  currentPublicOfferJourney.map((key) => [key, revoryCommercialOfferContracts[key].amountCents, revoryCommercialOfferContracts[key].mode]),
  [["QUOTE_RECOVERY_AUDIT", 39900, "payment"], ["STARTER", 39900, "subscription"], ["GROWTH", 59900, "subscription"]],
  "Current catalog price and cadence contracts are wrong.",
);
assert.ok(page.includes("currentPublicOfferJourney") && page.includes("data-offer-key") && page.includes("data-cadence") && page.includes("data-recommended"), "Public packaging must render from stable semantic offer metadata.");
assert.ok(!checkout.includes("hasCompletedQuoteRecoveryBaseline") && !checkout.includes("baseline-required"), "Audit must not be a technical checkout prerequisite.");
assert.ok(offers.includes("revoryCommercialOfferContracts"), "Server billing must consume the canonical commercial contract.");
assert.equal(revoryCommercialOfferContracts.PRO.commerciallyAvailable, false);
assert.equal(revoryCommercialOfferContracts.FULL_REVENUE_LEAK_AUDIT.publiclyListed, false);
assert.ok(landing.includes("Get your Quote Recovery Audit — $399 once") && landing.includes("View the sample audit") && landing.includes("No sales call. No CRM migration. No subscription required."), "Landing CTA hierarchy is incomplete.");
assert.ok(source.includes("Superseding commercial decision — 2026-07-30"), "Superseding commercial decision is missing.");
console.log("Current Audit-first commercial packaging: PASS");
