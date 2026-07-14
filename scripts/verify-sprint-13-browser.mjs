import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error("Sprint 13 browser QA is disabled in production.");
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
    const response = await fetch(`${baseURL}/start`, { redirect: "manual" });
    return response.status > 0;
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
  if (!databaseUrl) throw new Error("Local .env DATABASE_URL is required for Sprint 13 browser QA.");
  const databaseHost = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error(`Sprint 13 browser QA refuses a non-local database host: ${databaseHost}`);
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
  serverProcess.stdout?.on("data", (chunk) => {
    serverLogs = `${serverLogs}${String(chunk)}`.slice(-12_000);
  });
  serverProcess.stderr?.on("data", (chunk) => {
    serverLogs = `${serverLogs}${String(chunk)}`.slice(-12_000);
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isServerReady()) return;
    if (serverProcess.exitCode !== null) throw new Error(`Sprint 13 QA server exited early.\n${serverLogs}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Sprint 13 QA server did not become ready.\n${serverLogs}`);
}

try {
  await ensureServer();
  browser = await chromium.launch({ headless: true });

  for (const viewport of [
    { height: 1000, label: "desktop", width: 1440 },
    { height: 844, label: "mobile", width: 390 },
  ]) {
    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/start", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Choose how often you want REVORY working for you." }).waitFor();
    const ongoingHeading = page.getByRole("heading", { name: "Ongoing plans" });
    const auditHeading = page.getByRole("heading", { name: "Start with an Audit" });
    if (!(await ongoingHeading.isVisible()) || !(await auditHeading.isVisible())) {
      throw new Error(`${viewport.label}: Sprint 13 pricing groups are not visible.`);
    }
    const ongoingBox = await ongoingHeading.boundingBox();
    const auditBox = await auditHeading.boundingBox();
    if (!ongoingBox || !auditBox || ongoingBox.y >= auditBox.y) {
      throw new Error(`${viewport.label}: Ongoing plans are not visually before the Audit group.`);
    }
    if ((await page.locator("article.rev-checkout-card").count()) !== 5) {
      throw new Error(`${viewport.label}: Expected five commercial cards.`);
    }

    const cardFor = (label) => page.getByRole("heading", { exact: true, name: label }).locator("xpath=ancestor::article");
    const starter = cardFor("Starter");
    if (!(await starter.getByText("per month", { exact: true }).isVisible())) {
      throw new Error(`${viewport.label}: Starter cadence is unclear.`);
    }
    if (!(await starter.getByRole("button", { name: "Complete the $799 Audit first" }).isVisible())) {
      throw new Error(`${viewport.label}: Starter prerequisite is not visible.`);
    }
    for (const plan of ["Growth", "Pro"]) {
      const card = cardFor(plan);
      if (!(await card.getByRole("button", { name: "Closed until the release gate passes" }).isVisible())) {
        throw new Error(`${viewport.label}: ${plan} does not show an honest closed state.`);
      }
    }
    for (const audit of ["Quote Recovery Audit", "Full Revenue Leak Audit"]) {
      const card = cardFor(audit);
      if (!(await card.getByText("paid once", { exact: true }).isVisible())) {
        throw new Error(`${viewport.label}: ${audit} cadence is unclear.`);
      }
    }
    if (await page.getByRole("button", { name: /annual|monthly/i }).count()) {
      throw new Error(`${viewport.label}: Unimplemented monthly/annual control is interactive.`);
    }

    const firstCard = page.locator("article.rev-checkout-card").first();
    await firstCard.hover();
    await page.waitForTimeout(300);
    const transform = await firstCard.evaluate((element) => getComputedStyle(element).transform);
    if (transform === "none") throw new Error(`${viewport.label}: Existing premium card hover treatment was lost.`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`${viewport.label}: Pricing screen horizontal overflow is ${overflow}px.`);
    if (errors.length) throw new Error(`${viewport.label}: Browser console errors: ${errors.join(" | ")}`);
    await page.screenshot({ path: path.join(evidenceDir, `sprint-13-${viewport.label}.png`), fullPage: true });
    await context.close();
  }

  console.log(`Sprint 13 desktop/mobile pricing hierarchy and preserved premium hover: PASS (${evidenceDir})`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill("SIGTERM");
  fs.rmSync(qaDistDir, { force: true, recursive: true });
  for (const snapshot of generatedSourceSnapshots) {
    fs.writeFileSync(path.join(process.cwd(), snapshot.relativePath), snapshot.content);
  }
}
