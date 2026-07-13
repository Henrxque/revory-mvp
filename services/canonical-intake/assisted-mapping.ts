import ExcelJS from "exceljs";

import { canonicalEntityTypes, type CanonicalEntityType } from "@/domain/revory/contracts";
import { canonicalFields } from "@/services/canonical-intake/definitions";
import { parseCanonicalCsv, type SafeCsvDelimiter } from "@/services/canonical-intake/csv-profile";

export type CanonicalColumnProfile = {
  fillRate: number;
  header: string;
  inferredType: "boolean" | "date" | "email" | "money" | "number" | "phone" | "text";
};

export type CanonicalMappingSuggestion = {
  confidence: number;
  sourceHeader: string;
  targetField: string | null;
};

export type CanonicalMappingReview = {
  acceptedForReview: boolean;
  columnProfiles: CanonicalColumnProfile[];
  confidence: number;
  delimiter: SafeCsvDelimiter | "xlsx";
  detectedEntityType: CanonicalEntityType | null;
  entityType: CanonicalEntityType;
  fileName: string;
  headers: string[];
  issues: string[];
  mapping: Record<string, string>;
  requiresConfirmation: true;
  rowCount: number;
};

const ACTIVE_ENTITY_TYPES = canonicalEntityTypes;

const aliases: Record<CanonicalEntityType, Record<string, readonly string[]>> = {
  CUSTOMER: {
    externalId: ["external id", "customer id", "client id", "contact id", "account id", "id"],
    name: ["customer name", "client name", "contact name", "account name", "name"],
    email: ["customer email", "client email", "contact email", "email", "email address"],
    phone: ["customer phone", "client phone", "contact phone", "phone", "phone number", "mobile"],
  },
  LEAD: {
    externalId: ["external id", "lead id", "opportunity id", "prospect id", "id"],
    customerExternalId: ["customer id", "client id", "contact id", "customer external id"],
    createdAt: ["created at", "created date", "lead date", "date created", "received at"],
    status: ["lead status", "status", "stage"],
    owner: ["owner", "assigned rep", "sales rep", "representative", "estimator"],
    source: ["source", "lead source", "channel"],
  },
  ESTIMATE: {
    externalId: ["external id", "estimate id", "quote id", "proposal id", "bid id", "id"],
    customerExternalId: ["customer id", "client id", "contact id", "customer external id"],
    leadExternalId: ["lead id", "opportunity id", "lead external id"],
    jobExternalId: ["job id", "project id", "job external id"],
    status: ["estimate status", "quote status", "proposal status", "status", "stage"],
    amountCents: ["estimate amount", "quote amount", "proposal amount", "estimate total", "quote total", "total", "amount", "value"],
    createdAt: ["estimate date", "quote date", "proposal date", "created at", "created date", "date created"],
    sentAt: ["sent at", "sent date", "date sent", "estimate sent"],
    closedAt: ["closed at", "close date", "won date"],
    lostAt: ["lost at", "lost date"],
    lastActivityAt: ["last activity", "last activity at", "last contact", "last contact date"],
    nextFollowUpAt: ["next follow up", "next follow-up", "follow up date", "follow-up date", "next contact date"],
    owner: ["owner", "assigned rep", "sales rep", "representative", "estimator"],
    source: ["source", "lead source", "channel", "marketing source"],
    serviceType: ["service type", "job type", "project type", "trade", "service"],
    nextStep: ["next step", "next action", "follow up action", "follow-up action"],
    currency: ["currency", "currency code"],
  },
  ACTIVITY: {
    externalId: ["external id", "activity id", "follow up id", "follow-up id", "touch id", "id"],
    customerExternalId: ["customer id", "client id", "contact id", "customer external id"],
    leadExternalId: ["lead id", "opportunity id", "lead external id"],
    estimateExternalId: ["estimate id", "quote id", "proposal id", "estimate external id"],
    jobExternalId: ["job id", "project id", "job external id"],
    occurredAt: ["occurred at", "activity date", "contact date", "follow up date", "follow-up date", "date"],
    activityType: ["activity type", "type", "channel", "contact type"],
    outcome: ["outcome", "result", "status"],
    nextStep: ["next step", "next action"],
  },
  JOB: {
    externalId: ["external id", "job id", "project id", "work order id", "id"],
    customerExternalId: ["customer id", "client id", "customer external id"],
    estimateExternalId: ["estimate id", "quote id", "proposal id", "estimate external id"],
    status: ["job status", "project status", "status"],
    contractValueCents: ["contract value", "job value", "project value", "contract amount", "job total", "amount"],
    contractValueIncludesApprovedChanges: ["contract includes changes", "includes approved changes", "revised contract value", "change orders included"],
    invoiceExportComplete: ["invoice export complete", "all invoices included", "invoice dataset complete"],
    changeOrderExportComplete: ["change order export complete", "all change orders included", "change order dataset complete"],
    costExportComplete: ["cost export complete", "all job costs included", "cost dataset complete"],
    currency: ["currency", "currency code"],
    owner: ["owner", "assigned rep", "sales rep", "project manager", "estimator"],
    source: ["source", "lead source", "channel", "marketing source"],
    serviceType: ["service type", "job type", "project type", "trade", "service"],
    targetGrossMarginBps: ["target gross margin", "target gross margin percent", "target margin", "target margin percent", "expected margin"],
    scopeChangeFlag: ["scope change flag", "scope changed", "extra work flag", "additional work flag"],
    notes: ["job notes", "project notes", "scope notes", "notes"],
    startedAt: ["started at", "start date", "job start", "project start"],
    completedAt: ["completed at", "completion date", "job completed", "project completed"],
  },
  INVOICE: {
    externalId: ["external id", "invoice id", "invoice number", "bill id", "id"],
    customerExternalId: ["customer id", "client id", "customer external id"],
    jobExternalId: ["job id", "project id", "work order id", "job external id"],
    estimateExternalId: ["estimate id", "quote id", "proposal id", "estimate external id"],
    status: ["invoice status", "billing status", "status"],
    amountCents: ["invoice amount", "invoice total", "billed amount", "bill amount", "amount", "total"],
    currency: ["currency", "currency code"],
    issuedAt: ["issued at", "invoice date", "issued date", "bill date"],
    paidAt: ["paid at", "paid date", "payment date"],
    dueAt: ["due at", "due date", "payment due"],
  },
  CHANGE_ORDER: {
    externalId: ["external id", "change order id", "change order number", "co id", "id"],
    jobExternalId: ["job id", "project id", "work order id", "job external id"],
    estimateExternalId: ["estimate id", "quote id", "proposal id", "estimate external id"],
    invoiceExternalId: ["invoice id", "invoice number", "invoice external id"],
    status: ["change order status", "approval status", "status"],
    billingStatus: ["billing status", "invoice status", "billed status", "change order billing status"],
    approvedAmountCents: ["approved amount", "change order amount", "approved value", "co amount", "amount"],
    currency: ["currency", "currency code"],
    approvedAt: ["approved at", "approval date", "approved date"],
    description: ["description", "change description", "scope description", "change order description"],
  },
  COST: {
    externalId: ["external id", "cost id", "expense id", "transaction id", "id"],
    jobExternalId: ["job id", "project id", "work order id", "job external id"],
    invoiceExternalId: ["invoice id", "invoice number", "invoice external id"],
    amountCents: ["cost amount", "expense amount", "actual cost", "amount", "total"],
    currency: ["currency", "currency code"],
    incurredAt: ["incurred at", "cost date", "expense date", "transaction date", "date"],
    category: ["cost category", "expense category", "category", "type"],
  },
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function inferType(values: readonly string[]): CanonicalColumnProfile["inferredType"] {
  const populated = values.map((value) => value.trim()).filter(Boolean);
  if (!populated.length) return "text";
  const ratio = (predicate: (value: string) => boolean) =>
    populated.filter(predicate).length / populated.length;
  if (ratio((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) >= 0.8) return "email";
  if (
    ratio((value) => /^(?:\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/.test(value)) >= 0.8
  ) return "date";
  if (
    ratio(
      (value) =>
        /^\+?[\d\s().-]{7,}$/.test(value) &&
        (value.match(/\d/g)?.length ?? 0) >= 7,
    ) >= 0.8
  ) return "phone";
  if (ratio((value) => /^[$€£]?\s*-?[\d,.]+$/.test(value)) >= 0.8) return "money";
  if (ratio((value) => /^-?[\d,.]+$/.test(value)) >= 0.8) return "number";
  if (ratio((value) => /^(true|false|yes|no|0|1)$/i.test(value)) >= 0.8) return "boolean";
  return "text";
}

function suggestMapping(headers: readonly string[], entityType: CanonicalEntityType) {
  const entityAliases = aliases[entityType];
  return headers.map((sourceHeader): CanonicalMappingSuggestion => {
    const normalized = normalizeHeader(sourceHeader);
    const exactCanonical = Object.keys(canonicalFields[entityType]).find(
      (field) => normalizeHeader(field) === normalized,
    );
    if (exactCanonical) return { confidence: 1, sourceHeader, targetField: exactCanonical };
    const aliasMatch = Object.entries(entityAliases).find(([, values]) =>
      values.some((value) => normalizeHeader(value) === normalized),
    );
    return {
      confidence: aliasMatch ? 0.96 : 0,
      sourceHeader,
      targetField: aliasMatch?.[0] ?? null,
    };
  });
}

function mappingScore(headers: readonly string[], entityType: CanonicalEntityType) {
  const suggestions = suggestMapping(headers, entityType);
  const mapped = new Set(suggestions.flatMap((item) => (item.targetField ? [item.targetField] : [])));
  const required = Object.entries(canonicalFields[entityType])
    .filter(([, definition]) => definition.required)
    .map(([field]) => field);
  const requiredCoverage = required.filter((field) => mapped.has(field)).length / required.length;
  const mappedCoverage = suggestions.filter((item) => item.targetField).length / Math.max(1, headers.length);
  return requiredCoverage * 0.72 + mappedCoverage * 0.28;
}

export function calculateReviewedMappingConfidence(input: {
  entityType: CanonicalEntityType;
  headers: readonly string[];
  mapping: Record<string, string>;
}) {
  const targets = new Set(Object.values(input.mapping).filter(Boolean));
  const required = Object.entries(canonicalFields[input.entityType])
    .filter(([, definition]) => definition.required)
    .map(([field]) => field);
  const requiredCoverage = required.filter((field) => targets.has(field)).length / required.length;
  const mappedCoverage = input.headers.filter((header) => input.mapping[header]).length / Math.max(1, input.headers.length);
  return requiredCoverage * 0.72 + mappedCoverage * 0.28;
}

function detectEntityType(headers: readonly string[]) {
  const ranked = ACTIVE_ENTITY_TYPES.map((entityType) => ({
    entityType,
    score: mappingScore(headers, entityType),
  })).sort((left, right) => right.score - left.score);
  if (!ranked[0] || ranked[0].score < 0.6 || ranked[0].score - (ranked[1]?.score ?? 0) < 0.12) {
    return null;
  }
  return ranked[0].entityType;
}

async function readProfile(input: { bytes: Uint8Array; fileName: string }) {
  if (input.fileName.toLowerCase().endsWith(".csv")) {
    const parsed = parseCanonicalCsv(new TextDecoder("utf-8", { fatal: true }).decode(input.bytes));
    return { delimiter: parsed.delimiter as SafeCsvDelimiter | "xlsx", headers: parsed.headers, rows: parsed.rows };
  }
  if (!input.fileName.toLowerCase().endsWith(".xlsx")) throw new Error("Only CSV and XLSX files are supported.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input.bytes as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheet.");
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? "").trim());
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push(headers.map((_, index) => String(row.getCell(index + 1).text ?? "")));
  });
  return { delimiter: "xlsx" as const, headers, rows };
}

export async function buildCanonicalMappingReview(input: {
  bytes: Uint8Array;
  entityType: CanonicalEntityType;
  fileName: string;
}): Promise<CanonicalMappingReview> {
  const profile = await readProfile(input);
  const suggestions = suggestMapping(profile.headers, input.entityType);
  const mapping = Object.fromEntries(
    suggestions.flatMap((item) => (item.targetField ? [[item.sourceHeader, item.targetField]] : [])),
  );
  const detectedEntityType = detectEntityType(profile.headers);
  const columnProfiles = profile.headers.map((header, columnIndex) => {
    const values = profile.rows.slice(0, 25).map((row) => row[columnIndex] ?? "");
    const populated = values.filter((value) => value.trim()).length;
    return {
      fillRate: values.length ? Math.round((populated / values.length) * 100) : 0,
      header,
      inferredType: inferType(values),
    };
  });
  const issues = validateReviewedCanonicalMapping({
    confidence: mappingScore(profile.headers, input.entityType),
    detectedEntityType,
    entityType: input.entityType,
    mapping,
  });
  return {
    acceptedForReview: !issues.some((issue) => issue.startsWith("Blocked:")),
    columnProfiles,
    confidence: mappingScore(profile.headers, input.entityType),
    delimiter: profile.delimiter,
    detectedEntityType,
    entityType: input.entityType,
    fileName: input.fileName,
    headers: profile.headers,
    issues,
    mapping,
    requiresConfirmation: true,
    rowCount: profile.rows.length,
  };
}

export function validateReviewedCanonicalMapping(input: {
  confidence: number;
  detectedEntityType: CanonicalEntityType | null;
  entityType: CanonicalEntityType;
  mapping: Record<string, string>;
}) {
  const issues: string[] = [];
  const definitions = canonicalFields[input.entityType];
  const targets = Object.values(input.mapping).filter(Boolean);
  const duplicateTargets = targets.filter((target, index) => targets.indexOf(target) !== index);
  const invalidTargets = targets.filter((target) => !definitions[target]);
  const required = Object.entries(definitions)
    .filter(([, definition]) => definition.required)
    .map(([field]) => field);
  const missingRequired = required.filter((field) => !targets.includes(field));

  if (input.detectedEntityType && input.detectedEntityType !== input.entityType) {
    issues.push(`Blocked: this file looks like ${input.detectedEntityType}, not ${input.entityType}.`);
  }
  if (input.confidence < 0.6) {
    issues.push("Blocked: mapping confidence is too low. Use a canonical template or provide clearer headers.");
  }
  if (duplicateTargets.length) {
    issues.push(`Blocked: more than one header maps to ${[...new Set(duplicateTargets)].join(", ")}.`);
  }
  if (invalidTargets.length) {
    issues.push(`Blocked: unsupported target fields: ${[...new Set(invalidTargets)].join(", ")}.`);
  }
  if (missingRequired.length) {
    issues.push(`Blocked: required fields are not mapped: ${missingRequired.join(", ")}.`);
  }
  return issues;
}
