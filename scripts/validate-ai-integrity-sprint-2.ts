import assert from "node:assert/strict";
import fs from "node:fs";
import ExcelJS from "exceljs";

import { buildAiIntakePlan, reviewAiIntakeFile } from "../services/ai-integrity/intake";
import type { AiIntegritySourceKind } from "../domain/ai-integrity/contracts";

const bytes = (value: string) => new TextEncoder().encode(value);
const metadata = (sourceKind: AiIntegritySourceKind) => ({ workspaceId: "synthetic-ws-a", sourceKind, sourceSystem: sourceKind.toLowerCase(), windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-09-01T00:00:00Z", sourceTimezone: "UTC" });
const file = (name: string) => ({ fileName: name, bytes: new Uint8Array(fs.readFileSync(`public/templates/${name}`)), mimeType: "text/csv" });

for (const [name, kind] of [
  ["ai-integrity-stripe-revenue.csv", "STRIPE_REVENUE"],
  ["ai-integrity-internal-ledger.csv", "INTERNAL_LEDGER"],
  ["ai-integrity-provider-report.csv", "PROVIDER_REPORT"],
] as const) {
  const source = file(name);
  const review = await reviewAiIntakeFile(source, kind);
  assert.equal(review.rowCount, kind === "PROVIDER_REPORT" ? 1 : 2);
  assert(review.requiredFields.every((field) => Object.values(review.suggestedMapping).includes(field)), `${name}: required mapping should be suggested.`);
  const plan = await buildAiIntakePlan(source, metadata(kind), review.suggestedMapping);
  assert.equal(plan.rejectedCount, 0);
  assert.equal(plan.acceptedCount, review.rowCount);
  assert.ok(plan.reviewToken);
  assert.equal((await buildAiIntakePlan(source, metadata(kind), review.suggestedMapping)).reviewToken, plan.reviewToken);
  if (kind === "PROVIDER_REPORT") {
    assert.equal(plan.batch?.sourceKind, "PROVIDER_REPORT");
    assert.equal("internalCustomerExternalId" in (plan.batch?.records[0] ?? {}), false, "Aggregate provider bucket must not be assigned a customer.");
  }
}

const mixedCsv = [
  "externalId,eventKind,status,occurredAt,amountMinor,currency,currencyExponent",
  "ch_ok,CHARGE,paid,2026-08-10T12:00:00Z,12000,USD,2",
  "ch_bad,CHARGE,paid,2026-08-10T12:00:00Z,not-money,USD,2",
  "ch_dup,CHARGE,paid,2026-08-10T12:00:00Z,100,USD,2",
  "ch_dup,CHARGE,paid,2026-08-10T12:00:00Z,200,USD,2",
].join("\n");
const mixedFile = { bytes: bytes(mixedCsv), fileName: "mixed.csv", mimeType: "text/csv" };
const mixedReview = await reviewAiIntakeFile(mixedFile, "STRIPE_REVENUE");
const mixedPlan = await buildAiIntakePlan(mixedFile, metadata("STRIPE_REVENUE"), mixedReview.suggestedMapping);
assert.equal(mixedPlan.acceptedCount, 1);
assert.equal(mixedPlan.rejectedCount, 3);
assert.equal(mixedPlan.issues.filter((issue) => issue.code === "DUPLICATE_EXTERNAL_ID").length, 2, "Both conflicting rows must be excluded.");
assert(mixedPlan.issues.some((issue) => issue.rowNumber === 3 && issue.code === "INVALID_ROW"));
assert.deepEqual((mixedPlan.batch?.dataQuality as { rejectedRows: number }).rejectedRows, 3);
assert.equal((mixedPlan.batch?.dataQuality as { excludedRows: Array<{ sourcePayload: Record<string, string> }> }).excludedRows.length, 3);
assert(mixedPlan.issues.every((issue) => issue.severity === "EXCLUDED"));

const outsideFile = { bytes: bytes("externalId,occurredAt,quantity,unit,internalCustomerExternalId\ninside,2026-08-10T12:00:00Z,1,request,\noutside,2026-09-01T00:00:00Z,1,request,customer_1"), fileName: "period.csv", mimeType: "text/csv" };
const outsideReview = await reviewAiIntakeFile(outsideFile, "INTERNAL_LEDGER");
const outsidePlan = await buildAiIntakePlan(outsideFile, metadata("INTERNAL_LEDGER"), outsideReview.suggestedMapping);
assert.equal(outsidePlan.acceptedCount, 1);
assert.equal(outsidePlan.rejectedCount, 1);
assert(outsidePlan.issues.some((issue) => issue.code === "OUTSIDE_WINDOW" && issue.severity === "EXCLUDED"));
assert(outsidePlan.issues.some((issue) => issue.code === "CUSTOMER_UNATTRIBUTED" && issue.severity === "WARNING"));

await assert.rejects(() => buildAiIntakePlan(mixedFile, metadata("STRIPE_REVENUE"), { ...mixedReview.suggestedMapping, unknown: "currency" }), /unknown source header/);
await assert.rejects(() => buildAiIntakePlan(mixedFile, metadata("STRIPE_REVENUE"), { ...mixedReview.suggestedMapping, status: "externalId" }), /mapped twice/);
const changedMapping = { ...mixedReview.suggestedMapping };
delete changedMapping.currency;
assert.notEqual((await buildAiIntakePlan(mixedFile, metadata("STRIPE_REVENUE"), changedMapping)).reviewToken, mixedPlan.reviewToken);

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Usage");
sheet.addRow(["externalId", "occurredAt", "quantity", "unit"]);
sheet.addRow(["evt_xlsx", "2026-08-10T12:00:00Z", "50", "tokens"]);
const xlsxFile = { bytes: new Uint8Array(await workbook.xlsx.writeBuffer()), fileName: "usage.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
const xlsxReview = await reviewAiIntakeFile(xlsxFile, "INTERNAL_LEDGER");
assert.equal((await buildAiIntakePlan(xlsxFile, metadata("INTERNAL_LEDGER"), xlsxReview.suggestedMapping)).acceptedCount, 1);
sheet.getRow(2).getCell(3).value = { formula: "1+1", result: 2 };
const formulaFile = { ...xlsxFile, bytes: new Uint8Array(await workbook.xlsx.writeBuffer()) };
await assert.rejects(() => reviewAiIntakeFile(formulaFile, "INTERNAL_LEDGER"), /Formula cell rejected/);

for (const route of ["src/app/api/ai-integrity/review/route.ts", "src/app/api/ai-integrity/import/route.ts"]) {
  const code = fs.readFileSync(route, "utf8");
  assert.match(code, /canUseAiIntegrityIntakePreview/);
  assert.match(code, /validOrigin/);
  assert.match(code, /checkRateLimit/);
}
assert.match(fs.readFileSync("services/ai-integrity/internal-access.ts", "utf8"), /process\.env\.NODE_ENV !== "production"/);
assert.match(fs.readFileSync("src/app/api/ai-integrity/import/route.ts", "utf8"), /reviewToken/);

console.log("AI Integrity Sprint 2 CSV/XLSX review, partial Data Quality, mapping confirmation contract and internal gate: PASS");
