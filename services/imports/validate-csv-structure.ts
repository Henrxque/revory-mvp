import {
  revoryAppointmentsCsvStructureSchema,
  revoryClientsCsvStructureSchema,
} from "@/schemas/imports/csv-structure";
import { readCsvDocument } from "@/services/imports/read-csv";
import type {
  RevoryCsvColumn,
  RevoryCsvStructureSchema,
  RevoryCsvStructuralValidationResult,
  RevoryCsvTemplateKey,
  RevoryCsvValidationIssue,
} from "@/types/imports";

const structureSchemas: Record<
  RevoryCsvTemplateKey,
  RevoryCsvStructureSchema<RevoryCsvColumn>
> = {
  appointments: revoryAppointmentsCsvStructureSchema,
  clients: revoryClientsCsvStructureSchema,
};

function isValidIsoDate(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return false;
  }

  const parsedDate = new Date(normalizedValue);

  return !Number.isNaN(parsedDate.getTime());
}

function buildIssue(
  issue: Omit<RevoryCsvValidationIssue, "severity"> & {
    severity: RevoryCsvValidationIssue["severity"];
  },
) {
  return issue;
}

export function validateCsvStructure(
  csvText: string,
  templateKey: RevoryCsvTemplateKey,
): RevoryCsvStructuralValidationResult {
  const normalizedText = csvText.replace(/^\uFEFF/, "");
  const schema = structureSchemas[templateKey];
  const errors: RevoryCsvValidationIssue[] = [];
  const warnings: RevoryCsvValidationIssue[] = [];

  if (!normalizedText.trim()) {
    errors.push(
      buildIssue({
        code: "file_empty",
        message: "The CSV file is empty. Add a header row and at least one usable data row.",
        severity: "error",
      }),
    );

    return {
      accepted: false,
      detectedRowCount: 0,
      errors,
      headerColumns: [],
      usefulRowCount: 0,
      warnings,
    };
  }

  const document = readCsvDocument(normalizedText);
  const headerColumns = document.headerColumns;
  const dataLines = document.rows;
  const missingRequiredColumns = schema.requiredColumns.filter(
    (column) => !headerColumns.includes(column),
  );

  if (missingRequiredColumns.length > 0) {
    errors.push(
      buildIssue({
        code: "missing_required_columns",
        message: `Missing required columns: ${missingRequiredColumns.join(", ")}.`,
        severity: "error",
      }),
    );
  }

  let usefulRowCount = 0;
  let emptyDataRowCount = 0;

  dataLines.forEach((row) => {
    const lineNumber = row.lineNumber;
    const rowValuesByColumn = row.values;

    if (!row.hasUsefulData) {
      emptyDataRowCount += 1;
      return;
    }

    usefulRowCount += 1;

    schema.requiredColumns.forEach((column) => {
      const value = rowValuesByColumn[column] ?? "";

      if (!value.trim()) {
        errors.push(
          buildIssue({
            code: "missing_required_value",
            column,
            lineNumber,
            message: `Line ${lineNumber} is missing a value for required column "${column}".`,
            severity: "error",
          }),
        );
      }
    });

    if (schema.atLeastOneOf && schema.atLeastOneOf.length > 0) {
      const hasIdentifier = schema.atLeastOneOf.some((column) => {
        const value = rowValuesByColumn[column] ?? "";
        return value.trim().length > 0;
      });

      if (!hasIdentifier) {
        errors.push(
          buildIssue({
            code: "missing_identifier",
            lineNumber,
            message: `Line ${lineNumber} must include at least one identifier from: ${schema.atLeastOneOf.join(", ")}.`,
            severity: "error",
          }),
        );
      }
    }

    schema.requiredDateColumns?.forEach((column) => {
      const value = rowValuesByColumn[column] ?? "";

      if (value.trim() && !isValidIsoDate(value)) {
        errors.push(
          buildIssue({
            code: "invalid_date",
            column,
            lineNumber,
            message: `Line ${lineNumber} has an invalid date in essential column "${column}". Use ISO 8601.`,
            severity: "error",
          }),
        );
      }
    });

    schema.optionalDateColumns?.forEach((column) => {
      const value = rowValuesByColumn[column] ?? "";

      if (value.trim() && !isValidIsoDate(value)) {
        warnings.push(
          buildIssue({
            code: "invalid_date",
            column,
            lineNumber,
            message: `Line ${lineNumber} has an invalid date in "${column}". This row may need correction before parsing.`,
            severity: "warning",
          }),
        );
      }
    });
  });

  if (dataLines.length === 0 || usefulRowCount === 0) {
    errors.push(
      buildIssue({
        code: "file_empty",
        message: "The CSV file does not contain any usable data rows after the header.",
        severity: "error",
      }),
    );
  }

  if (emptyDataRowCount > 0) {
    warnings.push(
      buildIssue({
        code: "empty_data_rows",
        message: `${emptyDataRowCount} row(s) were ignored because they do not contain useful data.`,
        severity: "warning",
      }),
    );
  }

  return {
    accepted: errors.length === 0,
    detectedRowCount: dataLines.length,
    errors,
    headerColumns,
    usefulRowCount,
    warnings,
  };
}
