import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildCanonicalMappingReview,
  validateReviewedCanonicalMapping,
} from "../services/canonical-intake/assisted-mapping";
import { requestCanonicalMappingAssistance } from "../services/canonical-intake/ai-assisted-mapping";
import { parseCanonicalCsv } from "../services/canonical-intake/csv-profile";
import { persistSecureIntakePlan } from "../services/canonical-intake/persist-intake";
import { buildSecureIntakePlan } from "../services/canonical-intake/secure-intake";
import { getLlmRuntimeStatus } from "../services/llm/get-llm-runtime-status";

const originalEnv = {
  apiKey: process.env.OPENAI_API_KEY,
  enabled: process.env.REVORY_LLM_ENABLED,
  model: process.env.REVORY_LLM_MODEL,
  timeout: process.env.REVORY_LLM_TIMEOUT_MS,
};
const originalFetch = globalThis.fetch;

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

try {
  const customerCsv = [
    "Customer ID,Customer Name,Email Address,Phone Number",
    "CUS-1,Sample Contractor,owner@example.invalid,+15555550101",
  ].join("\n");
  const estimateCsv = [
    "Quote ID;Customer ID;Quote Status;Quote Amount;Quote Date;Next Follow Up;Owner;Next Step",
    "EST-1;CUS-1;open;18000;2026-01-02;2026-02-01;Alex;Review evidence",
  ].join("\n");
  const activityCsv = [
    "Activity ID\tQuote ID\tActivity Date\tActivity Type\tOutcome",
    "ACT-1\tEST-1\t2026-01-10\temail\tNo reply",
  ].join("\n");

  assert.equal(parseCanonicalCsv(customerCsv).delimiter, ",");
  assert.equal(parseCanonicalCsv(estimateCsv).delimiter, ";");
  assert.equal(parseCanonicalCsv(activityCsv).delimiter, "\t");

  const customerReview = await buildCanonicalMappingReview({
    bytes: bytes(customerCsv),
    entityType: "CUSTOMER",
    fileName: "customers.csv",
  });
  const estimateReview = await buildCanonicalMappingReview({
    bytes: bytes(estimateCsv),
    entityType: "ESTIMATE",
    fileName: "estimates.csv",
  });
  const activityReview = await buildCanonicalMappingReview({
    bytes: bytes(activityCsv),
    entityType: "ACTIVITY",
    fileName: "activities.csv",
  });
  assert.equal(customerReview.mapping["Customer ID"], "externalId");
  assert.equal(estimateReview.mapping["Quote Amount"], "amountCents");
  assert.equal(activityReview.mapping["Activity Date"], "occurredAt");
  assert.equal(customerReview.acceptedForReview, true);
  assert.equal(estimateReview.acceptedForReview, true);
  assert.equal(activityReview.acceptedForReview, true);

  const wrongDataset = await buildCanonicalMappingReview({
    bytes: bytes(customerCsv),
    entityType: "ESTIMATE",
    fileName: "wrong-estimates.csv",
  });
  assert.equal(wrongDataset.detectedEntityType, "CUSTOMER");
  assert(wrongDataset.issues.some((issue) => issue.includes("looks like CUSTOMER")));

  const missingRequired = await buildCanonicalMappingReview({
    bytes: bytes("Quote ID,Quote Status\nEST-2,open"),
    entityType: "ESTIMATE",
    fileName: "missing-date.csv",
  });
  assert(missingRequired.issues.some((issue) => issue.includes("createdAt")));

  const duplicateMappingIssues = validateReviewedCanonicalMapping({
    confidence: 1,
    detectedEntityType: "CUSTOMER",
    entityType: "CUSTOMER",
    mapping: { "Customer ID": "externalId", ID: "externalId" },
  });
  assert(duplicateMappingIssues.some((issue) => issue.includes("more than one header")));

  const intakeFiles = [
    {
      bytes: bytes(customerCsv),
      entityType: "CUSTOMER" as const,
      fileName: "customers.csv",
      mapping: customerReview.mapping,
      sourceSystem: "qa-fixture",
    },
    {
      bytes: bytes(estimateCsv),
      entityType: "ESTIMATE" as const,
      fileName: "estimates.csv",
      mapping: estimateReview.mapping,
      sourceSystem: "qa-fixture",
    },
  ];
  const planA = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: intakeFiles });
  const planB = await buildSecureIntakePlan({ workspaceId: "workspace-a", files: intakeFiles });
  assert.equal(planA.accepted, true);
  assert.equal(planA.idempotencyKey, planB.idempotencyKey);
  assert(planA.records.every((record) => record.workspaceId === "workspace-a"));
  await assert.rejects(
    persistSecureIntakePlan({ workspaceId: "workspace-b", plan: planA }),
    /workspace-scoped/,
  );

  delete process.env.REVORY_LLM_MODEL;
  assert.equal(getLlmRuntimeStatus().model, "gpt-4o-mini");
  process.env.REVORY_LLM_ENABLED = "false";
  globalThis.fetch = async () => {
    throw new Error("AI-disabled mapping must not call the provider.");
  };
  const unavailable = await requestCanonicalMappingAssistance(estimateReview);
  assert.equal(unavailable.providerUsed, false);
  assert.deepEqual(unavailable.mapping, estimateReview.mapping);

  process.env.REVORY_LLM_ENABLED = "true";
  process.env.OPENAI_API_KEY = "qa-synthetic-key";
  process.env.REVORY_LLM_TIMEOUT_MS = "20";
  globalThis.fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  const timedOut = await requestCanonicalMappingAssistance(estimateReview);
  assert.equal(timedOut.providerUsed, false);

  let invalidCalls = 0;
  globalThis.fetch = async () => {
    invalidCalls += 1;
    return new Response(JSON.stringify({ output_text: "not-json" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  const invalidJson = await requestCanonicalMappingAssistance(estimateReview);
  assert.equal(invalidJson.providerUsed, false);
  assert.equal(invalidCalls, 2);

  const actionSource = fs.readFileSync(
    "src/app/(app)/app/imports/canonical-actions.ts",
    "utf8",
  );
  assert.match(actionSource, /mappingConfirmed/);
  assert.match(actionSource, /Explicitly confirm the reviewed mapping/);
  assert.match(actionSource, /getAppContext/);
  assert.match(actionSource, /workspace\.id/);

  console.log(
    "Canonical assisted intake: alternate headers, safe delimiters, bounded AI fallback, Data Quality, idempotency, workspace isolation and confirmation: PASS",
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalEnv.apiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalEnv.apiKey;
  if (originalEnv.enabled === undefined) delete process.env.REVORY_LLM_ENABLED;
  else process.env.REVORY_LLM_ENABLED = originalEnv.enabled;
  if (originalEnv.model === undefined) delete process.env.REVORY_LLM_MODEL;
  else process.env.REVORY_LLM_MODEL = originalEnv.model;
  if (originalEnv.timeout === undefined) delete process.env.REVORY_LLM_TIMEOUT_MS;
  else process.env.REVORY_LLM_TIMEOUT_MS = originalEnv.timeout;
}
