import { randomBytes, scrypt as scryptCallback, createHash } from "node:crypto";
import { promisify } from "node:util";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error("Sprint 15 browser QA is disabled in production.");
}

const baseURL = process.env.REVORY_QA_BASE_URL ?? "http://localhost:3005";
const evidenceDir = path.join(os.tmpdir(), "revory-sprint-15");
const qaDistDir = path.join(process.cwd(), ".next-s15");
const generatedSourceSnapshots = ["next-env.d.ts", "tsconfig.json"].map((relativePath) => ({
  content: fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  relativePath,
}));
fs.mkdirSync(evidenceDir, { recursive: true });

const envSource = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const databaseLine = envSource.split(/\r?\n/).find((line) => line.trim().startsWith("DATABASE_URL="));
const databaseUrl = databaseLine?.slice(databaseLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Sprint 15 browser QA requires the local PostgreSQL URL from .env.");
}

const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const email = `sprint-15-browser-${runId}@example.invalid`;
const password = "Sprint-15-Browser-Password";
const authSubject = `sprint-15-browser-${runId}`;
const requestEmail = `sprint-15-reset-${runId}@example.invalid`;
let user = null;
let workspace = null;
let serverProcess = null;
let browser = null;
let serverLogs = "";

function durableRateLimitKey(value) {
  return createHash("sha256")
    .update(`revory-rate-limit:${value.trim().toLowerCase()}`)
    .digest("hex");
}

async function isServerReady() {
  try {
    return (await fetch(`${baseURL}/sign-up`, { redirect: "manual" })).status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isServerReady()) return;
  if (process.env.REVORY_QA_BASE_URL) throw new Error(`Configured QA server is unavailable at ${baseURL}.`);
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--port", "3005"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      AUTH_EMAIL_FROM: "REVORY QA <security@revory.local>",
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      RESEND_API_KEY: "re_sprint15_local_fake",
      REVORY_QA_DIST_DIR: ".next-s15",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  serverProcess.stdout?.on("data", (chunk) => { serverLogs = `${serverLogs}${String(chunk)}`.slice(-12_000); });
  serverProcess.stderr?.on("data", (chunk) => { serverLogs = `${serverLogs}${String(chunk)}`.slice(-12_000); });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isServerReady()) return;
    if (serverProcess.exitCode !== null) throw new Error(`Sprint 15 QA server exited early.\n${serverLogs}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Sprint 15 QA server did not become ready.\n${serverLogs}`);
}

try {
  const salt = randomBytes(16).toString("base64url");
  const key = await promisify(scryptCallback)(password, salt, 64);
  const passwordHash = `scrypt$${salt}$${Buffer.from(key).toString("base64url")}`;
  user = await prisma.user.create({
    data: {
      authProvider: "credentials",
      authSubject,
      email,
      emailVerifiedAt: new Date(),
      fullName: "Sprint 15 Browser QA",
      passwordHash,
      status: "ACTIVE",
    },
  });
  workspace = await prisma.workspace.create({
    data: {
      name: "Sprint 15 Browser QA",
      ownerUserId: user.id,
      slug: `s15-${runId}`,
      status: "ACTIVE",
    },
  });
  await prisma.workspaceEntitlement.create({
    data: {
      analysisRunsUsed: 1,
      maxAnalysisRuns: 1,
      offerKey: "QUOTE_RECOVERY_AUDIT",
      status: "ACTIVE",
      workspaceId: workspace.id,
    },
  });
  await prisma.quoteRecoveryAnalysisRun.create({
    data: {
      completedAt: new Date(),
      dataQualityJson: {},
      findingSnapshotJson: [],
      status: "COMPLETED",
      workspaceId: workspace.id,
    },
  });

  await ensureServer();
  browser = await chromium.launch({ headless: true });

  for (const viewport of [
    { height: 900, label: "desktop", width: 1440 },
    { height: 844, label: "mobile", width: 390 },
  ]) {
    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

    await page.goto("/", { waitUntil: "networkidle" });
    const pricingLink = page.getByRole("link", { name: "See pricing", exact: true });
    await pricingLink.waitFor();
    if ((await pricingLink.getAttribute("href")) !== "#pricing") {
      throw new Error(`${viewport.label}: header primary CTA must point to #pricing.`);
    }
    const heroPricingLink = page.getByRole("link", { name: /See plans and pricing/ });
    if ((await heroPricingLink.getAttribute("href")) !== "#pricing") {
      throw new Error(`${viewport.label}: hero primary CTA must point to #pricing.`);
    }
    await heroPricingLink.click();
    if (new URL(page.url()).hash !== "#pricing") {
      throw new Error(`${viewport.label}: primary landing CTA did not reach pricing.`);
    }
    const sampleLinks = page.getByRole("link", { name: "View sample demo", exact: true });
    if ((await sampleLinks.count()) < 1) {
      throw new Error(`${viewport.label}: secondary sample demo path is missing.`);
    }
    await page.screenshot({ path: path.join(evidenceDir, `landing-${viewport.label}.png`), fullPage: true });
    await sampleLinks.first().click();
    await page.waitForURL(/\/demo$/);
    await page.getByText("Cedar Ridge Contractors sample workspace", { exact: true }).waitFor();
    await page.getByRole("heading", { name: "See what may still be recoverable - and why." }).waitFor();
    await page.getByRole("heading", { name: "Top opportunities" }).waitFor();
    await page.getByRole("heading", { name: "Data readiness" }).waitFor();
    await page.getByRole("heading", { name: "What deserves review first" }).waitFor();
    if (await page.getByText("Source lineage", { exact: true }).count()) {
      throw new Error(`${viewport.label}: implementation-facing source-lineage label remains in the public demo.`);
    }
    if (await page.locator('input[type="file"], form[action*="billing"], form[action*="imports"]').count()) {
      throw new Error(`${viewport.label}: public demo exposes a write, import or billing control.`);
    }
    const demoOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (demoOverflow > 1) throw new Error(`${viewport.label}: demo horizontal overflow is ${demoOverflow}px.`);
    await page.screenshot({ path: path.join(evidenceDir, `demo-${viewport.label}.png`), fullPage: true });

    await page.goto("/sign-up", { waitUntil: "networkidle" });
    await page.getByLabel("Name").fill("Mismatch QA");
    await page.getByLabel("Work email").fill(`mismatch-${viewport.label}-${runId}@example.invalid`);
    await page.getByLabel("Password", { exact: true }).fill("Mismatch-Password-15");
    await page.getByLabel("Confirm password").fill("Different-Password-15");
    await page.getByRole("button", { name: "Create account with email" }).click();
    await page.getByRole("alert").getByText("Passwords do not match.").waitFor();

    await page.goto("/forgot-password", { waitUntil: "networkidle" });
    await page.getByLabel("Work email").fill(`${viewport.label}-${requestEmail}`);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await page.getByTestId("password-reset-request-success").waitFor();
    await page.getByText("Check your inbox", { exact: true }).waitFor();
    await page.getByText(/If an email\/password REVORY account matches this address/).waitFor();

    await page.goto("/reset-password?token=browser-invalid-token", { waitUntil: "networkidle" });
    await page.getByLabel("New password", { exact: true }).fill("Mismatch-Password-15");
    await page.getByLabel("Confirm new password").fill("Different-Password-15");
    await page.getByRole("button", { name: "Update password" }).click();
    await page.getByRole("alert").getByText("Passwords do not match.").waitFor();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`${viewport.label}: auth flow horizontal overflow is ${overflow}px.`);
    if (errors.length) throw new Error(`${viewport.label}: browser console errors: ${errors.join(" | ")}`);
    await page.screenshot({ path: path.join(evidenceDir, `auth-${viewport.label}.png`), fullPage: true });
    await context.close();
  }

  const appContext = await browser.newContext({ baseURL, viewport: { height: 1000, width: 1440 } });
  const appPage = await appContext.newPage();
  await appPage.goto("/sign-in", { waitUntil: "networkidle" });
  await appPage.getByLabel("Work email").fill(email);
  await appPage.getByLabel("Password", { exact: true }).fill(password);
  await appPage.getByRole("button", { name: "Continue with email" }).click();
  await appPage.waitForURL(/\/app/);
  await appPage.goto("/app/dashboard", { waitUntil: "networkidle" });
  const continuation = appPage.getByTestId("audit-continuation");
  await continuation.getByText("Your Audit establishes the baseline.").waitFor();
  await continuation.getByText(/US\$399\/month after the completed Audit/).waitFor();
  if (await continuation.getByRole("button").count()) {
    throw new Error("The post-Audit explanation must not expose a payment button.");
  }
  await prisma.workspaceEntitlement.create({
    data: { offerKey: "STARTER", status: "ACTIVE", workspaceId: workspace.id },
  });
  await appPage.reload({ waitUntil: "networkidle" });
  if (await appPage.getByTestId("audit-continuation").count()) {
    throw new Error("The Audit continuation card must disappear when Starter is already active.");
  }
  await appPage.screenshot({ path: path.join(evidenceDir, "starter-active-dashboard.png"), fullPage: true });
  await appContext.close();

  console.log(`Sprint 15 desktop/mobile auth and gated Audit continuation browser QA: PASS (${evidenceDir})`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill("SIGTERM");
  if (workspace) await prisma.workspace.deleteMany({ where: { id: workspace.id } });
  if (user) await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.authRateLimitBucket.deleteMany({
    where: { key: { in: ["desktop", "mobile"].map((label) => durableRateLimitKey(`password-reset:${label}-${requestEmail}`)) } },
  });
  await prisma.$disconnect();
  fs.rmSync(qaDistDir, { force: true, recursive: true });
  for (const snapshot of generatedSourceSnapshots) {
    fs.writeFileSync(path.join(process.cwd(), snapshot.relativePath), snapshot.content);
  }
}
