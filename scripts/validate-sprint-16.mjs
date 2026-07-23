import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const vercel = JSON.parse(read("vercel.json"));
const retention = read("src/app/api/jobs/enforce-retention/route.ts");
const digest = read("src/app/api/jobs/weekly-digest/route.ts");
const health = read("src/app/api/health/route.ts");
const uptime = read(".github/workflows/revory-uptime-monitor.yml");
const observer = read("scripts/observe-sprint-16-crons.mjs");
const restore = read("scripts/verify-isolated-restore.mjs");
const sprint = read("docs/sprints/SPRINT_16_PRODUCTION_OPERATIONS_AND_RECOVERY.md");
const home = read("src/app/page.tsx");
const terms = read("src/app/terms/page.tsx");
const privacy = read("src/app/privacy/page.tsx");
const refunds = read("src/app/refunds/page.tsx");
const legal = read("content/revory-legal.ts");

assert.deepEqual(vercel.crons, [
  { path: "/api/jobs/enforce-retention", schedule: "15 5 * * *" },
  { path: "/api/jobs/weekly-digest", schedule: "0 13 * * 1" },
]);
for (const [route, marker] of [
  [retention, "retention_job_complete"],
  [digest, "weekly_digest_job_complete"],
]) {
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /authorization/);
  assert.ok(route.includes(marker));
}

for (const required of ["SELECT 1", "database: \"reachable\"", "no-store", "status: 503"]) {
  assert.ok(health.includes(required), `Health route is missing: ${required}`);
}

for (const required of [
  "*/15 * * * *",
  "https://revory.app/api/health",
  "workflow_dispatch",
  "simulate_failure",
  "issues: write",
  "gh issue create",
  "gh issue close",
]) {
  assert.ok(uptime.includes(required), `External uptime monitor is missing: ${required}`);
}

for (const required of [
  "retention_job_complete",
  "weekly_digest_job_complete",
  "timestampUtc",
  "Sprint 16 cron evidence is incomplete",
]) {
  assert.ok(observer.includes(required), `Cron observer is missing: ${required}`);
}

for (const required of [
  "READ_ONLY_ISOLATED_RESTORE",
  "REVORY_RESTORE_SOURCE_DATABASE_URL",
  "REVORY_RESTORE_TARGET_DATABASE_URL",
  "distinct isolated database endpoint",
  "information_schema.tables",
  "measuredRpoMinutes",
  "measuredRtoMinutes",
]) {
  assert.ok(restore.includes(required), `Restore verifier is missing: ${required}`);
}

assert.ok(
  sprint.includes("IN PROGRESS") && sprint.includes("Stripe prerequisite: BLOCKED"),
  "Sprint 16 must not claim completion before Stripe E2E and external evidence pass.",
);

for (const required of [
  "68.046.497/0001-12",
  "AMETRINE LABS DESENVOLVIMENTO DE SOFTWARE NAO CUSTOMIZAVEL LTDA",
]) {
  assert.ok(legal.includes(required), `Legal identity is missing: ${required}`);
}
assert.ok(home.includes("REVORY_LEGAL.linkedinUrl"), "LinkedIn company link is missing.");
assert.ok(home.includes('href="/refunds"'), "Refund policy is missing from the public footer.");
assert.ok(terms.includes("Cancellation and Refund Policy"), "Terms do not link the commercial policy.");
assert.ok(privacy.includes("controller") && privacy.includes("processor"), "Privacy roles are incomplete.");
assert.ok(refunds.includes("seven-day statutory right"), "Mandatory-rights savings language is missing.");

console.log("Sprint 16 local operational-control preparation: PASS");
console.log(
  "External cron, provider-recovery and Stripe lifecycle evidence remains required before the exit gate can pass.",
);
