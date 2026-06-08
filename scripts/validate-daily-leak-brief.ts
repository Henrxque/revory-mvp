import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakStatus,
  RevenueLeakType,
} from "@prisma/client";

import { getDailyLeakBriefRead } from "../services/revenue-leaks/get-daily-leak-brief-read";

const prisma = new PrismaClient();
const runId = `daily-leak-brief-${Date.now()}`;
const emailPrefix = "daily.leak.brief.qa+";
const detectedAt = new Date("2026-06-03T12:00:00.000Z");
const projectRoot = process.cwd();

let openAiFetchCalls = 0;
const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();

  if (url.includes("openai.com")) {
    openAiFetchCalls += 1;
    throw new Error("Unexpected OpenAI call during Daily Leak Brief QA.");
  }

  return originalFetch(input, init);
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message: string) {
  console.log(`[daily-leak-brief-qa] ${message}`);
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

async function createWorkspace(suffix: string) {
  const user = await prisma.user.create({
    data: {
      authProvider: "qa",
      authSubject: `${runId}-${suffix}`,
      email: `${emailPrefix}${runId}-${suffix}@example.com`,
      fullName: "Daily Leak Brief QA",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      billingStatus: "ACTIVE",
      name: `Daily Leak Brief QA ${suffix}`,
      ownerUserId: user.id,
      planKey: "GROWTH",
      slug: `daily-leak-brief-qa-${runId}-${suffix}`,
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
        signals: [`qa:${input.fingerprint}`, "daily-brief"],
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
      recommendedAction: `Review ${input.leakType} from the QA daily brief fixture.`,
      severity: input.severity,
      status: input.status ?? "OPEN",
      workspaceId: input.workspaceId,
    },
  });
}

async function assertNoSprint06Migration() {
  const migrationsPath = path.join(projectRoot, "prisma/migrations");
  const migrations = await fs.readdir(migrationsPath);
  const sprint06Migrations = migrations.filter((migration) =>
    migration.toLowerCase().includes("sprint_06"),
  );

  assert(
    sprint06Migrations.length === 0,
    `Sprint 06 should not create migrations. Found: ${sprint06Migrations.join(", ")}.`,
  );
}

async function assertCopyGuardrails() {
  const files = [
    "components/briefs/DailyLeakBrief.tsx",
    "services/revenue-leaks/get-daily-leak-brief-read.ts",
  ];
  const forbiddenPatterns = [
    /lost revenue/i,
    /confirmed loss/i,
    /recovered revenue/i,
    /generated revenue/i,
    /AI detected/i,
    /daily alert/i,
    /inbox/i,
  ];

  for (const file of files) {
    const source = await fs.readFile(path.join(projectRoot, file), "utf8");

    for (const pattern of forbiddenPatterns) {
      assert(
        !pattern.test(source),
        `${file} contains forbidden Daily Leak Brief copy: ${pattern}.`,
      );
    }
  }
}

async function main() {
  log("Checking static guardrails");
  await assertNoSprint06Migration();
  await assertCopyGuardrails();

  log("Cleaning previous QA runs");
  await cleanupPreviousRuns();

  log("Validating EMPTY state");
  const emptyWorkspace = await createWorkspace("empty");
  const emptyRead = await getDailyLeakBriefRead(emptyWorkspace.id);

  assert(emptyRead.state === "EMPTY", `Expected EMPTY, got ${emptyRead.state}.`);
  assert(emptyRead.detailHref === "/app/revenue-leaks", "EMPTY detailHref should point to Revenue Leaks page.");
  assert(emptyRead.estimatedValueCents === null, "EMPTY should not invent financial value.");

  log("Validating HAS_FINANCIAL_LEAK state");
  const financialWorkspace = await createWorkspace("financial");
  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 10,
    estimatedValueCents: 240000,
    fingerprint: "financial-value",
    leakType: "NO_SHOW_REVENUE",
    severity: "HIGH",
    workspaceId: financialWorkspace.id,
  });
  const financialRead = await getDailyLeakBriefRead(financialWorkspace.id);

  assert(
    financialRead.state === "HAS_FINANCIAL_LEAK",
    `Expected HAS_FINANCIAL_LEAK, got ${financialRead.state}.`,
  );
  assert(financialRead.estimatedValueCents === 240000, "Financial read should expose counted estimated value.");
  assert(financialRead.primaryLeak?.estimatedValueCents === 240000, "Primary financial leak should keep estimated value.");
  assert(financialRead.detailHref === "/app/revenue-leaks", "Financial detailHref should point to Revenue Leaks page.");

  log("Validating OPERATIONAL_ONLY state");
  const operationalWorkspace = await createWorkspace("operational");
  await createLeak({
    confidence: "LOW",
    detectedAtOffsetMinutes: 9,
    estimatedValueCents: 990000,
    fingerprint: "operational-value-not-counted",
    leakType: "BOOKING_PATH_BLOCKED",
    severity: "HIGH",
    workspaceId: operationalWorkspace.id,
  });
  const operationalRead = await getDailyLeakBriefRead(operationalWorkspace.id);

  assert(
    operationalRead.state === "OPERATIONAL_ONLY",
    `Expected OPERATIONAL_ONLY, got ${operationalRead.state}.`,
  );
  assert(operationalRead.estimatedValueCents === null, "Operational-only read should not expose financial value.");
  assert(
    operationalRead.primaryLeak?.estimatedValueCents === null,
    "Operational primary leak should not become financial value.",
  );

  log("Validating DATA_STALE state");
  const staleWorkspace = await createWorkspace("stale");
  await createLeak({
    confidence: "MEDIUM",
    detectedAtOffsetMinutes: 8,
    estimatedValueCents: 880000,
    fingerprint: "stale-value-not-counted",
    leakType: "STALE_BOOKED_PROOF",
    severity: "LOW",
    workspaceId: staleWorkspace.id,
  });
  const staleRead = await getDailyLeakBriefRead(staleWorkspace.id);

  assert(
    staleRead.state === "DATA_STALE",
    `Expected DATA_STALE, got ${staleRead.state}.`,
  );
  assert(staleRead.estimatedValueCents === null, "Data-stale read should not expose financial value.");
  assert(
    staleRead.primaryLeak?.estimatedValueCents === null,
    "Data-quality primary leak should not become financial value.",
  );

  log("Validating THIN_DATA state");
  const thinWorkspace = await createWorkspace("thin");
  await createLeak({
    confidence: "LOW",
    detectedAtOffsetMinutes: 7,
    estimatedValueCents: null,
    fingerprint: "financial-no-value",
    leakType: "CANCELED_NOT_RECOVERED",
    severity: "MEDIUM",
    workspaceId: thinWorkspace.id,
  });
  const thinRead = await getDailyLeakBriefRead(thinWorkspace.id);

  assert(
    thinRead.state === "THIN_DATA",
    `Expected THIN_DATA, got ${thinRead.state}.`,
  );
  assert(thinRead.estimatedValueCents === null, "Thin read should not invent financial value.");
  assert(
    thinRead.primaryLeak?.estimatedValueCents === null,
    "Financial leak without value should stay value-thin.",
  );

  assert(openAiFetchCalls === 0, "Daily Leak Brief QA should not make OpenAI calls.");

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
