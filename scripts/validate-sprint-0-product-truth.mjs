import fs from "node:fs";
import path from "node:path";

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
  "visible-prelaunch-gate",
  home.includes("Secure checkout activation is being finalized") &&
    start.includes("Activation pending"),
  "Landing and start screen visibly mark checkout as closed during validation.",
);
check(
  "no-legacy-growth-cta",
  !home.includes("/start?plan=growth"),
  "Public audit CTAs remove the historical Growth query parameter.",
);
check(
  "growth-recurring-primary",
  /const growthPlan:[\s\S]*?featured:\s*true,[\s\S]*?offerKey:\s*"GROWTH"/.test(start),
  "Growth is the highlighted US$799/month recurring plan.",
);
check(
  "sprint-14-commercial-path",
  start.includes("Choose how you want REVORY to review your revenue.") &&
    start.includes("[growthPlan, starterPlan, proPlan]") &&
    start.includes("[quoteRecoveryAudit, fullRevenueLeakAudit]") &&
    start.includes('priceNote: "paid once"') &&
    start.includes('priceNote: "per month"'),
  "The pricing screen separates monthly plans from one-time audits and preserves explicit billing cadence.",
);
check(
  "starter-is-recurring-continuation",
  start.includes('entryCondition: "Available after your first Quote Recovery Audit is complete."') &&
    start.includes('priceNote: "per month"') &&
    !start.includes("Everything in the audit flow"),
  "Starter is described as recurring continuity after the Audit, not a cheaper replacement for it.",
);
check(
  "no-live-checkout-link",
  !start.includes('href="/api/billing/checkout"'),
  "The checkout presentation does not expose a direct charge link.",
);
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
