import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";
import { encode } from "next-auth/jwt";

const root = process.cwd();
const outputDir = path.join(root, ".tmp", "manual-audit", "full-product-qa");
const outputPath = path.join(outputDir, "full-product-qa-results.json");
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const prisma = new PrismaClient();
const results = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  passes: [],
  failures: [],
  observations: [],
  created: {
    emails: [],
    clientIds: [],
    opportunityIds: [],
  },
};

function hasMojibake(text) {
  return (
    text.includes("â") ||
    text.includes("Â") ||
    text.includes("Ã") ||
    text.includes("�") ||
    [...text].some((char) => {
      const code = char.charCodeAt(0);

      return code >= 0x80 && code <= 0x9f;
    })
  );
}

function record(name, passed, details = {}) {
  const item = { name, passed, details };

  if (passed) {
    results.passes.push(item);
  } else {
    results.failures.push(item);
  }

  return passed;
}

function observe(name, details = {}) {
  results.observations.push({ name, details });
}

async function createSessionToken(email, name = "REVORY QA") {
  const secret = process.env.AUTH_SECRET || "revory-local-auth-secret";

  return encode({
    maxAge: 60 * 60 * 24,
    secret,
    token: {
      email,
      name,
      sub: `qa-${email}`,
    },
  });
}

async function addNextAuthCookie(context, email, name = "REVORY QA") {
  const token = await createSessionToken(email, name);
  const url = new URL(baseUrl);

  await context.addCookies([
    {
      domain: url.hostname,
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      httpOnly: true,
      name: "next-auth.session-token",
      path: "/",
      sameSite: "Lax",
      secure: false,
      value: token,
    },
  ]);

  return token;
}

async function getManualRerunWorkspace() {
  const rerunPath = path.join(root, ".tmp", "manual-audit", "rerun", "rerun-results.json");

  if (!fs.existsSync(rerunPath)) {
    return null;
  }

  const read = JSON.parse(fs.readFileSync(rerunPath, "utf8"));

  return {
    email: read.verified?.email,
    workspaceId: read.workspace?.id,
    workspaceName: read.workspace?.name,
  };
}

async function testPublicAndPricing(browser) {
  const context = await browser.newContext();
  const pageErrors = [];
  const consoleErrors = [];
  const page = await context.newPage();

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText();
    const footerLinks = await page
      .locator("footer a")
      .evaluateAll((links) => links.map((link) => ({ text: link.textContent?.trim(), href: link.getAttribute("href") })));

    record("landing loads without obvious mojibake", !/[ÂÃ�]|âœ|â€|â†/.test(bodyText), {
      sample: bodyText.slice(0, 220),
    });
    record("landing has primary CTA to pricing/start", (await page.locator('a[href^="/start"]').count()) > 0, {
      ctaCount: await page.locator('a[href^="/start"]').count(),
    });
    observe("landing footer links", { footerLinks });

    const unauthApp = await fetch(`${baseUrl}/app`, { redirect: "manual" });
    record("unauthenticated /app redirects instead of exposing app", [302, 303, 307, 308].includes(unauthApp.status), {
      status: unauthApp.status,
      location: unauthApp.headers.get("location"),
    });

    const pricingEmail = `pricing.qa+${Date.now()}@example.com`;
    results.created.emails.push(pricingEmail);
    const pricingContext = await browser.newContext();
    await addNextAuthCookie(pricingContext, pricingEmail, "Pricing QA");
    const pricingPage = await pricingContext.newPage();

    await pricingPage.goto(`${baseUrl}/start`, { waitUntil: "networkidle" });
    const pricingBody = await pricingPage.locator("body").innerText();

    record("pricing loads for authenticated inactive user", /Basic|Growth|Premium/i.test(pricingBody), {
      url: pricingPage.url(),
      sample: pricingBody.slice(0, 260),
    });
    record("pricing has no mojibake in visible plan feature markers", !hasMojibake(pricingBody), {
      offendingSample: pricingBody
        .split(/\r?\n/)
        .find((line) => hasMojibake(line)) ?? null,
    });

    const growthCta = pricingPage.locator('a[href="/api/billing/checkout?plan=growth"]').first();
    const hasGrowthCta = (await growthCta.count()) > 0;

    if (hasGrowthCta) {
      await growthCta.click();
      await pricingPage.waitForLoadState("networkidle").catch(() => undefined);
    }

    record("Stripe-missing checkout returns controlled unavailable state", hasGrowthCta && /billing=unavailable/.test(pricingPage.url()), {
      url: pricingPage.url(),
    });

    await pricingContext.close();

    record("public pages produced no browser runtime errors", pageErrors.length === 0 && consoleErrors.length === 0, {
      pageErrors,
      consoleErrors,
    });
  } finally {
    await context.close();
  }
}

async function testAuthRedirectSecurity() {
  const email = `redirect.qa+${Date.now()}@example.com`;
  results.created.emails.push(email);
  const token = await createSessionToken(email, "Redirect QA");
  const cookie = `next-auth.session-token=${token}`;
  const targets = [
    "/sign-in?redirect_url=%2F%2Fevil.example",
    "/sign-up?redirect_url=%2F%2Fevil.example",
    "/sign-in?redirect_url=https%3A%2F%2Fevil.example%2Ftakeover",
  ];

  for (const target of targets) {
    const response = await fetch(`${baseUrl}${target}`, {
      headers: { cookie },
      redirect: "manual",
    });
    const location = response.headers.get("location");

    record(`authenticated auth redirect stays same-origin for ${target}`, !(location?.startsWith("//") || /^https?:\/\/evil\.example/i.test(location ?? "")), {
      status: response.status,
      location,
    });
  }
}

async function testAuthenticatedCore(browser) {
  const rerunWorkspace = await getManualRerunWorkspace();

  if (!rerunWorkspace?.email || !rerunWorkspace?.workspaceId) {
    record("manual rerun workspace exists for authenticated QA", false, { rerunWorkspace });
    return;
  }

  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const pageErrors = [];
  const consoleErrors = [];
  await addNextAuthCookie(context, rerunWorkspace.email, "LUMINA RERUN QA");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
  const page = await context.newPage();

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
    record("authenticated /app reaches active app surface", /dashboard|revenue|booking/i.test(page.url()), {
      url: page.url(),
      heading: await page.locator("h1, h2").first().textContent().catch(() => null),
    });

    try {
      await page.goto(`${baseUrl}/app/setup/deal_value?edit=1`, { waitUntil: "networkidle" });
      const dealValueInput = page.getByLabel(/Value tied to one booked appointment/i);
      await dealValueInput.fill("not money");
      await page.getByRole("button", { name: /Save|Continue/i }).first().click();
      await page.waitForLoadState("networkidle").catch(() => undefined);
      const invalidDealText = await page.locator("body").innerText();
      record("adjust setup rejects invalid deal value without saving fake success", /error=deal_value|number|valid|value/i.test(page.url() + " " + invalidDealText), {
        url: page.url(),
        sample: invalidDealText.match(/[^\n]*(?:number|valid|value|error)[^\n]*/i)?.[0] ?? invalidDealText.slice(0, 220),
      });
    } catch (error) {
      record("adjust setup rejects invalid deal value without saving fake success", false, {
        message: error instanceof Error ? error.message : String(error),
        url: page.url(),
      });
    }

    await page.goto(`${baseUrl}/app/imports`, { waitUntil: "networkidle" });
    const importBody = await page.locator("body").innerText();
    record("imports page shows booking assistance and quick add", /Quick add/i.test(importBody) && /Booking assistance|booking read|Action pack/i.test(importBody), {
      url: page.url(),
      sample: importBody.slice(0, 260),
    });

    await page.getByRole("button", { name: "Quick add" }).first().click();
    await page.getByLabel(/Lead name/i).fill("Name Only QA");
    record("quick add submit stays disabled without contact identity", await page.getByRole("button", { name: /^Add lead$/i }).isDisabled(), {});
    await page.getByRole("button", { name: /Cancel/i }).click();

    const phoneOnlyName = `Phone Only QA ${Date.now()}`;
    const phoneOnlyPhone = `+1555${Date.now().toString().slice(-7)}`;
    await page.getByRole("button", { name: "Quick add" }).first().click();
    await page.getByLabel(/Lead name/i).fill(phoneOnlyName);
    await page.getByLabel(/Phone/i).fill(phoneOnlyPhone);
    await page.getByRole("button", { name: /^Add lead$/i }).click();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(1200);

    const phoneOnlyOpportunity = await prisma.leadBookingOpportunity.findFirst({
      include: { client: true },
      orderBy: { createdAt: "desc" },
      where: {
        workspaceId: rerunWorkspace.workspaceId,
        client: {
          phone: phoneOnlyPhone,
        },
      },
    });

    if (phoneOnlyOpportunity) {
      results.created.clientIds.push(phoneOnlyOpportunity.clientId);
      results.created.opportunityIds.push(phoneOnlyOpportunity.id);
    }

    record("quick add phone-only lead is classified honestly against email booking path", phoneOnlyOpportunity?.status === "BLOCKED" && phoneOnlyOpportunity?.blockingReason === "ineligible_for_handoff", {
      status: phoneOnlyOpportunity?.status,
      blockingReason: phoneOnlyOpportunity?.blockingReason,
      clientPhone: phoneOnlyOpportunity?.client.phone,
    });

    const conflictSuffix = Date.now();
    const clientA = await prisma.client.create({
      data: {
        email: `identity-a-${conflictSuffix}@example.com`,
        fullName: "Identity Conflict A",
        hasLeadBaseSupport: true,
        workspaceId: rerunWorkspace.workspaceId,
      },
    });
    const clientB = await prisma.client.create({
      data: {
        fullName: "Identity Conflict B",
        hasLeadBaseSupport: true,
        phone: `+1666${String(conflictSuffix).slice(-7)}`,
        workspaceId: rerunWorkspace.workspaceId,
      },
    });
    results.created.clientIds.push(clientA.id, clientB.id);

    await page.goto(`${baseUrl}/app/imports`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Quick add" }).first().click();
    await page.getByLabel(/Lead name/i).fill("Identity Conflict UI");
    await page.getByLabel(/Email/i).fill(clientA.email);
    await page.getByLabel(/Phone/i).fill(clientB.phone);
    await page.getByRole("button", { name: /^Add lead$/i }).click();
    await page.waitForTimeout(1200);
    const conflictText = await page.locator("body").innerText();

    record("quick add conflicting identity returns visible error", /could not match|conflicting|same lead|different existing leads|identity/i.test(conflictText), {
      sample: conflictText.match(/[^\n]*(?:could not match|conflicting|same lead|different existing leads|identity)[^\n]*/i)?.[0] ?? conflictText.slice(0, 240),
    });

    const appointmentSource = await prisma.dataSource.findFirst({
      orderBy: { updatedAt: "desc" },
      where: {
        workspaceId: rerunWorkspace.workspaceId,
        type: "APPOINTMENTS_CSV",
        status: "IMPORTED",
      },
    });

    if (appointmentSource) {
      const originalLastImportedAt = appointmentSource.lastImportedAt;
      const staleDate = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);

      await prisma.dataSource.update({
        data: { lastImportedAt: staleDate },
        where: { id: appointmentSource.id },
      });
      await page.goto(`${baseUrl}/app/imports`, { waitUntil: "networkidle" });
      const staleBody = await page.locator("body").innerText();

      record("stale source read becomes visible when proof import is old", /stale|refresh|outdated|old|may be stale/i.test(staleBody), {
        sourceId: appointmentSource.id,
        sample: staleBody.match(/[^\n]*(?:stale|refresh|outdated|old|may be stale)[^\n]*/i)?.[0] ?? staleBody.slice(0, 260),
      });

      await prisma.dataSource.update({
        data: { lastImportedAt: originalLastImportedAt },
        where: { id: appointmentSource.id },
      });
    } else {
      record("stale source read test had an imported appointment source", false, {});
    }

    await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Share proof/i }).click();
    await page.getByRole("button", { name: /Copy summary/i }).click();
    await page.waitForTimeout(500);
    const summaryCopiedVisible = await page.getByText(/Summary copied/i).isVisible().catch(() => false);
    record("executive proof copy summary shows real success", summaryCopiedVisible, {});

    const popupPromise = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await page.getByRole("button", { name: /Print or save PDF/i }).click();
    const popup = await popupPromise;
    const popupUrl = popup?.url() ?? null;
    const printUnavailable = await page.getByText(/Print unavailable|Copy failed/i).isVisible().catch(() => false);

    record("executive proof print opens non-empty print view", Boolean(popup && popupUrl && popupUrl !== "about:blank"), {
      popupUrl,
      printUnavailable,
    });
    if (popup) {
      await popup.close().catch(() => undefined);
    }

    record("authenticated core surfaces produced no browser runtime errors", pageErrors.length === 0 && consoleErrors.length === 0, {
      pageErrors,
      consoleErrors,
    });
  } finally {
    await context.close();
  }
}

async function inspectDatabaseReadiness() {
  const pendingMigrations = await prisma.$queryRaw`
    SELECT migration_name
    FROM _prisma_migrations
    WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
  `;
  const dbMigrations = await prisma.$queryRaw`
    SELECT migration_name
    FROM _prisma_migrations
    ORDER BY migration_name ASC
  `;
  const migrationDirs = fs
    .readdirSync(path.join(root, "prisma", "migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const dbMigrationNames = dbMigrations.map((row) => row.migration_name);
  const dbOnlyMigrations = dbMigrationNames.filter((name) => !migrationDirs.includes(name));
  const fileOnlyMigrations = migrationDirs.filter((name) => !dbMigrationNames.includes(name));

  record("database has no unfinished or rolled back migrations", pendingMigrations.length === 0, {
    pendingMigrations,
  });
  observe("migration table vs local migration folders", {
    dbOnlyMigrations,
    fileOnlyMigrations,
    dbMigrationCount: dbMigrationNames.length,
    localMigrationCount: migrationDirs.length,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    await testPublicAndPricing(browser);
    await testAuthRedirectSecurity();
    await testAuthenticatedCore(browser);
    await inspectDatabaseReadiness();
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  if (results.failures.length > 0) {
    process.exitCode = 1;
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(async (error) => {
  results.failures.push({
    name: "full product QA harness crashed",
    passed: false,
    details: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    },
  });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
