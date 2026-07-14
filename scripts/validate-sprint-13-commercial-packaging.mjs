import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const page = read("src/app/start/page.tsx");
const checkout = read("src/app/api/billing/checkout/route.ts");
const readiness = read("services/billing/commercial-readiness.ts");
const offers = read("services/billing/revory-offers.ts");
const sourceOfTruth = read("docs/source-of-truth.md");
const sprint = read("docs/sprints/SPRINT_13_COMMERCIAL_PACKAGING_AND_PRICING_CLARITY.md");
const ongoingBlock = page.slice(page.indexOf("const ongoingPlans"), page.indexOf("const audits"));
const auditBlock = page.slice(page.indexOf("const audits"), page.indexOf("function CheckIcon"));

assert.ok(
  page.includes("Choose how often you want REVORY working for you."),
  "Sprint 13 headline is missing.",
);
assert.ok(
  page.indexOf("Ongoing plans") < page.indexOf("Start with an Audit"),
  "Ongoing plans must be the first visual group.",
);
assert.ok(
  page.includes("Every ongoing plan starts with the matching one-time Audit"),
  "The baseline requirement must be explicit above subscription cards.",
);

for (const plan of [
  ['label: "Starter"', 'price: "$399"'],
  ['label: "Growth"', 'price: "$799"'],
  ['label: "Pro"', 'price: "$1,499"'],
]) {
  assert.ok(page.includes(plan[0]) && page.includes(plan[1]), `Missing ongoing plan ${plan[0]}.`);
}
assert.ok(
  (ongoingBlock.match(/priceNote: "per month"/g) ?? []).length === 3,
  "Every ongoing plan must state per month.",
);

for (const audit of [
  ['label: "Quote Recovery Audit"', 'price: "$799"'],
  ['label: "Full Revenue Leak Audit"', 'price: "$1,499"'],
]) {
  assert.ok(page.includes(audit[0]) && page.includes(audit[1]), `Missing one-time audit ${audit[0]}.`);
}
assert.ok(
  (auditBlock.match(/priceNote: "paid once"/g) ?? []).length === 2,
  "Every Audit must state paid once.",
);

for (const annualPrice of ["$3,990", "$7,990", "$14,990"]) {
  assert.ok(!page.includes(annualPrice), `Unimplemented annual price leaked into the UI: ${annualPrice}.`);
}
assert.ok(
  page.includes("Annual billing is not offered yet") && !page.includes("billingInterval"),
  "Annual billing must remain an explicit non-offer without an interactive switch.",
);

assert.ok(
  page.includes("Complete the $799 Audit first") &&
    page.includes("Closed until the release gate passes"),
  "Prerequisite and release-gated disabled states must be honest.",
);
assert.match(
  checkout,
  /offerKey === "STARTER" && !\(await hasCompletedQuoteRecoveryBaseline\(workspace\.id\)\)/,
  "The checkout route must enforce the Starter baseline prerequisite server-side.",
);
assert.ok(
  readiness.includes('offerKey: "QUOTE_RECOVERY_AUDIT"') &&
    readiness.includes('status: "COMPLETED"'),
  "Commercial readiness must require both Audit entitlement history and a completed read.",
);
assert.match(offers, /GROWTH:\s*\{ commerciallyAvailable: false,[\s\S]*?priceEnv: null \}/);
assert.match(offers, /PRO:\s*\{ commerciallyAvailable: false,[\s\S]*?priceEnv: null \}/);
assert.ok(
  page.includes("rev-checkout-page") &&
    page.includes("rev-checkout-card") &&
    page.includes("rev-checkout-card-primary"),
  "The premium billing visual system must be preserved.",
);
assert.ok(
  !page.includes("Everything in the audit flow") &&
    !page.includes("QuoteSignal") &&
    !page.includes("MedSpa"),
  "Misleading or historical public packaging language remains.",
);
assert.ok(
  sourceOfTruth.includes("not a three-tier price ladder") &&
    sprint.includes("One-time audits") &&
    sprint.includes("Recurring subscriptions"),
  "Living product truth must retain the Sprint 13 commercial distinction.",
);

console.log("Sprint 13 commercial packaging, cadence clarity, gate honesty and visual-contract checks: PASS");
