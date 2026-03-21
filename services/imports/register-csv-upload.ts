import "server-only";

import {
  DataSourceStatus,
  DataSourceType,
  type DataSource,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { RevoryCsvTemplateKey } from "@/types/imports";

const csvImportSourceNames: Record<RevoryCsvTemplateKey, string> = {
  appointments: "appointments-csv-upload",
  clients: "clients-csv-upload",
};

const csvImportSourceTypes: Record<RevoryCsvTemplateKey, DataSourceType> = {
  appointments: DataSourceType.APPOINTMENTS_CSV,
  clients: DataSourceType.CLIENTS_CSV,
};

type RegisterCsvUploadInput = {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string | null;
  templateKey: RevoryCsvTemplateKey;
  workspaceId: string;
};

export async function registerCsvUploadMetadata({
  fileName,
  fileSizeBytes,
  mimeType,
  templateKey,
  workspaceId,
}: RegisterCsvUploadInput): Promise<DataSource> {
  const receivedAt = new Date();
  const configJson: Prisma.InputJsonValue = {
    lastUpload: {
      fileName,
      fileSizeBytes,
      mimeType,
      receivedAt: receivedAt.toISOString(),
      templateKey,
    },
  };

  return prisma.dataSource.upsert({
    where: {
      workspaceId_name: {
        workspaceId,
        name: csvImportSourceNames[templateKey],
      },
    },
    update: {
      type: csvImportSourceTypes[templateKey],
      status: DataSourceStatus.PENDING,
      lastImportedAt: receivedAt,
      lastImportFileName: fileName,
      lastImportRowCount: 0,
      lastImportError: null,
      configJson,
    },
    create: {
      workspaceId,
      name: csvImportSourceNames[templateKey],
      type: csvImportSourceTypes[templateKey],
      status: DataSourceStatus.PENDING,
      lastImportedAt: receivedAt,
      lastImportFileName: fileName,
      lastImportRowCount: 0,
      lastImportError: null,
      configJson,
    },
  });
}
