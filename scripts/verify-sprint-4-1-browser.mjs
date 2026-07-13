import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const baseURL = process.env.REVORY_QA_BASE_URL ?? "http://localhost:3003";
const dir = path.join(process.cwd(), ".tmp", "sprint-4-1");
const qaDistDir = path.join(process.cwd(), ".next-landing-qa");
fs.mkdirSync(dir, { recursive: true });
let serverProcess = null;
let serverLog = "";

async function isReady() {
  try {
    const response = await fetch(baseURL, { redirect: "manual" });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isReady()) return;
  if (process.env.REVORY_QA_BASE_URL) {
    throw new Error(`Configured landing QA server is unavailable at ${baseURL}.`);
  }
  const envSource = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const databaseLine = envSource
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("DATABASE_URL="));
  const databaseUrl = databaseLine
    ?.slice(databaseLine.indexOf("=") + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("Landing browser QA requires the local PostgreSQL URL from .env.");
  }
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--port", "3003"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      REVORY_LLM_ENABLED: "false",
      REVORY_QA_DIST_DIR: ".next-landing-qa",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  serverProcess.stdout.on("data", (chunk) => {
    serverLog = `${serverLog}${chunk}`.slice(-12000);
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverLog = `${serverLog}${chunk}`.slice(-12000);
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isReady()) return;
    if (serverProcess.exitCode !== null) throw new Error("Isolated landing QA server exited early.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Isolated landing QA server did not become ready.");
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

    const response = await page.goto("/", { waitUntil: "networkidle" });
    if (!response?.ok()) {
      throw new Error(`${name} returned ${response?.status()}\n${serverLog}`);
    }
    if (!(await page.getByText("Find the estimates that still deserve").isVisible())) {
      throw new Error(`${name} hero missing`);
    }
    if (!(await page.getByRole("link", { name: "Preview the US$799 audit" }).isVisible())) {
      throw new Error(`${name} primary hero CTA is below the initial fold`);
    }
    if (!(await page.getByText("Revenue Realization is gated").isVisible())) {
      throw new Error(`${name} roadmap gate missing`);
    }
    if (await page.locator("[data-nextjs-dialog],.vite-error-overlay").count()) {
      throw new Error(`${name} error overlay`);
    }

    const text = await page.locator("body").innerText();
    if (/QuoteSignal|MedSpa|clinic|appointment|patient|no-show|booking/i.test(text)) {
      throw new Error(`${name} rendered forbidden legacy copy`);
    }

    if (name === "desktop") {
      for (const [label, id] of [
        ["How it works", "how"],
        ["Signals", "signals"],
        ["Pricing", "pricing"],
        ["FAQ", "faq"],
      ]) {
        await page.getByRole("link", { name: label, exact: true }).click();
        await page.waitForTimeout(900);
        if ((await page.evaluate(() => window.location.hash)) !== `#${id}`) {
          throw new Error(`${label} navigation did not update the hash`);
        }
        const sectionTop = await page.locator(`#${id}`).evaluate((element) =>
          Math.round(element.getBoundingClientRect().top),
        );
        if (sectionTop < 70 || sectionTop > 150) {
          throw new Error(`${label} navigation landed at an invalid offset: ${sectionTop}`);
        }
      }

      const firstSignal = page.locator("#signals article").first();
      const beforeHover = await firstSignal.evaluate(
        (element) => ({
          boxShadow: getComputedStyle(element).boxShadow,
          transform: getComputedStyle(element).transform,
        }),
      );
      await firstSignal.hover();
      await page.waitForTimeout(900);
      const afterHover = await firstSignal.evaluate(
        (element) => ({
          boxShadow: getComputedStyle(element).boxShadow,
          transform: getComputedStyle(element).transform,
        }),
      );
      if (
        beforeHover.boxShadow === afterHover.boxShadow ||
        beforeHover.transform === afterHover.transform
      ) {
        throw new Error(
          `Signal card hover glow is not active: ${JSON.stringify({ beforeHover, afterHover })}`,
        );
      }

      const startResponse = await page.goto("/start", { waitUntil: "networkidle" });
      if (startResponse?.ok() && page.url().endsWith("/start")) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollHeight - window.innerHeight,
        );
        if (overflow > 24) {
          throw new Error(`Checkout is not one-page on desktop: ${overflow}px overflow`);
        }
        await page.screenshot({
          path: path.join(dir, "checkout-desktop.png"),
          fullPage: true,
        });
      }
    }

    await page.goto("/", { waitUntil: "networkidle" });
    if (errors.length) throw new Error(`${name} console errors: ${errors.join(" | ")}`);
    await page.screenshot({
      path: path.join(dir, `landing-${name}.png`),
      fullPage: true,
    });
    await context.close();
  }
} finally {
  await browser.close();
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill("SIGTERM");
  fs.rmSync(qaDistDir, { force: true, recursive: true });
}

console.log("Sprint 4.1 landing interactions, glow, desktop/mobile and one-page checkout: PASS");
