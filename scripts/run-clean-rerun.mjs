import fs from "node:fs";
import path from "node:path";

import { BillingPlanKey, BillingStatus, PrismaClient } from "@prisma/client";
import { chromium } from "playwright";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const projectRoot = process.cwd();
const fixtureDir = path.join(projectRoot, "scripts", "fixtures", "clean-rerun");
const evidenceDir = path.join(projectRoot, ".tmp", "manual-audit", "rerun");
const runId = `rerun-${Date.now()}`;
const emailPrefix = "lumina.rerun.qa+";
const email = `${emailPrefix}${Date.now()}@example.com`;
const authSubject = `google-oauth2|${runId}`;
const cookieName = "next-auth.session-token";
const expectedResults = JSON.parse(
  fs.readFileSync(path.join(fixtureDir, "expected-results.json"), "utf8"),
);

function resetEvidenceDirectory() {
  fs.rmSync(evidenceDir, { force: true, recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
}

function readEnv(filePath) {
  const env = {};

  if (!fs.existsSync(filePath)) {
    return env;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const env = {
  ...readEnv(path.join(projectRoot, ".env")),
  ...readEnv(path.join(projectRoot, ".env.local")),
  ...process.env,
};
const authSecret = env.AUTH_SECRET ?? "revory-local-auth-secret";
const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function log(message) {
  console.log(`[clean-rerun] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertServerReady() {
  const response = await fetch(`${baseUrl}/sign-in`, {
    redirect: "manual",
  });

  assert(
    response.status >= 200 && response.status < 400,
    `App server did not respond successfully on ${baseUrl}/sign-in`,
  );
}

async function cleanupPreviousRerunUsers() {
  const users = await prisma.user.findMany({
    select: { email: true, id: true },
    where: {
      email: {
        startsWith: emailPrefix,
      },
    },
  });

  for (const user of users) {
    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
      where: { ownerUserId: user.id },
    });

    for (const workspace of workspaces) {
      await prisma.$transaction([
        prisma.metricsSnapshot.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.reviewRequest.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.recoveryOpportunity.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.automationRun.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.appointment.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.client.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.dataSource.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.activationSetup.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.medSpaProfile.deleteMany({ where: { workspaceId: workspace.id } }),
        prisma.workspace.deleteMany({ where: { id: workspace.id } }),
      ]);
    }

    await prisma.user.deleteMany({
      where: {
        id: user.id,
      },
    });
  }
}

async function getWorkspaceContext() {
  const user = await prisma.user.findUnique({
    select: { email: true, id: true },
    where: { email },
  });

  if (!user) {
    return null;
  }

  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      billingStatus: true,
      currentPeriodEnd: true,
      id: true,
      name: true,
      planKey: true,
      status: true,
    },
    where: { ownerUserId: user.id },
  });

  return {
    user,
    workspace,
  };
}

async function activateBilling(workspaceId) {
  await prisma.workspace.update({
    data: {
      billingStatus: BillingStatus.ACTIVE,
      currentPeriodEnd: new Date("2026-12-31T23:59:59.000Z"),
      planKey: BillingPlanKey.GROWTH,
    },
    where: { id: workspaceId },
  });
}

async function screenshot(page, name) {
  await page.screenshot({
    fullPage: true,
    path: path.join(evidenceDir, `${name}.png`),
  });
}

async function gotoStable(page, url) {
  await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load", { timeout: 60000 });
}

async function waitForUrl(page, pattern) {
  await page.waitForURL(pattern, { timeout: 60000 });
}

async function clickContinue(page) {
  const button = page.getByRole("button", { name: /continue|go live with seller/i });
  await button.click();
}

async function fillOnboarding(page) {
  await waitForUrl(page, /\/app\/setup\/template/);
  await page.getByLabel("Clinic name").fill(expectedResults.workspaceName);
  await page.getByRole("radio", { name: /Injectables/i }).check();
  await screenshot(page, "01-template");
  await clickContinue(page);

  await waitForUrl(page, /\/app\/setup\/source/);
  await page.getByRole("radio", { name: /Appointments upload/i }).check();
  await screenshot(page, "02-source");
  await clickContinue(page);

  await waitForUrl(page, /\/app\/setup\/channel/);
  await page.getByRole("radio", { name: /Primary booking path \(Email\)/i }).check();
  await screenshot(page, "03-channel");
  await clickContinue(page);

  await waitForUrl(page, /\/app\/setup\/deal_value/);
  await page.getByLabel("Value tied to one booked appointment").fill("650");
  await screenshot(page, "04-deal-value");
  await clickContinue(page);

  await waitForUrl(page, /\/app\/setup\/mode/);
  await page.getByRole("radio", { name: /Calm & Premium/i }).check();
  await screenshot(page, "05-mode");
  await clickContinue(page);

  await waitForUrl(page, /\/app\/setup\/activation/);
  await screenshot(page, "06-activation");
  await page.getByRole("button", { name: /go live with .*seller/i }).click();
}

async function uploadCsv(page, inputIndex, filePath, shotPrefix) {
  const fileName = path.basename(filePath);
  const fileInput = page.locator('input[type="file"]').nth(inputIndex);
  const lane = fileInput.locator("xpath=ancestor::section[1]");

  await fileInput.setInputFiles(filePath);
  await lane.getByRole("button", { name: /open review|continue review/i }).click();
  await lane
    .getByRole("button", {
      name: /confirm and make visible|confirm mapping and make visible/i,
    })
    .click();
  await lane.getByText(fileName, { exact: false }).last().waitFor({ timeout: 60000 });
  await lane.getByText("Rows reviewed", { exact: false }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  await screenshot(page, shotPrefix);
}

function buildMonthlySnapshot(appointments) {
  const monthly = {};
  let explicitRevenue = 0;

  for (const appointment of appointments) {
    const key = `${appointment.scheduledAt.getUTCFullYear()}-${String(
      appointment.scheduledAt.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    monthly[key] ??= { booked: 0, canceled: 0, noShow: 0, total: 0 };
    monthly[key].total += 1;

    if (appointment.status === "COMPLETED" || appointment.status === "SCHEDULED") {
      monthly[key].booked += 1;
    }

    if (appointment.status === "NO_SHOW") {
      monthly[key].noShow += 1;
    }

    if (appointment.status === "CANCELED") {
      monthly[key].canceled += 1;
    }

    if (appointment.estimatedRevenue) {
      explicitRevenue += Number(appointment.estimatedRevenue);
    }
  }

  return { explicitRevenue, monthly };
}

function verifyMonthlySnapshot(monthly) {
  for (const [monthKey, booked] of Object.entries(expectedResults.monthlyBooked)) {
    assert(
      monthly[monthKey]?.booked === booked,
      `Expected ${booked} booked appointments in ${monthKey}, got ${monthly[monthKey]?.booked ?? "none"}`,
    );
  }
}

async function collectAndVerifyResults(workspaceId) {
  const [activation, medSpa, dataSources, appointments, clientsCount, supportClients, supportedBooked] =
    await Promise.all([
      prisma.activationSetup.findUnique({
        where: { workspaceId },
      }),
      prisma.medSpaProfile.findUnique({
        where: { workspaceId },
      }),
      prisma.dataSource.findMany({
        orderBy: { type: "asc" },
        select: {
          lastImportErrorRowCount: true,
          lastImportFileName: true,
          lastImportRowCount: true,
          lastImportSuccessRowCount: true,
          status: true,
          type: true,
        },
        where: { workspaceId },
      }),
      prisma.appointment.findMany({
        select: {
          estimatedRevenue: true,
          scheduledAt: true,
          status: true,
        },
        where: { workspaceId },
      }),
      prisma.client.count({
        where: { workspaceId },
      }),
      prisma.client.count({
        where: {
          hasLeadBaseSupport: true,
          workspaceId,
        },
      }),
      prisma.appointment.count({
        where: {
          client: {
            is: {
              hasLeadBaseSupport: true,
            },
          },
          status: {
            in: ["SCHEDULED", "COMPLETED"],
          },
          workspaceId,
        },
      }),
    ]);

  const { explicitRevenue, monthly } = buildMonthlySnapshot(appointments);
  const appointmentsSource = dataSources.find(
    (source) => source.lastImportFileName === "appointments-6mo.csv",
  );
  const clientsSource = dataSources.find(
    (source) => source.lastImportFileName === "clients-6mo.csv",
  );

  assert(Boolean(activation?.isCompleted), "Activation setup should be completed");
  assert(medSpa?.brandName === expectedResults.workspaceName, "MedSpa profile was not persisted");
  assert(clientsCount === expectedResults.clientsCount, `Expected ${expectedResults.clientsCount} clients, got ${clientsCount}`);
  assert(
    supportClients === expectedResults.supportClients,
    `Expected ${expectedResults.supportClients} support clients, got ${supportClients}`,
  );
  assert(
    supportedBooked === expectedResults.supportedBooked,
    `Expected ${expectedResults.supportedBooked} supported booked appointments, got ${supportedBooked}`,
  );
  assert(
    appointmentsSource?.lastImportSuccessRowCount === expectedResults.appointmentsImportedRows,
    `Expected ${expectedResults.appointmentsImportedRows} imported appointment rows`,
  );
  assert(
    clientsSource?.lastImportSuccessRowCount === expectedResults.clientsImportedRows,
    `Expected ${expectedResults.clientsImportedRows} imported client rows`,
  );
  verifyMonthlySnapshot(monthly);

  return {
    activation,
    clientsCount,
    dataSources,
    email,
    explicitRevenue,
    medSpa,
    monthly,
    supportClients,
    supportedBooked,
  };
}

async function main() {
  resetEvidenceDirectory();
  await cleanupPreviousRerunUsers();
  await assertServerReady();

  const token = await encode({
    salt: "",
    secret: authSecret,
    token: {
      email,
      name: "Lumina QA Rerun",
      sub: authSubject,
    },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl });

  await context.addCookies([
    {
      domain: "localhost",
      httpOnly: true,
      name: cookieName,
      path: "/",
      sameSite: "Lax",
      value: token,
    },
  ]);

  const page = await context.newPage();

  log("Opening /start to create auth-linked workspace");
  await gotoStable(page, `${baseUrl}/start`);
  await page.waitForSelector("body", { timeout: 30000 });
  await screenshot(page, "00-start-auth");

  const workspaceContext = await getWorkspaceContext();
  assert(workspaceContext?.workspace, "Workspace was not created after authenticated /start visit.");

  await activateBilling(workspaceContext.workspace.id);

  log("Opening /app after billing activation");
  await gotoStable(page, `${baseUrl}/app`);
  await fillOnboarding(page);

  await waitForUrl(page, /\/app\/imports/);
  await screenshot(page, "07-imports-empty");

  await uploadCsv(
    page,
    0,
    path.join(fixtureDir, "appointments-smoke.csv"),
    "08-imports-appointments-smoke",
  );

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "09-dashboard-smoke");

  await gotoStable(page, `${baseUrl}/app/imports`);
  await uploadCsv(
    page,
    1,
    path.join(fixtureDir, "clients-smoke.csv"),
    "10-imports-clients-smoke",
  );

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "11-dashboard-with-support");

  await gotoStable(page, `${baseUrl}/app/imports`);
  await uploadCsv(
    page,
    0,
    path.join(fixtureDir, "appointments-6mo.csv"),
    "12-imports-appointments-6mo",
  );
  await uploadCsv(
    page,
    1,
    path.join(fixtureDir, "clients-6mo.csv"),
    "13-imports-clients-6mo",
  );

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "14-dashboard-6mo");

  const finalWorkspaceContext = await getWorkspaceContext();
  assert(finalWorkspaceContext?.workspace, "Final workspace context was not available.");
  assert(
    finalWorkspaceContext.workspace.name === expectedResults.workspaceName,
    "Workspace name does not match expected fixture",
  );
  assert(
    finalWorkspaceContext.workspace.planKey === expectedResults.planKey,
    `Expected plan ${expectedResults.planKey}, got ${finalWorkspaceContext.workspace.planKey}`,
  );
  assert(
    finalWorkspaceContext.workspace.billingStatus === expectedResults.billingStatus,
    `Expected billing status ${expectedResults.billingStatus}, got ${finalWorkspaceContext.workspace.billingStatus}`,
  );

  const verified = await collectAndVerifyResults(finalWorkspaceContext.workspace.id);
  const result = {
    checkedAt: new Date().toISOString(),
    expectedResults,
    fixtures: {
      appointments6mo: path.join(fixtureDir, "appointments-6mo.csv"),
      appointmentsSmoke: path.join(fixtureDir, "appointments-smoke.csv"),
      clients6mo: path.join(fixtureDir, "clients-6mo.csv"),
      clientsSmoke: path.join(fixtureDir, "clients-smoke.csv"),
    },
    verified,
    workspace: finalWorkspaceContext.workspace,
  };

  fs.writeFileSync(path.join(evidenceDir, "rerun-results.json"), JSON.stringify(result, null, 2));

  await context.close();
  await browser.close();
  await prisma.$disconnect();

  log(`Done. Evidence saved to ${evidenceDir}`);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
