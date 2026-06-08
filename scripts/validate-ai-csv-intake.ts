import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

import { requestAiCsvTriage } from "../services/imports/ai-csv-triage";
import { buildDeterministicCsvMappingFallback } from "../services/imports/csv-mapping-fallback";

const prisma = new PrismaClient();
const projectRoot = process.cwd();
const originalFetch = globalThis.fetch;
const originalEnvironment = {
  apiKey: process.env.OPENAI_API_KEY,
  enabled: process.env.REVORY_LLM_ENABLED,
  model: process.env.REVORY_LLM_MODEL,
  timeout: process.env.REVORY_LLM_TIMEOUT_MS,
};

const appointmentCsv = [
  "Appt ID,Appt Date,Status,Client Full Name,Email,Mobile,Price,Provider,Service,Notes",
  "appt-1,2026-06-01,NO_SHOW,Jane Sensitive,jane.secret@example.com,+15551234567,450,Dr Stone,Facial,Private medical note",
].join("\n");
const clientCsv = [
  "Client ID,Client Full Name,Email,Mobile,Last Visit,Total Visits",
  "client-1,Example Client,client@example.com,+15557654321,2026-05-01,3",
].join("\n");
const leadCsv = [
  "Lead ID,Lead Created At,Lead Status,Client Full Name,Mobile,Booking Path,Blocking Reason",
  "lead-1,2026-06-01,OPEN,Example Lead,+15550001111,SMS,Missing response",
].join("\n");
const paymentCsv = [
  "Payment ID,Payment Amount,Payment Date,Payment Status,Client ID",
  "pay-1,250,2026-06-01,PAID,client-1",
].join("\n");
const unknownCsv = ["Alpha,Beta", "foo,bar"].join("\n");
const incompleteAppointmentCsv = [
  "Appt Date,Client Full Name,Mobile,Provider,Service",
  "2026-06-01,Example Client,+15550001111,Dr Stone,Facial",
].join("\n");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message: string) {
  console.log(`[ai-csv-intake-qa] ${message}`);
}

function buildValidAiOutput(
  deterministic: ReturnType<typeof buildDeterministicCsvMappingFallback>,
) {
  return {
    columnMapping: Object.fromEntries(
      deterministic.mappingSuggestions.map((suggestion) => [
        suggestion.sourceHeader,
        suggestion.targetField ?? "UNMAPPED",
      ]),
    ),
    confidence: "HIGH",
    detectedDatasetType: deterministic.classification.datasetType,
    missingFields: deterministic.dataQuality.missingFields,
    probableSourceFormat: "QA appointment export",
    reviewRequired: true,
    supportedLeaks: deterministic.dataQuality.supportedLeakPreview
      .filter((preview) => preview.supportLevel !== "NOT_SUPPORTED")
      .map((preview) => preview.leakType),
    warnings: ["Review the suggested mapping before import."],
  };
}

function mockOpenAiResponse(outputText: string, requestBodies: string[]) {
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string" ? input : input.toString();

    assert(
      url === "https://api.openai.com/v1/responses",
      `Unexpected network request during AI CSV QA: ${url}.`,
    );

    requestBodies.push(typeof init?.body === "string" ? init.body : "");

    return new Response(
      JSON.stringify({
        output_text: outputText,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  }) as typeof fetch;
}

async function assertNoSprint08Migration() {
  const migrationsPath = path.join(projectRoot, "prisma", "migrations");
  const migrations = await fs.readdir(migrationsPath);
  const sprint08Migrations = migrations.filter((migration) =>
    migration.toLowerCase().includes("sprint_08"),
  );

  assert(
    sprint08Migrations.length === 0,
    `Sprint 08 should not create a migration. Found: ${sprint08Migrations.join(", ")}.`,
  );
}

async function assertConfirmationGate() {
  const actionPath = path.join(
    projectRoot,
    "src",
    "app",
    "(app)",
    "app",
    "imports",
    "actions.ts",
  );
  const actionSource = await fs.readFile(actionPath, "utf8");
  const confirmationGuardIndex = actionSource.indexOf(
    "if (!mappingDecisionDraft)",
  );
  const firstPersistenceIndex = Math.min(
    ...[
      actionSource.indexOf("registerCsvUploadMetadata({"),
      actionSource.indexOf("persistCsvImport({"),
    ].filter((index) => index >= 0),
  );

  assert(
    confirmationGuardIndex >= 0,
    "Import action must reject requests without a confirmed mapping draft.",
  );
  assert(
    Number.isFinite(firstPersistenceIndex) &&
      confirmationGuardIndex < firstPersistenceIndex,
    "Mapping confirmation must be enforced before import persistence.",
  );
}

function assertDatasetClassifications() {
  const appointment = buildDeterministicCsvMappingFallback(appointmentCsv);
  const client = buildDeterministicCsvMappingFallback(clientCsv);
  const lead = buildDeterministicCsvMappingFallback(leadCsv);
  const payment = buildDeterministicCsvMappingFallback(paymentCsv);
  const unknown = buildDeterministicCsvMappingFallback(unknownCsv);

  assert(
    appointment.classification.datasetType === "APPOINTMENTS",
    `Expected APPOINTMENTS, got ${appointment.classification.datasetType}.`,
  );
  assert(
    client.classification.datasetType === "CLIENTS",
    `Expected CLIENTS, got ${client.classification.datasetType}.`,
  );
  assert(
    lead.classification.datasetType === "LEADS",
    `Expected LEADS, got ${lead.classification.datasetType}.`,
  );
  assert(
    payment.classification.datasetType === "PAYMENTS_UNSUPPORTED",
    `Expected PAYMENTS_UNSUPPORTED, got ${payment.classification.datasetType}.`,
  );
  assert(
    unknown.classification.datasetType === "UNKNOWN",
    `Expected UNKNOWN, got ${unknown.classification.datasetType}.`,
  );

  return {
    appointment,
    client,
    lead,
    payment,
    unknown,
  };
}

function assertDeterministicMapping(
  appointment: ReturnType<typeof buildDeterministicCsvMappingFallback>,
) {
  const mappingByHeader = new Map(
    appointment.mappingSuggestions.map((suggestion) => [
      suggestion.sourceHeader,
      suggestion.targetField,
    ]),
  );

  assert(
    mappingByHeader.get("Appt Date") === "scheduledAt",
    "Appt Date should map deterministically to scheduledAt.",
  );
  assert(
    mappingByHeader.get("Status") === "appointmentStatus",
    "Status should map deterministically to appointmentStatus.",
  );
  assert(
    mappingByHeader.get("Price") === "estimatedRevenue",
    "Price should map deterministically to estimatedRevenue.",
  );
  assert(
    appointment.mappingConfidence > 0,
    "Deterministic mapping confidence should be returned.",
  );
}

function assertDataQuality(
  appointment: ReturnType<typeof buildDeterministicCsvMappingFallback>,
) {
  const supportedLeaks = new Set(
    appointment.dataQuality.supportedLeakPreview
      .filter((preview) => preview.supportLevel !== "NOT_SUPPORTED")
      .map((preview) => preview.leakType),
  );
  const incomplete = buildDeterministicCsvMappingFallback(
    incompleteAppointmentCsv,
  );

  assert(
    incomplete.classification.datasetType === "APPOINTMENTS",
    `Incomplete appointment fixture should remain APPOINTMENTS, got ${incomplete.classification.datasetType}.`,
  );
  assert(
    supportedLeaks.has("NO_SHOW_REVENUE"),
    "Appointment quality check should identify no-show leak support.",
  );
  assert(
    supportedLeaks.has("CANCELED_NOT_RECOVERED"),
    "Appointment quality check should identify cancellation leak support.",
  );
  assert(
    supportedLeaks.has("STALE_BOOKED_PROOF"),
    "Appointment quality check should identify stale-data leak support.",
  );
  assert(
    incomplete.dataQuality.missingFields.length > 0,
    "Incomplete appointment data should report missing required fields.",
  );
  assert(
    incomplete.dataQuality.state === "BLOCKED",
    `Incomplete appointment data should be BLOCKED, got ${incomplete.dataQuality.state}.`,
  );
}

async function assertValidAiTriage(
  appointment: ReturnType<typeof buildDeterministicCsvMappingFallback>,
) {
  const requestBodies: string[] = [];
  const validOutput = buildValidAiOutput(appointment);

  mockOpenAiResponse(JSON.stringify(validOutput), requestBodies);

  const result = await requestAiCsvTriage({
    deterministic: appointment,
    encoding: "utf-8",
  });

  assert(requestBodies.length === 1, "Valid AI triage should use one mocked request.");
  assert(result.reviewRequired === true, "AI triage must always require user review.");
  assert(
    result.detectedDatasetType === "APPOINTMENTS",
    "Valid AI triage should preserve the appointment classification.",
  );
  assert(
    result.columnMapping["Appt Date"] === "scheduledAt",
    "Valid AI triage should return the reviewed appointment mapping.",
  );

  const requestBody = requestBodies[0];
  const forbiddenRawValues = [
    appointmentCsv,
    "Jane Sensitive",
    "jane.secret@example.com",
    "+15551234567",
    "Private medical note",
  ];

  for (const value of forbiddenRawValues) {
    assert(
      !requestBody.includes(value),
      `AI request must not contain raw CSV/sensitive value: ${value}.`,
    );
  }

  assert(
    requestBody.includes("email_like") &&
      requestBody.includes("phone_like") &&
      requestBody.includes("redacted_text"),
    "AI request should contain sanitized value shapes.",
  );
}

async function assertAiDisabledFallback(
  unknown: ReturnType<typeof buildDeterministicCsvMappingFallback>,
) {
  let fetchCalls = 0;

  process.env.REVORY_LLM_ENABLED = "false";
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("AI-disabled fallback must not call the provider.");
  }) as typeof fetch;

  const result = await requestAiCsvTriage({
    deterministic: unknown,
  });

  assert(fetchCalls === 0, "AI-disabled fallback should not call fetch.");
  assert(
    result.detectedDatasetType === "UNKNOWN",
    "AI-disabled fallback should preserve UNKNOWN classification.",
  );
  assert(
    result.reviewRequired === true,
    "Uncertain deterministic mapping must require user review.",
  );
  assert(
    result.warnings.some((warning) =>
      warning.includes("deterministic mapping fallback"),
    ),
    "AI-disabled flow should explain deterministic fallback.",
  );

  process.env.REVORY_LLM_ENABLED = "true";
}

async function assertInvalidAiFallback(
  appointment: ReturnType<typeof buildDeterministicCsvMappingFallback>,
) {
  const requestBodies: string[] = [];

  mockOpenAiResponse("{not-valid-json", requestBodies);

  const result = await requestAiCsvTriage({
    deterministic: appointment,
  });

  assert(
    requestBodies.length === 2,
    "Invalid AI JSON should exhaust the bounded two-attempt runtime.",
  );
  assert(
    result.warnings.some((warning) =>
      warning.includes("deterministic mapping fallback"),
    ),
    "Invalid AI JSON should return the deterministic fallback.",
  );
  assert(
    result.columnMapping["Appt Date"] === "scheduledAt",
    "Fallback should preserve deterministic mapping.",
  );
  assert(
    result.reviewRequired === true,
    "Fallback mapping must still require user review.",
  );
}

async function main() {
  process.env.REVORY_LLM_ENABLED = "true";
  process.env.OPENAI_API_KEY = "qa-placeholder-key";
  process.env.REVORY_LLM_MODEL = "qa-mocked-model";
  process.env.REVORY_LLM_TIMEOUT_MS = "1000";

  log("Checking migration and persistence guardrails");
  await assertNoSprint08Migration();
  await assertConfirmationGate();

  const leakCountBefore = await prisma.revenueLeak.count();

  log("Validating deterministic dataset classifications");
  const results = assertDatasetClassifications();

  log("Validating deterministic mapping and data quality");
  assertDeterministicMapping(results.appointment);
  assertDataQuality(results.appointment);

  log("Validating deterministic fallback with AI disabled");
  await assertAiDisabledFallback(results.unknown);

  log("Validating mocked valid AI response and sanitized payload");
  await assertValidAiTriage(results.appointment);

  log("Validating invalid AI JSON fallback");
  await assertInvalidAiFallback(results.appointment);

  const leakCountAfter = await prisma.revenueLeak.count();

  assert(
    leakCountAfter === leakCountBefore,
    `AI CSV intake QA must not create RevenueLeak rows (${leakCountBefore} -> ${leakCountAfter}).`,
  );

  log("All checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    globalThis.fetch = originalFetch;

    if (originalEnvironment.apiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalEnvironment.apiKey;
    }

    if (originalEnvironment.enabled === undefined) {
      delete process.env.REVORY_LLM_ENABLED;
    } else {
      process.env.REVORY_LLM_ENABLED = originalEnvironment.enabled;
    }

    if (originalEnvironment.model === undefined) {
      delete process.env.REVORY_LLM_MODEL;
    } else {
      process.env.REVORY_LLM_MODEL = originalEnvironment.model;
    }

    if (originalEnvironment.timeout === undefined) {
      delete process.env.REVORY_LLM_TIMEOUT_MS;
    } else {
      process.env.REVORY_LLM_TIMEOUT_MS = originalEnvironment.timeout;
    }

    await prisma.$disconnect();
  });
