import type {
  RevoryClientCsvColumn,
  RevoryClientCsvRawRow,
  RevoryClientNormalizedRow,
  RevoryClientParsedRow,
  RevoryCsvParseResult,
  RevoryCsvParserWarning,
} from "@/types/imports";
import {
  normalizeDate,
  normalizeEmail,
  normalizeInteger,
  normalizeName,
  normalizeOptionalText,
  normalizePhone,
  normalizeTagList,
} from "@/services/imports/normalize-import-values";
import { readCsvDocument } from "@/services/imports/read-csv";

export function parseClientsCsv(
  csvText: string,
): RevoryCsvParseResult<
  RevoryClientCsvRawRow,
  RevoryClientParsedRow,
  RevoryClientNormalizedRow
> {
  const document = readCsvDocument<RevoryClientCsvColumn>(csvText);
  const validRows: Array<{
    lineNumber: number;
    normalizedRow: RevoryClientNormalizedRow;
    parsedRow: RevoryClientParsedRow;
    rawRow: RevoryClientCsvRawRow;
    warnings: string[];
  }> = [];
  const invalidRows: Array<{
    lineNumber: number;
    parsedRow: RevoryClientParsedRow;
    rawRow: RevoryClientCsvRawRow;
    reasons: string[];
  }> = [];
  const warnings: RevoryCsvParserWarning[] = [];

  document.rows.forEach((row) => {
    if (!row.hasUsefulData) {
      return;
    }

    const rawRow: RevoryClientCsvRawRow = {
      lineNumber: row.lineNumber,
      values: row.values,
    };
    const parsedRow: RevoryClientParsedRow = {
      email: row.values.email ?? null,
      externalId: row.values.external_id ?? null,
      fullName: row.values.full_name ?? null,
      lastVisitAt: row.values.last_visit_at ?? null,
      notes: row.values.notes ?? null,
      phone: row.values.phone ?? null,
      tags: row.values.tags ?? null,
      totalVisits: row.values.total_visits ?? null,
    };
    const rowReasons: string[] = [];
    const rowWarnings: string[] = [];

    const fullName = normalizeName(parsedRow.fullName);
    const externalId = normalizeOptionalText(parsedRow.externalId);
    const email = normalizeEmail(parsedRow.email);
    const phone = normalizePhone(parsedRow.phone);
    const lastVisitAt = normalizeDate(parsedRow.lastVisitAt);
    const totalVisits = normalizeInteger(parsedRow.totalVisits);
    const tags = normalizeTagList(parsedRow.tags);
    const notes = normalizeOptionalText(parsedRow.notes);

    if (!fullName) {
      rowReasons.push("Client full name could not be normalized.");
    } else if (parsedRow.fullName && parsedRow.fullName !== fullName) {
      const message = `Line ${row.lineNumber} had full_name normalized for whitespace consistency.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_name",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (!externalId && !email && !phone) {
      rowReasons.push("No usable client identifier remained after normalization.");
      warnings.push({
        code: "missing_usable_identifier",
        lineNumber: row.lineNumber,
        message: `Line ${row.lineNumber} does not keep a usable client identifier after normalization.`,
      });
    }

    if (parsedRow.email && !email) {
      const message = `Line ${row.lineNumber} contains an email value that could not be normalized.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_email",
        lineNumber: row.lineNumber,
        message,
      });
    } else if (parsedRow.email && email && parsedRow.email !== email) {
      const message = `Line ${row.lineNumber} had email normalized to lowercase.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_email",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.phone && !phone) {
      const message = `Line ${row.lineNumber} contains a phone value that could not be normalized.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_phone",
        lineNumber: row.lineNumber,
        message,
      });
    } else if (parsedRow.phone && phone && parsedRow.phone !== phone) {
      const message = `Line ${row.lineNumber} had phone normalized to a digits-focused format.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_phone",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.lastVisitAt && lastVisitAt === null) {
      const message = `Line ${row.lineNumber} contains a last_visit_at value that could not be normalized and will stay empty.`;
      rowWarnings.push(message);
      warnings.push({
        code: "invalid_optional_date",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.totalVisits && totalVisits === null) {
      const message = `Line ${row.lineNumber} contains a total_visits value that could not be normalized and will stay empty.`;
      rowWarnings.push(message);
      warnings.push({
        code: "invalid_total_visits",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (rowReasons.length > 0 || !fullName) {
      invalidRows.push({
        lineNumber: row.lineNumber,
        parsedRow,
        rawRow,
        reasons: rowReasons,
      });
      return;
    }

    validRows.push({
      lineNumber: row.lineNumber,
      normalizedRow: {
        email,
        externalId,
        fullName,
        lastVisitAt,
        notes,
        phone,
        tags,
        totalVisits,
      },
      parsedRow,
      rawRow,
      warnings: rowWarnings,
    });
  });

  return {
    invalidRowCount: invalidRows.length,
    invalidRows,
    validRowCount: validRows.length,
    validRows,
    warnings,
  };
}
