import { spawnSync } from "node:child_process";
import path from "node:path";

const requestedWindow = process.env.REVORY_CRON_LOG_WINDOW?.trim() || "1h";
if (!/^\d+[mhd]$/.test(requestedWindow)) {
  throw new Error("REVORY_CRON_LOG_WINDOW must use a bounded value such as 30m, 1h or 1d.");
}

const isWindows = process.platform === "win32";
const executable = isWindows ? "powershell.exe" : "npx";
const commandPrefix = isWindows
  ? [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "npx.ps1"),
    ]
  : [];
const jobs = [
  { job: "retention", marker: "retention_job_complete" },
  { job: "weekly_digest", marker: "weekly_digest_job_complete" },
];

function parseTimestamp(value) {
  if (typeof value === "number") {
    return new Date(value < 10_000_000_000 ? value * 1_000 : value).toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
}

function observeJob({ job, marker }) {
  const result = spawnSync(
    executable,
    [...commandPrefix, "vercel", "logs", "--since", requestedWindow, "--query", marker, "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Vercel log query failed for ${job}.`);
  }

  const entries = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
  const matching = entries.filter((entry) =>
    JSON.stringify(entry).includes(marker),
  );
  const latest = matching.at(-1);

  return {
    job,
    observed: Boolean(latest),
    timestampUtc: latest
      ? parseTimestamp(latest.timestamp ?? latest.createdAt ?? latest.time)
      : null,
    window: requestedWindow,
  };
}

const observations = jobs.map(observeJob);
console.log(JSON.stringify({ observations }, null, 2));

if (observations.some((observation) => !observation.observed)) {
  console.error(
    "Sprint 16 cron evidence is incomplete. Run this command inside the provider log-retention window after each scheduled execution.",
  );
  process.exitCode = 1;
}
