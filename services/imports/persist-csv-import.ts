import "server-only";

import type {
  RevoryAppointmentCsvRawRow,
  RevoryAppointmentNormalizedRow,
  RevoryAppointmentParsedRow,
  RevoryClientCsvRawRow,
  RevoryClientNormalizedRow,
  RevoryClientParsedRow,
  RevoryCsvParseResult,
} from "@/types/imports";
import { finalizeCsvImport } from "@/services/imports/finalize-csv-import";
import { persistAppointmentsImport } from "@/services/imports/persist-appointments-import";
import { persistClientsImport } from "@/services/imports/persist-clients-import";

type PersistCsvImportInput = {
  dataSourceId: string;
  parseResult:
    | RevoryCsvParseResult<
        RevoryAppointmentCsvRawRow,
        RevoryAppointmentParsedRow,
        RevoryAppointmentNormalizedRow
      >
    | RevoryCsvParseResult<
        RevoryClientCsvRawRow,
        RevoryClientParsedRow,
        RevoryClientNormalizedRow
      >;
  templateKey: "appointments" | "clients";
  warnings: readonly string[];
  workspaceId: string;
};

export type PersistCsvImportResult = {
  createdAppointmentCount: number;
  createdClientCount: number;
  errorRows: Array<{
    lineNumber: number;
    reasons: string[];
  }>;
  finalStatus: "error" | "imported";
  persistedAppointmentCount: number;
  persistedClientCount: number;
  successRows: number;
  totalRows: number;
  updatedAppointmentCount: number;
  updatedClientCount: number;
};

export async function persistCsvImport({
  dataSourceId,
  parseResult,
  templateKey,
  warnings,
  workspaceId,
}: PersistCsvImportInput): Promise<PersistCsvImportResult> {
  const totalRows = parseResult.validRowCount + parseResult.invalidRowCount;
  const persistenceResult =
    templateKey === "appointments"
      ? await persistAppointmentsImport({
          dataSourceId,
          parseResult: parseResult as RevoryCsvParseResult<
            RevoryAppointmentCsvRawRow,
            RevoryAppointmentParsedRow,
            RevoryAppointmentNormalizedRow
          >,
          workspaceId,
        })
      : await persistClientsImport({
          dataSourceId,
          parseResult: parseResult as RevoryCsvParseResult<
            RevoryClientCsvRawRow,
            RevoryClientParsedRow,
            RevoryClientNormalizedRow
          >,
          workspaceId,
        });
  const errorMessage =
    persistenceResult.errorRows.length > 0
      ? `${persistenceResult.errorRows.length} row(s) could not be imported.`
      : null;
  const dataSource = await finalizeCsvImport({
    createdAppointmentCount: persistenceResult.createdAppointmentCount,
    createdClientCount: persistenceResult.createdClientCount,
    dataSourceId,
    errorMessage,
    errorRows: persistenceResult.errorRows,
    parseWarnings: warnings,
    persistedAppointmentCount: persistenceResult.persistedAppointmentCount,
    persistedClientCount: persistenceResult.persistedClientCount,
    successRows: persistenceResult.successRows,
    totalRows,
    updatedAppointmentCount: persistenceResult.updatedAppointmentCount,
    updatedClientCount: persistenceResult.updatedClientCount,
  });

  return {
    createdAppointmentCount: persistenceResult.createdAppointmentCount,
    createdClientCount: persistenceResult.createdClientCount,
    errorRows: persistenceResult.errorRows,
    finalStatus: dataSource.status === "IMPORTED" ? "imported" : "error",
    persistedAppointmentCount: persistenceResult.persistedAppointmentCount,
    persistedClientCount: persistenceResult.persistedClientCount,
    successRows: persistenceResult.successRows,
    totalRows,
    updatedAppointmentCount: persistenceResult.updatedAppointmentCount,
    updatedClientCount: persistenceResult.updatedClientCount,
  };
}
