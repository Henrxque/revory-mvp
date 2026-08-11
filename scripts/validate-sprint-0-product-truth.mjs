import fs from "node:fs";
import path from "node:path";

import {
  currentPublicOfferJourney,
  revoryCommercialOfferContracts,
} from "../domain/revory/commercial-offers.ts";

const cwd = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(cwd, relativePath), "utf8");
}

const checks = [];

function check(name, condition, detail) {
  checks.push({ detail, name, passed: Boolean(condition) });
}

const home = read("src/app/page.tsx");
const start = read("src/app/start/page.tsx");
const checkout = read("src/app/api/billing/checkout/route.ts");
const preview = read("services/app/internal-preview.ts");
const claimRegister = read("docs/sprints/SPRINT_0_PUBLIC_CLAIM_REGISTER.md");
const threatModel = read("docs/security/REVORY_DATA_FLOW_AND_THREAT_MODEL.md");
const sourceOfTruth = read("docs/source-of-truth.md");

check(
  "canonical-brand",
  sourceOfTruth.includes("public brand is **REVORY**") ||
    sourceOfTruth.includes("Product identity"),
  "Source of truth identifies REVORY as the active product.",
);
check(
  "historical-name-normalized",
  !home.includes("QuoteSignal"),
  "Historical QuoteSignal naming does not reach public rendering.",
);
check(
  "visible-secure-checkout",
  start.includes('<form action={`/api/billing/checkout?offer=${offer.offerKey}`} method="post">') &&
    checkout.includes("export async function GET()") &&
    checkout.includes("status: 405"),
  "The pricing screen uses POST checkout forms and rejects charge-like GET requests.",
);
check(
  "no-legacy-growth-cta",
  !home.includes("/start?plan=growth"),
  "Public audit CTAs remove the historical Growth query parameter.",
);
check("current-public-journey", JSON.stringify(currentPublicOfferJourney) === JSON.stringify(["QUOTE_RECOVERY_AUDIT", "STARTER", "GROWTH"]), "The recommended public order is Audit, Starter, then Growth without making it a prerequisite.");
check("audit-contract", revoryCommercialOfferContracts.QUOTE_RECOVERY_AUDIT.amountCents === 39900 && revoryCommercialOfferContracts.QUOTE_RECOVERY_AUDIT.mode === "payment" && revoryCommercialOfferContracts.QUOTE_RECOVERY_AUDIT.interval === null, "Audit is US$399 paid once.");
check("starter-contract", revoryCommercialOfferContracts.STARTER.amountCents === 39900 && revoryCommercialOfferContracts.STARTER.mode === "subscription" && revoryCommercialOfferContracts.STARTER.interval === "month", "Starter is US$399 per month.");
check("growth-contract", revoryCommercialOfferContracts.GROWTH.amountCents === 59900 && revoryCommercialOfferContracts.GROWTH.mode === "subscription" && revoryCommercialOfferContracts.GROWTH.interval === "month", "Growth is US$599 per month.");
check("advanced-offers-private", !revoryCommercialOfferContracts.PRO.publiclyListed && !revoryCommercialOfferContracts.PRO.commerciallyAvailable && !revoryCommercialOfferContracts.FULL_REVENUE_LEAK_AUDIT.publiclyListed && !revoryCommercialOfferContracts.FULL_REVENUE_LEAK_AUDIT.commerciallyAvailable, "Historical US$1,499 offers remain preserved but gated and private.");
check("stable-offer-semantics", start.includes("currentPublicOfferJourney") && start.includes("data-offer-key") && start.includes("data-cadence") && start.includes("data-recommended"), "The pricing screen exposes semantic offer identity, cadence and recommendation markers.");
check(
  "starter-is-independent-recurring-path",
  start.includes("Start directly. A one-time Audit is optional") &&
    start.includes('priceNote: "per month"') &&
    !start.includes("Everything in the audit flow"),
  "Starter is described as an independent recurring path, not a forced Audit continuation.",
);
check(
  "no-live-checkout-link",
  !start.includes('href="/api/billing/checkout"'),
  "The checkout presentation does not expose a direct charge link.",
);
check("dynamic-checkout-mode", checkout.includes("mode: offer.mode") && checkout.includes('offer.mode === "subscription"') && checkout.includes("subscription_data"), "Checkout derives payment versus subscription behavior from the canonical offer contract.");
check(
  "preview-production-guard",
  preview.includes('process.env.NODE_ENV !== "production"') &&
    preview.includes('process.env.REVORY_INTERNAL_PREVIEW_MODE === "true"'),
  "Internal migration preview cannot bypass gates in production.",
);
check(
  "claim-register-complete",
  Array.from(claimRegister.matchAll(/^\| C\d{2} \|/gm)).length >= 28,
  "Public claim register contains status and owner rows for every claim family.",
);
check(
  "threat-model-provider-coverage",
  ["Google OAuth", "CSV upload", "Optional AI mapping", "Stripe webhook", "Resend email", "CSV/PDF export"].every(
    (term) => threatModel.includes(term),
  ),
  "Threat model covers auth, upload, AI, billing, email and export boundaries.",
);

for (const entry of checks) {
  console.log(`[sprint-0] ${entry.passed ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`);
}

const failed = checks.filter((entry) => !entry.passed);

if (failed.length > 0) {
  console.error(`[sprint-0] ${failed.length} product-truth check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`[sprint-0] ${checks.length} product-truth checks passed.`);
}
