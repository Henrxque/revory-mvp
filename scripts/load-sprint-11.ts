import assert from "node:assert/strict";

import type { CanonicalRecordContract } from "../domain/revory/contracts";
import { runQuoteRecoveryEngine } from "../services/quote-recovery/engine";
import { buildRevenueRealizationRead } from "../services/revenue-realization/reconciliation-engine";

const pairCount = Number(process.env.REVORY_LOAD_PAIRS ?? 25_000);
assert.ok(Number.isSafeInteger(pairCount) && pairCount > 0 && pairCount <= 100_000);
const provenance = { fileName: "load.csv", importedAt: "2026-07-13T12:00:00Z", rowNumber: 2, sourceHeaders: [] };
const records: CanonicalRecordContract[] = [];
for (let index = 0; index < pairCount; index += 1) {
  const id = `E-${index}`;
  records.push({ workspaceId: "load", entityType: "ESTIMATE", sourceSystem: "fixture", externalId: id, relationExternalIds: {}, provenance, occurredAt: null, payload: { externalId: id, status: "open", amountCents: 2_000_000, currency: "USD", createdAt: "2026-01-01T00:00:00Z", nextFollowUpAt: "2026-07-01T00:00:00Z", owner: "Owner", nextStep: "Review" } });
  records.push({ workspaceId: "load", entityType: "ACTIVITY", sourceSystem: "fixture", externalId: `A-${index}`, relationExternalIds: { estimateExternalId: id }, provenance, occurredAt: "2026-06-01T00:00:00Z", payload: { externalId: `A-${index}`, occurredAt: "2026-06-01T00:00:00Z" } });
}
const quoteStarted = performance.now();
const findings = runQuoteRecoveryEngine({ workspaceId: "load", records, now: new Date("2026-07-13T00:00:00Z") });
const quoteDurationMs = Math.round(performance.now() - quoteStarted);
assert.ok(findings.length >= pairCount);
assert.ok(quoteDurationMs < 15_000, `Quote Recovery load corpus took ${quoteDurationMs}ms`);

const realization: CanonicalRecordContract[] = [];
for (let index = 0; index < Math.min(pairCount, 5_000); index += 1) {
  const job = `J-${index}`;
  realization.push({ workspaceId: "load", entityType: "JOB", sourceSystem: "fixture", externalId: job, relationExternalIds: {}, provenance, occurredAt: null, payload: { externalId: job, status: "completed", contractValueCents: 2_000_000, contractValueIncludesApprovedChanges: true, invoiceExportComplete: true, changeOrderExportComplete: true, costExportComplete: true, currency: "USD" } });
  realization.push({ workspaceId: "load", entityType: "INVOICE", sourceSystem: "fixture", externalId: `I-${index}`, relationExternalIds: { jobExternalId: job }, provenance, occurredAt: null, payload: { externalId: `I-${index}`, status: "paid", amountCents: 1_500_000, currency: "USD" } });
}
const realizationStarted = performance.now();
const read = buildRevenueRealizationRead(realization, new Date("2026-07-13T00:00:00Z"));
const realizationDurationMs = Math.round(performance.now() - realizationStarted);
assert.equal(read.summary.eligibleJobs, Math.min(pairCount, 5_000));
assert.ok(realizationDurationMs < 15_000, `Revenue Realization load corpus took ${realizationDurationMs}ms`);

console.log(JSON.stringify({ status: "PASS", quoteRecords: records.length, quoteFindings: findings.length, quoteDurationMs, realizationRecords: realization.length, realizationDurationMs, heapMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }));
