import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  buildAssistedImportConfirmationDraft,
  buildAssistedImportMappingFromConfirmationDraft,
  buildAssistedImportPayloadFromCsv,
  createMappedCsvText,
} from "@/services/imports/build-assisted-import-payload";
import { parseCsvByTemplate } from "@/services/imports/parse-csv-by-template";
import { persistCsvImport } from "@/services/imports/persist-csv-import";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";

const prisma = new PrismaClient();
const projectRoot = "C:/Users/hriqu/Documents/revory-mvp";
const fixturesDir = path.join(projectRoot, ".tmp", "qa-fixtures-sprint3");
const outputPath = path.join(projectRoot, ".tmp", "qa-sprint3-etapa5-backend.json");
const email = "revory-sprint3-qa-1774208521272+clerk_test@example.com";

async function resolveWorkspace() {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error(`Local user not found for ${email}.`);
  }

  const workspace = await prisma.workspace.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      ownerUserId: user.id,
    },
  });

  if (!workspace) {
    throw new Error(`Workspace not found for ${email}.`);
  }

  return {
    user,
    workspace,
  };
}

async function getSnapshot(workspaceId) {
  const [appointments, clients, dataSources] = await Promise.all([
    prisma.appointment.count({
      where: {
        workspaceId,
      },
    }),
    prisma.client.count({
      where: {
        workspaceId,
      },
    }),
    prisma.dataSource.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        lastImportError: true,
        lastImportErrorRowCount: true,
        lastImportFileName: true,
        lastImportRowCount: true,
        lastImportSuccessRowCount: true,
        name: true,
        status: true,
      },
      where: {
        workspaceId,
      },
    }),
  ]);

  return {
    appointments,
    clients,
    dataSources,
  };
}

async function runImportScenario({
  fileName,
  label,
  templateKey,
  workspaceId,
}) {
  const filePath = path.join(fixturesDir, fileName);
  const originalCsv = fs.readFileSync(filePath, "utf8");
  const payload = buildAssistedImportPayloadFromCsv(templateKey, originalCsv);
  const draft = buildAssistedImportConfirmationDraft(payload.preview, payload.preview);
  const mappedCsv = createMappedCsvText(
    templateKey,
    originalCsv,
    buildAssistedImportMappingFromConfirmationDraft(templateKey, draft),
  );
  const validationResult = validateCsvStructure(mappedCsv, templateKey);

  if (!validationResult.accepted) {
    return {
      fileName,
      label,
      status: "blocked",
      validationErrors: validationResult.errors.map((issue) => issue.message),
    };
  }

  const parseResult = parseCsvByTemplate(mappedCsv, templateKey);
  const dataSource = await registerCsvUploadMetadata({
    fileName,
    fileSizeBytes: Buffer.byteLength(originalCsv, "utf8"),
    mimeType: "text/csv",
    parseSummary: {
      invalidRowCount: parseResult.invalidRowCount,
      validRowCount: parseResult.validRowCount,
      warnings: parseResult.warnings.map((warning) => warning.message),
    },
    rowCount: validationResult.detectedRowCount,
    templateKey,
    validationSummary: {
      errors: validationResult.errors.map((issue) => issue.message),
      warnings: validationResult.warnings.map((issue) => issue.message),
    },
    workspaceId,
  });
  const persistResult = await persistCsvImport({
    dataSourceId: dataSource.id,
    parseResult,
    templateKey,
    warnings: [
      ...validationResult.warnings.map((issue) => issue.message),
      ...parseResult.warnings.map((warning) => warning.message),
    ],
    workspaceId,
  });

  return {
    fileName,
    importResult: persistResult,
    label,
    preview: {
      canImport: payload.preview.canImport,
      exactTemplateMatch: payload.preview.exactTemplateMatch,
      matchedWithConfidenceCount: payload.preview.matchedWithConfidenceCount,
      missingIdentityPath: payload.preview.missingIdentityPath,
      missingRequiredColumns: payload.preview.missingRequiredColumns,
      suggestedCount: payload.preview.suggestedCount,
      unresolvedCount: payload.preview.unresolvedCount,
    },
    snapshot: await getSnapshot(workspaceId),
    status: "imported",
  };
}

function runPreviewScenario({ fileName, label, templateKey }) {
  const filePath = path.join(fixturesDir, fileName);
  const originalCsv = fs.readFileSync(filePath, "utf8");
  const payload = buildAssistedImportPayloadFromCsv(templateKey, originalCsv);
  const draft = buildAssistedImportConfirmationDraft(payload.preview, payload.preview);

  return {
    fileName,
    label,
    preview: {
      canImport: payload.preview.canImport,
      duplicateSourceHeaders: payload.preview.duplicateSourceHeaders,
      duplicateTargets: payload.preview.duplicateTargets,
      exactTemplateMatch: payload.preview.exactTemplateMatch,
      matchedWithConfidenceCount: payload.preview.matchedWithConfidenceCount,
      missingIdentityPath: draft.missingIdentityPath,
      missingRequiredColumns: draft.missingRequiredColumns,
      suggestedPendingConfirmationCount: draft.suggestedPendingConfirmationCount,
      totalHeaderCount: payload.preview.totalHeaderCount,
      unresolvedCount: payload.preview.unresolvedCount,
    },
    status: "previewed",
  };
}

function runValidationScenario({ fileName, label, templateKey }) {
  const filePath = path.join(fixturesDir, fileName);
  const originalCsv = fs.readFileSync(filePath, "utf8");
  const validationResult = validateCsvStructure(originalCsv, templateKey);

  return {
    fileName,
    label,
    status: validationResult.accepted ? "accepted" : "blocked",
    validation: {
      accepted: validationResult.accepted,
      detectedRowCount: validationResult.detectedRowCount,
      errors: validationResult.errors.map((issue) => issue.message),
      usefulRowCount: validationResult.usefulRowCount,
      warnings: validationResult.warnings.map((issue) => issue.message),
    },
  };
}

const { user, workspace } = await resolveWorkspace();
const results = {
  email,
  generatedAt: new Date().toISOString(),
  scenarios: [],
  userId: user.id,
  workspaceId: workspace.id,
};

results.scenarios.push(
  runPreviewScenario({
    fileName: "appointments-official-exact.csv",
    label: "regression.official-appointments.preview",
    templateKey: "appointments",
  }),
);
results.scenarios.push(
  await runImportScenario({
    fileName: "appointments-official-exact.csv",
    label: "regression.official-appointments.import",
    templateKey: "appointments",
    workspaceId: workspace.id,
  }),
);
results.scenarios.push(
  await runImportScenario({
    fileName: "clients-official-exact.csv",
    label: "regression.official-clients.import",
    templateKey: "clients",
    workspaceId: workspace.id,
  }),
);
results.scenarios.push(
  runPreviewScenario({
    fileName: "appointments-assisted-compatible.csv",
    label: "sprint3.assisted-compatible.preview",
    templateKey: "appointments",
  }),
);
results.scenarios.push(
  await runImportScenario({
    fileName: "appointments-assisted-compatible.csv",
    label: "sprint3.assisted-compatible.import",
    templateKey: "appointments",
    workspaceId: workspace.id,
  }),
);
results.scenarios.push(
  await runImportScenario({
    fileName: "appointments-extra-columns.csv",
    label: "sprint3.extra-columns.import",
    templateKey: "appointments",
    workspaceId: workspace.id,
  }),
);
results.scenarios.push(
  runPreviewScenario({
    fileName: "appointments-missing-required.csv",
    label: "sprint3.block-missing-required.preview",
    templateKey: "appointments",
  }),
);
results.scenarios.push(
  runPreviewScenario({
    fileName: "appointments-duplicate-headers.csv",
    label: "sprint3.block-duplicate-headers.preview",
    templateKey: "appointments",
  }),
);
results.scenarios.push(
  runValidationScenario({
    fileName: "appointments-empty.csv",
    label: "sprint3.block-empty.validation",
    templateKey: "appointments",
  }),
);
results.scenarios.push(
  runValidationScenario({
    fileName: "appointments-malformed-quote.csv",
    label: "sprint3.block-malformed.validation",
    templateKey: "appointments",
  }),
);

results.finalSnapshot = await getSnapshot(workspace.id);

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(outputPath);

await prisma.$disconnect();
