import "server-only";

import {
  DataSourceStatus,
  type DataSource,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  csvUploadSourceNames,
  csvUploadSourceTypes,
} from "@/services/imports/csv-upload-source-config";
import type { RevoryCsvTemplateKey } from "@/types/imports";

type RegisterCsvUploadInput = {
  errorMessage?: string | null;
  errorRowCount?: number;
  fileName: string;
  fileSizeBytes: number;
  importCompletedAt?: Date | null;
  mimeType: string | null;
  parseSummary?: {
    invalidRowCount: number;
    validRowCount: number;
    warnings: readonly string[];
  };
  rowCount?: number;
  successRowCount?: number;
  status?: DataSourceStatus;
  templateKey: RevoryCsvTemplateKey;
  validationSummary?: {
    errors: readonly string[];
    warnings: readonly string[];
  };
  workspaceId: string;
};

export async function registerCsvUploadMetadata({
  errorMessage = null,
  errorRowCount = 0,
  fileName,
  fileSizeBytes,
  importCompletedAt = null,
  mimeType,
  parseSummary,
  rowCount = 0,
  successRowCount = 0,
  status = DataSourceStatus.PENDING,
  templateKey,
  validationSummary,
  workspaceId,
}: RegisterCsvUploadInput): Promise<DataSource> {
  const receivedAt = new Date();
  const configJson: Prisma.InputJsonValue = {
    lastUpload: {
      fileName,
      fileSizeBytes,
      mimeType,
      parseSummary,
      receivedAt: receivedAt.toISOString(),
      templateKey,
      validationSummary,
    },
  };

  return prisma.dataSource.upsert({
    where: {
      workspaceId_name: {
        workspaceId,
        name: csvUploadSourceNames[templateKey],
      },
    },
    update: {
      type: csvUploadSourceTypes[templateKey],
      status,
      lastImportedAt: receivedAt,
      lastImportCompletedAt: importCompletedAt,
      lastImportFileName: fileName,
      lastImportRowCount: rowCount,
      lastImportSuccessRowCount: successRowCount,
      lastImportErrorRowCount: errorRowCount,
      lastImportError: errorMessage,
      configJson,
    },
    create: {
      workspaceId,
      name: csvUploadSourceNames[templateKey],
      type: csvUploadSourceTypes[templateKey],
      status,
      lastImportedAt: receivedAt,
      lastImportCompletedAt: importCompletedAt,
      lastImportFileName: fileName,
      lastImportRowCount: rowCount,
      lastImportSuccessRowCount: successRowCount,
      lastImportErrorRowCount: errorRowCount,
      lastImportError: errorMessage,
      configJson,
    },
  });
}
