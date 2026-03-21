import "server-only";

import { DataSourceStatus, Prisma, type DataSource } from "@prisma/client";

import { prisma } from "@/db/prisma";

type FinalizeCsvImportInput = {
  createdAppointmentCount: number;
  createdClientCount: number;
  dataSourceId: string;
  errorMessage?: string | null;
  errorRows: Array<{
    lineNumber: number;
    reasons: string[];
  }>;
  parseWarnings: readonly string[];
  persistedAppointmentCount: number;
  persistedClientCount: number;
  successRows: number;
  totalRows: number;
  updatedAppointmentCount: number;
  updatedClientCount: number;
};

function resolveFinalStatus({
  errorRows,
  successRows,
}: Pick<FinalizeCsvImportInput, "errorRows" | "successRows">) {
  if (successRows > 0) {
    return DataSourceStatus.IMPORTED;
  }

  if (errorRows.length > 0) {
    return DataSourceStatus.ERROR;
  }

  return DataSourceStatus.PENDING;
}

export async function finalizeCsvImport({
  createdAppointmentCount,
  createdClientCount,
  dataSourceId,
  errorMessage = null,
  errorRows,
  parseWarnings,
  persistedAppointmentCount,
  persistedClientCount,
  successRows,
  totalRows,
  updatedAppointmentCount,
  updatedClientCount,
}: FinalizeCsvImportInput): Promise<DataSource> {
  const completedAt = new Date();
  const finalStatus = resolveFinalStatus({
    errorRows,
    successRows,
  });

  const existingSource = await prisma.dataSource.findUnique({
    where: {
      id: dataSourceId,
    },
    select: {
      configJson: true,
    },
  });

  const currentConfig =
    existingSource?.configJson && typeof existingSource.configJson === "object"
      ? (existingSource.configJson as Prisma.JsonObject)
      : {};

  const configJson: Prisma.InputJsonValue = {
    ...currentConfig,
    lastImportResult: {
      completedAt: completedAt.toISOString(),
      createdAppointmentCount,
      createdClientCount,
      errorRows: errorRows.slice(0, 10),
      parseWarnings: [...parseWarnings],
      persistedAppointmentCount,
      persistedClientCount,
      successRows,
      totalRows,
      updatedAppointmentCount,
      updatedClientCount,
    },
  };

  return prisma.dataSource.update({
    data: {
      configJson,
      lastImportCompletedAt: completedAt,
      lastImportError: errorMessage,
      lastImportErrorRowCount: errorRows.length,
      lastImportRowCount: totalRows,
      lastImportSuccessRowCount: successRows,
      status: finalStatus,
    },
    where: {
      id: dataSourceId,
    },
  });
}
