import fs from "node:fs";
import path from "node:path";

import {
  AppointmentStatus,
  DataSourceStatus,
  DataSourceType,
  PrismaClient,
} from "@prisma/client";
import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

import { parseCsvByTemplate } from "@/services/imports/parse-csv-by-template";
import { persistCsvImport } from "@/services/imports/persist-csv-import";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";

const projectRoot = "C:/Users/hriqu/Documents/revory-mvp";
const baseUrl = "http://localhost:3000";
const frontendApiUrl = "touched-albacore-54.clerk.accounts.dev";
const keyless = JSON.parse(
  fs.readFileSync(path.join(projectRoot, ".clerk", ".tmp", "keyless.json"), "utf8"),
);
const prisma = new PrismaClient();
const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(projectRoot, ".tmp", "qa-functional-final", runId);
const resultsPath = path.join(evidenceDir, "results.json");

const appointmentsValidCsvPath = path.join(
  projectRoot,
  "docs",
  "testing",
  "manual-test-csvs",
  "appointments-valid.csv",
);
const appointmentsInvalidCsvPath = path.join(
  projectRoot,
  "docs",
  "testing",
  "manual-test-csvs",
  "appointments-invalid.csv",
);
const clientsValidCsvPath = path.join(
  projectRoot,
  "docs",
  "testing",
  "manual-test-csvs",
  "clients-valid.csv",
);
const partialCsvPath = path.join(projectRoot, ".tmp", "qa-fixtures", "appointments-partial.csv");

fs.mkdirSync(evidenceDir, { recursive: true });

process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;

await clerkSetup({
  publishableKey: keyless.publishableKey,
  secretKey: keyless.secretKey,
});

const email = `revory-functional-final-${Date.now()}+clerk_test@example.com`;
const password = "Revory!12345";

const results = {
  baseUrl,
  email,
  findings: [],
  finishedAt: null,
  startedAt: startedAt.toISOString(),
  steps: [],
};

function recordStep(name, status, details = {}) {
  results.steps.push({
    details,
    name,
    status,
  });
}

function recordFinding(title, details = {}) {
  results.findings.push({
    details,
    title,
  });
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function saveScreenshot(page, name) {
  await page.screenshot({
    fullPage: true,
    path: path.join(evidenceDir, `${name}.png`),
  });
}

async function setupTestingBypass(page) {
  await page.goto(baseUrl, {
    timeout: 60000,
    waitUntil: "commit",
  });
  await setupClerkTestingToken({
    page,
    options: {
      frontendApiUrl,
    },
  });
}

async function getWorkspaceSnapshot() {
  const localUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!localUser) {
    return null;
  }

  const workspace = await prisma.workspace.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      ownerUserId: localUser.id,
    },
  });

  if (!workspace) {
    return {
      localUserId: localUser.id,
      workspace: null,
    };
  }

  const [
    activationSetup,
    appointmentCount,
    clientCount,
    upcomingCount,
    canceledCount,
    revenue,
    appointments,
    dataSources,
  ] = await Promise.all([
    prisma.activationSetup.findUnique({
      where: {
        workspaceId: workspace.id,
      },
    }),
    prisma.appointment.count({
      where: {
        workspaceId: workspace.id,
      },
    }),
    prisma.client.count({
      where: {
        workspaceId: workspace.id,
      },
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: new Date(),
        },
        status: AppointmentStatus.SCHEDULED,
        workspaceId: workspace.id,
      },
    }),
    prisma.appointment.count({
      where: {
        status: AppointmentStatus.CANCELED,
        workspaceId: workspace.id,
      },
    }),
    prisma.appointment.aggregate({
      _sum: {
        estimatedRevenue: true,
      },
      where: {
        estimatedRevenue: {
          not: null,
        },
        workspaceId: workspace.id,
      },
    }),
    prisma.appointment.findMany({
      orderBy: {
        externalId: "asc",
      },
      select: {
        externalId: true,
        status: true,
      },
      where: {
        workspaceId: workspace.id,
      },
    }),
    prisma.dataSource.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        lastImportError: true,
        lastImportErrorRowCount: true,
        lastImportFileName: true,
        lastImportRowCount: true,
        lastImportSuccessRowCount: true,
        name: true,
        status: true,
        type: true,
      },
      where: {
        workspaceId: workspace.id,
      },
    }),
  ]);

  return {
    activationSetup: activationSetup
      ? {
          currentStep: activationSetup.currentStep,
          googleReviewsUrl: activationSetup.googleReviewsUrl,
          isCompleted: activationSetup.isCompleted,
          recommendedModeKey: activationSetup.recommendedModeKey,
          selectedTemplate: activationSetup.selectedTemplate,
        }
      : null,
    appointments: appointments.map((appointment) => ({
      externalId: appointment.externalId,
      status: appointment.status,
    })),
    appointmentsCount: appointmentCount,
    canceledAppointments: canceledCount,
    clientsCount: clientCount,
    dataSources,
    estimatedRevenue:
      revenue._sum.estimatedRevenue !== null ? Number(revenue._sum.estimatedRevenue) : null,
    localUserId: localUser.id,
    upcomingAppointments: upcomingCount,
    workspace: {
      activeModeKey: workspace.activeModeKey,
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
    },
  };
}

function formatIssuesForUi(messages) {
  return [...new Set(messages)].slice(0, 3);
}

async function runImportViaServices({ filePath, templateKey, workspaceId }) {
  const fileName = path.basename(filePath);
  const csvText = fs.readFileSync(filePath, "utf8");
  const fileSizeBytes = Buffer.byteLength(csvText, "utf8");
  const validationResult = validateCsvStructure(csvText, templateKey);

  if (!validationResult.accepted) {
    const blockingMessages = formatIssuesForUi(
      validationResult.errors.map((issue) => issue.message),
    );

    const dataSource = await registerCsvUploadMetadata({
      errorMessage: blockingMessages.join(" "),
      fileName,
      fileSizeBytes,
      importCompletedAt: new Date(),
      mimeType: "text/csv",
      rowCount: validationResult.detectedRowCount,
      errorRowCount: validationResult.usefulRowCount,
      successRowCount: 0,
      status: DataSourceStatus.ERROR,
      templateKey,
      validationSummary: {
        errors: validationResult.errors.map((issue) => issue.message),
        warnings: validationResult.warnings.map((issue) => issue.message),
      },
      workspaceId,
    });

    return {
      accepted: false,
      dataSource,
      validationResult,
      warnings: formatIssuesForUi(
        validationResult.warnings.map((issue) => issue.message),
      ),
    };
  }

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
    accepted: true,
    dataSource,
    parseResult,
    persistenceResult,
    validationResult,
    warnings: combinedWarnings,
  };
}

async function waitForStepPage(page, step) {
  await page.goto(`${baseUrl}/app/setup/${step}`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    (expectedPath) => window.location.pathname.includes(expectedPath),
    `/app/setup/${step}`,
    {
      timeout: 60000,
    },
  );
}

async function completeEmailVerification(page) {
  const verificationInput = page
    .locator(
      'input[aria-label="Enter verification code"], input[inputmode="numeric"], input[autocomplete="one-time-code"]',
    )
    .first();

  if (page.url().includes("/verify-email-address")) {
    await verificationInput.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);
    await verificationInput.fill("424242");
    await page.waitForTimeout(2000);

    if (
      (await page.getByText(/need to send a verification code/i).count()) > 0
    ) {
      const resendButton = page.getByRole("button", {
        name: /Didn't receive a code\? Resend/i,
      });

      if ((await resendButton.count()) > 0) {
        await resendButton.click({
          force: true,
        });
        await page.waitForTimeout(1500);
        await verificationInput.fill("424242");
      }
    }

    await page.waitForTimeout(10000);
  }
}

async function completeVerificationChallenge(page) {
  const verificationInput = page
    .locator(
      'input[aria-label="Enter verification code"], input[inputmode="numeric"], input[autocomplete="one-time-code"]',
    )
    .first();

  const hasVerificationInput = async () =>
    (await verificationInput.count()) > 0 && (await verificationInput.isVisible().catch(() => false));

  if (
    page.url().includes("/verify-email-address") ||
    page.url().includes("/factor-two") ||
    (await hasVerificationInput())
  ) {
    await verificationInput.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);
    await verificationInput.fill("424242");
    await page.waitForTimeout(2000);

    const resendButton = page
      .getByRole("button")
      .filter({ hasText: /resend/i })
      .first();

    if (
      (await page.getByText(/need to send a verification code/i).count()) > 0 &&
      (await resendButton.count()) > 0
    ) {
      await resendButton.click({
        force: true,
      });
      await page.waitForTimeout(1500);
      await verificationInput.fill("424242");
      await page.waitForTimeout(2000);
    }

    const continueButton = page
      .getByRole("button")
      .filter({ hasText: /continue|verify/i })
      .first();

    if ((await continueButton.count()) > 0) {
      await continueButton.click({
        force: true,
      });
    }
  }
}

async function performUiSignIn(page) {
  await page.goto(`${baseUrl}/sign-in`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="identifier"], input[name="emailAddress"]').first().fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForLoadState("domcontentloaded", {
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  await completeVerificationChallenge(page);
  await page.waitForURL(/\/app(\/dashboard)?/, {
    timeout: 120000,
  });
}

async function performOnboarding(page) {
  await waitForStepPage(page, "template");
  await page.locator('input[value="MEDSPA"]').check();
  await page.locator('form button.rev-button-primary[type="submit"]').click({ force: true });
  await page.waitForTimeout(5000);
  let snapshot = await getWorkspaceSnapshot();
  ensure(
    snapshot?.activationSetup?.currentStep === "source",
    "Template step did not persist the next onboarding state.",
  );

  await waitForStepPage(page, "source");
  await page.locator('input[value="APPOINTMENTS_CSV"]').check();
  await page.locator('form button.rev-button-primary[type="submit"]').click({ force: true });
  await page.waitForTimeout(5000);
  snapshot = await getWorkspaceSnapshot();
  ensure(
    snapshot?.activationSetup?.currentStep === "channel",
    "Source step did not persist the next onboarding state.",
  );

  await waitForStepPage(page, "channel");
  await page.locator('input[value="EMAIL"]').check();
  await page.locator('form button.rev-button-primary[type="submit"]').click({ force: true });
  await page.waitForTimeout(5000);
  snapshot = await getWorkspaceSnapshot();
  ensure(
    snapshot?.activationSetup?.currentStep === "reviews",
    "Channel step did not persist the next onboarding state.",
  );

  await waitForStepPage(page, "reviews");
  await page.locator('input[name="googleReviewsUrl"]').fill("https://g.page/r/revory-functional-qa");
  await page.locator('form button.rev-button-primary[type="submit"]').click({ force: true });
  await page.waitForTimeout(5000);
  snapshot = await getWorkspaceSnapshot();
  ensure(
    snapshot?.activationSetup?.currentStep === "mode",
    "Reviews step did not persist the next onboarding state.",
  );

  await waitForStepPage(page, "mode");
  await page.locator('input[value="MODE_B"]').check();
  await page.locator('form button.rev-button-primary[type="submit"]').click({ force: true });
  await page.waitForTimeout(5000);
  snapshot = await getWorkspaceSnapshot();
  ensure(
    snapshot?.activationSetup?.currentStep === "activation",
    "Mode step did not persist the next onboarding state.",
  );

  await waitForStepPage(page, "activation");
  const activationButtonLabel =
    (await page.locator('form button.rev-button-primary[type="submit"]').textContent())?.trim() ??
    "";

  if (activationButtonLabel !== "Activate REVORY") {
    recordFinding("Activation CTA label mismatch", {
      observedLabel: activationButtonLabel,
    });
  }

  recordStep("2. onboarding wizard complete", "passed", {
    activationButtonLabel,
    reachedStep: "activation",
  });

  await saveScreenshot(page, "03-activation-step");
  await page.locator('form button.rev-button-primary[type="submit"]').click({ force: true });
  await page.waitForURL(/\/app\/dashboard/, {
    timeout: 120000,
  });
}

async function tryBrowserUploadInteraction(page, index, filePath) {
  const form = page.locator("form").nth(index);
  const fileInput = form.locator('input[type="file"]');
  const fileName = path.basename(filePath);
  let lastResult = null;

  await fileInput.waitFor({
    state: "attached",
    timeout: 60000,
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await fileInput.setInputFiles(filePath);
    await fileInput.evaluate((element) => {
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });

    try {
      await page.waitForFunction(
        (expectedFileName) => {
          const bodyText = document.body?.innerText ?? "";

          return (
            bodyText.includes(expectedFileName) ||
            bodyText.includes("Official structure detected") ||
            bodyText.includes("Assisted mapping ready for review")
          );
        },
        fileName,
        {
          timeout: 8000,
        },
      );
    } catch {}

    const inputState = await fileInput.evaluate((element) => ({
      filesLength: element.files?.length ?? 0,
      firstName: element.files?.[0]?.name ?? null,
    }));
    const bodyText = await page.locator("body").innerText();
    const reacted =
      bodyText.includes(fileName) ||
      bodyText.includes("Official structure detected") ||
      bodyText.includes("Assisted mapping ready for review");

    lastResult = {
      attempts: attempt,
      bodySnippet: bodyText.slice(0, 2500),
      inputState,
      reacted,
    };

    if (reacted) {
      return lastResult;
    }

    await page.waitForTimeout(1500 * attempt);
  }

  return lastResult;
}

const browser = await chromium.launch({ headless: true });
let context = null;

try {
  context = await browser.newContext({
    viewport: {
      height: 900,
      width: 1440,
    },
  });

  const page = await context.newPage();
  await setupTestingBypass(page);

  await page.goto(`${baseUrl}/sign-up`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="emailAddress"]').waitFor({
    state: "visible",
    timeout: 60000,
  });
  await saveScreenshot(page, "01-sign-up-page");
  recordStep("1. sign up page render", "passed", {
    url: page.url(),
  });

  await page.locator('input[name="emailAddress"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForURL(/\/sign-up\/verify-email-address|\/app/, {
    timeout: 120000,
  });
  await completeEmailVerification(page);
  await saveScreenshot(page, "02-after-sign-up");
  recordStep("1. sign up flow", "passed", {
    finalUrl: page.url(),
  });

  const snapshotAfterSignUp = await getWorkspaceSnapshot();
  recordStep("1. local sync after sign up", snapshotAfterSignUp ? "passed" : "failed", {
    snapshot: snapshotAfterSignUp,
  });
  ensure(snapshotAfterSignUp?.workspace, "The local workspace was not created after sign-up.");

  await performOnboarding(page);
  await saveScreenshot(page, "04-dashboard-after-activation");
  recordStep("3. activation final", "passed", {
    finalUrl: page.url(),
  });

  const snapshotAfterActivation = await getWorkspaceSnapshot();
  const activationValidated =
    snapshotAfterActivation?.activationSetup?.isCompleted === true &&
    snapshotAfterActivation?.workspace?.status === "ACTIVE" &&
    snapshotAfterActivation?.workspace?.activeModeKey === "MODE_B";
  recordStep("4. dashboard after activation", activationValidated ? "passed" : "failed", {
    snapshot: snapshotAfterActivation,
  });
  ensure(activationValidated, "The workspace activation state was not persisted as expected.");

  await page.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const importsPageText = await page.locator("body").innerText();
  recordStep("4. imports page access", importsPageText.includes("Imports & Mapping") ? "passed" : "failed", {
    textSnippet: importsPageText.slice(0, 3000),
    url: page.url(),
  });
  ensure(importsPageText.includes("Imports & Mapping"), "The imports page did not render after activation.");

  const browserUploadAttempt = await tryBrowserUploadInteraction(page, 0, appointmentsValidCsvPath);
  recordStep(
    "5. upload ui appointments control",
    browserUploadAttempt.reacted ? "passed" : "failed",
    browserUploadAttempt,
  );
  if (!browserUploadAttempt.reacted) {
    recordFinding("Imports file control did not react in headless browser QA", browserUploadAttempt);
  }

  const workspaceId = snapshotAfterActivation.workspace.id;

  const validAppointmentsResult = await runImportViaServices({
    filePath: appointmentsValidCsvPath,
    templateKey: "appointments",
    workspaceId,
  });
  const snapshotAfterAppointments = await getWorkspaceSnapshot();
  const appointmentsValidated =
    validAppointmentsResult.accepted &&
    snapshotAfterAppointments?.appointmentsCount === 3 &&
    snapshotAfterAppointments?.clientsCount === 3;
  recordStep("5. upload de CSV valido de appointments", appointmentsValidated ? "passed" : "failed", {
    importResult: validAppointmentsResult.accepted
      ? {
          errorRows: validAppointmentsResult.persistenceResult.errorRows.length,
          status: validAppointmentsResult.persistenceResult.finalStatus,
          successRows: validAppointmentsResult.persistenceResult.successRows,
          totalRows: validAppointmentsResult.persistenceResult.totalRows,
        }
      : validAppointmentsResult,
    snapshot: snapshotAfterAppointments,
  });
  ensure(appointmentsValidated, "The valid appointments import did not persist the expected records.");

  const validClientsResult = await runImportViaServices({
    filePath: clientsValidCsvPath,
    templateKey: "clients",
    workspaceId,
  });
  const snapshotAfterClients = await getWorkspaceSnapshot();
  const clientsValidated =
    validClientsResult.accepted && snapshotAfterClients?.clientsCount === 6;
  recordStep("6. upload de CSV valido de clients", clientsValidated ? "passed" : "failed", {
    importResult: validClientsResult.accepted
      ? {
          errorRows: validClientsResult.persistenceResult.errorRows.length,
          status: validClientsResult.persistenceResult.finalStatus,
          successRows: validClientsResult.persistenceResult.successRows,
          totalRows: validClientsResult.persistenceResult.totalRows,
        }
      : validClientsResult,
    snapshot: snapshotAfterClients,
  });
  ensure(clientsValidated, "The valid clients import did not persist the expected records.");

  const snapshotBeforeInvalid = await getWorkspaceSnapshot();
  const invalidImportResult = await runImportViaServices({
    filePath: appointmentsInvalidCsvPath,
    templateKey: "appointments",
    workspaceId,
  });
  const snapshotAfterInvalid = await getWorkspaceSnapshot();
  const invalidDidNotChangeCounts =
    invalidImportResult.accepted === false &&
    snapshotBeforeInvalid?.appointmentsCount === snapshotAfterInvalid?.appointmentsCount &&
    snapshotBeforeInvalid?.clientsCount === snapshotAfterInvalid?.clientsCount &&
    (snapshotAfterInvalid?.dataSources.some(
      (source) =>
        source.type === DataSourceType.APPOINTMENTS_CSV &&
        source.lastImportFileName === "appointments-invalid.csv" &&
        source.status === "ERROR",
    ) ??
      false);
  recordStep("7. validacao de CSV invalido", invalidDidNotChangeCounts ? "passed" : "failed", {
    after: snapshotAfterInvalid,
    before: snapshotBeforeInvalid,
    importResult: {
      accepted: invalidImportResult.accepted,
      errors: invalidImportResult.validationResult.errors.map((issue) => issue.message),
    },
  });
  ensure(invalidDidNotChangeCounts, "The invalid CSV changed persisted counts or metadata unexpectedly.");

  const partialImportResult = await runImportViaServices({
    filePath: partialCsvPath,
    templateKey: "appointments",
    workspaceId,
  });
  const snapshotAfterPartial = await getWorkspaceSnapshot();
  const partialValidated =
    partialImportResult.accepted &&
    snapshotAfterPartial?.appointmentsCount === 4 &&
    snapshotAfterPartial?.clientsCount === 7 &&
    (snapshotAfterPartial?.dataSources.some(
      (source) =>
        source.type === DataSourceType.APPOINTMENTS_CSV &&
        source.lastImportFileName === "appointments-partial.csv" &&
        source.lastImportErrorRowCount === 1 &&
        source.lastImportSuccessRowCount === 1,
    ) ??
      false);
  recordStep("8. cenario de rejeicao parcial", partialValidated ? "passed" : "failed", {
    importResult: partialImportResult.accepted
      ? {
          errorRows: partialImportResult.persistenceResult.errorRows,
          status: partialImportResult.persistenceResult.finalStatus,
          successRows: partialImportResult.persistenceResult.successRows,
          totalRows: partialImportResult.persistenceResult.totalRows,
        }
      : partialImportResult,
    snapshot: snapshotAfterPartial,
  });
  ensure(partialValidated, "The partial rejection scenario did not persist the expected mixed result.");

  const snapshotBeforeReimport = await getWorkspaceSnapshot();
  const reimportResult = await runImportViaServices({
    filePath: appointmentsValidCsvPath,
    templateKey: "appointments",
    workspaceId,
  });
  const snapshotAfterReimport = await getWorkspaceSnapshot();
  const reimportValidated =
    reimportResult.accepted &&
    snapshotAfterReimport?.appointmentsCount === snapshotBeforeReimport?.appointmentsCount &&
    snapshotAfterReimport?.clientsCount === snapshotBeforeReimport?.clientsCount &&
    JSON.stringify(snapshotAfterReimport?.appointments) ===
      JSON.stringify(snapshotBeforeReimport?.appointments) &&
    (snapshotAfterReimport?.dataSources.some(
      (source) =>
        source.type === DataSourceType.APPOINTMENTS_CSV &&
        source.lastImportFileName === "appointments-valid.csv" &&
        source.lastImportErrorRowCount === 0 &&
        source.lastImportSuccessRowCount === 3,
    ) ??
      false);
  recordStep("9. reimportacao do mesmo CSV", reimportValidated ? "passed" : "failed", {
    after: snapshotAfterReimport,
    before: snapshotBeforeReimport,
    importResult: reimportResult.accepted
      ? {
          errorRows: reimportResult.persistenceResult.errorRows.length,
          status: reimportResult.persistenceResult.finalStatus,
          successRows: reimportResult.persistenceResult.successRows,
          totalRows: reimportResult.persistenceResult.totalRows,
        }
      : reimportResult,
  });
  ensure(reimportValidated, "Reimporting the same appointments CSV changed the persisted dataset unexpectedly.");

  await page.goto(`${baseUrl}/app/dashboard`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await saveScreenshot(page, "05-dashboard-real-data");
  const dashboardText = await page.locator("body").innerText();
  const dashboardSnapshot = await getWorkspaceSnapshot();
  const dashboardValidated =
    dashboardText.includes("Dashboard") &&
    dashboardText.includes(String(dashboardSnapshot?.appointmentsCount ?? "")) &&
    dashboardText.includes(String(dashboardSnapshot?.clientsCount ?? ""));
  recordStep("10. dashboard com dados reais persistidos", dashboardValidated ? "passed" : "failed", {
    dashboardTextSnippet: dashboardText.slice(0, 3000),
    snapshot: dashboardSnapshot,
  });
  ensure(dashboardValidated, "The dashboard did not show the persisted dataset after imports.");

  await page.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const importsText = await page.locator("body").innerText();
  const importsViewValidated =
    importsText.includes("appointments-valid.csv") && importsText.includes("clients-valid.csv");
  recordStep("10. imports com dados persistidos", importsViewValidated ? "passed" : "failed", {
    importsTextSnippet: importsText.slice(0, 3000),
  });

  await page.reload({
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const refreshDashboardText = await page.locator("body").innerText();
  const refreshValidated = refreshDashboardText.includes("Imports & Mapping");
  recordStep("11. refresh do dashboard/imports", refreshValidated ? "passed" : "failed", {
    url: page.url(),
  });

  await context.close();
  context = await browser.newContext({
    viewport: {
      height: 900,
      width: 1440,
    },
  });
  const secondPage = await context.newPage();
  await setupTestingBypass(secondPage);
  await performUiSignIn(secondPage);
  await saveScreenshot(secondPage, "06-sign-in-return-dashboard");

  const reloginDashboardText = await secondPage.locator("body").innerText();
  const dashboardRestored = reloginDashboardText.includes("Dashboard");

  await secondPage.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const reloginImportsText = await secondPage.locator("body").innerText();
  const reloginImportsValidated =
    reloginImportsText.includes("appointments-valid.csv") &&
    reloginImportsText.includes("clients-valid.csv");
  recordStep(
    "11. novo login e retorno ao dashboard/imports",
    dashboardRestored && reloginImportsValidated ? "passed" : "failed",
    {
      dashboardRestored,
      importsTextSnippet: reloginImportsText.slice(0, 2500),
      importsViewValidated: reloginImportsValidated,
    },
  );
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
  await browser.close().catch(() => {});
}
