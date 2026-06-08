import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getRevoryCsvTemplateColumns } from "@/lib/imports/csv-template-definitions";
import { csvUploadSourceNames } from "@/services/imports/csv-upload-source-config";
import type {
  RevoryAssistedImportConfirmationDraft,
  RevoryAssistedImportMapping,
  RevoryCsvColumn,
  RevoryCsvTemplateKey,
} from "@/types/imports";

const SAVED_MAPPING_VERSION = 1;

type SavedCsvMappingRecord = {
  confirmedAt: string;
  headerSignature: string;
  mapping: Record<string, RevoryCsvColumn | null>;
  templateKey: RevoryCsvTemplateKey;
  version: typeof SAVED_MAPPING_VERSION;
};

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildNormalizedHeaderMap(headers: readonly string[]) {
  const entries = headers.map((header) => [normalizeHeader(header), header] as const);
  const normalizedHeaders = entries.map(([normalized]) => normalized);

  if (
    normalizedHeaders.some((header) => header.length === 0) ||
    new Set(normalizedHeaders).size !== normalizedHeaders.length
  ) {
    return null;
  }

  return new Map(entries);
}

function buildHeaderSignature(normalizedHeaders: readonly string[]) {
  return [...normalizedHeaders].sort().join("|");
}

function parseSavedMapping(
  configJson: Prisma.JsonValue | null,
): SavedCsvMappingRecord | null {
  if (!isJsonObject(configJson)) {
    return null;
  }

  const value = configJson.lastConfirmedMapping;

  if (!isJsonObject(value) || !isJsonObject(value.mapping)) {
    return null;
  }

  if (
    value.version !== SAVED_MAPPING_VERSION ||
    (value.templateKey !== "appointments" && value.templateKey !== "clients") ||
    typeof value.confirmedAt !== "string" ||
    typeof value.headerSignature !== "string"
  ) {
    return null;
  }

  const mapping = Object.fromEntries(
    Object.entries(value.mapping).flatMap(([sourceHeader, targetColumn]) => {
      if (targetColumn === null || typeof targetColumn === "string") {
        return [[sourceHeader, targetColumn]];
      }

      return [];
    }),
  ) as Record<string, RevoryCsvColumn | null>;

  return {
    confirmedAt: value.confirmedAt,
    headerSignature: value.headerSignature,
    mapping,
    templateKey: value.templateKey,
    version: SAVED_MAPPING_VERSION,
  };
}

export async function getSavedCsvMappingForHeaders(input: {
  headers: readonly string[];
  templateKey: RevoryCsvTemplateKey;
  workspaceId: string;
}): Promise<RevoryAssistedImportMapping | null> {
  const currentHeaders = buildNormalizedHeaderMap(input.headers);

  if (!currentHeaders) {
    return null;
  }

  const source = await prisma.dataSource.findUnique({
    select: {
      configJson: true,
    },
    where: {
      workspaceId_name: {
        name: csvUploadSourceNames[input.templateKey],
        workspaceId: input.workspaceId,
      },
    },
  });
  const savedMapping = parseSavedMapping(source?.configJson ?? null);
  const currentHeaderSignature = buildHeaderSignature([...currentHeaders.keys()]);

  if (
    !savedMapping ||
    savedMapping.templateKey !== input.templateKey ||
    savedMapping.headerSignature !== currentHeaderSignature
  ) {
    return null;
  }

  const validTargets = new Set<RevoryCsvColumn>(
    getRevoryCsvTemplateColumns(input.templateKey),
  );
  const mapping: RevoryAssistedImportMapping = {};

  for (const [normalizedHeader, currentHeader] of currentHeaders) {
    if (!(normalizedHeader in savedMapping.mapping)) {
      return null;
    }

    const targetColumn = savedMapping.mapping[normalizedHeader];

    if (targetColumn !== null && !validTargets.has(targetColumn)) {
      return null;
    }

    mapping[currentHeader] = targetColumn;
  }

  return mapping;
}

export async function saveConfirmedCsvMapping(input: {
  dataSourceId: string;
  draft: RevoryAssistedImportConfirmationDraft;
  headers: readonly string[];
  templateKey: RevoryCsvTemplateKey;
}) {
  const normalizedHeaders = buildNormalizedHeaderMap(input.headers);

  if (
    !normalizedHeaders ||
    !input.draft.canProceed ||
    input.draft.templateKey !== input.templateKey
  ) {
    return false;
  }

  const validTargets = new Set<RevoryCsvColumn>(
    getRevoryCsvTemplateColumns(input.templateKey),
  );
  const decisionsByHeader = new Map(
    input.draft.decisions.map((decision) => [
      normalizeHeader(decision.sourceHeader),
      decision.finalTargetColumn,
    ]),
  );
  const mapping: Record<string, RevoryCsvColumn | null> = {};

  for (const normalizedHeader of normalizedHeaders.keys()) {
    if (!decisionsByHeader.has(normalizedHeader)) {
      return false;
    }

    const targetColumn = decisionsByHeader.get(normalizedHeader) ?? null;

    if (targetColumn !== null && !validTargets.has(targetColumn)) {
      return false;
    }

    mapping[normalizedHeader] = targetColumn;
  }

  const source = await prisma.dataSource.findUnique({
    select: {
      configJson: true,
    },
    where: {
      id: input.dataSourceId,
    },
  });

  if (!source) {
    return false;
  }

  const currentConfig = isJsonObject(source.configJson)
    ? source.configJson
    : {};
  const savedMapping = {
    confirmedAt: new Date().toISOString(),
    headerSignature: buildHeaderSignature([...normalizedHeaders.keys()]),
    mapping,
    templateKey: input.templateKey,
    version: SAVED_MAPPING_VERSION,
  } satisfies SavedCsvMappingRecord;

  await prisma.dataSource.update({
    data: {
      configJson: {
        ...currentConfig,
        lastConfirmedMapping: savedMapping,
      },
    },
    where: {
      id: input.dataSourceId,
    },
  });

  return true;
}
