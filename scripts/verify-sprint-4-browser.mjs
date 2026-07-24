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
const qaPort = 3100 + Math.floor(Math.random() * 400);
let baseURL = process.env.REVORY_QA_BASE_URL ?? `http://localhost:${qaPort}`;
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
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--port", String(qaPort)], {
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
  const auditEntitlement = await prisma.workspaceEntitlement.create({
    data: {
      analysisRunsUsed: 0,
      maxAnalysisRuns: 1,
      offerKey: "QUOTE_RECOVERY_AUDIT",
      status: "ACTIVE",
      workspaceId: workspace.id,
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
      "Quote ID,Customer ID,Quote Status,Quote Amount,Quote Date,Last Contact Date,Next Follow Up,Owner,Lead Source,Service Type,Next Step,Job ID",
      "EST-QA-1,CUS-QA-1,open,18000,2026-01-02,2026-01-10,2026-02-01,Alex,Referral,Roofing,Review evidence,",
      "EST-QA-2,CUS-QA-1,open,9500,2026-02-02,2026-02-04,2026-03-01,Alex,Referral,Roofing,Follow up,",
      "EST-QA-3,CUS-QA-1,open,12000,2026-02-03,2026-02-05,2026-03-02,Alex,Referral,Roofing,Follow up,",
      "EST-QA-4,CUS-QA-1,open,14000,2026-02-04,2026-02-06,2026-03-03,Alex,Referral,Roofing,Follow up,",
      "EST-QA-5,CUS-QA-1,open,16000,2026-02-05,2026-02-07,2026-03-04,Alex,Referral,Roofing,Follow up,",
      "EST-QA-6,CUS-QA-1,open,17000,2026-02-06,2026-02-08,2026-03-05,Alex,Referral,Roofing,Follow up,",
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
    [
      "Project ID,Project Status,Contract Amount,Includes Approved Changes,invoiceExportComplete,changeOrderExportComplete,costExportComplete,Currency,Owner,Lead Source,Service Type,Target Margin Percent,Scope Change Flag,Project Notes,Completion Date",
      "JOB-QA-1,completed,100000,false,true,true,true,USD,Alex,Referral,Roofing,40,false,Final scope documented,2026-06-30",
      "JOB-QA-2,completed,20000,true,true,true,true,USD,Alex,Referral,Roofing,35,false,Final scope documented,2026-06-30",
      "JOB-QA-3,completed,20000,true,true,true,true,USD,Alex,Referral,Roofing,35,false,Final scope documented,2026-06-30",
      "JOB-QA-4,completed,20000,true,true,true,true,USD,Alex,Referral,Roofing,35,false,Final scope documented,2026-06-30",
      "JOB-QA-5,completed,20000,true,true,true,true,USD,Alex,Referral,Roofing,35,false,Final scope documented,2026-06-30",
    ].join("\n"),
  );
  fs.writeFileSync(
    invoicesPath,
    [
      "Invoice Number,Project ID,Billing Status,Invoice Total,Currency,Invoice Date",
      "INV-QA-1,JOB-QA-1,issued,60000,USD,2026-06-15",
      "INV-QA-2,JOB-QA-2,issued,10000,USD,2026-06-15",
      "INV-QA-3,JOB-QA-3,issued,10000,USD,2026-06-15",
      "INV-QA-4,JOB-QA-4,issued,10000,USD,2026-06-15",
      "INV-QA-5,JOB-QA-5,issued,10000,USD,2026-06-15",
    ].join("\n"),
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

  const legalConsent = page.getByRole("checkbox", {
    name: /I agree to the Terms of Service and acknowledge the Privacy Notice/i,
  });
  if (await legalConsent.isVisible()) {
    await legalConsent.check();
    await page.getByRole("button", { name: "Accept and continue to REVORY" }).click();
    await page.waitForURL("**/app/dashboard", { timeout: 15_000 });
    if (await legalConsent.isVisible()) {
      throw new Error("Legal acceptance remained visible after a successful submission.");
    }
  }

  await page.goto("/app/settings", { waitUntil: "networkidle" });
  await page.getByLabel("Default currency").selectOption("CAD");
  await page.getByRole("button", { name: "Save currency" }).click();
  await page.waitForLoadState("networkidle");
  let currencyWorkspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspace.id } });
  for (let attempt = 0; attempt < 30 && currencyWorkspace.defaultCurrency !== "CAD"; attempt += 1) {
    await page.waitForTimeout(100);
    currencyWorkspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspace.id } });
  }
  if (currencyWorkspace.defaultCurrency !== "CAD") {
    throw new Error(`Workspace currency setting did not persist; found ${currencyWorkspace.defaultCurrency}.`);
  }
  await page.goto("/app/imports", { waitUntil: "networkidle" });
  if (!(await page.getByText(/Currency fallback:\s*CAD/).isVisible())) {
    throw new Error("Import currency fallback explanation is missing.");
  }

  const sourceSystem = page.getByLabel("Where did these exports come from?");
  if ((await sourceSystem.evaluate((element) => element.tagName)) !== "SELECT") {
    throw new Error("Source system must be a standardized select, not a free-text field.");
  }
  await sourceSystem.selectOption("manual-export");
  await page.getByLabel("Customers file").setInputFiles(customersPath);
  await page.getByLabel("Estimates file").setInputFiles(estimatesPath);
  await page.getByLabel("Activities file").setInputFiles(activitiesPath);
  const selectedQuoteFiles = await page.locator('#canonical-intake-form input[type="file"]').evaluateAll((inputs) => inputs.map((input) => input.files?.[0]?.name).filter(Boolean));
  if (selectedQuoteFiles.length !== 3) throw new Error(`Expected 3 selected quote files, found ${selectedQuoteFiles.join(", ") || "none"}.`);
  await page.getByText("3 files attached and ready to review.").waitFor();
  for (const selectedFile of ["customers.csv", "estimates.csv", "activities.csv"]) {
    if (!(await page.getByText(selectedFile, { exact: true }).isVisible())) {
      throw new Error(`Selected file confirmation missing for ${selectedFile}.`);
    }
  }
  const profileButton = page.getByRole("button", { name: "Review files and column matches" });
  const attentionAnimation = await profileButton.evaluate((element) => getComputedStyle(element).animationName);
  if (attentionAnimation !== "rev-button-attention-pulse") {
    throw new Error(`Profile action should pulse after file selection; animation=${attentionAnimation}.`);
  }
  await page.waitForTimeout(250);
  await profileButton.click();
  await page.getByText("Check the column matches below, then confirm the import.").waitFor({ timeout: 15_000 }).catch(async () => {
    await page.screenshot({ path: path.join(evidenceDir, "mapping-failure.png"), fullPage: true });
    throw new Error(
      `Mapping review did not become ready. BODY=${(await page.locator("body").innerText()).slice(-1_800)} SERVER=${serverLogs}`,
    );
  });
  if (!(await page.getByText("Empty", { exact: true }).first().isVisible())) {
    throw new Error("Traffic-light mapping review did not flag an empty mapped column for review.");
  }
  const animationAfterReview = await profileButton.evaluate((element) => getComputedStyle(element).animationName);
  if (animationAfterReview !== "none") {
    throw new Error(`Profile action should stop pulsing after review opens; animation=${animationAfterReview}.`);
  }
  await page.getByLabel(/I reviewed the column matches/).check();
  await page.getByLabel(/complete current export/).check();
  await page.getByRole("button", { name: "Use one-time Audit and create read" }).click();
  await page.getByRole("dialog", { name: "Use this import for your one-time Quote Recovery Audit?" }).waitFor();
  const unusedAudit = await prisma.workspaceEntitlement.findUniqueOrThrow({
    where: { id: auditEntitlement.id },
  });
  if (unusedAudit.analysisRunsUsed !== 0) {
    throw new Error("Opening the one-time Audit confirmation must not consume the analysis run.");
  }
  await page.getByRole("button", { name: "Use Audit and create read" }).click();
  await page.getByText(/Your files were imported and the latest REVORY read is ready/).waitFor({ timeout: 20_000 }).catch(async () => {
    await page.screenshot({ path: path.join(evidenceDir, "commit-failure.png"), fullPage: true });
    throw new Error(
      `Canonical commit did not complete. BODY=${(await page.locator("body").innerText()).slice(-2_200)} SERVER=${serverLogs}`,
    );
  });
  const consumedAudit = await prisma.workspaceEntitlement.findUniqueOrThrow({
    where: { id: auditEntitlement.id },
  });
  if (consumedAudit.analysisRunsUsed !== 1) {
    throw new Error(`Successful one-time Audit commit must consume exactly one run; found ${consumedAudit.analysisRunsUsed}.`);
  }
  const rememberedMappings = await prisma.savedCanonicalMapping.findMany({
    where: { workspaceId: workspace.id },
    select: { sourceSystem: true },
  });
  if (!rememberedMappings.length || rememberedMappings.some((mapping) => mapping.sourceSystem !== "manual-export")) {
    throw new Error("Approved column mappings did not retain their workspace-scoped source system.");
  }
  await page.screenshot({ path: path.join(evidenceDir, "imports-desktop.png"), fullPage: true });

  await page.goto("/app/imports", { waitUntil: "networkidle" });
  await page.getByLabel("Customers file").setInputFiles(customersPath);
  await page.getByLabel("Estimates file").setInputFiles(estimatesPath);
  await page.getByLabel("Activities file").setInputFiles(activitiesPath);
  await page.getByRole("button", { name: "Review files and column matches" }).click();
  await page.getByText("Check the column matches below, then confirm the import.").waitFor({ timeout: 15_000 });
  if (await page.getByText("Saved workspace match", { exact: true }).count() < 3) {
    throw new Error("Approved workspace mappings were not reused for the same source columns.");
  }

  await prisma.workspaceEntitlement.create({
    data: {
      offerKey: "PRO",
      status: "ACTIVE",
      workspaceId: workspace.id,
    },
  });
  await page.goto("/app/imports", { waitUntil: "networkidle" });
  await page.getByLabel("Jobs file").setInputFiles(jobsPath);
  await page.getByLabel("Invoices file").setInputFiles(invoicesPath);
  await page.getByLabel("Change orders file").setInputFiles(changesPath);
  await page.getByLabel("Costs file").setInputFiles(costsPath);
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Review files and column matches" }).click();
  await page.getByText("Check the column matches below, then confirm the import.").waitFor({ timeout: 15_000 });
  await page.getByLabel(/I reviewed the column matches/).check();
  await page.getByLabel(/complete current export/).check();
  await page.getByRole("button", { name: "Import approved files and create read" }).click();
  await page.getByText(/Your files were imported and the latest REVORY read is ready/).waitFor({ timeout: 20_000 });

  await page.goto("/app/revenue-realization", { waitUntil: "networkidle" });
  if (!(await page.getByText("Turn defensible reconciliation into review-ready findings.").isVisible())) {
    throw new Error("Revenue Realization Sprint 9 headline missing.");
  }
  if (!(await page.getByText("$50,000.00").first().isVisible())) {
    throw new Error("Reconstructable calculated billing difference missing.");
  }
  if (!(await page.getByText("Every imported reference connects to exactly one record.").isVisible())) {
    throw new Error("Explicit matching review did not resolve fixture links.");
  }
  for (const expected of ["Underbilling Gap", "Approved Change Order Not Billed", "Margin At Risk", "$10,000.00", "$19,000.00"]) {
    if (!(await page.getByText(expected, { exact: true }).first().isVisible())) {
      throw new Error(`Sprint 9 finding evidence missing: ${expected}`);
    }
  }
  const findingCountBeforeRefresh = await prisma.revenueRealizationFinding.count({ where: { workspaceId: workspace.id } });
  await page.getByRole("button", { name: "Refresh findings" }).click();
  await page.waitForLoadState("networkidle");
  const findingCountAfterRefresh = await prisma.revenueRealizationFinding.count({ where: { workspaceId: workspace.id } });
  if (findingCountBeforeRefresh !== findingCountAfterRefresh) {
    throw new Error(`Sprint 9 persisted rerun drifted from ${findingCountBeforeRefresh} to ${findingCountAfterRefresh} findings.`);
  }
  await page.screenshot({ path: path.join(evidenceDir, "sprint-9-findings-desktop.png"), fullPage: true });
  await page.getByText("Underbilling Gap", { exact: true }).first().click();
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
  if (!(await page.getByText("CA$18,000").first().isVisible())) {
    throw new Error("Estimated opportunity value missing from dashboard.");
  }
  if (!(await page.locator('[data-testid="executive-metric"]').first().getByText("CA$86,500", { exact: true }).isVisible())) {
    throw new Error("Executive total must count each estimate exposure once.");
  }
  const dashboardHeadingBox = await page.getByRole("heading", { name: "See what may still be recoverable - and why." }).boundingBox();
  const executiveActionsBox = await page.locator('[data-testid="executive-actions"]').boundingBox();
  if (
    !dashboardHeadingBox ||
    !executiveActionsBox ||
    executiveActionsBox.x <= dashboardHeadingBox.x ||
    executiveActionsBox.y > dashboardHeadingBox.y + 80
  ) {
    throw new Error(`Executive actions are not anchored in the upper-right hero area: ${JSON.stringify({ dashboardHeadingBox, executiveActionsBox })}`);
  }
  const executiveActionRows = await page.locator('[data-testid="executive-actions"] > *').evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top)),
  );
  if (Math.max(...executiveActionRows) - Math.min(...executiveActionRows) > 2) {
    throw new Error(`Executive actions wrapped onto multiple rows: ${JSON.stringify(executiveActionRows)}`);
  }
  const executiveMetric = page.locator('[data-testid="executive-metric"]').first();
  const metricShadowBefore = await executiveMetric.evaluate((element) => getComputedStyle(element).boxShadow);
  await executiveMetric.hover();
  await page.waitForTimeout(260);
  const metricShadowAfter = await executiveMetric.evaluate((element) => getComputedStyle(element).boxShadow);
  if (metricShadowAfter === metricShadowBefore || metricShadowAfter === "none") {
    throw new Error("Executive metric hover glow is missing.");
  }
  const priorityOpportunity = page.locator('[data-testid="priority-opportunity"]').first();
  const opportunityShadowBefore = await priorityOpportunity.evaluate((element) => getComputedStyle(element).boxShadow);
  await priorityOpportunity.hover();
  await page.waitForTimeout(260);
  const opportunityShadowAfter = await priorityOpportunity.evaluate((element) => getComputedStyle(element).boxShadow);
  if (opportunityShadowAfter === opportunityShadowBefore || opportunityShadowAfter === "none") {
    throw new Error("Priority opportunity hover glow is missing.");
  }
  for (const [metricName, expectedFilter, filterLabel] of [
    ["Opportunities to review", "ACTIVE", "To review"],
    ["Estimates with value", "FINANCIAL", "With value"],
    ["Process gaps", "OPERATIONAL", "Process gaps"],
  ]) {
    await page.goto("/app/dashboard", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: new RegExp(metricName) }).click();
    await page.waitForURL(`**/app/revenue-leaks?filter=${expectedFilter}`);
    await page.waitForLoadState("networkidle");
    const activeFilter = page.getByRole("link", { name: filterLabel, exact: true });
    await activeFilter.waitFor({ state: "visible" });
  }
  await page.goto("/app/dashboard", { waitUntil: "networkidle" });
  for (const qualityLabel of ["Records imported", "Connections confirmed", "Checks available"]) {
    if (!(await page.getByText(qualityLabel, { exact: true }).isVisible())) {
      throw new Error(`Natural-language import health label missing: ${qualityLabel}.`);
    }
  }
  if (!(await page.getByRole("link", { name: /Review import issues|Review data connections|View import details/ }).isVisible())) {
    throw new Error("Import review action is missing.");
  }
  const quoteRecoveryPdfResponse = await context.request.get("/app/dashboard/report.pdf");
  const quoteRecoveryPdfBytes = await quoteRecoveryPdfResponse.body();
  if (
    quoteRecoveryPdfResponse.status() !== 200
    || quoteRecoveryPdfResponse.headers()["content-type"] !== "application/pdf"
    || quoteRecoveryPdfBytes.subarray(0, 4).toString() !== "%PDF"
  ) {
    throw new Error(
      `Quote Recovery executive PDF failed. status=${quoteRecoveryPdfResponse.status()} content-type=${quoteRecoveryPdfResponse.headers()["content-type"]}`,
    );
  }
  fs.writeFileSync(path.join(evidenceDir, "quote-recovery-executive-report.pdf"), quoteRecoveryPdfBytes);
  await page.screenshot({ path: path.join(evidenceDir, "dashboard-desktop.png"), fullPage: true });

  await page.goto("/app/data-quality", { waitUntil: "networkidle" });
  if (!(await page.getByText("See what is ready, incomplete or blocking.").isVisible())) {
    throw new Error("Data Quality drill-down headline missing.");
  }
  if (!(await page.getByText("Records that need an exact ID match").isVisible())) {
    throw new Error("Data Quality relation detail is missing.");
  }
  await page.screenshot({ path: path.join(evidenceDir, "data-quality-detail-desktop.png"), fullPage: true });

  await page.goto("/app/revenue-leaks", { waitUntil: "networkidle" });
  const exportFindingsButton = page.getByRole("link", { name: "Export current findings" });
  const exportFindingsBox = await exportFindingsButton.boundingBox();
  if (!exportFindingsBox || exportFindingsBox.height > 56 || exportFindingsBox.width > 240) {
    throw new Error(`Quote Recovery export CTA is disproportionate: ${JSON.stringify(exportFindingsBox)}`);
  }
  await page.screenshot({ path: path.join(evidenceDir, "quote-recovery-opportunities-desktop.png"), fullPage: true });

  const finding = await prisma.quoteRecoveryFinding.findFirst({
    where: { estimateExternalId: "EST-QA-1", workspaceId: workspace.id },
    orderBy: { severity: "desc" },
  });
  if (!finding) throw new Error("Canonical import did not create a Quote Recovery finding.");
  await page.goto(`/app/revenue-leaks/${finding.id}`, { waitUntil: "networkidle" });
  if (!(await page.getByText("Source evidence").isVisible())) throw new Error("Evidence detail missing.");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await page.getByText("Resolved", { exact: true }).waitFor({ timeout: 10_000 });

  const exportResponse = await context.request.get("/app/quote-recovery/export");
  const exportText = await exportResponse.text();
  if (
    exportResponse.status() !== 200
    || !exportText.includes("EST-QA-1")
    || !exportText.includes("counted_in_estimated_total")
    || !exportText.includes("estimated_total_contribution_cents")
  ) {
    throw new Error("Workspace-scoped CSV export failed.");
  }

  await page.goto("/app/history", { waitUntil: "networkidle" });
  if (!(await page.getByText("Turn recurring reads into one careful weekly decision.").isVisible())) {
    throw new Error("Growth intelligence headline missing.");
  }
  if (!(await page.getByText(/Review .* first\./).first().isVisible())) {
    throw new Error(`Sample-guarded weekly decision missing. BODY=${(await page.locator("body").innerText()).slice(-1800)}`);
  }
  if (!(await page.getByText("Source, owner and service concentration.").isVisible())) {
    throw new Error("Growth segmentation surface missing.");
  }
  const pdfResponse = await context.request.get("/app/history/report.pdf");
  const pdfBytes = await pdfResponse.body();
  if (pdfResponse.status() !== 200 || pdfResponse.headers()["content-type"] !== "application/pdf" || pdfBytes.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`Growth executive PDF failed. status=${pdfResponse.status()} content-type=${pdfResponse.headers()["content-type"]}`);
  }
  fs.writeFileSync(path.join(evidenceDir, "sprint-10-growth-report.pdf"), pdfBytes);
  await page.screenshot({ path: path.join(evidenceDir, "sprint-10-growth-desktop.png"), fullPage: true });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/app/dashboard", { waitUntil: "networkidle" });
  if (!(await page.getByText("See what may still be recoverable").isVisible())) {
    throw new Error("Mobile dashboard headline missing.");
  }
  await page.screenshot({ path: path.join(evidenceDir, "dashboard-mobile.png"), fullPage: true });
  await page.goto("/app/revenue-leaks", { waitUntil: "networkidle" });
  const mobileExportFindingsBox = await page.getByRole("link", { name: "Export current findings" }).boundingBox();
  if (!mobileExportFindingsBox || mobileExportFindingsBox.height > 56 || mobileExportFindingsBox.width > 240) {
    throw new Error(`Mobile Quote Recovery export CTA is disproportionate: ${JSON.stringify(mobileExportFindingsBox)}`);
  }
  const quoteRecoveryOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (quoteRecoveryOverflow > 1) throw new Error(`Quote Recovery mobile overflow: ${quoteRecoveryOverflow}px`);
  await page.screenshot({ path: path.join(evidenceDir, "quote-recovery-opportunities-mobile.png"), fullPage: true });
  await page.goto("/app/revenue-realization", { waitUntil: "networkidle" });
  if (!(await page.getByText("Turn defensible reconciliation into review-ready findings.").isVisible())) {
    throw new Error("Mobile Revenue Realization headline missing.");
  }
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (horizontalOverflow > 1) throw new Error(`Revenue Realization mobile overflow: ${horizontalOverflow}px`);
  await page.screenshot({ path: path.join(evidenceDir, "sprint-9-findings-mobile.png"), fullPage: true });
  await page.goto("/app/history", { waitUntil: "networkidle" });
  if (!(await page.getByText("Turn recurring reads into one careful weekly decision.").isVisible())) {
    throw new Error("Mobile Growth intelligence headline missing.");
  }
  const growthOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (growthOverflow > 1) throw new Error(`Growth intelligence mobile overflow: ${growthOverflow}px`);
  await page.screenshot({ path: path.join(evidenceDir, "sprint-10-growth-mobile.png"), fullPage: true });
  if (await page.locator("[data-nextjs-dialog]:visible,.vite-error-overlay:visible").count()) {
    throw new Error("Framework error overlay detected.");
  }
  if (errors.length) throw new Error(`Browser console errors: ${errors.join(" | ")}`);
  await context.close();
  console.log(
    "Authenticated browser: one-time Audit confirmation, assisted imports, traffic-light Data Quality drill-down, dashboard hover states, Quote Recovery and Growth PDFs, Tier 2 findings, idempotent snapshots and mobile: PASS",
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
