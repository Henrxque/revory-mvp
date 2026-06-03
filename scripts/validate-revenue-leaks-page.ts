import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakStatus,
  RevenueLeakType,
} from "@prisma/client";

import {
  getRevenueLeakListForWorkspace,
  type RevenueLeakListFilter,
} from "../services/revenue-leaks/get-revenue-leak-list";

const prisma = new PrismaClient();
const runId = `revenue-leaks-page-${Date.now()}`;
const emailPrefix = "revenue.leaks.page.qa+";
const detectedAt = new Date("2026-05-28T12:00:00.000Z");
const projectRoot = process.cwd();

let openAiFetchCalls = 0;
const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();

  if (url.includes("openai.com")) {
    openAiFetchCalls += 1;
    throw new Error("Unexpected OpenAI call during revenue leaks page QA.");
  }

  return originalFetch(input, init);
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message: string) {
  console.log(`[revenue-leaks-page-qa] ${message}`);
}

async function cleanupPreviousRuns() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
    where: {
      email: {
        startsWith: emailPrefix,
      },
    },
  });

  for (const user of users) {
    await prisma.workspace.deleteMany({
      where: {
        ownerUserId: user.id,
      },
    });
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });
  }
}

async function createWorkspace() {
  const user = await prisma.user.create({
    data: {
      authProvider: "qa",
      authSubject: runId,
      email: `${emailPrefix}${runId}@example.com`,
      fullName: "Revenue Leaks Page QA",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      billingStatus: "ACTIVE",
      name: `Revenue Leaks Page QA ${runId}`,
      ownerUserId: user.id,
      planKey: "GROWTH",
      slug: `revenue-leaks-page-qa-${runId}`,
      status: "ACTIVE",
    },
  });

  await prisma.activationSetup.create({
    data: {
      averageDealValue: 1200,
      currentStep: "activation",
      isCompleted: true,
      primaryChannel: "EMAIL",
      recommendedModeKey: "MODE_A",
      selectedTemplate: "injectables",
      workspaceId: workspace.id,
    },
  });

  return workspace;
}

async function createLeak(input: {
  confidence: RevenueLeakConfidence;
  detectedAtOffsetMinutes: number;
  estimatedValueCents?: number | null;
  fingerprint: string;
  leakType: RevenueLeakType;
  severity: RevenueLeakSeverity;
  status?: RevenueLeakStatus;
  workspaceId: string;
}) {
  return prisma.revenueLeak.create({
    data: {
      confidence: input.confidence,
      detectedAt: new Date(
        detectedAt.getTime() + input.detectedAtOffsetMinutes * 60 * 1000,
      ),
      estimatedValueCents: input.estimatedValueCents ?? null,
      evidenceJson: {
        confidenceReason: `QA confidence reason for ${input.fingerprint}.`,
        signals: [`qa:${input.fingerprint}`, "page-read"],
        sourceRecordIds: [`source:${input.fingerprint}`],
        summary: `QA evidence summary for ${input.fingerprint}.`,
        value: {
          basis: "QA fixture",
          estimatedValueCents: input.estimatedValueCents ?? null,
        },
      },
      fingerprint: input.fingerprint,
      leakType: input.leakType,
      reason: `QA reason for ${input.leakType}.`,
      recommendedAction: `Review ${input.leakType} from the QA page fixture.`,
      severity: input.severity,
      status: input.status ?? "OPEN",
      workspaceId: input.workspaceId,
    },
  });
}

async function setupFixtures() {
  const workspace = await createWorkspace();

  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 10,
    estimatedValueCents: 220000,
    fingerprint: "financial-open",
    leakType: "NO_SHOW_REVENUE",
    severity: "HIGH",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "MEDIUM",
    detectedAtOffsetMinutes: 9,
    estimatedValueCents: 180000,
    fingerprint: "financial-resolved",
    leakType: "CANCELED_NOT_RECOVERED",
    severity: "CRITICAL",
    status: "RESOLVED",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "LOW",
    detectedAtOffsetMinutes: 8,
    estimatedValueCents: 990000,
    fingerprint: "operational-open",
    leakType: "BOOKING_PATH_BLOCKED",
    severity: "HIGH",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "MEDIUM",
    detectedAtOffsetMinutes: 7,
    estimatedValueCents: 770000,
    fingerprint: "data-quality-open",
    leakType: "STALE_BOOKED_PROOF",
    severity: "LOW",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 6,
    estimatedValueCents: 120000,
    fingerprint: "financial-dismissed",
    leakType: "NO_SHOW_REVENUE",
    severity: "MEDIUM",
    status: "DISMISSED",
    workspaceId: workspace.id,
  });

  return workspace;
}

async function assertStaticPageContracts() {
  const pagePath = path.join(
    projectRoot,
    "src/app/(app)/app/revenue-leaks/page.tsx",
  );
  const actionsPath = path.join(
    projectRoot,
    "src/app/(app)/app/revenue-leaks/actions.ts",
  );
  const pageSource = await fs.readFile(pagePath, "utf8");
  const actionSource = await fs.readFile(actionsPath, "utf8");

  assert(
    pageSource.includes("getAppContext"),
    "Revenue leaks page should require authenticated app context.",
  );
  assert(
    pageSource.includes("buildSignInRedirectPath"),
    "Revenue leaks page should preserve auth redirect behavior.",
  );
  assert(
    pageSource.includes("activationSetup.isCompleted"),
    "Revenue leaks page should guard incomplete activation.",
  );
  assert(
    pageSource.includes("getOnboardingStepPath"),
    "Revenue leaks page should redirect to setup step when activation is incomplete.",
  );
  assert(
    pageSource.includes("getRevenueLeakListForWorkspace"),
    "Revenue leaks page should load the list read model.",
  );
  assert(
    !pageSource.toLowerCase().includes("openai") &&
      !actionSource.toLowerCase().includes("openai"),
    "Revenue leaks page/actions should not call OpenAI.",
  );
  assert(
    !pageSource.includes("<table") && !pageSource.includes("<canvas"),
    "Revenue leaks page should not introduce BI-style table or chart elements.",
  );
  assert(
    actionSource.includes("leak.workspaceId !== appContext.workspace.id"),
    "Status actions should verify workspace ownership.",
  );
  assert(
    actionSource.includes("status: input.nextStatus"),
    "Status actions should update only the selected status.",
  );
  assert(
    !actionSource.includes("estimatedValueCents") &&
      !actionSource.includes("evidenceJson"),
    "Status actions must not edit financial value or evidence JSON.",
  );
}

async function assertNoSprint05Migration() {
  const migrationsPath = path.join(projectRoot, "prisma/migrations");
  const migrations = await fs.readdir(migrationsPath);
  const sprint05Migrations = migrations.filter((migration) =>
    migration.toLowerCase().includes("sprint_05"),
  );

  assert(
    sprint05Migrations.length === 0,
    `Sprint 05 should not create migrations. Found: ${sprint05Migrations.join(", ")}.`,
  );
}

async function assertFilter(
  workspaceId: string,
  filter: RevenueLeakListFilter,
  expectedFingerprints: string[],
) {
  const read = await getRevenueLeakListForWorkspace({
    filter,
    workspaceId,
  });
  const fingerprints = read.items.map((item) => item.fingerprint).sort();

  assert(
    JSON.stringify(fingerprints) === JSON.stringify([...expectedFingerprints].sort()),
    `Filter ${filter} returned ${fingerprints.join(", ")} instead of ${expectedFingerprints.join(", ")}.`,
  );

  return read;
}

async function main() {
  log("Checking static page/action contracts");
  await assertStaticPageContracts();
  await assertNoSprint05Migration();

  log("Cleaning previous QA runs");
  await cleanupPreviousRuns();

  log("Creating isolated page fixtures");
  const workspace = await setupFixtures();

  log("Validating filters");
  const activeRead = await assertFilter(workspace.id, "ALL_ACTIVE", [
    "data-quality-open",
    "financial-open",
    "operational-open",
  ]);
  await assertFilter(workspace.id, "FINANCIAL", ["financial-open"]);
  await assertFilter(workspace.id, "OPERATIONAL", ["operational-open"]);
  await assertFilter(workspace.id, "DATA_QUALITY", ["data-quality-open"]);
  await assertFilter(workspace.id, "HIGH_SEVERITY", [
    "financial-open",
    "operational-open",
  ]);
  await assertFilter(workspace.id, "LOW_CONFIDENCE", ["operational-open"]);
  await assertFilter(workspace.id, "RESOLVED", ["financial-resolved"]);
  await assertFilter(workspace.id, "DISMISSED", ["financial-dismissed"]);

  log("Validating display-safe evidence and confidence copy");
  const financialItem = activeRead.items.find(
    (item) => item.fingerprint === "financial-open",
  );
  const operationalItem = activeRead.items.find(
    (item) => item.fingerprint === "operational-open",
  );
  const dataQualityItem = activeRead.items.find(
    (item) => item.fingerprint === "data-quality-open",
  );

  assert(financialItem, "Financial leak should appear in active read.");
  assert(operationalItem, "Operational risk should appear in active read.");
  assert(dataQualityItem, "Data-quality risk should appear in active read.");
  assert(
    financialItem.evidenceSummary.summary.includes("QA evidence summary"),
    "Evidence summary should be generated from evidenceJson.",
  );
  assert(
    financialItem.confidenceExplanation.includes("QA confidence reason"),
    "Confidence explanation should use stored confidence evidence.",
  );
  assert(
    operationalItem.estimatedValueCents === null,
    "Operational risks should not expose estimated value as financial loss.",
  );
  assert(
    operationalItem.estimatedValueLabel ===
      "Operational risk; not counted as revenue at risk",
    "Operational risks should clearly avoid financial-loss framing.",
  );
  assert(
    dataQualityItem.estimatedValueCents === null,
    "Data-quality risks should not expose estimated value as financial loss.",
  );
  assert(
    dataQualityItem.estimatedValueLabel ===
      "Data-quality risk; not counted as revenue at risk",
    "Data-quality risks should clearly avoid financial-loss framing.",
  );
  assert(openAiFetchCalls === 0, "Revenue leaks page QA should not make OpenAI calls.");

  log("All checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    globalThis.fetch = originalFetch;
    await cleanupPreviousRuns().catch(() => undefined);
    await prisma.$disconnect();
  });
