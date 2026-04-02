"use server";

import { revalidatePath } from "next/cache";
import { DataSourceStatus } from "@prisma/client";

import {
  REVORY_CSV_ALLOWED_EXTENSION,
  REVORY_CSV_MAX_FILE_SIZE_BYTES,
} from "@/lib/imports/csv-upload";
import { getAppContext } from "@/services/app/get-app-context";
import {
  buildAssistedImportExecutionMappingSummary,
  buildAssistedImportMappingFromConfirmationDraft,
  buildAssistedImportPreview,
  createMappedCsvText,
  extractDetectedCsvHeaders,
  formatImportColumnLabel,
} from "@/services/imports/build-assisted-import-payload";
import { parseCsvByTemplate } from "@/services/imports/parse-csv-by-template";
import { persistCsvImport } from "@/services/imports/persist-csv-import";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";
import type {
  RevoryAssistedImportConfirmationDraft,
  RevoryCsvTemplateKey,
  RevoryCsvUploadActionState,
} from "@/types/imports";

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

function isMappingDecisionDraft(
  value: unknown,
): value is RevoryAssistedImportConfirmationDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RevoryAssistedImportConfirmationDraft>;

  return (
    typeof candidate.canProceed === "boolean" &&
    Array.isArray(candidate.decisions) &&
    Array.isArray(candidate.duplicateSourceHeaders) &&
    Array.isArray(candidate.duplicateTargets) &&
    typeof candidate.keptConfidentMatchCount === "number" &&
    typeof candidate.mappedByUserCount === "number" &&
    typeof candidate.missingIdentityPath === "boolean" &&
    Array.isArray(candidate.missingRequiredColumns) &&
    typeof candidate.requiredMatchedCount === "number" &&
    typeof candidate.requiredTotalCount === "number" &&
    typeof candidate.suggestedPendingConfirmationCount === "number" &&
    (candidate.templateKey === "appointments" || candidate.templateKey === "clients") &&
    typeof candidate.unmappedCount === "number" &&
    candidate.decisions.every((decision) => {
      if (!decision || typeof decision !== "object") {
        return false;
      }

      const candidateDecision = decision as Record<string, unknown>;

      return (
        typeof candidateDecision.sourceHeader === "string" &&
        typeof candidateDecision.normalizedSourceHeader === "string" &&
        typeof candidateDecision.systemReason === "string" &&
        typeof candidateDecision.systemReasonCode === "string" &&
        typeof candidateDecision.systemConfidence === "string" &&
        typeof candidateDecision.systemMatchStatus === "string" &&
        typeof candidateDecision.decisionState === "string" &&
        (candidateDecision.finalTargetColumn === null ||
          typeof candidateDecision.finalTargetColumn === "string") &&
        (candidateDecision.systemSuggestedColumn === null ||
          typeof candidateDecision.systemSuggestedColumn === "string")
      );
    })
  );
}

function parseMappingDecisionDraft(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    return isMappingDecisionDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildMappingConfirmationBlockingMessage(
  templateKey: RevoryCsvTemplateKey,
  csvText: string,
  draft: RevoryAssistedImportConfirmationDraft,
) {
  if (draft.templateKey !== templateKey) {
    return "REVORY could not confirm the final mapping for this CSV type.";
  }

  const confirmedMapping = buildAssistedImportMappingFromConfirmationDraft(
    templateKey,
    draft,
  );
  const confirmedPreview = buildAssistedImportPreview(
    templateKey,
    extractDetectedCsvHeaders(csvText),
    confirmedMapping,
  );

  if (confirmedPreview.duplicateSourceHeaders.length > 0) {
    return `Remove duplicate source headers before continuing: ${confirmedPreview.duplicateSourceHeaders.join(
      ", ",
    )}.`;
  }

  if (confirmedPreview.duplicateTargets.length > 0) {
    return `Choose only one source column for ${confirmedPreview.duplicateTargets
      .map((column) => formatImportColumnLabel(column))
      .join(", ")}.`;
  }

  if (confirmedPreview.missingRequiredColumns.length > 0) {
    return `Map the required fields before continuing: ${confirmedPreview.missingRequiredColumns
      .map((column) => formatImportColumnLabel(column))
      .join(", ")}.`;
  }

  if (confirmedPreview.missingIdentityPath) {
    return "Map at least one client identifier before continuing.";
  }

  return null;
}

export async function uploadCsvFile(
  _previousState: RevoryCsvUploadActionState,
  formData: FormData,
): Promise<RevoryCsvUploadActionState> {
  try {
    const appContext = await getAppContext();

    if (!appContext) {
      return {
        message:
          "Your REVORY session expired before the visibility update could finish. Sign in again and retry the current file.",
        requiresReauth: true,
        status: "error",
      };
    }

    if (!appContext.activationSetup.isCompleted) {
      return {
        message: "Finish workspace activation before updating booked visibility.",
        status: "error",
      };
    }

    const templateKeyValue = formData.get("templateKey");
    const fileValue = formData.get("file");
    const rawMappingDecisionDraft = formData.get("mappingDecisionDraft");
    const mappingDecisionDraft = parseMappingDecisionDraft(rawMappingDecisionDraft);

    if (typeof templateKeyValue !== "string" || !isTemplateKey(templateKeyValue)) {
      return {
        message: "Select a valid REVORY CSV input before continuing.",
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
        message: "Use a file with the .csv extension.",
        status: "error",
      };
    }

    if (fileValue.size > REVORY_CSV_MAX_FILE_SIZE_BYTES) {
      return {
        message: "The CSV file is larger than the current REVORY file limit.",
        status: "error",
      };
    }

    if (rawMappingDecisionDraft && !mappingDecisionDraft) {
      return {
        message: "REVORY could not confirm the final mapping for this file.",
        status: "error",
      };
    }

    const originalCsvText = await fileValue.text();
    const mappingBlockingMessage = mappingDecisionDraft
      ? buildMappingConfirmationBlockingMessage(
          templateKeyValue,
          originalCsvText,
          mappingDecisionDraft,
        )
      : null;

    if (mappingBlockingMessage) {
      return {
        message: mappingBlockingMessage,
        status: "error",
      };
    }

    const csvText = mappingDecisionDraft
      ? createMappedCsvText(
          templateKeyValue,
          originalCsvText,
          buildAssistedImportMappingFromConfirmationDraft(
            templateKeyValue,
            mappingDecisionDraft,
          ),
        )
      : originalCsvText;
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
      mappingExecutionSummary: mappingDecisionDraft
        ? buildAssistedImportExecutionMappingSummary(mappingDecisionDraft)
        : undefined,
      message: hasPartialErrors
        ? "Booked visibility updated with partial row rejection. Review the rows that still need correction."
        : mappingDecisionDraft
          ? "Booked visibility updated successfully using the confirmed mapping for this file."
          : "Booked visibility updated successfully for this file.",
      importedAt: dataSource.lastImportedAt?.toISOString() ?? new Date().toISOString(),
      status: persistenceResult.finalStatus,
      warnings: combinedWarnings,
    };
  } catch (error) {
    console.error("REVORY import execution failed.", error);

    return {
      message:
        "REVORY could not finish this visibility update right now. Refresh the session and retry the current file.",
      status: "error",
    };
  }
}
