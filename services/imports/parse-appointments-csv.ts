import type {
  RevoryAppointmentCsvColumn,
  RevoryAppointmentCsvRawRow,
  RevoryAppointmentNormalizedRow,
  RevoryAppointmentParsedRow,
  RevoryCsvParseResult,
  RevoryCsvParserWarning,
} from "@/types/imports";
import {
  normalizeAppointmentStatus,
  normalizeDate,
  normalizeEmail,
  normalizeEstimatedRevenue,
  normalizeName,
  normalizeOptionalText,
  normalizePhone,
} from "@/services/imports/normalize-import-values";
import { readCsvDocument } from "@/services/imports/read-csv";

function buildWarning(message: string, lineNumber: number): RevoryCsvParserWarning {
  return {
    code: "normalized_name",
    lineNumber,
    message,
  };
}

export function parseAppointmentsCsv(
  csvText: string,
): RevoryCsvParseResult<
  RevoryAppointmentCsvRawRow,
  RevoryAppointmentParsedRow,
  RevoryAppointmentNormalizedRow
> {
  const document = readCsvDocument<RevoryAppointmentCsvColumn>(csvText);
  const validRows: Array<{
    lineNumber: number;
    normalizedRow: RevoryAppointmentNormalizedRow;
    parsedRow: RevoryAppointmentParsedRow;
    rawRow: RevoryAppointmentCsvRawRow;
    warnings: string[];
  }> = [];
  const invalidRows: Array<{
    lineNumber: number;
    parsedRow: RevoryAppointmentParsedRow;
    rawRow: RevoryAppointmentCsvRawRow;
    reasons: string[];
  }> = [];
  const warnings: RevoryCsvParserWarning[] = [];

  document.rows.forEach((row) => {
    if (!row.hasUsefulData) {
      return;
    }

    const rawRow: RevoryAppointmentCsvRawRow = {
      lineNumber: row.lineNumber,
      values: row.values,
    };
    const parsedRow: RevoryAppointmentParsedRow = {
      appointmentExternalId: row.values.appointment_external_id ?? null,
      bookedAt: row.values.booked_at ?? null,
      canceledAt: row.values.canceled_at ?? null,
      clientEmail: row.values.client_email ?? null,
      clientExternalId: row.values.client_external_id ?? null,
      clientFullName: row.values.client_full_name ?? null,
      clientPhone: row.values.client_phone ?? null,
      estimatedRevenue: row.values.estimated_revenue ?? null,
      locationName: row.values.location_name ?? null,
      providerName: row.values.provider_name ?? null,
      scheduledAt: row.values.scheduled_at ?? null,
      serviceName: row.values.service_name ?? null,
      sourceNotes: row.values.source_notes ?? null,
      status: row.values.status ?? null,
    };
    const rowReasons: string[] = [];
    const rowWarnings: string[] = [];

    const appointmentExternalId = normalizeOptionalText(parsedRow.appointmentExternalId);
    const clientFullName = normalizeName(parsedRow.clientFullName);
    const clientExternalId = normalizeOptionalText(parsedRow.clientExternalId);
    const clientEmail = normalizeEmail(parsedRow.clientEmail);
    const clientPhone = normalizePhone(parsedRow.clientPhone);
    const scheduledAt = normalizeDate(parsedRow.scheduledAt);
    const status = normalizeAppointmentStatus(parsedRow.status);
    const serviceName = normalizeOptionalText(parsedRow.serviceName);
    const providerName = normalizeOptionalText(parsedRow.providerName);
    const estimatedRevenue = normalizeEstimatedRevenue(parsedRow.estimatedRevenue);
    const bookedAt = normalizeDate(parsedRow.bookedAt);
    const canceledAt = normalizeDate(parsedRow.canceledAt);
    const locationName = normalizeOptionalText(parsedRow.locationName);
    const sourceNotes = normalizeOptionalText(parsedRow.sourceNotes);

    if (!appointmentExternalId) {
      rowReasons.push("Appointment external ID could not be normalized.");
    }

    if (!clientFullName) {
      rowReasons.push("Client full name could not be normalized.");
    } else if (parsedRow.clientFullName && parsedRow.clientFullName !== clientFullName) {
      const message = `Line ${row.lineNumber} had client_full_name normalized for whitespace consistency.`;
      rowWarnings.push(message);
      warnings.push(buildWarning(message, row.lineNumber));
    }

    if (!scheduledAt) {
      rowReasons.push("Scheduled date could not be normalized.");
    }

    if (!status) {
      rowReasons.push("Appointment status is not supported by the official REVORY contract.");
      warnings.push({
        code: "invalid_appointment_status",
        lineNumber: row.lineNumber,
        message: `Line ${row.lineNumber} contains an unsupported appointment status.`,
      });
    }

    if (!clientExternalId && !clientEmail && !clientPhone) {
      rowReasons.push("No usable client identifier remained after normalization.");
      warnings.push({
        code: "missing_usable_identifier",
        lineNumber: row.lineNumber,
        message: `Line ${row.lineNumber} does not keep a usable client identifier after normalization.`,
      });
    }

    if (parsedRow.clientEmail && !clientEmail) {
      rowWarnings.push(`Line ${row.lineNumber} contains a client_email value that could not be normalized.`);
      warnings.push({
        code: "normalized_email",
        lineNumber: row.lineNumber,
        message: `Line ${row.lineNumber} contains a client_email value that could not be normalized.`,
      });
    } else if (parsedRow.clientEmail && clientEmail && parsedRow.clientEmail !== clientEmail) {
      const message = `Line ${row.lineNumber} had client_email normalized to lowercase.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_email",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.clientPhone && !clientPhone) {
      rowWarnings.push(`Line ${row.lineNumber} contains a client_phone value that could not be normalized.`);
      warnings.push({
        code: "normalized_phone",
        lineNumber: row.lineNumber,
        message: `Line ${row.lineNumber} contains a client_phone value that could not be normalized.`,
      });
    } else if (parsedRow.clientPhone && clientPhone && parsedRow.clientPhone !== clientPhone) {
      const message = `Line ${row.lineNumber} had client_phone normalized to a digits-focused format.`;
      rowWarnings.push(message);
      warnings.push({
        code: "normalized_phone",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.estimatedRevenue && estimatedRevenue === null) {
      const message = `Line ${row.lineNumber} contains an estimated_revenue value that could not be normalized.`;
      rowWarnings.push(message);
      warnings.push({
        code: "invalid_estimated_revenue",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.bookedAt && bookedAt === null) {
      const message = `Line ${row.lineNumber} contains a booked_at value that could not be normalized and will stay empty.`;
      rowWarnings.push(message);
      warnings.push({
        code: "invalid_optional_date",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (parsedRow.canceledAt && canceledAt === null) {
      const message = `Line ${row.lineNumber} contains a canceled_at value that could not be normalized and will stay empty.`;
      rowWarnings.push(message);
      warnings.push({
        code: "invalid_optional_date",
        lineNumber: row.lineNumber,
        message,
      });
    }

    if (rowReasons.length > 0 || !appointmentExternalId || !clientFullName || !scheduledAt || !status) {
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
        appointmentExternalId,
        bookedAt,
        canceledAt,
        clientEmail,
        clientExternalId,
        clientFullName,
        clientPhone,
        estimatedRevenue,
        locationName,
        providerName,
        scheduledAt,
        serviceName,
        sourceNotes,
        status,
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
