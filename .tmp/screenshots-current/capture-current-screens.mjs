import fs from "node:fs";
import path from "node:path";

import { BillingPlanKey, BillingStatus, PrismaClient, WorkspaceStatus } from "@prisma/client";
import { chromium } from "playwright";
import { encode } from "next-auth/jwt";

const root = process.cwd();
const outputDir = path.join(root, ".tmp", "screenshots-current");
const fixtureDir = path.join(root, "scripts", "fixtures", "clean-rerun");
const prisma = new PrismaClient();

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
  ...readEnv(path.join(root, ".env")),
  ...readEnv(path.join(root, ".env.local")),
  ...process.env,
};
const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const authSecret = env.AUTH_SECRET ?? "revory-local-auth-secret";
const cookieName = "next-auth.session-token";

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function screenshot(page, name) {
  await page.screenshot({
    fullPage: true,
    path: path.join(outputDir, `${name}.png`),
  });
}

async function gotoStable(page, url) {
  await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load", { timeout: 60000 });
  await page.waitForTimeout(400);
}

async function createSessionContext(browser, email, name) {
  const token = await encode({
    salt: "",
    secret: authSecret,
    token: {
      email,
      name,
      sub: `screenshots|${email}`,
    },
  });
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: {
      height: 1100,
      width: 1440,
    },
  });
  const url = new URL(baseUrl);

  await context.addCookies([
    {
      domain: url.hostname,
      httpOnly: true,
      name: cookieName,
      path: "/",
      sameSite: "Lax",
      secure: false,
      value: token,
    },
  ]);

  return context;
}

async function getLatestRerunUser() {
  return prisma.user.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      email: {
        startsWith: "lumina.rerun.qa+",
      },
    },
  });
}

async function getOrCreateScreensUser() {
  const latest = await getLatestRerunUser();

  if (latest) {
    return latest;
  }

  return prisma.user.create({
    data: {
      authProvider: "google",
      authSubject: `screenshots|${Date.now()}`,
      email: `lumina.screens.qa+${Date.now()}@example.com`,
      fullName: "Lumina Screens QA",
    },
  });
}

async function ensureWorkspaceReady(userId) {
  const workspace =
    (await prisma.workspace.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        ownerUserId: userId,
      },
    })) ??
    (await prisma.workspace.create({
      data: {
        name: "LUMINA AESTHETICS",
        ownerUserId: userId,
        slug: `lumina-screens-${Date.now()}`,
      },
    }));

  await prisma.workspace.update({
    data: {
      billingStatus: BillingStatus.ACTIVE,
      currentPeriodEnd: new Date("2026-12-31T23:59:59.000Z"),
      name: "LUMINA AESTHETICS",
      planKey: BillingPlanKey.GROWTH,
      status: WorkspaceStatus.ACTIVE,
    },
    where: {
      id: workspace.id,
    },
  });

  await prisma.medSpaProfile.upsert({
    create: {
      brandName: "LUMINA AESTHETICS",
      businessType: "MedSpa",
      timezone: "America/New_York",
      workspaceId: workspace.id,
    },
    update: {
      brandName: "LUMINA AESTHETICS",
      businessType: "MedSpa",
      timezone: "America/New_York",
    },
    where: {
      workspaceId: workspace.id,
    },
  });

  await prisma.activationSetup.upsert({
    create: {
      activatedAt: new Date(),
      averageDealValue: "650",
      currentStep: "activation",
      isCompleted: true,
      primaryChannel: "EMAIL",
      recommendedModeKey: "MODE_A",
      selectedTemplate: "INJECTABLES",
      workspaceId: workspace.id,
    },
    update: {
      activatedAt: new Date(),
      averageDealValue: "650",
      currentStep: "activation",
      isCompleted: true,
      primaryChannel: "EMAIL",
      recommendedModeKey: "MODE_A",
      selectedTemplate: "INJECTABLES",
    },
    where: {
      workspaceId: workspace.id,
    },
  });

  return prisma.workspace.findUniqueOrThrow({
    where: {
      id: workspace.id,
    },
  });
}

async function uploadCsv(page, inputIndex, fileName, shotName) {
  const filePath = path.join(fixtureDir, fileName);
  const fileInput = page.locator('input[type="file"]').nth(inputIndex);
  const lane = fileInput.locator("xpath=ancestor::section[1]");

  await fileInput.setInputFiles(filePath);
  await lane.getByRole("button", { name: /open review|continue review/i }).click();
  await lane
    .getByRole("button", {
      name: /confirm and make visible|confirm mapping and make visible/i,
    })
    .click();
  await lane.getByText("Rows reviewed", { exact: false }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(600);
  await screenshot(page, shotName);
}

async function capturePublic(browser) {
  const context = await browser.newContext({
    viewport: {
      height: 1100,
      width: 1440,
    },
  });
  const page = await context.newPage();

  await gotoStable(page, baseUrl);
  await screenshot(page, "00-landing");

  await gotoStable(page, `${baseUrl}/sign-in`);
  await screenshot(page, "01-sign-in");

  await gotoStable(page, `${baseUrl}/sign-up`);
  await screenshot(page, "02-sign-up");

  await gotoStable(page, `${baseUrl}/privacy`);
  await screenshot(page, "03-privacy");

  await gotoStable(page, `${baseUrl}/terms`);
  await screenshot(page, "04-terms");

  await context.close();
}

async function capturePricing(browser) {
  const email = `pricing.screens.qa+${Date.now()}@example.com`;
  const context = await createSessionContext(browser, email, "Pricing Screens QA");
  const page = await context.newPage();

  await gotoStable(page, `${baseUrl}/start`);
  await screenshot(page, "05-pricing-auth");

  await context.close();
}

async function capturePrivate(browser, user, workspace) {
  const context = await createSessionContext(browser, user.email, "Lumina Screens QA");
  const page = await context.newPage();

  await gotoStable(page, `${baseUrl}/app/setup`);
  await screenshot(page, "06-activation-path-summary");

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "07-dashboard-before-import");

  await gotoStable(page, `${baseUrl}/app/imports`);
  await screenshot(page, "08-imports-empty");

  await page.getByRole("button", { name: /^quick add$/i }).click();
  await screenshot(page, "09-quick-add-modal");
  await page.getByRole("button", { name: /^close$/i }).click();

  await uploadCsv(page, 0, "appointments-smoke.csv", "10-imports-appointments-smoke");

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "11-dashboard-smoke");

  await gotoStable(page, `${baseUrl}/app/imports`);
  await uploadCsv(page, 1, "clients-smoke.csv", "12-imports-clients-smoke");

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "13-dashboard-with-support");

  await gotoStable(page, `${baseUrl}/app/imports`);
  await uploadCsv(page, 0, "appointments-6mo.csv", "14-imports-appointments-6mo");
  await uploadCsv(page, 1, "clients-6mo.csv", "15-imports-clients-6mo");

  await gotoStable(page, `${baseUrl}/app/dashboard`);
  await screenshot(page, "16-dashboard-6mo");

  await page.getByRole("button", { name: /^share proof$/i }).click();
  await screenshot(page, "17-proof-share-modal");

  const popupPromise = page.waitForEvent("popup", { timeout: 10000 }).catch(() => null);
  await page.getByRole("button", { name: /^print or save pdf$/i }).click();
  const popup = await popupPromise;

  if (popup) {
    await popup.waitForLoadState("load", { timeout: 30000 });
    await popup.waitForTimeout(400);
    await screenshot(popup, "18-proof-print-view");
    await popup.close();
  }

  await context.close();

  return workspace;
}

async function main() {
  ensureOutputDir();

  const response = await fetch(`${baseUrl}/sign-in`, {
    redirect: "manual",
  });

  if (response.status < 200 || response.status >= 400) {
    throw new Error(`App server is not ready at ${baseUrl}`);
  }

  const user = await getOrCreateScreensUser();
  const workspace = await ensureWorkspaceReady(user.id);
  const browser = await chromium.launch({
    headless: true,
  });

  await capturePublic(browser);
  await capturePricing(browser);
  await capturePrivate(browser, user, workspace);

  const files = fs
    .readdirSync(outputDir)
    .filter((file) => file.endsWith(".png"))
    .sort();

  fs.writeFileSync(
    path.join(outputDir, "screenshots-results.json"),
    JSON.stringify(
      {
        baseUrl,
        checkedAt: new Date().toISOString(),
        files,
        note: "Activation was seeded after the clean rerun activation submit returned /app/setup/activation?error=activation.",
        workspaceId: workspace.id,
      },
      null,
      2,
    ),
  );

  await browser.close();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
