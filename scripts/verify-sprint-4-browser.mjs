import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error("Sprint 4 QA helpers are disabled in production.");
}

const prisma = new PrismaClient();
const runId = `s4-${Date.now()}`;
const authSubject = `qa|${runId}`;
const email = `${runId}@example.invalid`;
const password = "Sprint4-QA-Password";
let baseURL = process.env.REVORY_QA_BASE_URL ?? "http://localhost:3001";
const evidenceDir = path.join(os.tmpdir(), "revory-sprint-4");
const fixtureDir = path.join(evidenceDir, "fixtures");
const qaDistDir = path.join(process.cwd(), ".next-qa");
fs.mkdirSync(fixtureDir, { recursive: true });

let serverProcess = null;
let serverLogs = "";
let user;
let workspace;
let browser;

async function isServerReady(url = baseURL) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function ensureLocalQaServer() {
  if (await isServerReady()) return;
  if (process.env.REVORY_QA_BASE_URL) {
    throw new Error(`Configured QA server is unavailable at ${baseURL}.`);
  }
  const envSource = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const databaseLine = envSource
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("DATABASE_URL="));
  const localDatabaseUrl = databaseLine?.slice(databaseLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  if (!localDatabaseUrl) throw new Error("Local .env DATABASE_URL is required for Sprint 4 QA.");
  const databaseHost = new URL(localDatabaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error(`Sprint 4 QA refuses a non-local database host: ${databaseHost}`);
  }
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--port", "3001"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      DATABASE_URL: localDatabaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      REVORY_INTERNAL_PREVIEW_MODE: "true",
      REVORY_LLM_ENABLED: "false",
      REVORY_QA_DIST_DIR: ".next-qa",
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
    if (serverProcess.exitCode !== null) {
      throw new Error(`Local QA server exited early.\n${serverLogs}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local QA server did not become ready.\n${serverLogs}`);
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
      fullName: "Sprint 4 QA",
      passwordHash,
      status: "ACTIVE",
    },
  });
  workspace = await prisma.workspace.create({
    data: {
      activationSetup: { create: { currentStep: "complete", isCompleted: true } },
      name: "Sprint 4 QA Workspace",
      ownerUserId: user.id,
      slug: `s4-${Date.now()}`,
      status: "ACTIVE",
    },
  });

  const customersPath = path.join(fixtureDir, "customers.csv");
  const estimatesPath = path.join(fixtureDir, "estimates.csv");
  const activitiesPath = path.join(fixtureDir, "activities.csv");
  const jobsPath = path.join(fixtureDir, "jobs.csv");
  const invoicesPath = path.join(fixtureDir, "invoices.csv");
  const changesPath = path.join(fixtureDir, "change-orders.csv");
  const costsPath = path.join(fixtureDir, "costs.csv");
  fs.writeFileSync(
    customersPath,
    "Customer ID,Customer Name,Email Address\nCUS-QA-1,Sample Contractor,owner@example.invalid\n",
  );
  fs.writeFileSync(
    estimatesPath,
    [
      "Quote ID,Customer ID,Quote Status,Quote Amount,Quote Date,Last Contact Date,Next Follow Up,Owner,Next Step",
      "EST-QA-1,CUS-QA-1,open,18000,2026-01-02,2026-01-10,2026-02-01,,Review evidence",
      "EST-QA-2,CUS-QA-1,open,9500,2026-02-02,2026-02-04,2026-03-01,Alex,Follow up",
    ].join("\n"),
  );
  fs.writeFileSync(
    activitiesPath,
    [
      "Activity ID,Quote ID,Activity Date,Activity Type,Outcome,Next Step",
      "ACT-QA-1,EST-QA-1,2026-01-10,email,No reply,Review evidence",
      "ACT-QA-2,EST-QA-2,2026-02-04,call,No reply,Follow up",
    ].join("\n"),
  );
  fs.writeFileSync(
    jobsPath,
    "Project ID,Project Status,Contract Amount,Includes Approved Changes,Currency,Target Margin Percent,Scope Change Flag,Project Notes,Completion Date\nJOB-QA-1,completed,100000,false,USD,40,false,Final scope documented,2026-06-30\n",
  );
  fs.writeFileSync(
    invoicesPath,
    "Invoice Number,Project ID,Billing Status,Invoice Total,Currency,Invoice Date\nINV-QA-1,JOB-QA-1,issued,60000,USD,2026-06-15\n",
  );
  fs.writeFileSync(
    changesPath,
    "CO ID,Project ID,Approval Status,Billing Status,Approved Value,Currency,Approval Date,Scope Description\nCO-QA-1,JOB-QA-1,approved,unbilled,10000,USD,2026-06-10,Approved premium material upgrade\n",
  );
  fs.writeFileSync(
    costsPath,
    "Expense ID,Project ID,Actual Cost,Currency,Expense Date,Expense Category\nCOST-QA-1,JOB-QA-1,55000,USD,2026-06-20,materials\n",
  );

  await ensureLocalQaServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL, viewport: { height: 1000, width: 1440 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/sign-in?redirect_url=%2Fapp%2Fimports", { waitUntil: "networkidle" });
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.waitForURL("**/app/imports", { timeout: 15_000 }).catch(async () => {
    await page.screenshot({ path: path.join(evidenceDir, "auth-failure.png"), fullPage: true });
    throw new Error(
      `Credentials login did not reach imports. URL=${page.url()} BODY=${(await page.locator("body").innerText()).slice(0, 800)}`,
    );
  });

  await page.getByLabel("Customers file").setInputFiles(customersPath);
  await page.getByLabel("Estimates file").setInputFiles(estimatesPath);
  await page.getByLabel("Activities file").setInputFiles(activitiesPath);
  await page.getByRole("button", { name: "Profile files and review mapping" }).click();
  await page.getByText("Review every suggested mapping").waitFor({ timeout: 15_000 }).catch(async () => {
    await page.screenshot({ path: path.join(evidenceDir, "mapping-failure.png"), fullPage: true });
    throw new Error(
      `Mapping review did not become ready. BODY=${(await page.locator("body").innerText()).slice(-1_800)} SERVER=${serverLogs}`,
    );
  });
  await page.getByLabel(/I reviewed each mapping/).check();
  await page.getByRole("button", { name: "Confirm mapping and import atomically" }).click();
  await page.getByText("Canonical import committed atomically.").waitFor({ timeout: 20_000 }).catch(async () => {
    await page.screenshot({ path: path.join(evidenceDir, "commit-failure.png"), fullPage: true });
    throw new Error(
      `Canonical commit did not complete. BODY=${(await page.locator("body").innerText()).slice(-2_200)} SERVER=${serverLogs}`,
    );
  });
  await page.screenshot({ path: path.join(evidenceDir, "imports-desktop.png"), fullPage: true });

  await page.goto("/app/imports", { waitUntil: "networkidle" });
  await page.getByLabel("Jobs file").setInputFiles(jobsPath);
  await page.getByLabel("Invoices file").setInputFiles(invoicesPath);
  await page.getByLabel("Change orders file").setInputFiles(changesPath);
  await page.getByLabel("Costs file").setInputFiles(costsPath);
  await page.getByRole("button", { name: "Profile files and review mapping" }).click();
  await page.getByText("Review every suggested mapping").waitFor({ timeout: 15_000 });
  await page.getByLabel(/I reviewed each mapping/).check();
  await page.getByRole("button", { name: "Confirm mapping and import atomically" }).click();
  await page.getByText("Canonical import committed atomically.").waitFor({ timeout: 20_000 });

  await page.goto("/app/revenue-realization", { waitUntil: "networkidle" });
  if (!(await page.getByText("Turn defensible reconciliation into review-ready findings.").isVisible())) {
    throw new Error("Revenue Realization Sprint 9 headline missing.");
  }
  if (!(await page.getByText("$50,000.00").first().isVisible())) {
    throw new Error("Reconstructable calculated billing difference missing.");
  }
  if (!(await page.getByText("Every explicit link resolves to exactly one record.").isVisible())) {
    throw new Error("Explicit matching review did not resolve fixture links.");
  }
  for (const expected of ["UNDERBILLING GAP", "APPROVED CHANGE ORDER NOT BILLED", "MARGIN AT RISK", "$10,000.00", "$19,000.00"]) {
    if (!(await page.getByText(expected, { exact: true }).first().isVisible())) {
      throw new Error(`Sprint 9 finding evidence missing: ${expected}`);
    }
  }
  const findingCountBeforeRefresh = await prisma.revenueRealizationFinding.count({ where: { workspaceId: workspace.id } });
  await page.getByRole("button", { name: "Refresh deterministic findings" }).click();
  await page.waitForLoadState("networkidle");
  const findingCountAfterRefresh = await prisma.revenueRealizationFinding.count({ where: { workspaceId: workspace.id } });
  if (findingCountBeforeRefresh !== findingCountAfterRefresh) {
    throw new Error(`Sprint 9 persisted rerun drifted from ${findingCountBeforeRefresh} to ${findingCountAfterRefresh} findings.`);
  }
  await page.screenshot({ path: path.join(evidenceDir, "sprint-9-findings-desktop.png"), fullPage: true });
  await page.getByText("UNDERBILLING GAP", { exact: true }).first().click();
  await page.getByText("Source lineage").waitFor();
  if (!(await page.getByText("This calculated gap contributes to the executive billing-gap total.", { exact: false }).isVisible())) {
    throw new Error("Dedicated Sprint 9 evidence view is missing its additive-boundary label.");
  }
  await page.screenshot({ path: path.join(evidenceDir, "sprint-9-evidence-desktop.png"), fullPage: true });
  await page.goto("/app/revenue-realization/report", { waitUntil: "networkidle" });
  if (!(await page.getByText("Executive Revenue Realization read").isVisible())) {
    throw new Error(`Full Revenue Leak executive report is missing. URL=${page.url()} BODY=${(await page.locator("body").innerText()).slice(-1800)} SERVER=${serverLogs}`);
  }
  await page.screenshot({ path: path.join(evidenceDir, "sprint-9-report-desktop.png"), fullPage: true });

  await page.goto("/app/dashboard", { waitUntil: "networkidle" });
  if (!(await page.getByText("See what may still be recoverable").isVisible())) {
    throw new Error("Contractor dashboard headline missing.");
  }
  if (!(await page.getByText("$18,000").first().isVisible())) {
    throw new Error("Estimated opportunity value missing from dashboard.");
  }
  await page.screenshot({ path: path.join(evidenceDir, "dashboard-desktop.png"), fullPage: true });

  const finding = await prisma.quoteRecoveryFinding.findFirst({
    where: { estimateExternalId: "EST-QA-1", workspaceId: workspace.id },
    orderBy: { severity: "desc" },
  });
  if (!finding) throw new Error("Canonical import did not create a Quote Recovery finding.");
  await page.goto(`/app/revenue-leaks/${finding.id}`, { waitUntil: "networkidle" });
  if (!(await page.getByText("Source lineage").isVisible())) throw new Error("Evidence detail missing.");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await page.getByText("Resolved", { exact: true }).waitFor({ timeout: 10_000 });

  const exportResponse = await context.request.get("/app/quote-recovery/export");
  if (exportResponse.status() !== 200 || !(await exportResponse.text()).includes("EST-QA-1")) {
    throw new Error("Workspace-scoped CSV export failed.");
  }

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/app/dashboard", { waitUntil: "networkidle" });
  if (!(await page.getByText("See what may still be recoverable").isVisible())) {
    throw new Error("Mobile dashboard headline missing.");
  }
  await page.screenshot({ path: path.join(evidenceDir, "dashboard-mobile.png"), fullPage: true });
  await page.goto("/app/revenue-realization", { waitUntil: "networkidle" });
  if (!(await page.getByText("Turn defensible reconciliation into review-ready findings.").isVisible())) {
    throw new Error("Mobile Revenue Realization headline missing.");
  }
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (horizontalOverflow > 1) throw new Error(`Revenue Realization mobile overflow: ${horizontalOverflow}px`);
  await page.screenshot({ path: path.join(evidenceDir, "sprint-9-findings-mobile.png"), fullPage: true });
  if (await page.locator("[data-nextjs-dialog],.vite-error-overlay").count()) {
    throw new Error("Framework error overlay detected.");
  }
  if (errors.length) throw new Error(`Browser console errors: ${errors.join(" | ")}`);
  await context.close();
  console.log(
    "Sprint 4 plus Sprints 7-9 authenticated browser: login, assisted imports, Data Quality, dashboard, persisted Tier 2 findings, dedicated evidence, executive report, idempotent rerun and mobile: PASS",
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (workspace) await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
  if (user) await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  await prisma.$disconnect();
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
  }
  fs.rmSync(qaDistDir, { force: true, recursive: true });
}
