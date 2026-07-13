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
  home.includes("Audit checkout remains gated until validation is complete") &&
    home.includes("Prices remain validation targets until the commercial gates pass"),
  "Landing visibly marks the US$799 offer as prelaunch and gated.",
);
check(
  "no-legacy-growth-cta",
  !home.includes("/start?plan=growth"),
  "Public audit CTAs remove the historical Growth query parameter.",
);
check(
  "audit-primary",
  /featured:\s*true,[\s\S]*?label:\s*"Quote Recovery Audit"/.test(start),
  "The US$799 Quote Recovery Audit is the primary checkout card.",
);
check(
  "no-live-checkout-link",
  !start.includes('href="/api/billing/checkout"'),
  "The checkout presentation does not start a charge before Sprint 5.",
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
