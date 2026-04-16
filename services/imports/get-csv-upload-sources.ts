import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { DataSource } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { csvUploadSourceNames } from "@/services/imports/csv-upload-source-config";
import type { RevoryCsvTemplateKey } from "@/types/imports";

type CsvUploadSourceSignal = Pick<DataSource, "lastImportSuccessRowCount" | "status">;

function reviveDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function reviveSource(source: DataSource | null) {
  if (!source) {
    return null;
  }

  return {
    ...source,
    lastImportedAt: reviveDate(source.lastImportedAt),
    lastImportCompletedAt: reviveDate(source.lastImportCompletedAt),
    lastSyncAt: reviveDate(source.lastSyncAt),
  };
}

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

const getCsvUploadSourcesCached = unstable_cache(async (
  workspaceId: string,
): Promise<Record<RevoryCsvTemplateKey, DataSource | null>> => {
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
}, ["csv-upload-sources"], {
  revalidate: 10,
});

export const getCsvUploadSources = cache(async (
  workspaceId: string,
): Promise<Record<RevoryCsvTemplateKey, DataSource | null>> =>
  {
    const sources = await getCsvUploadSourcesCached(workspaceId);

    return {
      appointments: reviveSource(sources.appointments),
      clients: reviveSource(sources.clients),
    };
  });
