import { PrismaClient } from "@prisma/client";
import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakStatus,
  RevenueLeakType,
} from "@prisma/client";

import { getRevenueLeakReadForWorkspace } from "../services/revenue-leaks/get-revenue-leak-read";

const prisma = new PrismaClient();
const runId = `revenue-leak-read-${Date.now()}`;
const emailPrefix = "revenue.leak.read.qa+";
const detectedAt = new Date("2026-05-28T12:00:00.000Z");

let openAiFetchCalls = 0;
const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();

  if (url.includes("openai.com")) {
    openAiFetchCalls += 1;
    throw new Error("Unexpected OpenAI call during revenue leak read QA.");
  }

  return originalFetch(input, init);
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message: string) {
  console.log(`[revenue-leak-read-qa] ${message}`);
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
      fullName: "Revenue Leak Read QA",
    },
  });

  return prisma.workspace.create({
    data: {
      billingStatus: "ACTIVE",
      name: `Revenue Leak Read QA ${suffix}`,
      ownerUserId: user.id,
      planKey: "GROWTH",
      slug: `revenue-leak-read-qa-${runId}-${suffix}`,
      status: "ACTIVE",
    },
  });
}

async function createLeak(input: {
  confidence: RevenueLeakConfidence;
  detectedAtOffsetMinutes: number;
  estimatedValueCents?: number | null;
  fingerprint: string;
  leakType: RevenueLeakType;
  recommendedAction?: string;
  reason?: string;
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
        confidenceReason: "QA read model fixture.",
        signals: [`qa:${input.fingerprint}`],
        summary: "Synthetic QA evidence for read model validation.",
        value: {
          estimatedValueCents: input.estimatedValueCents ?? null,
        },
      },
      fingerprint: input.fingerprint,
      leakType: input.leakType,
      reason: input.reason ?? `QA reason for ${input.leakType}.`,
      recommendedAction:
        input.recommendedAction ?? `Review ${input.leakType} from QA fixture.`,
      severity: input.severity,
      status: input.status ?? "OPEN",
      workspaceId: input.workspaceId,
    },
  });
}

async function setupMainWorkspace() {
  const workspace = await createWorkspace("main");

  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 10,
    estimatedValueCents: 200000,
    fingerprint: "qa-financial-top",
    leakType: "CANCELED_NOT_RECOVERED",
    recommendedAction: "Review the highest-value unrecovered cancellation.",
    severity: "CRITICAL",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "MEDIUM",
    detectedAtOffsetMinutes: 9,
    estimatedValueCents: 50000,
    fingerprint: "qa-financial-secondary",
    leakType: "NO_SHOW_REVENUE",
    severity: "HIGH",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 8,
    estimatedValueCents: 999999,
    fingerprint: "qa-operational-not-summed",
    leakType: "BOOKING_PATH_BLOCKED",
    recommendedAction: "Fix the blocked booking path before widening the workflow.",
    severity: "HIGH",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "LOW",
    detectedAtOffsetMinutes: 7,
    estimatedValueCents: 888888,
    fingerprint: "qa-data-quality-not-summed",
    leakType: "STALE_BOOKED_PROOF",
    recommendedAction: "Upload a fresh appointment file.",
    severity: "LOW",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 6,
    estimatedValueCents: 700000,
    fingerprint: "qa-resolved-excluded",
    leakType: "NO_SHOW_REVENUE",
    severity: "CRITICAL",
    status: "RESOLVED",
    workspaceId: workspace.id,
  });
  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 5,
    estimatedValueCents: 600000,
    fingerprint: "qa-dismissed-excluded",
    leakType: "CANCELED_NOT_RECOVERED",
    severity: "CRITICAL",
    status: "DISMISSED",
    workspaceId: workspace.id,
  });

  return workspace;
}

async function setupOperationalOnlyWorkspace() {
  const workspace = await createWorkspace("operational-only");

  await createLeak({
    confidence: "HIGH",
    detectedAtOffsetMinutes: 4,
    estimatedValueCents: 400000,
    fingerprint: "qa-missing-contact-not-summed",
    leakType: "MISSING_CONTACT",
    severity: "MEDIUM",
    workspaceId: workspace.id,
  });

  return workspace;
}

async function setupThinDataWorkspace() {
  const workspace = await createWorkspace("thin-data");

  await createLeak({
    confidence: "LOW",
    detectedAtOffsetMinutes: 3,
    estimatedValueCents: null,
    fingerprint: "qa-financial-without-value",
    leakType: "NO_SHOW_REVENUE",
    severity: "MEDIUM",
    workspaceId: workspace.id,
  });

  return workspace;
}

async function main() {
  log("Cleaning previous QA runs");
  await cleanupPreviousRuns();

  log("Creating isolated read model fixtures");
  const mainWorkspace = await setupMainWorkspace();
  const operationalOnlyWorkspace = await setupOperationalOnlyWorkspace();
  const thinDataWorkspace = await setupThinDataWorkspace();
  const emptyWorkspace = await createWorkspace("empty");

  log("Validating main revenue leak read");
  const mainRead = await getRevenueLeakReadForWorkspace(mainWorkspace.id);

  assert(mainRead.activeLeakCount === 4, "Main read should include only active OPEN/ACKNOWLEDGED leaks.");
  assert(mainRead.activeFinancialLeakCount === 2, "Main read should count active financial leaks.");
  assert(mainRead.activeOperationalRiskCount === 1, "Main read should count active operational risks.");
  assert(mainRead.activeDataQualityRiskCount === 1, "Main read should count active data-quality risks.");
  assert(
    mainRead.estimatedRevenueAtRiskCents === 250000,
    `Expected financial sum of 250000 cents, got ${mainRead.estimatedRevenueAtRiskCents}.`,
  );
  assert(
    mainRead.state === "HAS_REVENUE_AT_RISK",
    `Expected HAS_REVENUE_AT_RISK, got ${mainRead.state}.`,
  );
  assert(
    mainRead.topFinancialLeak?.fingerprint !== "qa-operational-not-summed",
    "Top financial leak should not be operational.",
  );
  assert(
    mainRead.topFinancialLeak?.leakType === "CANCELED_NOT_RECOVERED",
    "Top financial leak should be selected by severity/confidence/value.",
  );
  assert(
    mainRead.topOperationalRisk?.leakType === "BOOKING_PATH_BLOCKED",
    "Top operational risk should be selected separately.",
  );
  assert(
    mainRead.dataFreshnessSummary.hasStaleDataRisk,
    "Stale source risk should create data freshness warning.",
  );
  assert(
    mainRead.dataFreshnessSummary.topStaleRisk?.leakType === "STALE_BOOKED_PROOF",
    "Data freshness top stale risk should come from STALE_BOOKED_PROOF.",
  );
  assert(mainRead.confidenceSummary.counts.HIGH === 2, "Confidence summary should count HIGH leaks.");
  assert(mainRead.confidenceSummary.counts.MEDIUM === 1, "Confidence summary should count MEDIUM leaks.");
  assert(mainRead.confidenceSummary.counts.LOW === 1, "Confidence summary should count LOW leaks.");
  assert(mainRead.confidenceSummary.dominant === "HIGH", "Dominant confidence should be HIGH.");
  assert(mainRead.severitySummary.counts.CRITICAL === 1, "Severity summary should count CRITICAL leaks.");
  assert(mainRead.severitySummary.counts.HIGH === 2, "Severity summary should count HIGH leaks.");
  assert(mainRead.severitySummary.counts.LOW === 1, "Severity summary should count LOW leaks.");
  assert(mainRead.severitySummary.dominant === "HIGH", "Dominant severity should be HIGH.");
  assert(
    mainRead.topLeaks.every((leak) => leak.status === "OPEN" || leak.status === "ACKNOWLEDGED"),
    "Top leaks should include only active statuses.",
  );

  log("Validating empty state");
  const emptyRead = await getRevenueLeakReadForWorkspace(emptyWorkspace.id);
  assert(emptyRead.state === "EMPTY", `Expected EMPTY state, got ${emptyRead.state}.`);
  assert(emptyRead.estimatedRevenueAtRiskCents === null, "Empty read should not invent revenue at risk.");
  assert(emptyRead.activeLeakCount === 0, "Empty read should have zero active leaks.");

  log("Validating no-financial-leaks state");
  const operationalRead = await getRevenueLeakReadForWorkspace(
    operationalOnlyWorkspace.id,
  );
  assert(
    operationalRead.state === "NO_FINANCIAL_LEAKS",
    `Expected NO_FINANCIAL_LEAKS state, got ${operationalRead.state}.`,
  );
  assert(
    operationalRead.estimatedRevenueAtRiskCents === null,
    "Operational-only read should not sum estimated revenue at risk.",
  );
  assert(
    operationalRead.topOperationalRisk?.leakType === "MISSING_CONTACT",
    "Operational-only read should expose top operational risk.",
  );

  log("Validating thin-data state");
  const thinDataRead = await getRevenueLeakReadForWorkspace(thinDataWorkspace.id);
  assert(
    thinDataRead.state === "THIN_DATA",
    `Expected THIN_DATA state, got ${thinDataRead.state}.`,
  );
  assert(
    thinDataRead.estimatedRevenueAtRiskCents === null,
    "Thin-data read should not invent estimated value.",
  );
  assert(
    thinDataRead.topFinancialLeak?.leakType === "NO_SHOW_REVENUE",
    "Thin-data read should retain the financial leak evidence.",
  );

  assert(openAiFetchCalls === 0, "Revenue leak read QA should not make OpenAI calls.");

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
