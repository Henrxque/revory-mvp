import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const baseURL = process.env.REVORY_QA_BASE_URL ?? "http://localhost:3002";
const outputDir = path.join(os.tmpdir(), "revory-public-demo");
const qaDistDir = path.join(process.cwd(), ".next-demo-qa");
fs.mkdirSync(outputDir, { recursive: true });
let serverProcess = null;

async function isReady() {
  try {
    const response = await fetch(`${baseURL}/demo`, { redirect: "manual" });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isReady()) return;
  if (process.env.REVORY_QA_BASE_URL) {
    throw new Error(`Configured demo QA server is unavailable at ${baseURL}.`);
  }
  const envSource = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const databaseLine = envSource.split(/\r?\n/).find((line) => line.trim().startsWith("DATABASE_URL="));
  const databaseUrl = databaseLine?.slice(databaseLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("Demo browser QA requires the local PostgreSQL URL from .env.");
  }
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--port", "3002"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      REVORY_LLM_ENABLED: "false",
      REVORY_QA_DIST_DIR: ".next-demo-qa",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isReady()) return;
    if (serverProcess.exitCode !== null) throw new Error("Isolated demo QA server exited early.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Isolated demo QA server did not become ready.");
}

await ensureServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto("/demo", { waitUntil: "networkidle" });
    if (!response?.ok()) throw new Error(`${name} demo returned ${response?.status()}`);
    if (!(await page.getByText("See the evidence behind a Quote Recovery read.").isVisible())) {
      throw new Error(`${name} demo headline missing`);
    }
    if (!(await page.getByText("Synthetic sample data").isVisible())) {
      throw new Error(`${name} sample label missing`);
    }
    const body = await page.locator("body").innerText();
    if (/QuoteSignal|MedSpa|clinic|appointment|patient|treatment|no[ -]?show|booking/i.test(body)) {
      throw new Error(`${name} demo contains prohibited legacy copy`);
    }
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (horizontalOverflow > 1) {
      throw new Error(`${name} demo has ${horizontalOverflow}px horizontal overflow`);
    }
    const csv = await context.request.get("/demo/quote-recovery.csv");
    if (csv.status() !== 200 || !(await csv.text()).includes("EST-SAMPLE-1042")) {
      throw new Error(`${name} sample CSV export failed`);
    }
    if (errors.length) throw new Error(`${name} demo console errors: ${errors.join(" | ")}`);
    await page.screenshot({ path: path.join(outputDir, `demo-${name}.png`), fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill("SIGTERM");
  fs.rmSync(qaDistDir, { force: true, recursive: true });
}
console.log("Canonical public sample workspace desktop/mobile: PASS");
