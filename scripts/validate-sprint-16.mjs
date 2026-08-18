import assert from "node:assert/strict";
import fs from "node:fs";
import { CRON_JOBS, evaluateEntries, runObserver, selectedJobs } from "./observe-sprint-16-crons.mjs";

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
const legalDocuments = read("content/revory-legal-documents.ts");
const privacy = read("src/app/privacy/page.tsx");
const refunds = read("src/app/refunds/page.tsx");
const legal = read("content/revory-legal.ts");
const packageJson = JSON.parse(read("package.json"));
const vercelBuild = read("scripts/vercel-build.mjs");
const runbook = read("docs/launch/REVORY_PRODUCTION_OPERATIONS_RUNBOOK.md");

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
  "REVORY_CRON_JOB",
  "--environment",
  "production",
]) {
  assert.ok(observer.includes(required), `Cron observer is missing: ${required}`);
}

assert.deepEqual(selectedJobs("retention"), [CRON_JOBS.retention]);
assert.deepEqual(selectedJobs("weekly_digest"), [CRON_JOBS.weekly_digest]);
assert.equal(selectedJobs("all").length, 2);
assert.throws(() => selectedJobs("unknown"), /all, retention, weekly_digest/);

const timestamp = "2026-08-18T12:00:00.000Z";
assert.equal(evaluateEntries({ entries: [], ...CRON_JOBS.retention, window: "1d" }).passed, false);
const retentionSuccess = evaluateEntries({ entries: [{ timestamp, message: JSON.stringify({ message: "retention_job_complete", failedWorkspaces: 0, workspaceId: "must-not-leak" }) }], ...CRON_JOBS.retention, window: "1d" });
assert.equal(retentionSuccess.passed, true);
assert.doesNotMatch(JSON.stringify(retentionSuccess), /workspaceId|must-not-leak|email|provider/i);
assert.equal(evaluateEntries({ entries: [{ timestamp, message: JSON.stringify({ message: "retention_job_complete", failedWorkspaces: 1 }) }], ...CRON_JOBS.retention, window: "1d" }).passed, false);

const digestNoDelivery = evaluateEntries({ entries: [{ timestamp, message: JSON.stringify({ message: "weekly_digest_job_complete", failed: 0, sent: 0, workspaces: 0, email: "must-not-leak" }) }], ...CRON_JOBS.weekly_digest, window: "2d" });
assert.equal(digestNoDelivery.passed, true);
assert.equal(digestNoDelivery.deliveryState, "NOT_APPLICABLE");
assert.doesNotMatch(JSON.stringify(digestNoDelivery), /must-not-leak|email/i);
const digestPendingDelivery = evaluateEntries({ entries: [{ timestamp, message: JSON.stringify({ message: "weekly_digest_job_complete", failed: 0, sent: 2, workspaces: 2 }) }], ...CRON_JOBS.weekly_digest, window: "2d" });
assert.equal(digestPendingDelivery.passed, true);
assert.equal(digestPendingDelivery.deliveryState, "PENDING_PROVIDER_EVIDENCE");
assert.equal(evaluateEntries({ entries: [{ timestamp, message: JSON.stringify({ message: "weekly_digest_job_complete", failed: 1, sent: 0, workspaces: 1 }) }], ...CRON_JOBS.weekly_digest, window: "2d" }).passed, false);

const fakeRun = (_command, args) => ({ error: null, status: 0, stdout: `${JSON.stringify({ timestamp, message: JSON.stringify({ message: args.includes("retention_job_complete") ? "retention_job_complete" : "weekly_digest_job_complete", failedWorkspaces: 0, failed: 0, sent: 0, workspaces: 0 }) })}\n` });
assert.equal(runObserver({ jobSelection: "retention", requestedWindow: "1d", run: fakeRun }).length, 1);
assert.equal(runObserver({ jobSelection: "weekly_digest", requestedWindow: "2d", run: fakeRun }).length, 1);
assert.equal(runObserver({ jobSelection: "all", requestedWindow: "2d", run: fakeRun }).length, 2);

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

assert.equal(
  packageJson.scripts["vercel-build"],
  "node scripts/vercel-build.mjs",
  "Vercel must use the migration-gated build.",
);
assert.equal(
  vercel.buildCommand,
  "npm run vercel-build",
  "vercel.json must override any stale dashboard build command.",
);
for (const required of ["VERCEL_ENV", "DATABASE_URL", "migrate", "deploy", "next", "build"]) {
  assert.ok(vercelBuild.includes(required), `Vercel build gate is missing: ${required}`);
}
for (const required of [
  "Deployment and database migration gate",
  "prisma migrate deploy",
  "Preview must use an isolated Neon branch",
  "/api/health",
]) {
  assert.ok(runbook.includes(required), `Production runbook is missing: ${required}`);
}

assert.ok(
  sprint.includes("IN PROGRESS") && sprint.includes("Stripe prerequisite: PASS"),
  "Sprint 16 must preserve the passed Stripe test prerequisite without claiming full completion.",
);

for (const required of [
  "68.046.497/0001-12",
  "AMETRINE LABS DESENVOLVIMENTO DE SOFTWARE NAO CUSTOMIZAVEL LTDA",
]) {
  assert.ok(legal.includes(required), `Legal identity is missing: ${required}`);
}
assert.ok(home.includes("REVORY_LEGAL.linkedinUrl"), "LinkedIn company link is missing.");
assert.ok(home.includes('href="/refunds"'), "Refund policy is missing from the public footer.");
assert.ok(
  terms.includes("termsDocuments") && legalDocuments.includes("Cancellation and Refund Policy"),
  "Terms do not incorporate the commercial policy.",
);
assert.ok(
  privacy.includes("privacyDocuments") &&
    legalDocuments.includes("controller") &&
    legalDocuments.includes("processor"),
  "Privacy roles are incomplete.",
);
assert.ok(
  refunds.includes("refundDocuments") && legalDocuments.includes("seven-day statutory right"),
  "Mandatory-rights savings language is missing.",
);

console.log("Sprint 16 local operational-control preparation: PASS");
console.log(
  "External cron and provider-recovery evidence remains required before the exit gate can pass.",
);
