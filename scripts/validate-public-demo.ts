import fs from "node:fs/promises";
import path from "node:path";

import { REVORY_PUBLIC_OFFER } from "../services/billing/public-offer";
import {
  REVORY_DEMO_READ,
  REVORY_DEMO_RECORDS,
  buildRevoryDemoRead,
} from "../services/demo/revory-demo-fixture";

const projectRoot = process.cwd();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message: string) {
  console.log(`[public-demo-qa] ${message}`);
}

function parseCsv(source: string) {
  const lines = source.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

async function validateFixtureAndCsv() {
  const csvPath = path.join(
    projectRoot,
    "public/demo/revory-demo-appointments.csv",
  );
  const csvSource = await fs.readFile(csvPath, "utf8");
  const csvRows = parseCsv(csvSource);
  const freshRead = buildRevoryDemoRead();

  assert(
    REVORY_DEMO_RECORDS.length >= 12 && REVORY_DEMO_RECORDS.length <= 20,
    "Demo fixture must contain between 12 and 20 records.",
  );
  assert(
    csvRows.length === REVORY_DEMO_RECORDS.length,
    "The public CSV must contain exactly the same number of rows as the fixture.",
  );

  for (const record of REVORY_DEMO_RECORDS) {
    const csvRecord = csvRows.find((row) => row.id === record.id);

    assert(csvRecord, `CSV is missing fixture record ${record.id}.`);
    assert(csvRecord.kind === record.kind, `${record.id} kind does not match.`);
    assert(csvRecord.status === record.status, `${record.id} status does not match.`);
    assert(
      csvRecord.estimatedRevenueCents ===
        (record.estimatedRevenueCents?.toString() ?? ""),
      `${record.id} estimated revenue does not match.`,
    );
  }

  assert(
    freshRead.estimatedRevenueAtRiskCents === 350000,
    "Demo estimated revenue at risk should be the deterministic $3,500 total.",
  );
  assert(
    freshRead.biggestLeak.id === "canceled-not-recovered" &&
      freshRead.biggestLeak.estimatedValueCents === 195000,
    "Canceled not recovered should be the $1,950 biggest leak.",
  );
  assert(
    freshRead.recoveredCancellationCount === 1,
    "The canceled appointment with a future rebooking must be excluded.",
  );
  assert(
    freshRead.operationalRisks.every(
      (risk) => risk.estimatedValueCents === null,
    ),
    "Operational risks must never contribute financial value.",
  );
  assert(
    freshRead.dataQualityRisks.every(
      (risk) => risk.estimatedValueCents === null,
    ),
    "Data-quality risks must never contribute financial value.",
  );
  assert(
    REVORY_DEMO_READ.estimatedRevenueAtRiskCents ===
      freshRead.estimatedRevenueAtRiskCents,
    "Exported demo read must match a freshly calculated read.",
  );
}

async function validateReadOnlyRouteContracts() {
  const paidDashboardSource = await fs.readFile(
    path.join(projectRoot, "src/app/(app)/app/dashboard/page.tsx"),
    "utf8",
  );
  const files = [
    "src/app/demo/page.tsx",
    "components/demo/RevoryDemoDashboard.tsx",
    "services/demo/revory-demo-adapter.ts",
    "services/demo/revory-demo-fixture.ts",
  ];
  const sources = await Promise.all(
    files.map(async (file) => ({
      file,
      source: await fs.readFile(path.join(projectRoot, file), "utf8"),
    })),
  );
  const combinedSource = sources.map(({ source }) => source).join("\n");
  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/getAppContext|getAuthSession|getOrCreateWorkspace/, "app/auth/workspace context"],
    [/@\/db\/|PrismaClient|prisma\./i, "Prisma/database access"],
    [/fetch\s*\(/, "network fetch"],
    [/<input\b|type\s*=\s*["']file["']/i, "file input"],
    [/<form\b|method\s*=\s*["']post["']/i, "POST form"],
    [/openai|chat\.completions|responses\.create/i, "OpenAI/LLM call"],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert(
      !pattern.test(combinedSource),
      `Public demo must not contain ${label}.`,
    );
  }

  const componentSource = sources.find(
    ({ file }) => file === "components/demo/RevoryDemoDashboard.tsx",
  )?.source;

  assert(componentSource, "Demo component source should be readable.");
  assert(
    componentSource.includes('href="/demo/revory-demo-appointments.csv"'),
    "Demo must expose the static sample CSV download.",
  );
  for (const sharedComponent of [
    "AppSidebar",
    "DailyLeakBrief",
    "RevenueLeakDashboardHero",
    "RevenueLeakList",
    "DataQualityCheckCard",
    "ExecutiveRevenueLeakSummaryCard",
  ]) {
    assert(
      componentSource.includes(sharedComponent),
      `Demo should reuse the paid product component ${sharedComponent}.`,
    );
  }
  assert(
    paidDashboardSource.includes("RevenueLeakDashboardHero"),
    "Paid dashboard and public demo must share RevenueLeakDashboardHero.",
  );
  assert(
    componentSource.includes("download"),
    "Sample CSV link must use download behavior.",
  );
  assert(
    !/>\s*Import(?:\s|<)/i.test(componentSource),
    "Demo must not expose an Import action.",
  );
  assert(
    REVORY_PUBLIC_OFFER.checkoutHref === "/start",
    "Demo CTA must point to the current paid start flow.",
  );
}

async function main() {
  log("Validating deterministic fixture and matching public CSV");
  await validateFixtureAndCsv();
  log("Validating public read-only route contracts");
  await validateReadOnlyRouteContracts();
  log("All public demo checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
