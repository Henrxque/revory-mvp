import "server-only";

import type { DataSource } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { csvUploadSourceNames } from "@/services/imports/csv-upload-source-config";
import type { RevoryCsvTemplateKey } from "@/types/imports";

type CsvUploadSourceSignal = Pick<DataSource, "lastImportSuccessRowCount" | "status">;

export function hasLiveCsvUploadSource(source: CsvUploadSourceSignal | null) {
  if (!source) {
    return false;
  }

  return (
    (source.lastImportSuccessRowCount ?? 0) > 0 ||
    source.status === "IMPORTED" ||
    source.status === "CONNECTED"
  );
}

export async function getCsvUploadSources(
  workspaceId: string,
): Promise<Record<RevoryCsvTemplateKey, DataSource | null>> {
  const sources = await prisma.dataSource.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      name: {
        in: Object.values(csvUploadSourceNames),
      },
      workspaceId,
    },
  });

  const appointmentsSource =
    sources.find((source) => source.name === csvUploadSourceNames.appointments) ?? null;
  const clientsSource =
    sources.find((source) => source.name === csvUploadSourceNames.clients) ?? null;

  return {
    appointments: appointmentsSource,
    clients: clientsSource,
  };
}
