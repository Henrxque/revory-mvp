import { spawnSync } from "node:child_process";

function log(message: string) {
  console.log(`[launch-readiness-qa] ${message}`);
}

const checks = [
  "db:validate",
  "typecheck",
  "lint",
  "qa:active-copy",
  "qa:sprint-0",
  "qa:sprint-4-1",
  "qa:sprint-6",
  "qa:sprints-7-8",
  "qa:sprint-9",
  "qa:sprint-10",
  "qa:sprint-11",
  "qa:sprint-12",
  "qa:sprint-12-1",
  "qa:sprint-13",
  "qa:retention",
  "qa:canonical-assisted-intake",
  "qa:sprint-10:browser",
  "qa:sprint-13:browser",
  "build",
] as const;

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required to run the canonical launch-readiness suite.");

log("Running the canonical REVORY hybrid local launch-control suite.");
log("Historical MedSpa clean-rerun evidence is intentionally excluded from the active launch gate.");

for (const check of checks) {
  log(`Starting ${check}`);
  const result = spawnSync(process.execPath, [npmCli, "run", check], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${check} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

log("Canonical local launch-control suite: PASS.");
log("Customer evidence, Stripe/OAuth/email production checks, managed restore, WAF/monitoring and final legal review remain external gates.");
