import "server-only";

import { prisma } from "@/db/prisma";
import { persistImportedClient } from "@/services/imports/persist-import-client";
import type {
  RevoryClientCsvRawRow,
  RevoryClientNormalizedRow,
  RevoryClientParsedRow,
  RevoryCsvParseResult,
} from "@/types/imports";

type PersistClientsImportInput = {
  dataSourceId: string;
  parseResult: RevoryCsvParseResult<
    RevoryClientCsvRawRow,
    RevoryClientParsedRow,
    RevoryClientNormalizedRow
  >;
  workspaceId: string;
};

type PersistClientsImportResult = {
  createdAppointmentCount: number;
  createdClientCount: number;
  errorRows: Array<{
    lineNumber: number;
    reasons: string[];
  }>;
  persistedAppointmentCount: number;
  persistedClientCount: number;
  successRows: number;
  updatedAppointmentCount: number;
  updatedClientCount: number;
};

export async function persistClientsImport({
  dataSourceId,
  parseResult,
  workspaceId,
}: PersistClientsImportInput): Promise<PersistClientsImportResult> {
  const createdClientIds = new Set<string>();
  const touchedClientIds = new Set<string>();
  const updatedClientIds = new Set<string>();
  const errorRows = parseResult.invalidRows.map((row) => ({
    lineNumber: row.lineNumber,
    reasons: row.reasons,
  }));
  let successRows = 0;

  for (const row of parseResult.validRows) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        return persistImportedClient(tx, {
          dataSourceId,
          email: row.normalizedRow.email,
          externalId: row.normalizedRow.externalId,
          fullName: row.normalizedRow.fullName,
          lastVisitAt: row.normalizedRow.lastVisitAt,
          leadBaseSupport: true,
          notes: row.normalizedRow.notes,
          phone: row.normalizedRow.phone,
          tags: row.normalizedRow.tags,
          totalVisits: row.normalizedRow.totalVisits,
          workspaceId,
        });
      });

      successRows += 1;
      touchedClientIds.add(result.client.id);

      if (result.operation === "created") {
        createdClientIds.add(result.client.id);
      } else if (!createdClientIds.has(result.client.id)) {
        updatedClientIds.add(result.client.id);
      }
    } catch (error) {
      errorRows.push({
        lineNumber: row.lineNumber,
        reasons: [
          error instanceof Error
            ? error.message
            : "The client row could not be persisted.",
        ],
      });
    }
  }

  return {
    createdAppointmentCount: 0,
    createdClientCount: createdClientIds.size,
    errorRows,
    persistedAppointmentCount: 0,
    persistedClientCount: touchedClientIds.size,
    successRows,
    updatedAppointmentCount: 0,
    updatedClientCount: updatedClientIds.size,
  };
}
