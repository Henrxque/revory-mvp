import "server-only";

import { DataSourceType, type DataSource } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { RevoryCsvTemplateKey } from "@/types/imports";

export async function getCsvUploadSources(
  workspaceId: string,
): Promise<Record<RevoryCsvTemplateKey, DataSource | null>> {
  const sources = await prisma.dataSource.findMany({
    where: {
      workspaceId,
      type: {
        in: [DataSourceType.APPOINTMENTS_CSV, DataSourceType.CLIENTS_CSV],
      },
    },
  });

  const appointmentsSource =
    sources.find((source) => source.type === DataSourceType.APPOINTMENTS_CSV) ?? null;
  const clientsSource =
    sources.find((source) => source.type === DataSourceType.CLIENTS_CSV) ?? null;

  return {
    appointments: appointmentsSource,
    clients: clientsSource,
  };
}
