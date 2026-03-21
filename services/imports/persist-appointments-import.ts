import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { persistImportedClient } from "@/services/imports/persist-import-client";
import type {
  RevoryAppointmentCsvRawRow,
  RevoryAppointmentNormalizedRow,
  RevoryAppointmentParsedRow,
  RevoryCsvParseResult,
} from "@/types/imports";

type PersistAppointmentsImportInput = {
  dataSourceId: string;
  parseResult: RevoryCsvParseResult<
    RevoryAppointmentCsvRawRow,
    RevoryAppointmentParsedRow,
    RevoryAppointmentNormalizedRow
  >;
  workspaceId: string;
};

type PersistAppointmentsImportResult = {
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

function buildAppointmentUpdateData(
  clientId: string,
  dataSourceId: string,
  row: RevoryAppointmentNormalizedRow,
): Prisma.AppointmentUpdateInput {
  return {
    client: {
      connect: {
        id: clientId,
      },
    },
    dataSource: {
      connect: {
        id: dataSourceId,
      },
    },
    status: row.status,
    scheduledAt: row.scheduledAt,
    ...(row.serviceName
      ? {
          serviceName: row.serviceName,
        }
      : {}),
    ...(row.providerName
      ? {
          providerName: row.providerName,
        }
      : {}),
    ...(row.bookedAt
      ? {
          bookedAt: row.bookedAt,
        }
      : {}),
    ...(row.canceledAt
      ? {
          canceledAt: row.canceledAt,
        }
      : {}),
    ...(row.locationName
      ? {
          locationName: row.locationName,
        }
      : {}),
    ...(row.sourceNotes
      ? {
          sourceNotes: row.sourceNotes,
        }
      : {}),
    ...(typeof row.estimatedRevenue === "number"
      ? {
          estimatedRevenue: row.estimatedRevenue,
        }
      : {}),
  };
}

function buildAppointmentCreateData(
  clientId: string,
  dataSourceId: string,
  row: RevoryAppointmentNormalizedRow,
  workspaceId: string,
): Prisma.AppointmentCreateInput {
  return {
    workspace: {
      connect: {
        id: workspaceId,
      },
    },
    client: {
      connect: {
        id: clientId,
      },
    },
    dataSource: {
      connect: {
        id: dataSourceId,
      },
    },
    externalId: row.appointmentExternalId,
    status: row.status,
    scheduledAt: row.scheduledAt,
    bookedAt: row.bookedAt ?? null,
    canceledAt: row.canceledAt ?? null,
    serviceName: row.serviceName,
    providerName: row.providerName,
    locationName: row.locationName,
    sourceNotes: row.sourceNotes,
    estimatedRevenue: row.estimatedRevenue,
  };
}

async function findExistingAppointmentForImport(
  tx: Prisma.TransactionClient,
  clientId: string,
  row: RevoryAppointmentNormalizedRow,
  workspaceId: string,
) {
  const existingByExternalId = await tx.appointment.findUnique({
    where: {
      workspaceId_externalId: {
        externalId: row.appointmentExternalId,
        workspaceId,
      },
    },
  });

  if (existingByExternalId) {
    return existingByExternalId;
  }

  return tx.appointment.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      clientId,
      scheduledAt: row.scheduledAt,
      serviceName: row.serviceName,
      workspaceId,
    },
  });
}

export async function persistAppointmentsImport({
  dataSourceId,
  parseResult,
  workspaceId,
}: PersistAppointmentsImportInput): Promise<PersistAppointmentsImportResult> {
  const createdAppointmentIds = new Set<string>();
  const createdClientIds = new Set<string>();
  const touchedAppointmentIds = new Set<string>();
  const touchedClientIds = new Set<string>();
  const updatedAppointmentIds = new Set<string>();
  const updatedClientIds = new Set<string>();
  const errorRows = parseResult.invalidRows.map((row) => ({
    lineNumber: row.lineNumber,
    reasons: row.reasons,
  }));
  let successRows = 0;

  for (const row of parseResult.validRows) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const persistedClient = await persistImportedClient(tx, {
          dataSourceId,
          email: row.normalizedRow.clientEmail,
          externalId: row.normalizedRow.clientExternalId,
          fullName: row.normalizedRow.clientFullName,
          phone: row.normalizedRow.clientPhone,
          workspaceId,
        });
        const existingAppointment = await findExistingAppointmentForImport(
          tx,
          persistedClient.client.id,
          row.normalizedRow,
          workspaceId,
        );
        const appointment = existingAppointment
          ? await tx.appointment.update({
              data: buildAppointmentUpdateData(
                persistedClient.client.id,
                dataSourceId,
                row.normalizedRow,
              ),
              where: {
                id: existingAppointment.id,
              },
            })
          : await tx.appointment.create({
              data: buildAppointmentCreateData(
                persistedClient.client.id,
                dataSourceId,
                row.normalizedRow,
                workspaceId,
              ),
            });

        return {
          appointmentId: appointment.id,
          appointmentOperation: existingAppointment ? "updated" : "created",
          clientId: persistedClient.client.id,
          clientOperation: persistedClient.operation,
        };
      });

      successRows += 1;
      touchedAppointmentIds.add(result.appointmentId);
      touchedClientIds.add(result.clientId);

      if (result.clientOperation === "created") {
        createdClientIds.add(result.clientId);
      } else if (!createdClientIds.has(result.clientId)) {
        updatedClientIds.add(result.clientId);
      }

      if (result.appointmentOperation === "created") {
        createdAppointmentIds.add(result.appointmentId);
      } else if (!createdAppointmentIds.has(result.appointmentId)) {
        updatedAppointmentIds.add(result.appointmentId);
      }
    } catch (error) {
      errorRows.push({
        lineNumber: row.lineNumber,
        reasons: [
          error instanceof Error
            ? error.message
            : "The appointment row could not be persisted.",
        ],
      });
    }
  }

  return {
    createdAppointmentCount: createdAppointmentIds.size,
    createdClientCount: createdClientIds.size,
    errorRows,
    persistedAppointmentCount: touchedAppointmentIds.size,
    persistedClientCount: touchedClientIds.size,
    successRows,
    updatedAppointmentCount: updatedAppointmentIds.size,
    updatedClientCount: updatedClientIds.size,
  };
}
