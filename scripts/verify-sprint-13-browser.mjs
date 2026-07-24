import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error("Commercial browser QA is disabled in production.");
}

const baseURL = process.env.REVORY_QA_BASE_URL ?? "http://localhost:3004";
const evidenceDir = path.join(os.tmpdir(), "revory-sprint-13");
const qaDistDir = path.join(process.cwd(), ".next-s13");
const generatedSourceSnapshots = ["next-env.d.ts", "tsconfig.json"].map((relativePath) => ({
  content: fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  relativePath,
}));
fs.mkdirSync(evidenceDir, { recursive: true });

let serverProcess = null;
let serverLogs = "";
let browser = null;

async function isServerReady() {
  try {
    return (await fetch(`${baseURL}/start`, { redirect: "manual" })).status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isServerReady()) return;
  if (process.env.REVORY_QA_BASE_URL) throw new Error(`Configured QA server is unavailable at ${baseURL}.`);
  const envSource = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const databaseLine = envSource.split(/\r?\n/).find((line) => line.trim().startsWith("DATABASE_URL="));
  const databaseUrl = databaseLine?.slice(databaseLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  if (!databaseUrl) throw new Error("Local .env DATABASE_URL is required for commercial browser QA.");
  const databaseHost = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error(`Commercial browser QA refuses a non-local database host: ${databaseHost}`);
  }
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--port", "3004"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      REVORY_INTERNAL_PREVIEW_MODE: "true",
      REVORY_QA_DIST_DIR: ".next-s13",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  serverProcess.stdout?.on("data", (chunk) => { serverLogs = `${serverLogs}${String(chunk)}`.slice(-12_000); });
  serverProcess.stderr?.on("data", (chunk) => { serverLogs = `${serverLogs}${String(chunk)}`.slice(-12_000); });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isServerReady()) return;
    if (serverProcess.exitCode !== null) throw new Error(`Commercial QA server exited early.\n${serverLogs}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Commercial QA server did not become ready.\n${serverLogs}`);
}

try {
  await ensureServer();
  browser = await chromium.launch({ headless: true });

  for (const viewport of [
    { height: 720, label: "desktop-1280", width: 1280 },
    { height: 1000, label: "desktop-1440", width: 1440 },
    { height: 844, label: "mobile", width: 390 },
  ]) {
    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

    await page.goto("/start", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Choose how you want REVORY to review your revenue." }).waitFor();
    const growth = page.getByRole("heading", { exact: true, name: "Growth" }).locator("xpath=ancestor::article");
    const starter = page.getByRole("heading", { exact: true, name: "Starter" }).locator("xpath=ancestor::article");
    const pro = page.getByRole("heading", { exact: true, name: "Pro" }).locator("xpath=ancestor::article");
    const audit = page.getByRole("heading", { exact: true, name: "Quote Recovery Audit" }).locator("xpath=ancestor::article");
    const fullAudit = page.getByRole("heading", { exact: true, name: "Full Revenue Leak Audit" }).locator("xpath=ancestor::article");
    if (!(await growth.getByText("per month", { exact: true }).isVisible())) {
      throw new Error(`${viewport.label}: Growth cadence is unclear.`);
    }
    if (!(await starter.getByText("per month", { exact: true }).isVisible())) {
      throw new Error(`${viewport.label}: Starter cadence is unclear.`);
    }
    if (!(await starter.getByRole("button", { name: "Complete the US$799 Audit first" }).isVisible())) {
      throw new Error(`${viewport.label}: Starter prerequisite is not visible.`);
    }
    if (!(await pro.getByText("per month", { exact: true }).isVisible())) {
      throw new Error(`${viewport.label}: Pro is not grouped as a monthly plan.`);
    }
    if (!(await audit.getByText("paid once", { exact: true }).isVisible()) ||
        !(await fullAudit.getByText("paid once", { exact: true }).isVisible())) {
      throw new Error(`${viewport.label}: One-time Audit cadence is unclear.`);
    }
    if (!(await pro.getByRole("button", { name: "Not available yet" }).isVisible()) ||
        !(await fullAudit.getByRole("button", { name: "Not available yet" }).isVisible())) {
      throw new Error(`${viewport.label}: Gated offers appear purchasable.`);
    }
    if (viewport.width >= 1280) {
      const monthlyBoxes = await Promise.all([growth, starter, pro].map((card) => card.boundingBox()));
      const auditBox = await audit.boundingBox();
      if (monthlyBoxes.some((box) => !box) || !auditBox) {
        throw new Error(`${viewport.label}: Pricing cards could not be measured.`);
      }
      const monthlyTop = monthlyBoxes[0].y;
      if (monthlyBoxes.some((box) => Math.abs(box.y - monthlyTop) > 2)) {
        throw new Error(`${viewport.label}: Monthly plans are not aligned in one comparison row.`);
      }
      if (auditBox.y <= monthlyTop + monthlyBoxes[0].height) {
        throw new Error(`${viewport.label}: One-time Audits are mixed into the monthly plan group.`);
      }
    }

    await growth.hover();
    await page.waitForTimeout(250);
    if ((await growth.evaluate((element) => getComputedStyle(element).transform)) === "none") {
      throw new Error(`${viewport.label}: Premium card hover treatment was lost.`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`${viewport.label}: Pricing screen horizontal overflow is ${overflow}px.`);
    if (errors.length) throw new Error(`${viewport.label}: Browser console errors: ${errors.join(" | ")}`);
    await page.screenshot({ path: path.join(evidenceDir, `commercial-${viewport.label}.png`), fullPage: true });
    await context.close();
  }

  console.log(`Monthly/audit grouping, responsive alignment and premium hover: PASS (${evidenceDir})`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill("SIGTERM");
  fs.rmSync(qaDistDir, { force: true, recursive: true });
  for (const snapshot of generatedSourceSnapshots) {
    fs.writeFileSync(path.join(process.cwd(), snapshot.relativePath), snapshot.content);
  }
}
