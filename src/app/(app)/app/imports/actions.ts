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
import { requestAiCsvTriage } from "@/services/imports/ai-csv-triage";
import type { CsvCanonicalField } from "@/services/imports/csv-column-mapping";
import { buildDeterministicCsvMappingFallback } from "@/services/imports/csv-mapping-fallback";
import { parseCsvByTemplate } from "@/services/imports/parse-csv-by-template";
import { persistCsvImport } from "@/services/imports/persist-csv-import";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import {
  getSavedCsvMappingForHeaders,
  saveConfirmedCsvMapping,
} from "@/services/imports/saved-csv-mapping";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";
import { buildFirstLeakRead } from "@/services/revenue-leaks/build-first-leak-read";
import { getRevenueLeakReadForWorkspace } from "@/services/revenue-leaks/get-revenue-leak-read";
import { syncRevenueLeaksForWorkspace } from "@/services/revenue-leaks/sync-revenue-leaks";
import type {
  RevoryAssistedImportConfirmationDraft,
  RevoryCsvColumn,
  RevoryCsvTemplateKey,
  RevoryCsvTriageReviewState,
  RevoryCsvUploadActionState,
} from "@/types/imports";

const canonicalFieldToTemplateColumn: Record<
  RevoryCsvTemplateKey,
  Partial<Record<CsvCanonicalField, RevoryCsvColumn>>
> = {
  appointments: {
    appointmentExternalId: "appointment_external_id",
    appointmentStatus: "status",
    bookedAt: "booked_at",
    canceledAt: "canceled_at",
    clientEmail: "client_email",
    clientExternalId: "client_external_id",
    clientName: "client_full_name",
    clientPhone: "client_phone",
    estimatedRevenue: "estimated_revenue",
    providerName: "provider_name",
    scheduledAt: "scheduled_at",
    serviceName: "service_name",
  },
  clients: {
    clientEmail: "email",
    clientExternalId: "external_id",
    clientName: "full_name",
    clientPhone: "phone",
    lastVisitAt: "last_visit_at",
    notes: "notes",
    tags: "tags",
    totalVisits: "total_visits",
  },
};
const CSV_TRIAGE_WINDOW_MS = 1000 * 60 * 10;

function getExpectedDatasetType(templateKey: RevoryCsvTemplateKey) {
  return templateKey === "appointments" ? "APPOINTMENTS" : "CLIENTS";
}

function buildTemplateMapping(
  templateKey: RevoryCsvTemplateKey,
  columnMapping: Readonly<Record<string, string>>,
) {
  const fieldMap = canonicalFieldToTemplateColumn[templateKey];

  return Object.fromEntries(
    Object.entries(columnMapping).map(([sourceHeader, canonicalField]) => [
      sourceHeader,
      canonicalField === "UNMAPPED"
        ? null
        : fieldMap[canonicalField as CsvCanonicalField] ?? null,
    ]),
  ) as Record<string, RevoryCsvColumn | null>;
}

function getSupportedLeaksForSavedMapping(
  templateKey: RevoryCsvTemplateKey,
  preview: ReturnType<typeof buildAssistedImportPreview>,
) {
  if (templateKey !== "appointments" || !preview.canImport) {
    return [];
  }

  return [
    "NO_SHOW_REVENUE",
    "CANCELED_NOT_RECOVERED",
    "STALE_BOOKED_PROOF",
  ];
}

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

export async function triageCsvFileAction(
  formData: FormData,
): Promise<RevoryCsvTriageReviewState> {
  try {
    const appContext = await getAppContext();

    if (!appContext) {
      return {
        columnMapping: {},
        confidence: "LOW",
        detectedDatasetType: "UNKNOWN",
        errorMessage: "Sign in again before reviewing this file.",
        importSupported: false,
        mappingConfidence: 0,
        matchesSelectedTemplate: false,
        missingFields: [],
        mode: "DETERMINISTIC_FALLBACK",
        probableSourceFormat: null,
        qualityScore: 0,
        qualityState: "BLOCKED",
        reviewRequired: true,
        status: "error",
        supportedLeaks: [],
        warnings: [],
      };
    }

    if (!appContext.activationSetup.isCompleted) {
      return {
        columnMapping: {},
        confidence: "LOW",
        detectedDatasetType: "UNKNOWN",
        errorMessage: "Finish workspace activation before reviewing import data.",
        importSupported: false,
        mappingConfidence: 0,
        matchesSelectedTemplate: false,
        missingFields: [],
        mode: "DETERMINISTIC_FALLBACK",
        probableSourceFormat: null,
        qualityScore: 0,
        qualityState: "BLOCKED",
        reviewRequired: true,
        status: "error",
        supportedLeaks: [],
        warnings: [],
      };
    }

    const rateLimit = checkRateLimit({
      key: `csv-triage:${appContext.workspace.id}`,
      limit: 20,
      windowMs: CSV_TRIAGE_WINDOW_MS,
    });

    if (rateLimit.limited) {
      return {
        columnMapping: {},
        confidence: "LOW",
        detectedDatasetType: "UNKNOWN",
        errorMessage: "Too many CSV reviews in a short window. Wait a few minutes and try again.",
        importSupported: false,
        mappingConfidence: 0,
        matchesSelectedTemplate: false,
        missingFields: [],
        mode: "DETERMINISTIC_FALLBACK",
        probableSourceFormat: null,
        qualityScore: 0,
        qualityState: "BLOCKED",
        reviewRequired: true,
        status: "error",
        supportedLeaks: [],
        warnings: [],
      };
    }

    const templateKeyValue = formData.get("templateKey");
    const fileValue = formData.get("file");

    if (
      typeof templateKeyValue !== "string" ||
      !isTemplateKey(templateKeyValue) ||
      !(fileValue instanceof File) ||
      fileValue.size === 0
    ) {
      return {
        columnMapping: {},
        confidence: "LOW",
        detectedDatasetType: "UNKNOWN",
        errorMessage: "Choose a valid CSV file for review.",
        importSupported: false,
        mappingConfidence: 0,
        matchesSelectedTemplate: false,
        missingFields: [],
        mode: "DETERMINISTIC_FALLBACK",
        probableSourceFormat: null,
        qualityScore: 0,
        qualityState: "BLOCKED",
        reviewRequired: true,
        status: "error",
        supportedLeaks: [],
        warnings: [],
      };
    }

    if (
      getFileExtension(fileValue.name) !== REVORY_CSV_ALLOWED_EXTENSION ||
      fileValue.size > REVORY_CSV_MAX_FILE_SIZE_BYTES
    ) {
      return {
        columnMapping: {},
        confidence: "LOW",
        detectedDatasetType: "UNKNOWN",
        errorMessage: "Use a CSV file within the current REVORY file limit.",
        importSupported: false,
        mappingConfidence: 0,
        matchesSelectedTemplate: false,
        missingFields: [],
        mode: "DETERMINISTIC_FALLBACK",
        probableSourceFormat: null,
        qualityScore: 0,
        qualityState: "BLOCKED",
        reviewRequired: true,
        status: "error",
        supportedLeaks: [],
        warnings: [],
      };
    }

    const csvText = await fileValue.text();
    const deterministic = buildDeterministicCsvMappingFallback(csvText);
    const savedMapping = await getSavedCsvMappingForHeaders({
      headers: deterministic.profile.columns,
      templateKey: templateKeyValue,
      workspaceId: appContext.workspace.id,
    });
    const triage = await requestAiCsvTriage({
      deterministic,
      encoding: null,
    });
    const fallbackUsed = triage.warnings.some((warning) =>
      warning.includes("deterministic mapping fallback"),
    );
    const expectedDatasetType = getExpectedDatasetType(templateKeyValue);
    const savedMappingPreview = savedMapping
      ? buildAssistedImportPreview(
          templateKeyValue,
          deterministic.profile.columns,
          savedMapping,
        )
      : null;
    const detectedDatasetType = savedMapping
      ? expectedDatasetType
      : triage.detectedDatasetType;
    const matchesSelectedTemplate =
      savedMappingPreview?.canImport === true ||
      triage.detectedDatasetType === expectedDatasetType;
    const delimiterSupported =
      deterministic.profile.delimiter === ",";
    const warnings = [...triage.warnings];

    if (savedMapping) {
      warnings.unshift(
        "A previously confirmed mapping matches the current columns. Review it before importing.",
      );
    }

    if (!matchesSelectedTemplate) {
      warnings.unshift(
        `This ${templateKeyValue} lane expects ${expectedDatasetType}, but REVORY detected ${detectedDatasetType}.`,
      );
    }

    if (!delimiterSupported) {
      warnings.unshift(
        `REVORY detected this file structure, but current import requires comma-separated CSV. Re-export this file with commas before importing.`,
      );
    }

    return {
      columnMapping:
        savedMapping ??
        buildTemplateMapping(
          templateKeyValue,
          triage.columnMapping,
        ),
      confidence: savedMapping ? "HIGH" : triage.confidence,
      detectedDatasetType,
      importSupported:
        (savedMappingPreview?.canImport ??
          deterministic.dataQuality.importSupported) &&
        matchesSelectedTemplate &&
        delimiterSupported,
      mappingConfidence: savedMapping
        ? 100
        : deterministic.mappingConfidence,
      matchesSelectedTemplate,
      missingFields: savedMappingPreview
        ? [
            ...savedMappingPreview.missingRequiredColumns,
            ...(savedMappingPreview.missingIdentityPath
              ? savedMappingPreview.identityColumns
              : []),
          ]
        : triage.missingFields,
      mode: savedMapping
        ? "SAVED_MAPPING"
        : fallbackUsed
          ? "DETERMINISTIC_FALLBACK"
          : "AI_ASSISTED",
      probableSourceFormat: triage.probableSourceFormat,
      qualityScore: deterministic.dataQuality.qualityScore,
      qualityState: savedMappingPreview?.canImport
        ? delimiterSupported
          ? "REVIEW_REQUIRED"
          : "BLOCKED"
        : matchesSelectedTemplate
          ? delimiterSupported
            ? deterministic.dataQuality.state
            : "BLOCKED"
          : "BLOCKED",
      reviewRequired: true,
      status: "ready",
      supportedLeaks: savedMappingPreview
        ? getSupportedLeaksForSavedMapping(
            templateKeyValue,
            savedMappingPreview,
          )
        : triage.supportedLeaks,
      warnings: [...new Set(warnings)].slice(0, 8),
    };
  } catch (error) {
    console.error("REVORY CSV triage failed.", error);

    return {
      columnMapping: {},
      confidence: "LOW",
      detectedDatasetType: "UNKNOWN",
      errorMessage:
        "REVORY could not finish the file review. The local mapping remains available.",
      importSupported: false,
      mappingConfidence: 0,
      matchesSelectedTemplate: false,
      missingFields: [],
      mode: "DETERMINISTIC_FALLBACK",
      probableSourceFormat: null,
      qualityScore: 0,
      qualityState: "REVIEW_REQUIRED",
      reviewRequired: true,
      status: "error",
      supportedLeaks: [],
      warnings: [],
    };
  }
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
          "Your REVORY session expired before the clinic data update could finish. Sign in again and retry the current file.",
        requiresReauth: true,
        status: "error",
      };
    }

    if (!appContext.activationSetup.isCompleted) {
      return {
        message: "Finish workspace activation before updating clinic data visibility.",
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

    if (!mappingDecisionDraft) {
      return {
        message:
          "Review and confirm the final mapping before importing this file.",
        status: "error",
      };
    }

    const originalCsvText = await fileValue.text();
    const mappingBlockingMessage = buildMappingConfirmationBlockingMessage(
      templateKeyValue,
      originalCsvText,
      mappingDecisionDraft,
    );

    if (mappingBlockingMessage) {
      return {
        message: mappingBlockingMessage,
        status: "error",
      };
    }

    const csvText = createMappedCsvText(
      templateKeyValue,
      originalCsvText,
      buildAssistedImportMappingFromConfirmationDraft(
        templateKeyValue,
        mappingDecisionDraft,
      ),
    );
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
    let mappingSaveWarning: string | null = null;
    let firstLeakReadWarning: string | null = null;
    let firstLeakRead: RevoryCsvUploadActionState["firstLeakRead"];

    if (persistenceResult.successRows > 0) {
      try {
        await syncRevenueLeaksForWorkspace({
          workspaceId: appContext.workspace.id,
        });
        firstLeakRead = buildFirstLeakRead(
          await getRevenueLeakReadForWorkspace(appContext.workspace.id),
        );
      } catch (error) {
        console.error("REVORY could not complete the post-import leak read.", error);
        firstLeakReadWarning =
          "The import completed, but the first leak read could not refresh. Open the dashboard and run the read again.";
      }

      try {
        const mappingSaved = await saveConfirmedCsvMapping({
          dataSourceId: dataSource.id,
          draft: mappingDecisionDraft,
          headers: extractDetectedCsvHeaders(originalCsvText),
          templateKey: templateKeyValue,
        });

        if (!mappingSaved) {
          mappingSaveWarning =
            "The import completed, but this mapping was not saved for reuse.";
        }
      } catch (error) {
        console.error("REVORY could not save the confirmed CSV mapping.", error);
        mappingSaveWarning =
          "The import completed, but this mapping was not saved for reuse.";
      }
    }

    revalidatePath("/app/imports");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/revenue-leaks");

    const errorRows = persistenceResult.errorRows.slice(0, 3);
    const hasPartialErrors = persistenceResult.errorRows.length > 0;

    return {
      fileName: dataSource.lastImportFileName ?? fileValue.name,
      failedRows: errorRows,
      firstLeakRead,
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
      mappingExecutionSummary:
        buildAssistedImportExecutionMappingSummary(mappingDecisionDraft),
      message: hasPartialErrors
        ? "Clinic data visibility updated with partial row rejection. Review the rows that still need correction."
        : "Clinic data visibility updated successfully using the confirmed mapping for this file.",
      importedAt: dataSource.lastImportedAt?.toISOString() ?? new Date().toISOString(),
      status: persistenceResult.finalStatus,
      warnings: formatIssuesForUi([
        ...combinedWarnings,
        ...(mappingSaveWarning ? [mappingSaveWarning] : []),
        ...(firstLeakReadWarning ? [firstLeakReadWarning] : []),
      ]),
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
