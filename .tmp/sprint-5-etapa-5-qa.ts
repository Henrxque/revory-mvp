import fs from "node:fs";
import path from "node:path";

import {
  CommunicationChannel,
  FlowModeKey,
  PrismaClient,
  UserStatus,
  WorkspaceStatus,
} from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "playwright";

import {
  buildAssistedImportConfirmationDraft,
  buildAssistedImportPayloadFromCsv,
  buildAssistedImportPreview,
  createMappedCsvText,
} from "@/services/imports/build-assisted-import-payload";
import { getDashboardOverview } from "@/services/dashboard/get-dashboard-overview";
import { getAtRiskClassification } from "@/services/at-risk/get-at-risk-classification";
import { getConfirmationClassification } from "@/services/confirmation/get-confirmation-classification";
import { parseCsvByTemplate } from "@/services/imports/parse-csv-by-template";
import { persistCsvImport } from "@/services/imports/persist-csv-import";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";
import { getOperationalSurface } from "@/services/operations/get-operational-surface";
import { getRecoveryOpportunityClassification } from "@/services/recovery/get-recovery-opportunity-classification";
import { getReminderClassification } from "@/services/reminder/get-reminder-classification";
import { getReviewRequestEligibilityClassification } from "@/services/review-request/get-review-request-eligibility-classification";

const projectRoot = "C:/Users/hriqu/Documents/revory-mvp";
const baseUrl = "http://localhost:3000";
const prisma = new PrismaClient();
const runStartedAt = new Date();
const runId = runStartedAt.toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(projectRoot, ".tmp", "qa-sprint4-etapa10", runId);
const fixturesDir = path.join(evidenceDir, "fixtures");
const resultsPath = path.join(evidenceDir, "results.json");
const envLocal = fs.readFileSync(path.join(projectRoot, ".env.local"), "utf8");
const authSecret =
  envLocal.match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "") ??
  "revory-local-auth-secret";

fs.mkdirSync(fixturesDir, { recursive: true });

const results = {
  baseUrl,
  bugs: [],
  email: null,
  finishedAt: null,
  findings: [],
  startedAt: runStartedAt.toISOString(),
  steps: [],
};

function recordStep(name, status, details = {}) {
  results.steps.push({
    details,
    name,
    status,
  });
}

function recordBug(severity, title, details = {}) {
  results.bugs.push({
    details,
    severity,
    title,
  });
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function toIso(date) {
  return date.toISOString();
}

function buildFixturePaths() {
  return {
    assistedAppointmentsCsvPath: path.join(fixturesDir, "appointments-assisted-stage10.csv"),
    officialAppointmentsCsvPath: path.join(fixturesDir, "appointments-official-stage10.csv"),
    officialClientsCsvPath: path.join(fixturesDir, "clients-official-stage10.csv"),
  };
}

function buildStage10Fixtures(now) {
  const plusHours = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);
  const minusDays = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const fixturePaths = buildFixturePaths();

  const officialAppointmentsCsv = [
    "appointment_external_id,client_full_name,client_external_id,client_email,client_phone,scheduled_at,status,service_name,provider_name,estimated_revenue,booked_at,canceled_at,location_name,source_notes",
    [
      "stage10_conf_ready",
      "Mia Confirmation",
      "stage10_cli_conf",
      "mia.confirmation@example.com",
      "",
      toIso(plusHours(36)),
      "SCHEDULED",
      "Hydrafacial",
      "Dr. Maia",
      "180",
      toIso(minusDays(4)),
      "",
      "Revory Prime",
      "Stage 10 confirmation ready",
    ].join(","),
    [
      "stage10_rem_ready",
      "Noa Reminder",
      "stage10_cli_rem",
      "noa.reminder@example.com",
      "",
      toIso(plusHours(12)),
      "SCHEDULED",
      "Skin Booster",
      "Dr. Maia",
      "220",
      toIso(minusDays(3)),
      "",
      "Revory Prime",
      "Stage 10 reminder ready",
    ].join(","),
    [
      "stage10_at_risk_blocked",
      "Lia At Risk",
      "stage10_cli_risk",
      "",
      "+5511999000001",
      toIso(plusHours(10)),
      "SCHEDULED",
      "Laser Session",
      "Dr. Maia",
      "250",
      toIso(minusDays(2)),
      "",
      "Revory Prime",
      "Stage 10 at-risk blocked by email",
    ].join(","),
    [
      "stage10_recovery_ready",
      "Rafa Recovery",
      "stage10_cli_recovery",
      "rafa.recovery@example.com",
      "",
      toIso(minusDays(2)),
      "CANCELED",
      "Botox",
      "Dr. Maia",
      "300",
      toIso(minusDays(7)),
      toIso(minusDays(2)),
      "Revory Prime",
      "Stage 10 recovery ready",
    ].join(","),
    [
      "stage10_review_ready",
      "Bia Review",
      "stage10_cli_review",
      "bia.review@example.com",
      "",
      toIso(minusDays(2)),
      "COMPLETED",
      "Peeling",
      "Dr. Maia",
      "140",
      toIso(minusDays(6)),
      "",
      "Revory Prime",
      "Stage 10 review ready",
    ].join(","),
    [
      "stage10_scheduled_later",
      "Zoe Later",
      "stage10_cli_later",
      "zoe.later@example.com",
      "",
      toIso(plusHours(72)),
      "SCHEDULED",
      "Consultation",
      "Dr. Maia",
      "90",
      toIso(minusDays(1)),
      "",
      "Revory Prime",
      "Stage 10 scheduled later",
    ].join(","),
  ].join("\n");

  const officialClientsCsv = [
    "full_name,external_id,email,phone,last_visit_at,total_visits,tags,notes",
    [
      "Clara Client Only",
      "stage10_cli_only",
      "clara.client@example.com",
      "+5511999000002",
      toIso(minusDays(5)),
      "3",
      "premium;manual",
      "Stage 10 clients regression row",
    ].join(","),
  ].join("\n");

  const assistedAppointmentsCsv = [
    "appt identifier,client name,scheduled visit,status text,client mobile number,service performed,revenue estimate,notes from spa",
    [
      "stage10_assisted_later",
      "Nia Assisted",
      toIso(plusHours(96)),
      "SCHEDULED",
      "+5511999000003",
      "LED Session",
      "110",
      "Stage 10 assisted import regression row",
    ].join(","),
  ].join("\n");

  fs.writeFileSync(fixturePaths.officialAppointmentsCsvPath, officialAppointmentsCsv, "utf8");
  fs.writeFileSync(fixturePaths.officialClientsCsvPath, officialClientsCsv, "utf8");
  fs.writeFileSync(fixturePaths.assistedAppointmentsCsvPath, assistedAppointmentsCsv, "utf8");

  return fixturePaths;
}

async function saveScreenshot(page, name) {
  await page.screenshot({
    fullPage: true,
    path: path.join(evidenceDir, `${name}.png`),
  });
}

async function createAuthenticatedWorkspaceIdentity(email) {
  const authSubject = `google-oauth2|qa-${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      authProvider: "google",
      authSubject,
      email,
      fullName: "Sprint 4 QA",
      status: UserStatus.ACTIVE,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      activeModeKey: FlowModeKey.MODE_B,
      name: "Sprint 4 QA Workspace",
      ownerUserId: user.id,
      slug: `sprint-4-qa-${Date.now()}`,
      status: WorkspaceStatus.ACTIVE,
    },
  });

  await prisma.activationSetup.create({
    data: {
      activatedAt: new Date(),
      currentStep: "activation",
      googleReviewsUrl: "https://g.page/r/stage10-reviews",
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_B,
      selectedTemplate: "MEDSPA",
      workspaceId: workspace.id,
    },
  });

  return {
    authSubject,
    workspace,
  };
}

async function injectAuthenticatedSession(page, authSubject, email) {
  const sessionToken = await encode({
    secret: authSecret,
    token: {
      email,
      name: "Sprint 4 QA",
      sub: authSubject,
    },
    maxAge: 60 * 60 * 24 * 30,
  });

  await page.goto(baseUrl, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.evaluate((value) => {
    document.cookie = `next-auth.session-token=${value}; Path=/; SameSite=Lax`;
  }, sessionToken);
  await page.goto(`${baseUrl}/api/auth/session`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });

  const sessionPayload = JSON.parse(await page.locator("body").innerText());
  ensure(
    sessionPayload?.user?.id === authSubject,
    "Injected next-auth session did not become active in the browser.",
  );
}

async function probeGoogleAuthEntry(page, routePath) {
  await page.goto(`${baseUrl}${routePath}`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const pageText = normalizeText(await page.locator("body").innerText());
  ensure(
    pageText.includes("Continue with Google") || pageText.includes("Start with Google"),
    `Google auth CTA did not render on ${routePath}.`,
  );
  ensure(
    pageText.includes("Google auth ready"),
    `Google auth was not marked ready on ${routePath}.`,
  );

  const buttonLabel = pageText.includes("Start with Google")
    ? "Start with Google"
    : "Continue with Google";

  await page
    .getByRole("button")
    .filter({ hasText: new RegExp(buttonLabel, "i") })
    .first()
    .click();
  await page.waitForFunction(
    () =>
      window.location.href.includes("/api/auth/signin/google") ||
      window.location.href.includes("accounts.google.com"),
    undefined,
    { timeout: 30000 },
  );

  return page.url();
}

function formatIssuesForUi(messages) {
  return [...new Set(messages)].slice(0, 3);
}

async function runOfficialImportViaServices({ filePath, templateKey, workspaceId }) {
  const fileName = path.basename(filePath);
  const csvText = fs.readFileSync(filePath, "utf8");
  const fileSizeBytes = Buffer.byteLength(csvText, "utf8");
  const validationResult = validateCsvStructure(csvText, templateKey);

  ensure(validationResult.accepted, `${fileName} failed structural validation unexpectedly.`);

  const parseResult = parseCsvByTemplate(csvText, templateKey);
  const parserWarnings = parseResult.warnings.map((warning) => warning.message);
  const combinedWarnings = formatIssuesForUi([
    ...validationResult.warnings.map((issue) => issue.message),
    ...parserWarnings,
  ]);

  const dataSource = await registerCsvUploadMetadata({
    fileName,
    fileSizeBytes,
    mimeType: "text/csv",
    parseSummary: {
      invalidRowCount: parseResult.invalidRowCount,
      validRowCount: parseResult.validRowCount,
      warnings: parserWarnings,
    },
    rowCount: validationResult.detectedRowCount,
    successRowCount: 0,
    templateKey,
    validationSummary: {
      errors: validationResult.errors.map((issue) => issue.message),
      warnings: validationResult.warnings.map((issue) => issue.message),
    },
    workspaceId,
  });

  const persistenceResult = await persistCsvImport({
    dataSourceId: dataSource.id,
    parseResult,
    templateKey,
    warnings: combinedWarnings,
    workspaceId,
  });

  return {
    dataSource,
    parseResult,
    persistenceResult,
    validationResult,
  };
}

async function runAssistedImportViaServices({ filePath, workspaceId }) {
  const templateKey = "appointments";
  const fileName = path.basename(filePath);
  const originalCsvText = fs.readFileSync(filePath, "utf8");
  const assistedPayload = buildAssistedImportPayloadFromCsv(templateKey, originalCsvText);
  const confirmedPreview = buildAssistedImportPreview(
    templateKey,
    assistedPayload.detectedHeaders,
    assistedPayload.mapping,
  );
  const confirmationDraft = buildAssistedImportConfirmationDraft(
    assistedPayload.preview,
    confirmedPreview,
  );

  ensure(
    confirmationDraft.canProceed,
    "Assisted import confirmation draft should be able to proceed for the compatible fixture.",
  );

  const mappedCsvText = createMappedCsvText(
    templateKey,
    originalCsvText,
    assistedPayload.mapping,
  );
  const fileSizeBytes = Buffer.byteLength(mappedCsvText, "utf8");
  const validationResult = validateCsvStructure(mappedCsvText, templateKey);

  ensure(validationResult.accepted, `${fileName} mapped output failed structural validation.`);

  const parseResult = parseCsvByTemplate(mappedCsvText, templateKey);
  const parserWarnings = parseResult.warnings.map((warning) => warning.message);
  const combinedWarnings = formatIssuesForUi([
    ...validationResult.warnings.map((issue) => issue.message),
    ...parserWarnings,
  ]);

  const dataSource = await registerCsvUploadMetadata({
    fileName,
    fileSizeBytes,
    mimeType: "text/csv",
    parseSummary: {
      invalidRowCount: parseResult.invalidRowCount,
      validRowCount: parseResult.validRowCount,
      warnings: parserWarnings,
    },
    rowCount: validationResult.detectedRowCount,
    successRowCount: 0,
    templateKey,
    validationSummary: {
      errors: validationResult.errors.map((issue) => issue.message),
      warnings: validationResult.warnings.map((issue) => issue.message),
    },
    workspaceId,
  });

  const persistenceResult = await persistCsvImport({
    dataSourceId: dataSource.id,
    parseResult,
    templateKey,
    warnings: combinedWarnings,
    workspaceId,
  });

  return {
    confirmationDraft,
    dataSource,
    parseResult,
    persistenceResult,
    validationResult,
  };
}

async function probeImportUi(page, filePath, expectedTexts) {
  const fileName = path.basename(filePath);
  const fileInput = page.locator('form').first().locator('input[type="file"]');

  await fileInput.waitFor({
    state: "attached",
    timeout: 60000,
  });
  await fileInput.setInputFiles(filePath);
  await fileInput.evaluate((element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(
    ([expectedFileName, texts]) => {
      const bodyText = document.body?.innerText ?? "";

      return (
        bodyText.includes(expectedFileName) &&
        texts.every((text) => bodyText.includes(text))
      );
    },
    [fileName, expectedTexts],
    {
      timeout: 60000,
    },
  );

  return page.locator("body").innerText();
}

async function getWorkspaceSnapshot(workspaceId, now) {
  const [overview, confirmation, reminder, atRisk, recovery, reviewRequest, operationalSurface] =
    await Promise.all([
      getDashboardOverview(workspaceId),
      getConfirmationClassification(workspaceId, now),
      getReminderClassification(workspaceId, now),
      getAtRiskClassification(workspaceId, now),
      getRecoveryOpportunityClassification(workspaceId, now),
      getReviewRequestEligibilityClassification(workspaceId, now),
      getOperationalSurface(workspaceId, true, now),
    ]);

  return {
    atRisk,
    confirmation,
    operationalSurface,
    overview,
    recovery,
    reminder,
    reviewRequest,
  };
}

let browser;
let context;

try {
  const email = `revory-sprint4-etapa10-${Date.now()}@example.com`;
  results.email = email;
  const fixturePaths = buildStage10Fixtures(new Date());

  browser = await chromium.launch({
    executablePath:
      "C:/Users/hriqu/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",
    headless: true,
  });
  context = await browser.newContext({
    viewport: {
      height: 960,
      width: 1440,
    },
  });
  const authProbePage = await context.newPage();
  const signInGoogleUrl = await probeGoogleAuthEntry(
    authProbePage,
    "/sign-in?redirect_url=%2Fapp%2Fdashboard",
  );
  recordStep("1. google auth sign-in entry", "passed", {
    finalUrl: signInGoogleUrl,
  });
  await authProbePage.close();

  const authProbeSignUpPage = await context.newPage();
  const signUpGoogleUrl = await probeGoogleAuthEntry(
    authProbeSignUpPage,
    "/sign-up?redirect_url=%2Fapp%2Fdashboard",
  );
  recordStep("2. google auth sign-up entry", "passed", {
    finalUrl: signUpGoogleUrl,
  });
  await authProbeSignUpPage.close();

  const { authSubject, workspace } = await createAuthenticatedWorkspaceIdentity(email);
  const page = await context.newPage();
  await injectAuthenticatedSession(page, authSubject, email);
  await page.goto(`${baseUrl}/app/dashboard`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () =>
      (document.body?.innerText ?? "").includes("Who needs action, and why.") &&
      (document.body?.innerText ?? "").includes(
        "Operational visibility starts after the first appointments import.",
      ),
    undefined,
    { timeout: 60000 },
  );
  await saveScreenshot(page, "01-dashboard-initial");
  const initialDashboardText = normalizeText(await page.locator("body").innerText());
  const initialDashboardValid =
    initialDashboardText.includes("Who needs action, and why.") &&
    initialDashboardText.includes(
      "Operational visibility starts after the first appointments import.",
    );
  recordStep("3. authenticated dashboard render", initialDashboardValid ? "passed" : "failed", {
    url: page.url(),
  });
  ensure(initialDashboardValid, "Initial dashboard did not render the empty operational surface.");

  await page.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await saveScreenshot(page, "02-imports-initial");
  const importsPageText = normalizeText(await page.locator("body").innerText());
  const importsPageValid = importsPageText.includes("Imports & Mapping");
  recordStep("4. imports page render", importsPageValid ? "passed" : "failed", {
    url: page.url(),
  });
  ensure(importsPageValid, "Imports page did not render for the authenticated workspace.");

  const officialUiText = await probeImportUi(page, fixturePaths.officialAppointmentsCsvPath, [
    "Review final confirmation",
  ]).catch(async (error) => {
    recordBug("P2", "Official import UI preview did not stabilize in browser QA", {
      impact:
        "The technical import backend may still work, but the browser preview for the official CSV did not settle as expected during QA.",
      message: error instanceof Error ? error.message : String(error),
      reproduction:
        "1. Open /app/imports\n2. Upload the official appointments CSV fixture\n3. Observe whether the preview/final confirmation state becomes readable",
    });

    return null;
  });

  recordStep(
    "5. official import UI preview",
    officialUiText ? "passed" : "failed",
    officialUiText ? { observedSnippet: officialUiText.slice(0, 2400) } : {},
  );

  await page.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const assistedUiText = await probeImportUi(page, fixturePaths.assistedAppointmentsCsvPath, [
    "Review the proposed mapping before import.",
    "Mapping can move forward",
  ]).catch(async (error) => {
    recordBug("P2", "Assisted import preview did not stabilize in browser QA", {
      impact:
        "The assisted import mapping UI may be unstable or too brittle to reach the expected confirmation preview.",
      message: error instanceof Error ? error.message : String(error),
      reproduction:
        "1. Open /app/imports\n2. Upload the assisted appointments CSV fixture\n3. Observe whether the mapping preview and confirmation CTA appear",
    });

    return null;
  });

  recordStep(
    "6. assisted import UI preview",
    assistedUiText ? "passed" : "failed",
    assistedUiText ? { observedSnippet: assistedUiText.slice(0, 2400) } : {},
  );

  const officialAppointmentsImport = await runOfficialImportViaServices({
    filePath: fixturePaths.officialAppointmentsCsvPath,
    templateKey: "appointments",
    workspaceId: workspace.id,
  });
  const officialClientsImport = await runOfficialImportViaServices({
    filePath: fixturePaths.officialClientsCsvPath,
    templateKey: "clients",
    workspaceId: workspace.id,
  });
  const assistedImport = await runAssistedImportViaServices({
    filePath: fixturePaths.assistedAppointmentsCsvPath,
    workspaceId: workspace.id,
  });

  const importsPersisted =
    officialAppointmentsImport.persistenceResult.finalStatus === "imported" &&
    officialClientsImport.persistenceResult.finalStatus === "imported" &&
    assistedImport.persistenceResult.finalStatus === "imported";
  recordStep("7. official and assisted imports persisted", importsPersisted ? "passed" : "failed", {
    assistedImport: assistedImport.persistenceResult,
    officialAppointmentsImport: officialAppointmentsImport.persistenceResult,
    officialClientsImport: officialClientsImport.persistenceResult,
  });
  ensure(importsPersisted, "One of the Sprint 4 import persistence checks failed.");

  const snapshot = await getWorkspaceSnapshot(workspace.id, new Date());
  const classificationValid =
    snapshot.confirmation.readyForConfirmationCount === 2 &&
    snapshot.confirmation.blockedMissingEmailCount === 1 &&
    snapshot.reminder.readyForReminderCount === 1 &&
    snapshot.reminder.blockedMissingEmailCount === 1 &&
    snapshot.atRisk.atRiskCount === 1 &&
    snapshot.atRisk.attentionNowCount === 1 &&
    snapshot.recovery.readyForRecoveryCount === 1 &&
    snapshot.recovery.opportunityCount === 1 &&
    snapshot.reviewRequest.eligibleCount === 1 &&
    snapshot.reviewRequest.blockedMissingEmailCount === 0 &&
    snapshot.operationalSurface.priorityItems.length === 5;
  recordStep("8. classification logic snapshot", classificationValid ? "passed" : "failed", {
    atRisk: {
      atRiskCount: snapshot.atRisk.atRiskCount,
      attentionNowCount: snapshot.atRisk.attentionNowCount,
      blockedContactCount: snapshot.atRisk.blockedContactCount,
    },
    confirmation: {
      blockedMissingEmailCount: snapshot.confirmation.blockedMissingEmailCount,
      readyForConfirmationCount: snapshot.confirmation.readyForConfirmationCount,
    },
    operationalSurface: {
      blockedCount: snapshot.operationalSurface.blockedCount,
      priorityItems: snapshot.operationalSurface.priorityItems.map((item) => ({
        category: item.categoryKey,
        clientName: item.clientName,
        stateLabel: item.stateLabel,
      })),
    },
    recovery: {
      opportunityCount: snapshot.recovery.opportunityCount,
      readyForRecoveryCount: snapshot.recovery.readyForRecoveryCount,
    },
    reminder: {
      blockedMissingEmailCount: snapshot.reminder.blockedMissingEmailCount,
      readyForReminderCount: snapshot.reminder.readyForReminderCount,
    },
    reviewRequest: {
      blockedMissingEmailCount: snapshot.reviewRequest.blockedMissingEmailCount,
      eligibleCount: snapshot.reviewRequest.eligibleCount,
    },
  });

  if (!classificationValid) {
    recordBug("P1", "Sprint 4 classification counts diverged from the seeded operational dataset", {
      impact:
        "The operational layer would stop being trustworthy because the same imported base would no longer classify into the expected confirmation/reminder/at-risk/recovery/review buckets.",
      reproduction:
        "1. Seed the stage 10 operational dataset\n2. Run the classification services for the workspace\n3. Compare the resulting counts against the expected seeded cases",
      snapshot,
    });
  }

  await page.goto(`${baseUrl}/app/dashboard`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => (document.body?.innerText ?? "").includes("Who needs action, and why."),
    undefined,
    { timeout: 60000 },
  );
  await saveScreenshot(page, "03-dashboard-operational");
  const dashboardText = normalizeText(await page.locator("body").innerText());
  const dashboardTextLower = dashboardText.toLowerCase();
  const dashboardUiValid =
    dashboardTextLower.includes("who needs action, and why.") &&
    dashboardTextLower.includes("at-risk appointments") &&
    dashboardTextLower.includes("confirmation queue") &&
    dashboardTextLower.includes("reminder queue") &&
    dashboardTextLower.includes("recovery opportunities") &&
    dashboardTextLower.includes("review-ready visits") &&
    dashboardTextLower.includes("lia at risk") &&
    dashboardTextLower.includes("noa reminder") &&
    dashboardTextLower.includes("mia confirmation") &&
    dashboardTextLower.includes("rafa recovery") &&
    dashboardTextLower.includes("bia review");
  recordStep("9. operational layer UI in dashboard", dashboardUiValid ? "passed" : "failed", {
    overview: {
      appointmentsMonitored: snapshot.overview.appointmentsMonitored,
      clientsImported: snapshot.overview.clientsImported,
      estimatedImportedRevenue: snapshot.overview.estimatedImportedRevenue,
      upcomingAppointments: snapshot.overview.upcomingAppointments,
    },
    textSnippet: dashboardText.slice(0, 5000),
  });

  if (!dashboardUiValid) {
    recordBug("P1", "Operational surface UI did not expose the seeded Sprint 4 states clearly", {
      impact:
        "The operational layer would be technically computed but functionally invisible or ambiguous to the MedSpa user.",
      reproduction:
        "1. Import the stage 10 appointments dataset\n2. Open /app/dashboard\n3. Inspect the Operational Layer section and the priority list",
      textSnippet: dashboardText.slice(0, 5000),
    });
  }

  await page.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await saveScreenshot(page, "04-imports-after-persistence");
  const importsAfterPersistenceText = normalizeText(await page.locator("body").innerText());
  const importsRegressionValid =
    importsAfterPersistenceText.includes(
      path.basename(fixturePaths.assistedAppointmentsCsvPath),
    ) &&
    importsAfterPersistenceText.includes(path.basename(fixturePaths.officialClientsCsvPath));
  recordStep("10. imports page persisted state", importsRegressionValid ? "passed" : "failed", {
    textSnippet: importsAfterPersistenceText.slice(0, 5000),
  });

  if (!importsRegressionValid) {
    recordBug("P1", "Imports page did not reflect the last persisted official/assisted state", {
      impact:
        "A user would not be able to trust what the workspace imported last or whether the assisted flow replaced the appointments source correctly.",
      reproduction:
        "1. Persist an official appointments import, a clients import, and an assisted appointments import\n2. Open /app/imports\n3. Check whether the cards show the latest file names and summaries",
      textSnippet: importsAfterPersistenceText.slice(0, 5000),
    });
  }

  const dashboardRegressionValid =
    snapshot.overview.appointmentsMonitored === 7 &&
    snapshot.overview.clientsImported === 8 &&
    snapshot.overview.upcomingAppointments === 5 &&
    snapshot.overview.canceledAppointments === 1 &&
    snapshot.overview.estimatedImportedRevenue === 1290;
  recordStep("11. dashboard existing metrics regression", dashboardRegressionValid ? "passed" : "failed", {
    overview: snapshot.overview,
  });

  if (!dashboardRegressionValid) {
    recordBug("P1", "Dashboard overview metrics regressed against the imported operational dataset", {
      impact:
        "The pre-existing dashboard would no longer match the persisted appointments and clients after Sprint 4.",
      reproduction:
        "1. Import the stage 10 official and assisted datasets\n2. Open /app/dashboard\n3. Compare the overview metrics against the persisted workspace data",
      overview: snapshot.overview,
    });
  }

  const northStarMisleading =
    dashboardText.includes("North-star metrics") &&
    dashboardText.includes("Next layer");
  recordStep("12. dashboard honesty check", northStarMisleading ? "failed" : "passed", {
    observed: northStarMisleading,
  });

  if (northStarMisleading) {
    recordBug("P2", "Dashboard still presents future metrics inside the live operational dashboard", {
      impact:
        "The Sprint 4 surface stays technically correct, but the dashboard still mixes real operational signals with future-looking metric cards that can read as already-live capability.",
      reproduction:
        "1. Open /app/dashboard after importing data\n2. Scroll below the operational surface\n3. Observe the North-star metrics cards with 'Next layer' badges inside the live dashboard",
    });
  }

  recordStep("suite", "passed", {
    evidenceDir,
    workspaceId: workspace.id,
  });
} catch (error) {
  recordStep("suite", "failed", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
  });
  throw error;
} finally {
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  if (context) {
    await context.close().catch(() => {});
  }
  if (browser) {
    await browser.close().catch(() => {});
  }
}
