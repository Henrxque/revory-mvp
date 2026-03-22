import fs from "node:fs";
import path from "node:path";

import { PrismaClient, AppointmentStatus, DataSourceType } from "@prisma/client";
import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

const projectRoot = "C:/Users/hriqu/Documents/revory-mvp";
const baseUrl = "http://localhost:3000";
const frontendApiUrl = "touched-albacore-54.clerk.accounts.dev";
const keyless = JSON.parse(
  fs.readFileSync(path.join(projectRoot, ".clerk", ".tmp", "keyless.json"), "utf8"),
);
const prisma = new PrismaClient();
const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(projectRoot, ".tmp", "qa-functional", runId);
const resultsPath = path.join(evidenceDir, "results.json");
const partialCsvPath = path.join(projectRoot, ".tmp", "qa-fixtures", "appointments-partial.csv");
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

fs.mkdirSync(evidenceDir, { recursive: true });

process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;

await clerkSetup({
  publishableKey: keyless.publishableKey,
  secretKey: keyless.secretKey,
});

const email = `revory-functional-${Date.now()}+clerk_test@example.com`;
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

  const [activationSetup, appointmentCount, clientCount, upcomingCount, canceledCount, revenue, appointments, dataSources] =
    await Promise.all([
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

async function expectOnboardingUrl(page, stepKey) {
  await page.waitForFunction(
    (expectedPath) => window.location.pathname.includes(expectedPath),
    `/app/setup/${stepKey}`,
    {
      timeout: 60000,
    },
  );
}

async function openOnboardingStep(page, stepKey) {
  await page.goto(`${baseUrl}/app/setup/${stepKey}`, {
    waitUntil: "domcontentloaded",
  });
  await expectOnboardingUrl(page, stepKey);
  const readinessSelectorByStep = {
    activation: 'button[type="submit"]',
    channel: 'input[name="primaryChannel"][value="EMAIL"]',
    mode: 'input[name="recommendedModeKey"][value="MODE_B"]',
    reviews: 'input[name="googleReviewsUrl"]',
    source: 'input[name="selectedDataSourceType"][value="APPOINTMENTS_CSV"]',
    template: 'input[name="selectedTemplate"][value="MEDSPA"]',
  };
  const selector = readinessSelectorByStep[stepKey];

  if (selector) {
    await page.locator(selector).waitFor({
      state: "visible",
      timeout: 60000,
    });
  }

  await page.waitForTimeout(1500);
}

async function continueOnboarding(page) {
  await page.locator('form button.rev-button-primary[type="submit"]').click({
    force: true,
  });
}

async function completeEmailVerification(page) {
  const verificationInput = page
    .locator(
      'input[aria-label="Enter verification code"], input[inputmode="numeric"], input[autocomplete="one-time-code"]',
    )
    .first();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (page.url().includes("/app/setup/")) {
      return;
    }

    try {
      await page.waitForURL(/\/app\/setup\//, {
        timeout: 5000,
      });
      return;
    } catch {}

    await verificationInput.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await verificationInput.click();
    await verificationInput.fill("424242");

    try {
      await page.waitForURL(/\/app(\/setup\/.*)?$/, {
        timeout: 20000,
      });
      return;
    } catch {
      await page.waitForTimeout(1500);
    }
  }

  throw new Error(`Email verification did not redirect to onboarding. Current URL: ${page.url()}`);
}

async function uploadCsv(page, index, filePath) {
  const form = page.locator("form").nth(index);
  const fileInput = form.locator('input[type="file"]');
  const uploadButton = form.locator('button[type="submit"]');
  const fileName = path.basename(filePath);

  await fileInput.waitFor({
    state: "visible",
    timeout: 30000,
  });
  await fileInput.setInputFiles(filePath);
  await form.getByText(fileName).waitFor({
    timeout: 30000,
  });
  await form.getByText(/Official structure detected|Assisted mapping ready for review/i).waitFor({
    timeout: 30000,
  });
  await uploadButton.waitFor({
    state: "visible",
    timeout: 30000,
  });
  await uploadButton.click();
}

async function waitForSnapshot(predicate, timeoutMs = 60000) {
  const startedAtMs = Date.now();

  while (Date.now() - startedAtMs < timeoutMs) {
    const snapshot = await getWorkspaceSnapshot();

    if (predicate(snapshot)) {
      return snapshot;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error("Timed out waiting for the expected workspace snapshot.");
}

async function performUiSignIn(page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").waitFor({
    state: "visible",
    timeout: 60000,
  });
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForURL(/\/app(\/dashboard)?/, {
    timeout: 60000,
  });
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

  await page.goto(`${baseUrl}/sign-up`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").waitFor({
    state: "visible",
    timeout: 60000,
  });
  await saveScreenshot(page, "01-sign-up-page");
  const signUpFormVisible =
    (await page.getByLabel("Email address").count()) > 0 &&
    (await page.getByRole("textbox", { name: "Password" }).count()) > 0;
  recordStep("1. sign up page render", signUpFormVisible ? "passed" : "failed", {
    url: page.url(),
  });
  ensure(signUpFormVisible, "The sign-up form did not render on the authenticated QA instance.");

  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForURL(/\/sign-up\/verify-email-address/, {
    timeout: 60000,
  });
  await completeEmailVerification(page);
  await page.waitForTimeout(10000);
  await saveScreenshot(page, "02-after-sign-up");
  recordStep("1. sign up flow", "passed", {
    finalUrl: page.url(),
  });

  const snapshotAfterSignUp = await getWorkspaceSnapshot();
  recordStep("1. local sync after sign up", snapshotAfterSignUp ? "passed" : "failed", {
    snapshot: snapshotAfterSignUp,
  });
  ensure(snapshotAfterSignUp?.workspace, "The local workspace was not created after the authenticated sign-up.");
  const onboardingStepAfterSignUp = snapshotAfterSignUp.activationSetup?.currentStep ?? "template";
  await openOnboardingStep(page, onboardingStepAfterSignUp);

  if (onboardingStepAfterSignUp === "template") {
    await page.locator('input[value="MEDSPA"]').check();
    await page.locator('input[name="selectedTemplate"]:checked').waitFor({
      state: "attached",
      timeout: 30000,
    });
    await continueOnboarding(page);
    await page.waitForTimeout(4000);
    const snapshotAfterTemplate = await getWorkspaceSnapshot();
  ensure(
    snapshotAfterTemplate?.activationSetup?.currentStep === "source",
    "Template step did not persist the next onboarding state.",
  );
    await page.goto(`${baseUrl}/app/setup/source`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator('input[name="selectedDataSourceType"][value="APPOINTMENTS_CSV"]').waitFor({
      state: "visible",
      timeout: 60000,
    });
  } else if (onboardingStepAfterSignUp === "source") {
    recordFinding("Template step auto-advanced after sign-up", {
      currentStepAfterSignUp: onboardingStepAfterSignUp,
      finalUrl: page.url(),
    });
  } else {
    throw new Error(`Unexpected onboarding step after sign-up: ${onboardingStepAfterSignUp}`);
  }

  await page.locator('input[value="APPOINTMENTS_CSV"]').check();
  const selectedSourceValues = await page
    .locator('input[name="selectedDataSourceType"]:checked')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("value")),
    );
  ensure(
    selectedSourceValues.includes("APPOINTMENTS_CSV"),
    "Appointments CSV was not selected on the source step.",
  );
  await page.locator('form button.rev-button-primary[type="submit"]').click({
    force: true,
  });
  await page.waitForTimeout(5000);
  let snapshotAfterSource = await getWorkspaceSnapshot();

  if (snapshotAfterSource?.activationSetup?.currentStep !== "channel") {
    recordFinding("Source step submit required retry", {
      currentStepAfterFirstAttempt: snapshotAfterSource?.activationSetup?.currentStep ?? null,
      urlAfterFirstAttempt: page.url(),
    });

    await page.goto(`${baseUrl}/app/setup/source`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator('input[name="selectedDataSourceType"][value="APPOINTMENTS_CSV"]').waitFor({
      state: "visible",
      timeout: 60000,
    });
    await page.locator('input[value="APPOINTMENTS_CSV"]').check();
    await page.locator('form button.rev-button-primary[type="submit"]').click({
      force: true,
    });
    await page.waitForTimeout(5000);
    snapshotAfterSource = await getWorkspaceSnapshot();
  }

  ensure(
    snapshotAfterSource?.activationSetup?.currentStep === "channel",
    "Source step did not persist the next onboarding state.",
  );
  await page.goto(`${baseUrl}/app/setup/channel`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="primaryChannel"][value="EMAIL"]').waitFor({
    state: "visible",
    timeout: 60000,
  });

  await page.locator('input[value="EMAIL"]').check();
  await page.locator('input[name="primaryChannel"]:checked').waitFor({
    state: "attached",
    timeout: 30000,
  });
  await continueOnboarding(page);
  await page.waitForTimeout(5000);
  const snapshotAfterChannel = await getWorkspaceSnapshot();
  ensure(
    snapshotAfterChannel?.activationSetup?.currentStep === "reviews",
    "Channel step did not persist the next onboarding state.",
  );
  await page.goto(`${baseUrl}/app/setup/reviews`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="googleReviewsUrl"]').waitFor({
    state: "visible",
    timeout: 60000,
  });

  await page.locator('input[name="googleReviewsUrl"]').fill("https://g.page/r/revory-functional-qa");
  await continueOnboarding(page);
  await page.waitForTimeout(5000);
  const snapshotAfterReviews = await getWorkspaceSnapshot();
  ensure(
    snapshotAfterReviews?.activationSetup?.currentStep === "mode",
    "Reviews step did not persist the next onboarding state.",
  );
  await page.goto(`${baseUrl}/app/setup/mode`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="recommendedModeKey"][value="MODE_B"]').waitFor({
    state: "visible",
    timeout: 60000,
  });

  await page.locator('input[value="MODE_B"]').check();
  await page.locator('input[name="recommendedModeKey"]:checked').waitFor({
    state: "attached",
    timeout: 30000,
  });
  await continueOnboarding(page);
  await page.waitForTimeout(5000);
  const snapshotAfterMode = await getWorkspaceSnapshot();
  ensure(
    snapshotAfterMode?.activationSetup?.currentStep === "activation",
    "Mode step did not persist the next onboarding state.",
  );
  await page.goto(`${baseUrl}/app/setup/activation`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('form button.rev-button-primary[type="submit"]').waitFor({
    state: "visible",
    timeout: 60000,
  });
  await saveScreenshot(page, "03-activation-step");

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

  await page.locator('form button.rev-button-primary[type="submit"]').click({
    force: true,
  });
  await page.waitForURL(/\/app\/dashboard/, {
    timeout: 60000,
  });
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

  await page.goto(`${baseUrl}/app/imports`, { waitUntil: "domcontentloaded" });
  const importsPageText = await page.locator("body").innerText();
  recordStep(
    "4. imports page access",
    importsPageText.includes("Imports & Mapping") ? "passed" : "failed",
    {
      textSnippet: importsPageText.slice(0, 3000),
      url: page.url(),
    },
  );
  ensure(importsPageText.includes("Imports & Mapping"), "The imports page did not render after activation.");

  await uploadCsv(page, 0, appointmentsValidCsvPath);
  await page.waitForTimeout(5000);
  recordStep("5. appointments import ui state", "passed", {
    textSnippet: (await page.locator("body").innerText()).slice(0, 4000),
  });
  await saveScreenshot(page, "05-appointments-valid");
  const snapshotAfterAppointments = await waitForSnapshot(
    (snapshot) => snapshot?.appointmentsCount === 3 && snapshot?.clientsCount === 3,
  );
  recordStep("5. upload de CSV valido de appointments", "passed", {
    snapshot: snapshotAfterAppointments,
  });
  ensure(snapshotAfterAppointments?.appointmentsCount === 3, "Expected 3 appointments after the first valid appointments import.");
  ensure(snapshotAfterAppointments?.clientsCount === 3, "Expected 3 clients created from the first appointments import.");

  await uploadCsv(page, 1, clientsValidCsvPath);
  await saveScreenshot(page, "06-clients-valid");
  const snapshotAfterClients = await waitForSnapshot(
    (snapshot) => snapshot?.clientsCount === 5,
  );
  recordStep("6. upload de CSV valido de clients", "passed", {
    snapshot: snapshotAfterClients,
  });
  ensure(snapshotAfterClients?.clientsCount === 5, "Expected 5 clients after the valid clients import.");

  const snapshotBeforeInvalid = await getWorkspaceSnapshot();
  await uploadCsv(page, 0, appointmentsInvalidCsvPath);
  await page.getByText(/Missing required columns/i).waitFor({
    timeout: 60000,
  });
  await saveScreenshot(page, "07-appointments-invalid");
  const snapshotAfterInvalid = await waitForSnapshot(
    (snapshot) =>
      snapshot?.dataSources.some(
        (source) =>
          source.type === DataSourceType.APPOINTMENTS_CSV &&
          source.lastImportFileName === "appointments-invalid.csv" &&
          source.status === "ERROR",
      ) ?? false,
  );
  const invalidDidNotChangeCounts =
    snapshotBeforeInvalid?.appointmentsCount === snapshotAfterInvalid?.appointmentsCount &&
    snapshotBeforeInvalid?.clientsCount === snapshotAfterInvalid?.clientsCount;
  recordStep("7. validacao de CSV invalido", invalidDidNotChangeCounts ? "passed" : "failed", {
    after: snapshotAfterInvalid,
    before: snapshotBeforeInvalid,
  });
  ensure(invalidDidNotChangeCounts, "The invalid CSV changed persisted entity counts.");

  await uploadCsv(page, 0, partialCsvPath);
  await page.getByText(/partial row rejection/i).waitFor({
    timeout: 60000,
  });
  await page.getByText(/Line 3:/i).waitFor({
    timeout: 60000,
  });
  await saveScreenshot(page, "08-partial-rejection");
  const snapshotAfterPartial = await waitForSnapshot(
    (snapshot) =>
      snapshot?.appointmentsCount === 4 &&
      snapshot?.clientsCount === 6 &&
      (snapshot?.dataSources.some(
        (source) =>
          source.type === DataSourceType.APPOINTMENTS_CSV &&
          source.lastImportFileName === "appointments-partial.csv" &&
          source.lastImportErrorRowCount === 1 &&
          source.lastImportSuccessRowCount === 1,
      ) ??
        false),
  );
  const partialValidated =
    snapshotAfterPartial?.appointmentsCount === 4 &&
    snapshotAfterPartial?.clientsCount === 6 &&
    snapshotAfterPartial?.dataSources.some(
      (source) =>
        source.type === DataSourceType.APPOINTMENTS_CSV &&
        source.lastImportErrorRowCount === 1 &&
        source.lastImportSuccessRowCount === 1,
    );
  recordStep("8. cenario de rejeicao parcial", partialValidated ? "passed" : "failed", {
    snapshot: snapshotAfterPartial,
  });
  ensure(partialValidated, "The partial rejection scenario did not persist the expected mixed result.");

  const snapshotBeforeReimport = await getWorkspaceSnapshot();
  await uploadCsv(page, 0, appointmentsValidCsvPath);
  await saveScreenshot(page, "09-reimport-valid");
  const snapshotAfterReimport = await waitForSnapshot(
    (snapshot) =>
      snapshot?.dataSources.some(
        (source) =>
          source.type === DataSourceType.APPOINTMENTS_CSV &&
          source.lastImportFileName === "appointments-valid.csv" &&
          source.lastImportErrorRowCount === 0 &&
          source.lastImportSuccessRowCount === 3,
      ) ?? false,
  );
  const reimportValidated =
    snapshotAfterReimport?.appointmentsCount === snapshotBeforeReimport?.appointmentsCount &&
    snapshotAfterReimport?.clientsCount === snapshotBeforeReimport?.clientsCount &&
    JSON.stringify(snapshotAfterReimport?.appointments) ===
      JSON.stringify(snapshotBeforeReimport?.appointments);
  recordStep("9. reimportacao do mesmo CSV", reimportValidated ? "passed" : "failed", {
    after: snapshotAfterReimport,
    before: snapshotBeforeReimport,
  });
  ensure(reimportValidated, "Reimporting the same appointments CSV duplicated or changed the persisted appointment set unexpectedly.");

  await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: "domcontentloaded" });
  await saveScreenshot(page, "10-dashboard-real-data");
  const dashboardText = await page.locator("body").innerText();
  const snapshotForDashboard = await getWorkspaceSnapshot();
  const dashboardValidated =
    dashboardText.includes("Overview") &&
    dashboardText.includes("Appointments Monitored") &&
    dashboardText.includes("Clients Imported") &&
    dashboardText.includes("Upcoming Appointments") &&
    dashboardText.includes("Import Readiness") &&
    dashboardText.includes(String(snapshotForDashboard?.appointmentsCount ?? "")) &&
    dashboardText.includes(String(snapshotForDashboard?.clientsCount ?? ""));
  recordStep("10. dashboard com dados reais persistidos", dashboardValidated ? "passed" : "failed", {
    dashboardTextSnippet: dashboardText.slice(0, 3000),
    snapshot: snapshotForDashboard,
  });
  ensure(dashboardValidated, "The dashboard did not show the real persisted dataset after the import flows.");

  await page.reload({ waitUntil: "domcontentloaded" });
  const refreshDashboardText = await page.locator("body").innerText();
  const refreshValidated = refreshDashboardText.includes("Overview");
  recordStep("11. refresh do dashboard", refreshValidated ? "passed" : "failed", {
    url: page.url(),
  });
  ensure(refreshValidated, "Dashboard refresh did not preserve the authenticated state.");

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
  await saveScreenshot(secondPage, "11-sign-in-return-dashboard");

  const reloginDashboardText = await secondPage.locator("body").innerText();
  ensure(reloginDashboardText.includes("Overview"), "The new login did not land back on the dashboard.");

  await secondPage.goto(`${baseUrl}/app/imports`, { waitUntil: "domcontentloaded" });
  await secondPage.reload({ waitUntil: "domcontentloaded" });
  await saveScreenshot(secondPage, "12-return-imports");
  const importsText = await secondPage.locator("body").innerText();
  const importsPersisted =
    importsText.includes("revory-appointments-template.csv") ||
    importsText.includes("appointments-valid.csv");
  const importsStateValidated =
    importsText.includes("appointments-valid.csv") &&
    importsText.includes("clients-valid.csv");
  recordStep("11. novo login e retorno ao dashboard/imports", importsStateValidated ? "passed" : "failed", {
    dashboardRestored: reloginDashboardText.includes("Overview"),
    importsPersisted,
    importsTextSnippet: importsText.slice(0, 2500),
  });
  ensure(importsStateValidated, "The persisted import state was not visible after a fresh login.");
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
