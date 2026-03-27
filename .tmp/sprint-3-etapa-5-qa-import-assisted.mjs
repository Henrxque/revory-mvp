import fs from "node:fs";
import path from "node:path";

import { AppointmentStatus, PrismaClient } from "@prisma/client";
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
const evidenceDir = path.join(projectRoot, ".tmp", "qa-sprint3-etapa5", runId);
const resultsPath = path.join(evidenceDir, "results.json");
const fixturesDir = path.join(projectRoot, ".tmp", "qa-fixtures-sprint3");

const fixturePaths = {
  appointmentsAssistedCompatible: path.join(
    fixturesDir,
    "appointments-assisted-compatible.csv",
  ),
  appointmentsDuplicateHeaders: path.join(
    fixturesDir,
    "appointments-duplicate-headers.csv",
  ),
  appointmentsEmpty: path.join(fixturesDir, "appointments-empty.csv"),
  appointmentsExtraColumns: path.join(
    fixturesDir,
    "appointments-extra-columns.csv",
  ),
  appointmentsMalformedQuote: path.join(
    fixturesDir,
    "appointments-malformed-quote.csv",
  ),
  appointmentsMissingRequired: path.join(
    fixturesDir,
    "appointments-missing-required.csv",
  ),
  appointmentsOfficialExact: path.join(
    fixturesDir,
    "appointments-official-exact.csv",
  ),
  clientsOfficialExact: path.join(fixturesDir, "clients-official-exact.csv"),
};

fs.mkdirSync(evidenceDir, { recursive: true });

process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;

await clerkSetup({
  publishableKey: keyless.publishableKey,
  secretKey: keyless.secretKey,
});

const email = `revory-sprint3-qa-${Date.now()}+clerk_test@example.com`;
const password = "Revory!12345";

const results = {
  baseUrl,
  email,
  findings: [],
  finishedAt: null,
  networkEvents: [],
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

function recordFinding({
  evidence = {},
  impact,
  severity,
  stepsToReproduce,
  title,
}) {
  results.findings.push({
    evidence,
    impact,
    severity,
    stepsToReproduce,
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

async function suppressClerkOverlay(page) {
  await page
    .addStyleTag({
      content:
        '#clerk-components{display:none !important;pointer-events:none !important;opacity:0 !important;}',
    })
    .catch(() => {});
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
    appointments,
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

async function forceActivateWorkspaceForSprint3() {
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
    return null;
  }

  await prisma.activationSetup.update({
    data: {
      activatedAt: new Date(),
      currentStep: "activation",
      googleReviewsUrl: "https://g.page/r/revory-sprint3-qa",
      isCompleted: true,
      primaryChannel: "EMAIL",
      recommendedModeKey: "MODE_B",
      selectedTemplate: "MEDSPA",
    },
    where: {
      workspaceId: workspace.id,
    },
  });

  await prisma.workspace.update({
    data: {
      activeModeKey: "MODE_B",
      status: "ACTIVE",
    },
    where: {
      id: workspace.id,
    },
  });

  return getWorkspaceSnapshot();
}

async function waitForWorkspaceSnapshot(timeoutMs = 30000) {
  const startedAtMs = Date.now();

  while (Date.now() - startedAtMs < timeoutMs) {
    const snapshot = await getWorkspaceSnapshot();

    if (snapshot?.workspace) {
      return snapshot;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }

  return null;
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

    if ((await page.getByText(/need to send a verification code/i).count()) > 0) {
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
    (await verificationInput.count()) > 0 &&
    (await verificationInput.isVisible().catch(() => false));

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
  if (!/\/sign-in/.test(page.url())) {
    await page.goto(`${baseUrl}/sign-in`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });
  } else {
    await page.waitForLoadState("domcontentloaded", {
      timeout: 60000,
    });
  }
  await page.locator('input[name="identifier"], input[name="emailAddress"]').first().fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForLoadState("domcontentloaded", {
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  await suppressClerkOverlay(page);
  await completeVerificationChallenge(page);
  await page.waitForURL(/\/app(\/|$)/, {
    timeout: 120000,
  });
  await suppressClerkOverlay(page);
}

async function gotoImports(page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto(`${baseUrl}/app/imports`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });

    if (/accounts\.dev\/sign-in|\/sign-in/.test(page.url())) {
      await performUiSignIn(page);
      await page.waitForTimeout(3000);
      continue;
    }

    await page.getByText("Imports & Mapping").first().waitFor({
      state: "visible",
      timeout: 60000,
    });
    await suppressClerkOverlay(page);

    return;
  }

  throw new Error("Could not restore an authenticated session for /app/imports.");
}

function getCardHandles(page, index) {
  const form = page.locator("form").nth(index);
  const section = form.locator("xpath=ancestor::section[1]");

  return {
    form,
    section,
  };
}

async function getCardText(page, index) {
  const { section } = getCardHandles(page, index);
  return section.innerText();
}

async function uploadFileToCard(page, index, filePath) {
  const { form } = getCardHandles(page, index);
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

    await page.waitForTimeout(1500 * attempt);

    const sectionText = await getCardText(page, index);
    const inputState = await fileInput.evaluate((element) => ({
      filesLength: element.files?.length ?? 0,
      firstName: element.files?.[0]?.name ?? null,
    }));
    const reacted =
      sectionText.includes(fileName) ||
      sectionText.includes("Mapping review") ||
      sectionText.includes("header detected") ||
      sectionText.includes("header detected.");

    lastResult = {
      attempt,
      inputState,
      reacted,
      sectionText,
    };

    if (reacted) {
      return lastResult;
    }
  }

  return lastResult;
}

async function getProgressButton(form) {
  return form.getByRole("button", {
    name: /Review final confirmation|Continue to final confirmation/i,
  });
}

async function getConfirmButton(form) {
  return form.getByRole("button", {
    name: /Confirm official mapping and import|Confirm mapping and import/i,
  });
}

async function openFinalConfirmation(page, index) {
  const { form } = getCardHandles(page, index);
  const progressButton = await getProgressButton(form);

  await progressButton.waitFor({
    state: "visible",
    timeout: 60000,
  });
  await progressButton.scrollIntoViewIfNeeded();
  await progressButton.click();

  const confirmButton = await getConfirmButton(form);

  await confirmButton.waitFor({
    state: "visible",
    timeout: 60000,
  });

  await page.waitForTimeout(500);
}

async function readFormText(form) {
  return form.evaluate((element) => element.closest("section")?.innerText ?? "");
}

async function locatorExists(locator) {
  return (await locator.count()) > 0;
}

async function getProgressButtonState(form) {
  const progressButton = await getProgressButton(form);
  const exists = await locatorExists(progressButton);

  if (!exists) {
    return {
      disabled: true,
      label: "",
      visible: false,
    };
  }

  return {
    disabled: await progressButton.isDisabled().catch(() => true),
    label: ((await progressButton.textContent()) ?? "").trim(),
    visible: await progressButton.isVisible().catch(() => false),
  };
}

async function getConfirmButtonState(form) {
  const confirmButton = await getConfirmButton(form);
  const exists = await locatorExists(confirmButton);

  if (!exists) {
    return {
      label: "",
      visible: false,
    };
  }

  return {
    label: ((await confirmButton.textContent()) ?? "").trim(),
    visible: await confirmButton.isVisible().catch(() => false),
  };
}

async function submitConfirmedImport(page, index) {
  const { form } = getCardHandles(page, index);
  const confirmButton = await getConfirmButton(form);

  await confirmButton.waitFor({
    state: "visible",
    timeout: 60000,
  });
  await confirmButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(9000);
  await confirmButton.click();
  await page.waitForTimeout(4000);

  await form
    .getByText(/Result from the import that just ran\.|Import finished|Rows still needing correction/i)
    .first()
    .waitFor({
      state: "visible",
      timeout: 120000,
    });
}

async function runSuccessfulImportScenario({
  cardIndex,
  expectedAppointments,
  expectedClients,
  expectedPrimaryLabel,
  expectedSummaryRegex,
  filePath,
  name,
  page,
}) {
  await gotoImports(page);
  const uploadResult = await uploadFileToCard(page, cardIndex, filePath);
  const { form } = getCardHandles(page, cardIndex);
  const cardTextAfterUpload = uploadResult.sectionText;
  const progressState = await getProgressButtonState(form);
  const progressLabel = progressState.label;
  const progressDisabled = progressState.disabled;

  const uploadPassed = uploadResult.reacted && !progressDisabled;
  recordStep(`${name}.preview`, uploadPassed ? "passed" : "failed", {
    progressDisabled,
    progressLabel,
    textSnippet: cardTextAfterUpload.slice(0, 2600),
    uploadResult,
  });
  ensure(uploadPassed, `${name}: preview did not become actionable.`);
  ensure(
    expectedPrimaryLabel.test(progressLabel),
    `${name}: unexpected primary action label "${progressLabel}".`,
  );

  await openFinalConfirmation(page, cardIndex);
  const cardTextAtConfirmation = await readFormText(form);
  const confirmState = await getConfirmButtonState(form);
  const confirmLabel = confirmState.label;
  const confirmationPassed =
    /final confirmation/i.test(cardTextAtConfirmation) &&
    confirmState.visible &&
    confirmLabel.length > 0;
  recordStep(`${name}.confirmation`, confirmationPassed ? "passed" : "failed", {
    confirmLabel,
    textSnippet: cardTextAtConfirmation.slice(0, 2600),
  });
  ensure(confirmationPassed, `${name}: final confirmation did not render.`);

  await submitConfirmedImport(page, cardIndex);
  const cardTextAfterImport = await getCardText(page, cardIndex);
  const snapshot = await getWorkspaceSnapshot();
  const importPassed =
    expectedSummaryRegex.test(cardTextAfterImport) &&
    snapshot?.appointmentsCount === expectedAppointments &&
    snapshot?.clientsCount === expectedClients;
  recordStep(name, importPassed ? "passed" : "failed", {
    snapshot,
    textSnippet: cardTextAfterImport.slice(0, 2600),
  });
  ensure(importPassed, `${name}: persisted data did not match expectations.`);
}

async function runBlockedScenario({
  cardIndex,
  expectedBlockers,
  filePath,
  name,
  page,
}) {
  await gotoImports(page);
  const uploadResult = await uploadFileToCard(page, cardIndex, filePath);
  const { form } = getCardHandles(page, cardIndex);
  const progressState = await getProgressButtonState(form);
  const progressVisible = progressState.visible;
  const progressDisabled = progressState.disabled;
  const cardText = uploadResult.sectionText;
  const blockersMatched = expectedBlockers.every((blocker) => blocker.test(cardText));
  const passed = uploadResult.reacted && progressDisabled && blockersMatched;

  recordStep(name, passed ? "passed" : "failed", {
    expectedBlockers: expectedBlockers.map((regex) => regex.source),
    progressDisabled,
    progressVisible,
    textSnippet: cardText.slice(0, 2600),
    uploadResult,
  });
}

const browser = await chromium.launch({ headless: true });
let context = null;

try {
  context = await browser.newContext({
    viewport: {
      height: 960,
      width: 1440,
    },
  });

  const page = await context.newPage();
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/app/imports")) {
      results.networkEvents.push({
        headers: request.headers(),
        method: request.method(),
        timestamp: new Date().toISOString(),
        url: request.url(),
      });
    }
  });
  await setupTestingBypass(page);
  await suppressClerkOverlay(page);

  await page.goto(`${baseUrl}/sign-up`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="emailAddress"]').waitFor({
    state: "visible",
    timeout: 60000,
  });
  await saveScreenshot(page, "01-sign-up-page");
  recordStep("auth.sign-up-page", "passed", {
    url: page.url(),
  });

  await page.locator('input[name="emailAddress"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForURL(/\/sign-up\/verify-email-address|\/app/, {
    timeout: 120000,
  });
  await completeEmailVerification(page);
  await page.waitForTimeout(12000);

  if (!/\/app(\/|$)/.test(page.url())) {
    await page.goto(`${baseUrl}/app`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(6000);
  }

  recordStep("auth.sign-up", "passed", {
    finalUrl: page.url(),
  });

  let snapshotAfterSignUp = await waitForWorkspaceSnapshot(45000);

  if (!snapshotAfterSignUp) {
    await page.goto(`${baseUrl}/app`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(12000);
    snapshotAfterSignUp = await waitForWorkspaceSnapshot(30000);
  }
  const workspaceCreated = Boolean(snapshotAfterSignUp?.workspace);
  recordStep("auth.workspace-created", workspaceCreated ? "passed" : "failed", {
    snapshot: snapshotAfterSignUp,
  });
  ensure(workspaceCreated, "Workspace was not created after sign-up.");

  const postActivationSnapshot = await forceActivateWorkspaceForSprint3();
  const activationPassed =
    postActivationSnapshot?.activationSetup?.isCompleted === true &&
    postActivationSnapshot?.workspace?.status === "ACTIVE";
  await page.goto(`${baseUrl}/app/dashboard`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await suppressClerkOverlay(page);
  await saveScreenshot(page, "02-dashboard-after-activation");
  recordStep("auth.activated-workspace-for-sprint3", activationPassed ? "passed" : "failed", {
    snapshot: postActivationSnapshot,
  });
  ensure(activationPassed, "Onboarding activation did not persist.");

  await runSuccessfulImportScenario({
    cardIndex: 0,
    expectedAppointments: 1,
    expectedClients: 1,
    expectedPrimaryLabel: /Review final confirmation/i,
    expectedSummaryRegex: /CSV imported successfully using the confirmed mapping for this execution\.|Result from the import that just ran\./i,
    filePath: fixturePaths.appointmentsOfficialExact,
    name: "regression.official-appointments-import",
    page,
  });
  await saveScreenshot(page, "03-official-appointments-import");

  await runSuccessfulImportScenario({
    cardIndex: 1,
    expectedAppointments: 1,
    expectedClients: 2,
    expectedPrimaryLabel: /Review final confirmation/i,
    expectedSummaryRegex: /CSV imported successfully using the confirmed mapping for this execution\.|Result from the import that just ran\./i,
    filePath: fixturePaths.clientsOfficialExact,
    name: "regression.official-clients-import",
    page,
  });
  await saveScreenshot(page, "04-official-clients-import");

  await runSuccessfulImportScenario({
    cardIndex: 0,
    expectedAppointments: 2,
    expectedClients: 3,
    expectedPrimaryLabel: /Continue to final confirmation/i,
    expectedSummaryRegex: /Current execution only|Result from the import that just ran\./i,
    filePath: fixturePaths.appointmentsAssistedCompatible,
    name: "sprint3.assisted-compatible-import",
    page,
  });
  await saveScreenshot(page, "05-assisted-compatible-import");

  await runSuccessfulImportScenario({
    cardIndex: 0,
    expectedAppointments: 3,
    expectedClients: 4,
    expectedPrimaryLabel: /Continue to final confirmation/i,
    expectedSummaryRegex: /Current execution only|Result from the import that just ran\./i,
    filePath: fixturePaths.appointmentsExtraColumns,
    name: "sprint3.extra-columns-import",
    page,
  });
  await saveScreenshot(page, "06-extra-columns-import");

  await runBlockedScenario({
    cardIndex: 0,
    expectedBlockers: [/Required fields still missing/i, /Scheduled At/i, /Status/i],
    filePath: fixturePaths.appointmentsMissingRequired,
    name: "sprint3.block-missing-required",
    page,
  });
  await saveScreenshot(page, "07-missing-required-blocked");

  await runBlockedScenario({
    cardIndex: 0,
    expectedBlockers: [/Duplicate source headers/i, /client_email/i],
    filePath: fixturePaths.appointmentsDuplicateHeaders,
    name: "sprint3.block-duplicate-headers",
    page,
  });
  await saveScreenshot(page, "08-duplicate-headers-blocked");

  await gotoImports(page);
  const emptyUpload = await uploadFileToCard(page, 0, fixturePaths.appointmentsEmpty);
  const { form: emptyForm } = getCardHandles(page, 0);
  const emptyText = emptyUpload.sectionText;
  const emptyProgressState = await getProgressButtonState(emptyForm);
  const emptyDisabled = emptyProgressState.disabled;
  const emptyPassed = emptyUpload.reacted && emptyDisabled;
  recordStep("sprint3.block-empty-csv", emptyPassed ? "passed" : "failed", {
    progressDisabled: emptyDisabled,
    textSnippet: emptyText.slice(0, 2600),
    uploadResult: emptyUpload,
  });
  if (!/empty/i.test(emptyText)) {
    recordFinding({
      evidence: {
        observedTextSnippet: emptyText.slice(0, 2000),
      },
      impact:
        "Usuários que sobem um CSV vazio recebem um bloqueio de mapeamento genérico e não entendem que o arquivo está vazio.",
      severity: "medium",
      stepsToReproduce: [
        "Autenticar em /app/imports",
        "Selecionar appointments-empty.csv no card de appointments",
        "Observar os bloqueios exibidos no preview",
      ],
      title: "CSV vazio não comunica a causa real do bloqueio",
    });
  }
  await saveScreenshot(page, "09-empty-csv-blocked");

  await gotoImports(page);
  const malformedUpload = await uploadFileToCard(page, 0, fixturePaths.appointmentsMalformedQuote);
  const { form: malformedForm } = getCardHandles(page, 0);
  const malformedText = malformedUpload.sectionText;
  const malformedProgressState = await getProgressButtonState(malformedForm);
  const malformedDisabled = malformedProgressState.disabled;
  const malformedPassed = malformedUpload.reacted && malformedDisabled;
  recordStep("sprint3.block-malformed-structure", malformedPassed ? "passed" : "failed", {
    progressDisabled: malformedDisabled,
    textSnippet: malformedText.slice(0, 2600),
    uploadResult: malformedUpload,
  });
  if (!/malformed|invalid|broken|structure/i.test(malformedText)) {
    recordFinding({
      evidence: {
        observedTextSnippet: malformedText.slice(0, 2000),
      },
      impact:
        "Arquivos estruturalmente quebrados ficam parecendo apenas um mapeamento incompleto, o que dificulta correção self-service e aumenta retrabalho.",
      severity: "medium",
      stepsToReproduce: [
        "Autenticar em /app/imports",
        "Selecionar appointments-malformed-quote.csv no card de appointments",
        "Observar que a UI não explica que o CSV está estruturalmente quebrado",
      ],
      title: "CSV estruturalmente inválido não tem feedback específico",
    });
  }
  await saveScreenshot(page, "10-malformed-csv-blocked");

  await page.goto(`${baseUrl}/app/dashboard`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const dashboardText = await page.locator("body").innerText();
  const dashboardSnapshot = await getWorkspaceSnapshot();
  const dashboardPassed =
    dashboardText.includes("Dashboard") &&
    dashboardText.includes("3") &&
    dashboardText.includes("4") &&
    dashboardSnapshot?.appointmentsCount === 3 &&
    dashboardSnapshot?.clientsCount === 4;
  recordStep("regression.dashboard-persisted-state", dashboardPassed ? "passed" : "failed", {
    snapshot: dashboardSnapshot,
    textSnippet: dashboardText.slice(0, 2600),
  });
  ensure(dashboardPassed, "Dashboard did not reflect persisted Sprint 3 import data.");
  await saveScreenshot(page, "11-dashboard-persisted");

  await gotoImports(page);
  const importsText = await page.locator("body").innerText();
  const importsPassed =
    importsText.includes("appointments-extra-columns.csv") &&
    importsText.includes("clients-official-exact.csv");
  recordStep("regression.imports-persisted-state", importsPassed ? "passed" : "failed", {
    textSnippet: importsText.slice(0, 2600),
  });
  ensure(importsPassed, "Imports page did not show persisted import state.");

  await page.reload({
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const refreshText = await page.locator("body").innerText();
  recordStep("regression.refresh-imports", refreshText.includes("Imports & Mapping") ? "passed" : "failed", {
    url: page.url(),
  });

  await context.close();
  context = await browser.newContext({
    viewport: {
      height: 960,
      width: 1440,
    },
  });

  const secondPage = await context.newPage();
  await setupTestingBypass(secondPage);
  await performUiSignIn(secondPage);
  await secondPage.goto(`${baseUrl}/app/imports`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await suppressClerkOverlay(secondPage);
  const reloginText = await secondPage.locator("body").innerText();
  const reloginPassed =
    reloginText.includes("appointments-extra-columns.csv") &&
    reloginText.includes("clients-official-exact.csv");
  recordStep(
    "regression.relogin-imports-state",
    reloginPassed ? "passed" : "failed",
    {
      textSnippet: reloginText.slice(0, 2600),
    },
  );
  ensure(reloginPassed, "Relogin did not restore persisted import state.");
  await saveScreenshot(secondPage, "12-relogin-imports");
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
