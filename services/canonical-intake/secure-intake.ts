import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

import type { CanonicalEntityType, CanonicalRecordContract } from "@/domain/revory/contracts";
import { assertWorkspaceScopedRecord } from "@/domain/revory/contracts";
import { parseCanonicalCsv } from "@/services/canonical-intake/csv-profile";
import { canonicalFields, quoteRecoveryEligibility } from "@/services/canonical-intake/definitions";
import { buildRevenueRealizationRead } from "@/services/revenue-realization/reconciliation-engine";

export const CANONICAL_MAX_FILES = 8;
export const CANONICAL_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const CANONICAL_MAX_ROWS_PER_FILE = 25_000;
export const CANONICAL_MAX_COLUMNS = 120;

export type IntakeFile = { bytes: Uint8Array; entityType: CanonicalEntityType; fileName: string; mimeType?: string; sourceSystem: string; mapping: Record<string, string> };
export type IntakeIssue = { code: string; fileName: string; message: string; rowNumber?: number };
export type IntakePlan = { accepted: boolean; idempotencyKey: string; records: CanonicalRecordContract[]; issues: IntakeIssue[]; mappings: Record<string, Record<string, string>>; eligibility: Record<string, { eligible: boolean; missingFields: string[] }>; linkCoverage: { linked: number; unmatched: number; conflicting: number } };

async function readRows(file: IntakeFile): Promise<{ headers: string[]; rows: unknown[][]; formulaRows: number[] }> {
  if (file.fileName.toLowerCase().endsWith(".csv")) {
    const parsed = parseCanonicalCsv(new TextDecoder("utf-8", { fatal: true }).decode(file.bytes));
    return { headers: parsed.headers, rows: parsed.rows, formulaRows: [] };
  }
  if (!file.fileName.toLowerCase().endsWith(".xlsx")) throw new Error("Only .csv and .xlsx files are accepted.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.bytes as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [], formulaRows: [] };
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? "").trim());
  const rows: unknown[][] = [], formulaRows: number[] = [];
  sheet.eachRow({ includeEmpty: false }, (sheetRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values = headers.map((_, index) => {
      const cell = sheetRow.getCell(index + 1);
      if (cell.type === ExcelJS.ValueType.Formula) formulaRows.push(rowNumber);
      return cell.value;
    });
    rows.push(values);
  });
  return { headers, rows, formulaRows: [...new Set(formulaRows)] };
}

function normalize(value: unknown, type: string): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = typeof value === "object" && value && "text" in value ? String((value as { text: unknown }).text) : String(value).trim();
  if (type === "money") { const number = Number(raw.replace(/[$,\s]/g, "")); return Number.isFinite(number) ? Math.round(number * 100) : null; }
  if (type === "integer") { const number = Number.parseInt(raw, 10); return Number.isFinite(number) ? number : null; }
  if (type === "boolean") return ["true", "yes", "1"].includes(raw.toLowerCase());
  if (type === "date") { const date = new Date(raw); return Number.isNaN(date.valueOf()) ? null : date.toISOString(); }
  return raw;
}

export async function buildSecureIntakePlan(input: { workspaceId: string; files: IntakeFile[] }): Promise<IntakePlan> {
  const issues: IntakeIssue[] = [], records: CanonicalRecordContract[] = [], mappings: Record<string, Record<string, string>> = {};
  if (!input.workspaceId.trim()) throw new Error("Workspace authorization is required.");
  if (input.files.length === 0 || input.files.length > CANONICAL_MAX_FILES) throw new Error(`Upload between 1 and ${CANONICAL_MAX_FILES} files.`);
  const signatures: string[] = [];
  for (const file of input.files) {
    if (file.bytes.byteLength > CANONICAL_MAX_FILE_BYTES) { issues.push({ code: "FILE_TOO_LARGE", fileName: file.fileName, message: "File exceeds the 8 MB limit." }); continue; }
    signatures.push(createHash("sha256").update(file.bytes).digest("hex"));
    const { headers, rows, formulaRows } = await readRows(file);
    if (!headers.length || headers.length > CANONICAL_MAX_COLUMNS || rows.length > CANONICAL_MAX_ROWS_PER_FILE) { issues.push({ code: "INVALID_DIMENSIONS", fileName: file.fileName, message: "File dimensions exceed the supported limits." }); continue; }
    if (new Set(headers.map((h) => h.toLowerCase())).size !== headers.length) { issues.push({ code: "DUPLICATE_HEADERS", fileName: file.fileName, message: "Duplicate headers must be resolved before import." }); continue; }
    if (formulaRows.length) { issues.push({ code: "FORMULA_REJECTED", fileName: file.fileName, message: "Formula cells are not accepted; export observed values only.", rowNumber: formulaRows[0] }); continue; }
    const definitions = canonicalFields[file.entityType]; mappings[file.fileName] = file.mapping;
    const targets = Object.values(file.mapping).filter(Boolean);
    if (new Set(targets).size !== targets.length || targets.some((field) => !definitions[field])) { issues.push({ code: "INVALID_MAPPING", fileName: file.fileName, message: "Mapping contains duplicate or unsupported target fields." }); continue; }
    for (const [index, row] of rows.entries()) {
      const payload: Record<string, string | number | boolean | null> = {};
      for (const [source, target] of Object.entries(file.mapping)) {
        const column = headers.indexOf(source); if (column >= 0 && definitions[target]) payload[target] = normalize(row[column], definitions[target].type);
      }
      const missing = Object.entries(definitions).filter(([, d]) => d.required).map(([field]) => field).filter((field) => payload[field] === null || payload[field] === undefined || payload[field] === "");
      if (missing.length) { issues.push({ code: "MISSING_REQUIRED", fileName: file.fileName, rowNumber: index + 2, message: `Missing required fields: ${missing.join(", ")}.` }); continue; }
      const relationExternalIds = Object.fromEntries(Object.entries(definitions).filter(([field, d]) => d.relation && typeof payload[field] === "string" && payload[field]).map(([field]) => [field, payload[field] as string]));
      const record: CanonicalRecordContract = { workspaceId: input.workspaceId, entityType: file.entityType, sourceSystem: file.sourceSystem.trim(), externalId: String(payload.externalId), relationExternalIds, provenance: { fileName: file.fileName, rowNumber: index + 2, sourceHeaders: headers, importedAt: new Date().toISOString() }, payload, occurredAt: typeof payload.occurredAt === "string" ? payload.occurredAt : typeof payload.createdAt === "string" ? payload.createdAt : null };
      assertWorkspaceScopedRecord(record); records.push(record);
    }
  }
  const availableEstimateFields = new Set(records.filter((r) => r.entityType === "ESTIMATE").flatMap((r) => Object.entries(r.payload).filter(([, v]) => v !== null).map(([k]) => k)));
  const quoteEligibility = Object.fromEntries(Object.entries(quoteRecoveryEligibility).map(([rule, required]) => { const missingFields = required.filter((field) => !availableEstimateFields.has(field)); return [rule, { eligible: missingFields.length === 0, missingFields }]; }));
  const realizationEligibility = records.length
    ? buildRevenueRealizationRead(records).eligibility
    : {};
  const eligibility = { ...quoteEligibility, ...realizationEligibility };
  const knownIds = new Set(records.map((r) => `${r.entityType}:${r.externalId}`)); let linked = 0, unmatched = 0;
  for (const record of records) for (const [field, id] of Object.entries(record.relationExternalIds)) { const type = field.replace("ExternalId", "").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase(); if (knownIds.has(`${type}:${id}`)) linked += 1; else unmatched += 1; }
  const duplicates = records.length - new Set(records.map((r) => `${r.entityType}:${r.sourceSystem}:${r.externalId}`)).size;
  if (duplicates) issues.push({ code: "DUPLICATE_EXTERNAL_ID", fileName: "batch", message: `${duplicates} duplicate external ID record(s) must be resolved.` });
  const idempotencyKey = createHash("sha256").update([input.workspaceId, ...signatures.sort(), JSON.stringify(mappings)].join("|")).digest("hex");
  return { accepted: issues.every((issue) => !["FILE_TOO_LARGE", "INVALID_DIMENSIONS", "DUPLICATE_HEADERS", "FORMULA_REJECTED", "INVALID_MAPPING", "MISSING_REQUIRED", "DUPLICATE_EXTERNAL_ID"].includes(issue.code)) && records.length > 0, idempotencyKey, records, issues, mappings, eligibility, linkCoverage: { linked, unmatched, conflicting: duplicates } };
}
