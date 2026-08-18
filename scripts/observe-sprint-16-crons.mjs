import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

export const CRON_JOBS = {
  retention: { job: "retention", marker: "retention_job_complete" },
  weekly_digest: { job: "weekly_digest", marker: "weekly_digest_job_complete" },
};

export function selectedJobs(value = "all") {
  const selection = value.trim().toLowerCase() || "all";
  if (selection === "all") return Object.values(CRON_JOBS);
  if (selection in CRON_JOBS) return [CRON_JOBS[selection]];
  throw new Error("REVORY_CRON_JOB must be one of: all, retention, weekly_digest.");
}

export function parseTimestamp(value) {
  if (typeof value === "number") {
    const parsed = new Date(value < 10_000_000_000 ? value * 1_000 : value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

function parseJson(value) {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}

function completionPayload(entry, marker) {
  const candidates = [entry, entry?.message, entry?.text, entry?.payload]
    .flatMap((candidate) => {
      const parsed = parseJson(candidate);
      return parsed ? [candidate, parsed] : [candidate];
    })
    .filter((candidate) => candidate && typeof candidate === "object");
  return candidates.find((candidate) => candidate.message === marker || candidate.marker === marker) ?? null;
}

function safeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? Number(value) : null;
}

export function evaluateEntries({ entries, job, marker, window }) {
  const matching = entries.flatMap((entry) => {
    const payload = completionPayload(entry, marker);
    if (!payload) return [];
    const timestampUtc = parseTimestamp(entry.timestamp ?? entry.createdAt ?? entry.time ?? payload.timestamp);
    return [{ payload, timestampUtc }];
  });
  const latest = matching.at(-1);
  if (!latest) return { job, markerFound: false, observed: false, passed: false, production: true, timestampUtc: null, window };

  if (job === "retention") {
    const failedWorkspaces = safeNumber(latest.payload.failedWorkspaces);
    return { failedWorkspaces, job, markerFound: true, observed: true, passed: failedWorkspaces === 0 && Boolean(latest.timestampUtc), production: true, timestampUtc: latest.timestampUtc, window };
  }

  const failed = safeNumber(latest.payload.failed);
  const sent = safeNumber(latest.payload.sent);
  const workspaces = safeNumber(latest.payload.workspaces);
  return {
    deliveryExpected: sent !== null && sent > 0,
    deliveryState: sent === 0 && workspaces === 0 ? "NOT_APPLICABLE" : "PENDING_PROVIDER_EVIDENCE",
    failed,
    job,
    markerFound: true,
    observed: true,
    passed: failed === 0 && Boolean(latest.timestampUtc),
    production: true,
    sent,
    timestampUtc: latest.timestampUtc,
    window,
    workspaces,
  };
}

function parseJsonLines(stdout) {
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const parsed = parseJson(line);
    return parsed && typeof parsed === "object" ? [parsed] : [];
  });
}

export function observeJob({ job, marker }, requestedWindow, run = spawnSync) {
  const isWindows = process.platform === "win32";
  const executable = isWindows ? "powershell.exe" : "npx";
  const commandPrefix = isWindows ? ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "npx.ps1")] : [];
  const result = run(executable, [...commandPrefix, "vercel", "logs", "--environment", "production", "--since", requestedWindow, "--query", marker, "--json"], { cwd: process.cwd(), encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Vercel production log query failed for ${job}.`);
  return evaluateEntries({ entries: parseJsonLines(result.stdout), job, marker, window: requestedWindow });
}

export function runObserver({ jobSelection = process.env.REVORY_CRON_JOB?.trim() || "all", requestedWindow = process.env.REVORY_CRON_LOG_WINDOW?.trim() || "1h", run = spawnSync } = {}) {
  if (!/^\d+[mhd]$/.test(requestedWindow)) throw new Error("REVORY_CRON_LOG_WINDOW must use a bounded value such as 30m, 1h or 1d.");
  return selectedJobs(jobSelection).map((job) => observeJob(job, requestedWindow, run));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const observations = runObserver();
    console.log(JSON.stringify({ observations }, null, 2));
    if (observations.some((observation) => !observation.passed)) {
      console.error("Sprint 16 cron evidence is incomplete or reports failures. Observe each job after its natural production schedule.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Cron observation failed.");
    process.exitCode = 1;
  }
}
