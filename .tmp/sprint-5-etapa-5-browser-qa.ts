import fs from "node:fs";
import path from "node:path";

import {
  CommunicationChannel,
  DataSourceStatus,
  DataSourceType,
  FlowModeKey,
  PrismaClient,
  UserStatus,
  WorkspaceStatus,
  AppointmentStatus,
} from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "playwright";

const projectRoot = "C:/Users/hriqu/Documents/revory-mvp";
const baseUrl = "http://localhost:3000";
const prisma = new PrismaClient();

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(projectRoot, ".tmp", "qa-sprint5-execution-foundation", runId);
const fixturesDir = path.join(evidenceDir, "fixtures");
const resultsPath = path.join(evidenceDir, "results.json");
const envLocal = fs.readFileSync(path.join(projectRoot, ".env.local"), "utf8");
const authSecret =
  envLocal.match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "") ??
  "revory-local-auth-secret";

fs.mkdirSync(fixturesDir, { recursive: true });

const results = {
  baseUrl,
  bugs: [] as Array<{ severity: string; title: string; details?: unknown }>,
  email: null as string | null,
  finishedAt: null as string | null,
  findings: [] as Array<{ title: string; details?: unknown }>,
  startedAt: startedAt.toISOString(),
  steps: [] as Array<{ name: string; status: string; details?: unknown }>,
};

function recordStep(name: string, status: string, details?: unknown) {
  results.steps.push({ details, name, status });
}

function recordBug(severity: string, title: string, details?: unknown) {
  results.bugs.push({ details, severity, title });
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function saveScreenshot(page: import("playwright").Page, name: string) {
  await page.screenshot({
    fullPage: true,
    path: path.join(evidenceDir, `${name}.png`),
  });
}

function buildFixtureFiles(now: Date) {
  const plusHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000);
  const minusDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const officialAppointmentsCsvPath = path.join(fixturesDir, "appointments-official-stage5.csv");
  const assistedAppointmentsCsvPath = path.join(fixturesDir, "appointments-assisted-stage5.csv");

  const officialAppointmentsCsv = [
    "appointment_external_id,client_full_name,client_external_id,client_email,client_phone,scheduled_at,status,service_name,provider_name,estimated_revenue,booked_at,canceled_at,location_name,source_notes",
    [
      "s5_csv_confirmation_ready",
      "CSV Ready Confirmation",
      "s5_csv_client_ready",
      "csv.ready.confirmation@example.com",
      "",
      plusHours(20).toISOString(),
      "SCHEDULED",
      "Laser Facial",
      "Dr. Maia",
      "210",
      minusDays(2).toISOString(),
      "",
      "Revory Prime",
      "Sprint 5 official QA fixture",
    ].join(","),
    [
      "s5_csv_review_ready",
      "CSV Review Ready",
      "s5_csv_client_review",
      "csv.review.ready@example.com",
      "",
      minusDays(1).toISOString(),
      "COMPLETED",
      "Collagen Boost",
      "Dr. Maia",
      "180",
      minusDays(4).toISOString(),
      "",
      "Revory Prime",
      "Sprint 5 official QA fixture",
    ].join(","),
  ].join("\n");

  const assistedAppointmentsCsv = [
    "appt identifier,client name,scheduled visit,status text,client email,service performed,revenue estimate,notes from spa",
    [
      "s5_assisted_preview",
      "CSV Assisted Preview",
      plusHours(90).toISOString(),
      "SCHEDULED",
      "assisted.preview@example.com",
      "LED Session",
      "110",
      "Sprint 5 assisted QA fixture",
    ].join(","),
  ].join("\n");

  fs.writeFileSync(officialAppointmentsCsvPath, officialAppointmentsCsv, "utf8");
  fs.writeFileSync(assistedAppointmentsCsvPath, assistedAppointmentsCsv, "utf8");

  return {
    assistedAppointmentsCsvPath,
    officialAppointmentsCsvPath,
  };
}

async function createWorkspace(email: string) {
  const authSubject = `google-oauth2|sprint5-${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      authProvider: "google",
      authSubject,
      email,
      fullName: "Sprint 5 QA",
      status: UserStatus.ACTIVE,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      activeModeKey: FlowModeKey.MODE_B,
      name: "Sprint 5 QA Workspace",
      ownerUserId: user.id,
      slug: `sprint-5-qa-${Date.now()}`,
      status: WorkspaceStatus.ACTIVE,
    },
  });

  await prisma.activationSetup.create({
    data: {
      activatedAt: new Date(),
      currentStep: "activation",
      googleReviewsUrl: "https://g.page/r/sprint5-reviews",
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_B,
      selectedTemplate: "MEDSPA",
      workspaceId: workspace.id,
    },
  });

  return { authSubject, workspace };
}

async function seedOperationalBase(workspaceId: string, now: Date) {
  const appointmentsSource = await prisma.dataSource.create({
    data: {
      lastImportCompletedAt: now,
      lastImportFileName: "appointments-official-stage5.csv",
      lastImportRowCount: 7,
      lastImportedAt: now,
      lastImportSuccessRowCount: 7,
      name: "appointments-csv-upload",
      status: DataSourceStatus.IMPORTED,
      type: DataSourceType.APPOINTMENTS_CSV,
      workspaceId,
    },
  });

  const clientsSource = await prisma.dataSource.create({
    data: {
      lastImportCompletedAt: now,
      lastImportFileName: "clients-official-stage5.csv",
      lastImportRowCount: 1,
      lastImportedAt: now,
      lastImportSuccessRowCount: 1,
      name: "clients-csv-upload",
      status: DataSourceStatus.IMPORTED,
      type: DataSourceType.CLIENTS_CSV,
      workspaceId,
    },
  });

  const clientDefinitions = [
    {
      email: null,
      externalId: "s5_cli_confirmation_blocked",
      fullName: "Blocked Confirmation",
      sourceId: appointmentsSource.id,
    },
    {
      email: "ready.confirmation@example.com",
      externalId: "s5_cli_confirmation_ready",
      fullName: "Ready Confirmation",
      sourceId: appointmentsSource.id,
    },
    {
      email: "tight.window@example.com",
      externalId: "s5_cli_tight_window",
      fullName: "Tight Window",
      sourceId: appointmentsSource.id,
    },
    {
      email: "ready.recovery@example.com",
      externalId: "s5_cli_recovery_ready",
      fullName: "Ready Recovery",
      sourceId: appointmentsSource.id,
    },
    {
      email: null,
      externalId: "s5_cli_review_blocked",
      fullName: "Blocked Review",
      sourceId: appointmentsSource.id,
    },
    {
      email: "ready.review@example.com",
      externalId: "s5_cli_review_ready",
      fullName: "Ready Review",
      sourceId: appointmentsSource.id,
    },
    {
      email: "later.confirmation@example.com",
      externalId: "s5_cli_later",
      fullName: "Later Confirmation",
      sourceId: appointmentsSource.id,
    },
    {
      email: "client.only@example.com",
      externalId: "s5_cli_only",
      fullName: "Client Only",
      sourceId: clientsSource.id,
    },
  ] as const;

  const clients = new Map<string, { id: string; fullName: string; email: string | null }>();

  for (const definition of clientDefinitions) {
    const client = await prisma.client.create({
      data: {
        dataSourceId: definition.sourceId,
        email: definition.email,
        externalId: definition.externalId,
        firstName: definition.fullName.split(" ")[0] ?? definition.fullName,
        fullName: definition.fullName,
        workspaceId,
      },
    });

    clients.set(definition.externalId, {
      email: client.email,
      fullName: client.fullName ?? definition.fullName,
      id: client.id,
    });
  }

  const plusHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000);
  const minusDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const appointmentDefinitions = [
    {
      bookedAt: minusDays(2),
      clientExternalId: "s5_cli_confirmation_blocked",
      estimatedRevenue: 190,
      externalId: "s5_confirmation_blocked",
      scheduledAt: plusHours(18),
      serviceName: "Hydrafacial",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      bookedAt: minusDays(3),
      clientExternalId: "s5_cli_confirmation_ready",
      estimatedRevenue: 210,
      externalId: "s5_confirmation_ready",
      scheduledAt: plusHours(22),
      serviceName: "Laser Facial",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      bookedAt: minusDays(1),
      clientExternalId: "s5_cli_tight_window",
      estimatedRevenue: 240,
      externalId: "s5_tight_window_ready",
      scheduledAt: plusHours(4),
      serviceName: "Botox",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      bookedAt: minusDays(7),
      canceledAt: minusDays(2),
      clientExternalId: "s5_cli_recovery_ready",
      estimatedRevenue: 300,
      externalId: "s5_recovery_ready",
      scheduledAt: minusDays(2),
      serviceName: "Recovery Visit",
      status: AppointmentStatus.CANCELED,
    },
    {
      bookedAt: minusDays(5),
      clientExternalId: "s5_cli_review_blocked",
      completedAt: minusDays(1),
      estimatedRevenue: 160,
      externalId: "s5_review_blocked",
      scheduledAt: minusDays(1),
      serviceName: "Glow Peel",
      status: AppointmentStatus.COMPLETED,
    },
    {
      bookedAt: minusDays(4),
      clientExternalId: "s5_cli_review_ready",
      completedAt: minusDays(2),
      estimatedRevenue: 180,
      externalId: "s5_review_ready",
      scheduledAt: minusDays(2),
      serviceName: "Collagen Boost",
      status: AppointmentStatus.COMPLETED,
    },
    {
      bookedAt: now,
      clientExternalId: "s5_cli_later",
      estimatedRevenue: 120,
      externalId: "s5_confirmation_later",
      scheduledAt: plusHours(72),
      serviceName: "Consultation",
      status: AppointmentStatus.SCHEDULED,
    },
  ] as const;

  for (const definition of appointmentDefinitions) {
    const client = clients.get(definition.clientExternalId);
    ensure(client, `Missing seeded client ${definition.clientExternalId}.`);

    await prisma.appointment.create({
      data: {
        bookedAt: definition.bookedAt,
        canceledAt: "canceledAt" in definition ? definition.canceledAt ?? null : null,
        clientId: client.id,
        completedAt: "completedAt" in definition ? definition.completedAt ?? null : null,
        dataSourceId: appointmentsSource.id,
        estimatedRevenue: definition.estimatedRevenue,
        externalId: definition.externalId,
        providerName: "Dr. Maia",
        scheduledAt: definition.scheduledAt,
        serviceName: definition.serviceName,
        status: definition.status,
        workspaceId,
      },
    });
  }
}

async function injectAuthenticatedSession(
  page: import("playwright").Page,
  authSubject: string,
  email: string,
) {
  const sessionToken = await encode({
    secret: authSecret,
    token: {
      email,
      name: "Sprint 5 QA",
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
    "Injected Auth.js session did not become active in the browser.",
  );
}

async function probeGoogleAuthEntry(page: import("playwright").Page) {
  await page.goto(`${baseUrl}/sign-in?redirect_url=%2Fapp%2Fdashboard`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const pageText = normalizeText(await page.locator("body").innerText());
  ensure(pageText.includes("Google auth ready"), "Google auth entry did not render as ready.");

  await page.getByRole("button").filter({ hasText: /google/i }).first().click();
  await page.waitForFunction(
    () =>
      window.location.href.includes("/api/auth/signin/google") ||
      window.location.href.includes("accounts.google.com"),
    undefined,
    { timeout: 30000 },
  );

  return page.url();
}

async function probeImportPreview(
  page: import("playwright").Page,
  filePath: string,
  expectedTexts: string[],
) {
  const fileInput = page.locator("form").first().locator('input[type="file"]');

  await fileInput.waitFor({ state: "attached", timeout: 60000 });
  await fileInput.setInputFiles(filePath);
  await fileInput.evaluate((element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(
    (texts) => {
      const bodyText = document.body?.innerText ?? "";
      return texts.every((text) => bodyText.includes(text));
    },
    expectedTexts,
    { timeout: 60000 },
  );

  return normalizeText(await page.locator("body").innerText());
}

void (async () => {
  let browser: import("playwright").Browser | undefined;
  let context: import("playwright").BrowserContext | undefined;

  try {
    const now = new Date();
    const fixturePaths = buildFixtureFiles(now);
    const email = `revory-sprint5-qa-${Date.now()}@example.com`;
    results.email = email;

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
    const signInGoogleUrl = await probeGoogleAuthEntry(authProbePage);
    recordStep("1. google auth sign-in entry", "passed", { finalUrl: signInGoogleUrl });
    await authProbePage.close();

    const { authSubject, workspace } = await createWorkspace(email);
    await seedOperationalBase(workspace.id, now);

    const page = await context.newPage();
    await injectAuthenticatedSession(page, authSubject, email);

    const [appointmentsMonitored, clientsImported, importedSources] = await Promise.all([
      prisma.appointment.count({ where: { workspaceId: workspace.id } }),
      prisma.client.count({ where: { workspaceId: workspace.id } }),
      prisma.dataSource.findMany({
        orderBy: { name: "asc" },
        select: {
          lastImportFileName: true,
          name: true,
          status: true,
        },
        where: { workspaceId: workspace.id },
      }),
    ]);

    ensure(
      appointmentsMonitored === 7,
      "Expected 7 monitored appointments in seeded QA workspace.",
    );
    ensure(clientsImported === 8, "Expected 8 client profiles in seeded QA workspace.");

    recordStep("2. seeded data overview", "passed", {
      appointmentsMonitored,
      clientsImported,
      importedSources,
    });

    await page.goto(`${baseUrl}/app/dashboard`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => {
        const bodyText = document.body?.innerText ?? "";
        return (
          bodyText.includes("What needs action next.") &&
          bodyText.includes("Base messages stay short and controlled.") &&
          bodyText.includes("Partially ready") &&
          bodyText.includes("Ready, with blockers")
        );
      },
      undefined,
      { timeout: 60000 },
    );
    await saveScreenshot(page, "01-dashboard-operational");
    const dashboardText = normalizeText(await page.locator("body").innerText());

    ensure(
      dashboardText.includes("Confirmation template") &&
        dashboardText.includes("Review request template") &&
        dashboardText.includes("Missing patient email"),
      "Dashboard did not expose the Sprint 5 execution foundation cues clearly.",
    );

    const partiallyReadyCount = (dashboardText.match(/Partially ready/g) ?? []).length;
    const mixedTemplateCount = (dashboardText.match(/Ready, with blockers/g) ?? []).length;

    ensure(
      partiallyReadyCount >= 3,
      "Dashboard should expose mixed readiness on confirmation, reminder, and review categories.",
    );
    ensure(
      mixedTemplateCount >= 3,
      "Dashboard should expose mixed execution foundation states on the template previews.",
    );

    recordStep("3. dashboard execution foundation ui", "passed", {
      mixedTemplateCount,
      partiallyReadyCount,
      url: page.url(),
    });

    await page.goto(`${baseUrl}/app/imports`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);
    await saveScreenshot(page, "02-imports-persisted");
    const importsText = normalizeText(await page.locator("body").innerText());
    ensure(
      page.url().includes("/app/imports"),
      `Imports navigation did not stay inside the private app. Current URL: ${page.url()}`,
    );
    ensure(
      importsText.includes("Imports & Mapping") &&
        importsText.includes("Appointments import") &&
        importsText.includes("Clients import") &&
        importsText.includes("LATEST SAVED RESULT: IMPORTED"),
      "Imports page did not reflect the persisted imported state.",
    );
    recordStep("4. imports persisted state", "passed", { url: page.url() });

    const officialPreviewText = await probeImportPreview(page, fixturePaths.officialAppointmentsCsvPath, [
      "Review the proposed mapping before import.",
      "Mapping can move forward",
      "appointments-official-stage5.csv",
    ]);
    ensure(
      officialPreviewText.includes("Review the proposed mapping before import."),
      "Official import preview did not become readable.",
    );
    recordStep("5. official import preview ui", "passed", {
      fileName: path.basename(fixturePaths.officialAppointmentsCsvPath),
    });

    await page.goto(`${baseUrl}/app/imports`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });

    const assistedPreviewText = await probeImportPreview(page, fixturePaths.assistedAppointmentsCsvPath, [
      "Review the proposed mapping before import.",
      "Mapping can move forward",
      "appointments-assisted-stage5.csv",
    ]);
    ensure(
      assistedPreviewText.includes("Review the proposed mapping before import."),
      "Assisted import preview did not become readable.",
    );
    await saveScreenshot(page, "03-imports-preview");
    recordStep("6. assisted import preview ui", "passed", {
      fileName: path.basename(fixturePaths.assistedAppointmentsCsvPath),
    });

    recordStep("suite", "passed");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordBug("P1", "Sprint 5 browser QA failed", { message });
    recordStep("suite", "failed", { message });
    throw error;
  } finally {
    results.finishedAt = new Date().toISOString();
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
