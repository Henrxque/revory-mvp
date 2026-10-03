import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

import { parseCanonicalCsv } from "@/services/canonical-intake/csv-profile";
import { assertCanonicalFileContent, assertCanonicalUploadMetadata } from "@/services/canonical-intake/file-security";
import { prepareAiIntegrityBatch, type AiIntegrityBatchInput, type AiIntegritySourceKind, type AiProviderBucketInput, type AiRevenueInput, type AiUsageInput } from "@/domain/ai-integrity/contracts";

export const AI_INTAKE_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const AI_INTAKE_MAX_ROWS = 10_000;
export const AI_INTAKE_MAX_COLUMNS = 80;

type Field = { label: string; required?: boolean; aliases: string[] };
export const aiIntakeFields: Record<AiIntegritySourceKind, Record<string, Field>> = {
  STRIPE_REVENUE: {
    externalId: { label: "Event ID", required: true, aliases: ["id", "event id", "external id", "charge id", "payment id"] },
    eventKind: { label: "Event kind", required: true, aliases: ["event kind", "event type", "type"] },
    status: { label: "Status", required: true, aliases: ["status", "payment status"] },
    occurredAt: { label: "Occurred at (ISO + timezone)", required: true, aliases: ["occurred at", "created at", "created", "event date"] },
    amountMinor: { label: "Amount in minor units", aliases: ["amount minor", "amount cents", "amount", "net amount cents"] },
    currency: { label: "Currency", aliases: ["currency", "currency code"] },
    currencyExponent: { label: "Currency exponent", aliases: ["currency exponent", "minor unit exponent"] },
    stripeCustomerExternalId: { label: "Stripe customer ID", aliases: ["customer id", "stripe customer id", "customer"] },
    stripeSubscriptionId: { label: "Subscription ID", aliases: ["subscription id"] },
    stripeInvoiceId: { label: "Invoice ID", aliases: ["invoice id"] },
    stripePaymentId: { label: "Payment ID", aliases: ["payment intent id", "payment id"] },
    parentExternalId: { label: "Parent event ID", aliases: ["parent id", "parent event id", "charge id for refund"] },
    periodStart: { label: "Period start", aliases: ["period start"] },
    periodEnd: { label: "Period end", aliases: ["period end"] },
    sourceVersion: { label: "Source version", aliases: ["version", "source version"] },
  },
  INTERNAL_LEDGER: {
    externalId: { label: "Usage event ID", required: true, aliases: ["event id", "usage id", "external id", "id"] },
    occurredAt: { label: "Occurred at (ISO + timezone)", required: true, aliases: ["occurred at", "timestamp", "created at"] },
    quantity: { label: "Quantity", required: true, aliases: ["quantity", "usage quantity", "tokens"] },
    unit: { label: "Unit", required: true, aliases: ["unit", "usage unit"] },
    internalCustomerExternalId: { label: "Internal customer ID", aliases: ["internal customer id", "customer id", "account id"] },
    provider: { label: "Provider", aliases: ["provider"] },
    providerRequestId: { label: "Provider request ID", aliases: ["provider request id", "request id"] },
    providerProjectId: { label: "Provider project ID", aliases: ["provider project id", "project id"] },
    model: { label: "Model", aliases: ["model"] },
    creditsDelta: { label: "Credits delta", aliases: ["credits delta", "credits debited"] },
    sourceVersion: { label: "Source version", aliases: ["version", "source version"] },
  },
  PROVIDER_REPORT: {
    externalId: { label: "Bucket ID", required: true, aliases: ["bucket id", "external id", "id"] },
    provider: { label: "Provider", required: true, aliases: ["provider"] },
    windowStart: { label: "Window start (ISO + timezone)", required: true, aliases: ["window start", "start time", "start"] },
    windowEnd: { label: "Window end (ISO + timezone)", required: true, aliases: ["window end", "end time", "end"] },
    costBasis: { label: "Cost basis", required: true, aliases: ["cost basis", "basis"] },
    costAmount: { label: "Cost amount", aliases: ["cost amount", "cost", "amount usd"] },
    costCurrency: { label: "Cost currency", aliases: ["cost currency", "currency"] },
    usageQuantity: { label: "Usage quantity", aliases: ["usage quantity", "quantity"] },
    usageUnit: { label: "Usage unit", aliases: ["usage unit", "unit"] },
    organizationId: { label: "Organization ID", aliases: ["organization id", "org id"] },
    projectId: { label: "Project ID", aliases: ["project id"] },
    model: { label: "Model", aliases: ["model"] },
    pricingVersion: { label: "Pricing version", aliases: ["pricing version", "price version"] },
    adjustmentKind: { label: "Adjustment kind", aliases: ["adjustment kind", "adjustment"] },
    reportedAt: { label: "Reported at", aliases: ["reported at", "report date"] },
    sourceVersion: { label: "Source version", aliases: ["version", "source version"] },
  },
};

export type AiIntakeIssue = { code: string; rowNumber: number | null; message: string; severity: "EXCLUDED" | "WARNING" };
export type AiIntakeFile = { bytes: Uint8Array; fileName: string; mimeType?: string };
export type AiIntakeMetadata = { workspaceId: string; sourceKind: AiIntegritySourceKind; sourceSystem: string; windowStart: string; windowEnd: string; sourceTimezone: string };
export type AiIntakeReview = { headers: string[]; sampleRows: string[][]; suggestedMapping: Record<string, string>; fields: Array<{ name: string; label: string; required: boolean }>; requiredFields: string[]; rowCount: number };
export type AiIntakePlan = { batch: AiIntegrityBatchInput | null; acceptedCount: number; rejectedCount: number; issues: AiIntakeIssue[]; mappingSha256: string; reviewToken: string | null };

function normalizedHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function sha256(value: Uint8Array | string) { return createHash("sha256").update(value).digest("hex"); }

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  throw new Error("Workbook contains an unsupported cell value; export plain values.");
}

async function readAiIntakeRows(file: AiIntakeFile): Promise<{ headers: string[]; rows: string[][]; rowNumbers: number[] }> {
  assertCanonicalUploadMetadata({ fileName: file.fileName, mimeType: file.mimeType, size: file.bytes.byteLength, maxFileBytes: AI_INTAKE_MAX_FILE_BYTES });
  await assertCanonicalFileContent({ bytes: file.bytes, fileName: file.fileName, maxFileBytes: AI_INTAKE_MAX_FILE_BYTES });
  let headers: string[];
  let rows: string[][];
  let rowNumbers: number[];
  if (file.fileName.toLowerCase().endsWith(".csv")) {
    const parsed = parseCanonicalCsv(new TextDecoder("utf-8", { fatal: true }).decode(file.bytes));
    headers = parsed.headers;
    rows = parsed.rows;
    rowNumbers = rows.map((_, index) => index + 2);
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.bytes as unknown as ExcelJS.Buffer);
    if (workbook.worksheets.length !== 1) throw new Error("XLSX must contain exactly one worksheet.");
    const sheet = workbook.worksheets[0];
    if (sheet.rowCount < 2 || sheet.rowCount > AI_INTAKE_MAX_ROWS + 1 || sheet.columnCount > AI_INTAKE_MAX_COLUMNS) throw new Error("Workbook dimensions exceed the AI intake limit.");
    headers = Array.from({ length: sheet.columnCount }, (_, index) => cellText(sheet.getRow(1).getCell(index + 1).value));
    rows = [];
    rowNumbers = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const values = headers.map((_, index) => {
        const cell = row.getCell(index + 1);
        if (cell.type === ExcelJS.ValueType.Formula) throw new Error(`Formula cell rejected at row ${rowNumber}. Export observed values.`);
        return cellText(cell.value);
      });
      if (values.some(Boolean)) { rows.push(values); rowNumbers.push(rowNumber); }
    }
  }
  if (!headers.length || headers.length > AI_INTAKE_MAX_COLUMNS || !rows.length || rows.length > AI_INTAKE_MAX_ROWS) throw new Error("File dimensions exceed the AI intake limit.");
  if (headers.some((header) => !header || ["__proto__", "constructor", "prototype"].includes(header.toLowerCase()))) throw new Error("File contains an empty or unsafe header.");
  if (new Set(headers.map(normalizedHeader)).size !== headers.length) throw new Error("Duplicate or ambiguous headers must be resolved before review.");
  if (rows.some((row) => row.length !== headers.length)) throw new Error("Row width differs from the header.");
  return { headers, rows, rowNumbers };
}

export async function reviewAiIntakeFile(file: AiIntakeFile, sourceKind: AiIntegritySourceKind): Promise<AiIntakeReview> {
  const { headers, rows } = await readAiIntakeRows(file);
  const fields = aiIntakeFields[sourceKind];
  if (!fields) throw new Error("Unsupported AI source kind.");
  const suggestedMapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const header of headers) {
    const target = Object.entries(fields).find(([field, definition]) => !used.has(field) && [field, ...definition.aliases].some((alias) => normalizedHeader(alias) === normalizedHeader(header)))?.[0];
    if (target) { suggestedMapping[header] = target; used.add(target); }
  }
  return { headers, sampleRows: rows.slice(0, 4), suggestedMapping, fields: Object.entries(fields).map(([name, field]) => ({ name, label: field.label, required: Boolean(field.required) })), requiredFields: Object.entries(fields).filter(([, field]) => field.required).map(([name]) => name), rowCount: rows.length };
}

function optional(value: string | undefined) { return value?.trim() || null; }

export async function buildAiIntakePlan(file: AiIntakeFile, metadata: AiIntakeMetadata, mapping: Record<string, string>): Promise<AiIntakePlan> {
  const { headers, rows, rowNumbers } = await readAiIntakeRows(file);
  const windowStart = new Date(metadata.windowStart);
  const windowEnd = new Date(metadata.windowEnd);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(metadata.windowStart) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(metadata.windowEnd) || !Number.isFinite(windowStart.valueOf()) || !Number.isFinite(windowEnd.valueOf()) || windowStart >= windowEnd) throw new Error("Choose a valid half-open import window with explicit timezone offsets.");
  const fields = aiIntakeFields[metadata.sourceKind];
  if (!fields) throw new Error("Unsupported AI source kind.");
  const mapped = Object.entries(mapping).filter(([, target]) => target);
  if (mapped.some(([header, target]) => !headers.includes(header) || !fields[target])) throw new Error("Mapping contains an unknown source header or target field.");
  if (new Set(mapped.map(([, target]) => target)).size !== mapped.length) throw new Error("A target field cannot be mapped twice.");
  const missingTargets = Object.entries(fields).filter(([, field]) => field.required).map(([target]) => target).filter((target) => !mapped.some(([, selected]) => selected === target));
  if (missingTargets.length) throw new Error(`Required mappings missing: ${missingTargets.join(", ")}.`);
  const mappingSha256 = sha256(JSON.stringify(mapped.sort(([left], [right]) => left.localeCompare(right))));
  const issues: AiIntakeIssue[] = [];
  const records: Array<AiRevenueInput | AiUsageInput | AiProviderBucketInput> = [];
  const idCounts = new Map<string, number>();
  for (const row of rows) {
    const idHeader = mapped.find(([, target]) => target === "externalId")?.[0];
    const id = idHeader ? row[headers.indexOf(idHeader)].trim() : "";
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  for (const [index, row] of rows.entries()) {
    const rowNumber = rowNumbers[index];
    const values = Object.fromEntries(mapped.map(([header, target]) => [target, row[headers.indexOf(header)].trim()])) as Record<string, string>;
    const missing = Object.entries(fields).filter(([, field]) => field.required).map(([name]) => name).filter((name) => !values[name]);
    if (missing.length) { issues.push({ code: "MISSING_REQUIRED", rowNumber, message: `Missing ${missing.join(", ")}.`, severity: "EXCLUDED" }); continue; }
    if ((idCounts.get(values.externalId) ?? 0) > 1) { issues.push({ code: "DUPLICATE_EXTERNAL_ID", rowNumber, message: `External ID ${values.externalId} appears more than once in this file.`, severity: "EXCLUDED" }); continue; }
    const base = {
      workspaceId: metadata.workspaceId,
      externalId: values.externalId,
      sourceVersion: optional(values.sourceVersion),
      sourceRowNumber: rowNumber,
      sourcePayload: Object.fromEntries(headers.map((header, column) => [header, row[column]])),
      provenance: { fileName: file.fileName, rowNumber, sourceSystem: metadata.sourceSystem },
    };
    let record: AiRevenueInput | AiUsageInput | AiProviderBucketInput;
    if (metadata.sourceKind === "STRIPE_REVENUE") {
      record = { ...base, eventKind: values.eventKind, status: values.status, occurredAt: values.occurredAt,
        amountMinor: optional(values.amountMinor), currency: optional(values.currency)?.toUpperCase(),
        currencyExponent: optional(values.currencyExponent) === null ? null : Number(values.currencyExponent),
        stripeCustomerExternalId: optional(values.stripeCustomerExternalId), stripeSubscriptionId: optional(values.stripeSubscriptionId),
        stripeInvoiceId: optional(values.stripeInvoiceId), stripePaymentId: optional(values.stripePaymentId), parentExternalId: optional(values.parentExternalId),
        periodStart: optional(values.periodStart), periodEnd: optional(values.periodEnd) };
    } else if (metadata.sourceKind === "INTERNAL_LEDGER") {
      record = { ...base, occurredAt: values.occurredAt, quantity: values.quantity, unit: values.unit,
        creditsDelta: optional(values.creditsDelta), internalCustomerExternalId: optional(values.internalCustomerExternalId),
        provider: optional(values.provider), providerRequestId: optional(values.providerRequestId), providerProjectId: optional(values.providerProjectId), model: optional(values.model) };
    } else {
      record = { ...base, provider: values.provider, windowStart: values.windowStart, windowEnd: values.windowEnd,
        costBasis: values.costBasis.toUpperCase() as AiProviderBucketInput["costBasis"], costAmount: optional(values.costAmount), costCurrency: optional(values.costCurrency)?.toUpperCase(),
        usageQuantity: optional(values.usageQuantity), usageUnit: optional(values.usageUnit), organizationId: optional(values.organizationId),
        projectId: optional(values.projectId), model: optional(values.model), pricingVersion: optional(values.pricingVersion),
        adjustmentKind: optional(values.adjustmentKind), reportedAt: optional(values.reportedAt) };
    }
    try {
      prepareAiIntegrityBatch({ ...metadata, fileName: file.fileName, fileSha256: sha256(file.bytes), mappingSha256, dataQuality: {}, sourceKind: metadata.sourceKind, records: [record] } as AiIntegrityBatchInput);
      if (metadata.sourceKind === "PROVIDER_REPORT") {
        const bucket = record as AiProviderBucketInput;
        if (new Date(bucket.windowStart) < windowStart || new Date(bucket.windowEnd) > windowEnd) {
          issues.push({ code: "OUTSIDE_WINDOW", rowNumber, message: "Provider bucket extends outside the selected import window.", severity: "EXCLUDED" });
          continue;
        }
        if (bucket.costBasis === "UNAVAILABLE") issues.push({ code: "COST_UNAVAILABLE", rowNumber, message: "Provider cost is unavailable; this row cannot support a cost claim.", severity: "WARNING" });
        if (bucket.costBasis === "ESTIMATED") issues.push({ code: "COST_ESTIMATED", rowNumber, message: "Provider cost is estimated and must remain separate from reported cost.", severity: "WARNING" });
      } else {
        const occurredAt = new Date((record as AiRevenueInput | AiUsageInput).occurredAt);
        if (occurredAt < windowStart || occurredAt >= windowEnd) {
          issues.push({ code: "OUTSIDE_WINDOW", rowNumber, message: "Event falls outside the selected import window.", severity: "EXCLUDED" });
          continue;
        }
        if (metadata.sourceKind === "STRIPE_REVENUE" && (record as AiRevenueInput).amountMinor === null) issues.push({ code: "AMOUNT_UNAVAILABLE", rowNumber, message: "Revenue amount is absent; this row cannot support a monetary claim.", severity: "WARNING" });
        if (metadata.sourceKind === "INTERNAL_LEDGER" && !(record as AiUsageInput).internalCustomerExternalId) issues.push({ code: "CUSTOMER_UNATTRIBUTED", rowNumber, message: "Internal customer ID is absent; this usage remains unattributed.", severity: "WARNING" });
      }
      records.push(record);
    } catch (error) {
      issues.push({ code: "INVALID_ROW", rowNumber, message: error instanceof Error ? error.message : "Invalid value.", severity: "EXCLUDED" });
    }
  }
  if (!records.length) return { batch: null, acceptedCount: 0, rejectedCount: rows.length, issues, mappingSha256, reviewToken: null };
  const excludedRows = issues.filter((issue) => issue.severity === "EXCLUDED").map((issue) => {
    const index = rowNumbers.indexOf(issue.rowNumber ?? -1);
    return { rowNumber: issue.rowNumber, reasonCode: issue.code, sourcePayload: Object.fromEntries(headers.map((header, column) => [header, rows[index][column]])) };
  });
  const batch = { ...metadata, fileName: file.fileName, fileSha256: sha256(file.bytes), mappingSha256,
    dataQuality: { inputRows: rows.length, acceptedRows: records.length, rejectedRows: rows.length - records.length, issues, excludedRows },
    sourceKind: metadata.sourceKind, records } as AiIntegrityBatchInput;
  const prepared = prepareAiIntegrityBatch(batch);
  return { batch, acceptedCount: records.length, rejectedCount: rows.length - records.length, issues, mappingSha256, reviewToken: prepared.idempotencyKey };
}
