import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const checks = [];
const check = (id, condition, evidence) => {
  checks.push({ id, passed: Boolean(condition), evidence });
  assert.ok(condition, `${id}: ${evidence}`);
};

const experience = read("services/ai-integrity/experience.ts");
const home = read("src/app/page.tsx");
const layout = read("src/app/layout.tsx");
const limitations = read("src/app/limitations/page.tsx");
const sourceRehearsal = read("services/ai-integrity/connected-sources.ts");
const sourceFixture = read("services/ai-integrity/source-fixtures.ts");
const sprint8 = JSON.parse(read("docs/qa/ai-integrity-sprint8/verification.json"));

check(
  "production_experience_blocked",
  /process\.env\.NODE_ENV\s*!==\s*["']production["']/.test(experience) &&
    /process\.env\.REVORY_AI_SAAS_PREVIEW\s*===\s*["']true["']/.test(experience),
  "The AI SaaS experience still requires a nonproduction preview flag.",
);
check(
  "public_home_still_legacy",
  home.includes("ContractorHomePage") && home.includes("isAiIntegrityExperienceEnabled"),
  "The public home retains the contractor fallback until release review.",
);
check(
  "public_metadata_still_legacy",
  layout.includes("Quote Recovery for High-Ticket Contractors") && layout.includes("aiPreview"),
  "Default public metadata still describes the legacy offer.",
);
check(
  "public_limitations_still_legacy",
  limitations.includes("Starter and Growth are current Quote Recovery offers"),
  "The public limitations page still describes legacy offers and needs adaptation.",
);
check(
  "source_rehearsal_is_fixture_only",
  sourceRehearsal.includes("REVORY_AI_SOURCE_REHEARSAL") &&
    sourceRehearsal.includes("isAiIntegrityExperienceEnabled()") &&
    /transport:\s*AiSourceTransport\s*=\s*aiSourceFixtureTransport/.test(sourceRehearsal) &&
    sourceFixture.includes("export const aiSourceFixtureTransport") &&
    !/\bfetch\s*\(/.test(sourceFixture),
  "Source rehearsal remains gated outside production; no real connector evidence is inferred.",
);
check(
  "monitor_rehearsal_is_synthetic",
  sprint8.mode === "SYNTHETIC_REHEARSAL" &&
    sprint8.realProviderConnections === 0 &&
    sprint8.automaticScans === 0 &&
    sprint8.emailsSent === 0 &&
    sprint8.subscriptionsCreated === 0,
  "Sprint 8 QA records zero real connections, automated reads, emails or subscriptions.",
);

// A local code audit never promotes an external gate. Each item needs independent,
// dated evidence from the relevant environment and users before a launch decision.
const unresolvedGates = [
  { id: "stripe_sandbox_purchase", owner: "Sprint 05", proof: "Real Stripe test-mode checkout, signed webhook, refund and entitlement trace" },
  { id: "paid_pilot", owner: "Sprint 06", proof: "3–5 consented, paid AI SaaS buyers and reviewed findings/activation" },
  { id: "openai_real_source", owner: "Sprint 07", proof: "Read-only permissions, protected credentials, revoke/retry and same-period export equivalence" },
  { id: "stripe_real_source", owner: "Sprint 07", proof: "Read-only permissions, protected credentials, revoke/retry and same-period export equivalence" },
  { id: "recurring_beta", owner: "Sprint 08", proof: "Two real reads, scheduled execution, bounded delivery, opt-out, billing and observed repeat value" },
  { id: "ai_saas_public_experience", owner: "Sprint 09", proof: "Approved AI SaaS landing, app, offer, metadata, legal/limitations and end-to-end self-service flow" },
  { id: "production_operations", owner: "Sprint 09", proof: "Target-environment auth/Resend checks, health, incident owner, rollback rehearsal and production smoke" },
  { id: "acquisition_activation", owner: "Sprint 09", proof: "Privacy-reviewed event contract, measured funnel denominators and first independent users" },
];

const report = {
  product: "REVORY AI SaaS",
  scope: "Sprint 09 local launch-preparation audit",
  decision: "NO_GO",
  publicLaunchAuthorized: false,
  checkedCodeState: checks,
  externalGates: unresolvedGates.map((gate) => ({ ...gate, status: "NOT_VERIFIED" })),
  caveat: "Code inspection and synthetic QA do not prove a real purchase, connection, buyer or production operation.",
};
const output = join(root, "docs/qa/ai-integrity-sprint9/launch-readiness.json");
mkdirSync(join(root, "docs/qa/ai-integrity-sprint9"), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Sprint 09 audit: ${report.decision}; ${checks.length} local guardrails verified; ${unresolvedGates.length} external gates not verified.`);
console.log("Report: docs/qa/ai-integrity-sprint9/launch-readiness.json");
