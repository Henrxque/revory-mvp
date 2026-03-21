"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DataSourceStatus } from "@prisma/client";

import {
  REVORY_CSV_ALLOWED_EXTENSION,
  REVORY_CSV_MAX_FILE_SIZE_BYTES,
} from "@/lib/imports/csv-upload";
import { getAppContext } from "@/services/app/get-app-context";
import { parseCsvByTemplate } from "@/services/imports/parse-csv-by-template";
import { persistCsvImport } from "@/services/imports/persist-csv-import";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import type {
  RevoryCsvTemplateKey,
  RevoryCsvUploadActionState,
} from "@/types/imports";

const initialUploadState: RevoryCsvUploadActionState = {
  status: "idle",
};

function isTemplateKey(value: string): value is RevoryCsvTemplateKey {
  return value === "appointments" || value === "clients";
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function formatIssuesForUi(messages: readonly string[]) {
  return [...new Set(messages)].slice(0, 3);
}

export async function uploadCsvFile(
  _previousState: RevoryCsvUploadActionState,
  formData: FormData,
): Promise<RevoryCsvUploadActionState> {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  if (!appContext.activationSetup.isCompleted) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const templateKeyValue = formData.get("templateKey");
  const fileValue = formData.get("file");

  if (typeof templateKeyValue !== "string" || !isTemplateKey(templateKeyValue)) {
    return {
      message: "Select a valid REVORY CSV import type before uploading.",
      status: "error",
    };
  }

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return {
      message: "Choose a CSV file before continuing.",
      status: "error",
    };
  }

  if (getFileExtension(fileValue.name) !== REVORY_CSV_ALLOWED_EXTENSION) {
    return {
      message: "Upload a file with the .csv extension.",
      status: "error",
    };
  }

  if (fileValue.size > REVORY_CSV_MAX_FILE_SIZE_BYTES) {
    return {
      message: "The CSV file is larger than the current REVORY upload limit.",
      status: "error",
    };
  }

  const csvText = await fileValue.text();
  const validationResult = validateCsvStructure(csvText, templateKeyValue);

  if (!validationResult.accepted) {
    const blockingMessages = formatIssuesForUi(
      validationResult.errors.map((issue) => issue.message),
    );

    await registerCsvUploadMetadata({
      errorMessage: blockingMessages.join(" "),
      fileName: fileValue.name,
      fileSizeBytes: fileValue.size,
      importCompletedAt: new Date(),
      mimeType: fileValue.type || null,
      rowCount: validationResult.detectedRowCount,
      errorRowCount: validationResult.usefulRowCount,
      successRowCount: 0,
      status: DataSourceStatus.ERROR,
      templateKey: templateKeyValue,
      validationSummary: {
        errors: validationResult.errors.map((issue) => issue.message),
        warnings: validationResult.warnings.map((issue) => issue.message),
      },
      workspaceId: appContext.workspace.id,
    });

    revalidatePath("/app/imports");
    revalidatePath("/app/dashboard");

    return {
      message: blockingMessages.join(" "),
      status: "error",
      warnings: formatIssuesForUi(
        validationResult.warnings.map((issue) => issue.message),
      ),
    };
  }

  const parseResult = parseCsvByTemplate(csvText, templateKeyValue);
  const parserWarnings = parseResult.warnings.map((warning) => warning.message);
  const combinedWarnings = formatIssuesForUi([
    ...validationResult.warnings.map((issue) => issue.message),
    ...parserWarnings,
  ]);

  const dataSource = await registerCsvUploadMetadata({
    fileName: fileValue.name,
    fileSizeBytes: fileValue.size,
    mimeType: fileValue.type || null,
    parseSummary: {
      invalidRowCount: parseResult.invalidRowCount,
      validRowCount: parseResult.validRowCount,
      warnings: parserWarnings,
    },
    rowCount: validationResult.detectedRowCount,
    successRowCount: 0,
    templateKey: templateKeyValue,
    validationSummary: {
      errors: validationResult.errors.map((issue) => issue.message),
      warnings: validationResult.warnings.map((issue) => issue.message),
    },
    workspaceId: appContext.workspace.id,
  });
  const persistenceResult = await persistCsvImport({
    dataSourceId: dataSource.id,
    parseResult,
    templateKey: templateKeyValue,
    warnings: combinedWarnings,
    workspaceId: appContext.workspace.id,
  });

  revalidatePath("/app/imports");
  revalidatePath("/app/dashboard");

  const errorRows = persistenceResult.errorRows.slice(0, 3);
  const hasPartialErrors = persistenceResult.errorRows.length > 0;

  return {
    fileName: dataSource.lastImportFileName ?? fileValue.name,
    failedRows: errorRows,
    importSummary: {
      createdAppointmentCount: persistenceResult.createdAppointmentCount,
      createdClientCount: persistenceResult.createdClientCount,
      errorRows: persistenceResult.errorRows.length,
      persistedAppointmentCount: persistenceResult.persistedAppointmentCount,
      persistedClientCount: persistenceResult.persistedClientCount,
      successRows: persistenceResult.successRows,
      totalRows: persistenceResult.totalRows,
      updatedAppointmentCount: persistenceResult.updatedAppointmentCount,
      updatedClientCount: persistenceResult.updatedClientCount,
    },
    message: hasPartialErrors
      ? "CSV imported with partial row rejection. Review the rows that still need correction."
      : "CSV imported successfully for this REVORY source.",
    importedAt: dataSource.lastImportedAt?.toISOString() ?? new Date().toISOString(),
    status: persistenceResult.finalStatus,
    warnings: combinedWarnings,
  };
}

export { initialUploadState };
