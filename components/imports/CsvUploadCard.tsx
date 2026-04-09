"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AssistedImportMappingPreview } from "@/components/imports/AssistedImportMappingPreview";
import { RevoryDecisionSupportCard } from "@/components/ui/RevoryDecisionSupportCard";
import {
  buildAssistedImportConfirmationDraft,
  buildAssistedImportPayloadFromCsv,
  buildAssistedImportPreview,
  formatImportColumnLabel,
  getAssistedImportTargetOptions,
  type AssistedImportPayload,
  type AssistedImportPreview,
} from "@/lib/imports/assisted-import";
import {
  REVORY_CSV_ACCEPT,
  REVORY_CSV_ALLOWED_EXTENSION,
  REVORY_CSV_MAX_FILE_SIZE_BYTES,
  formatUploadSizeLimit,
} from "@/lib/imports/csv-upload";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { buildImportDecisionSupport } from "@/services/decision-support/build-import-decision-support";
import { validateCsvStructure } from "@/services/imports/validate-csv-structure";
import { uploadCsvFile } from "@/src/app/(app)/app/imports/actions";
import {
  initialRevoryCsvUploadActionState,
  type RevoryCsvColumn,
  type RevoryCsvTemplateKey,
  type RevoryCsvUploadActionState,
} from "@/types/imports";

type CsvUploadCardProps = Readonly<{
  helperText: string;
  lastUpload: {
    errorRows: number;
    fileName: string | null;
    importedAt: string | null;
    successRows: number;
    totalRows: number;
    status: string;
  } | null;
  laneSummary: string;
  onActivityChange?: (isActive: boolean) => void;
  templateHref: string;
  templateKey: RevoryCsvTemplateKey;
  templateName: string;
  tone: "primary" | "secondary";
}>;

function TemplateIcon({ templateKey }: Readonly<{ templateKey: RevoryCsvTemplateKey }>) {
  const sharedProps = {
    className: "h-[18px] w-[18px]",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (templateKey === "appointments") {
    return (
      <svg {...sharedProps}>
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function DownloadButtonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function UploadButtonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 16V5" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function ButtonArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

type FlowStepState = "complete" | "current" | "upcoming";
type StatusTone = "accent" | "danger" | "neutral" | "success" | "warning";

function getStatusToneClassName(tone: StatusTone) {
  switch (tone) {
    case "accent":
      return "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.09)] text-[color:var(--accent-light)]";
    case "success":
      return "border-[rgba(46,204,134,0.24)] bg-[rgba(46,204,134,0.1)] text-[color:var(--success)]";
    case "warning":
      return "border-[rgba(245,166,35,0.26)] bg-[rgba(245,166,35,0.1)] text-[color:var(--warning)]";
    case "danger":
      return "border-[rgba(255,114,141,0.34)] bg-[rgba(255,114,141,0.1)] text-[color:var(--danger)]";
    default:
      return "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--text-muted)]";
  }
}

function getHistoricalStatusTone(status: string | null | undefined): StatusTone {
  switch (status?.toLowerCase()) {
    case "imported":
    case "completed":
    case "active":
      return "success";
    case "warning":
      return "warning";
    case "error":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

function getFlowStepToneClassName(state: FlowStepState) {
  switch (state) {
    case "complete":
      return "border-[rgba(46,204,134,0.2)] bg-[rgba(46,204,134,0.08)] text-[color:var(--foreground)]";
    case "current":
      return "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] text-[color:var(--foreground)]";
    default:
      return "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] text-[color:var(--text-muted)]";
  }
}

function formatImportedAt(value: string | null | undefined) {
  if (!value) {
    return "Pass pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getCoveragePercent(lastUpload: CsvUploadCardProps["lastUpload"]) {
  if (!lastUpload || lastUpload.totalRows <= 0) {
    return 0;
  }

  return (lastUpload.successRows / lastUpload.totalRows) * 100;
}

function buildPreviewBlockingMessage(preview: AssistedImportPreview | null) {
  if (!preview) {
    return "Select a CSV file so REVORY can review the headers before updating visibility.";
  }

  if (preview.duplicateSourceHeaders.length > 0) {
    return `Remove duplicate source headers before continuing: ${preview.duplicateSourceHeaders.join(
      ", ",
    )}.`;
  }

  if (preview.duplicateTargets.length > 0) {
    return `Choose only one source column for ${preview.duplicateTargets
      .map((column) => formatImportColumnLabel(column))
      .join(", ")}.`;
  }

  if (preview.missingRequiredColumns.length > 0) {
    return `Map the required fields before continuing: ${preview.missingRequiredColumns
      .map((column) => formatImportColumnLabel(column))
      .join(", ")}.`;
  }

  if (preview.missingIdentityPath) {
    return "Map at least one client identifier before continuing.";
  }

  return null;
}

function formatPreviewValidationMessage(messages: readonly string[]) {
  return [...new Set(messages)].slice(0, 2).join(" ");
}

export function CsvUploadCard({
  helperText,
  lastUpload,
  laneSummary,
  onActivityChange,
  templateHref,
  templateKey,
  templateName,
  tone,
}: CsvUploadCardProps) {
  const [serverState, formAction, isPending] = useActionState(
    uploadCsvFile,
    initialRevoryCsvUploadActionState,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [rawFileText, setRawFileText] = useState<string | null>(null);
  const [assistedPayload, setAssistedPayload] = useState<AssistedImportPayload | null>(null);
  const [mapping, setMapping] = useState<Record<string, RevoryCsvColumn | null>>({});
  const [isConfirmationStepVisible, setIsConfirmationStepVisible] = useState(false);
  const [showServerState, setShowServerState] = useState(false);
  const state = showServerState ? serverState : initialRevoryCsvUploadActionState;
  const coveragePercent = getCoveragePercent(lastUpload);
  const statusState = useMemo<RevoryCsvUploadActionState>(() => {
    if (clientError) {
      return {
        message: clientError,
        status: "error",
      };
    }

    return state;
  }, [clientError, state]);
  const currentPreview = useMemo(() => {
    if (!assistedPayload) {
      return null;
    }

    return buildAssistedImportPreview(
      templateKey,
      assistedPayload.detectedHeaders,
      mapping,
    );
  }, [assistedPayload, mapping, templateKey]);
  const confirmationDraft = useMemo(() => {
    if (!assistedPayload || !currentPreview) {
      return null;
    }

    return buildAssistedImportConfirmationDraft(assistedPayload.preview, currentPreview);
  }, [assistedPayload, currentPreview]);
  const targetOptions = useMemo(
    () => getAssistedImportTargetOptions(templateKey),
    [templateKey],
  );
  const blockingMessage = useMemo(
    () => buildPreviewBlockingMessage(currentPreview),
    [currentPreview],
  );
  const canSubmit = Boolean(
    currentPreview && confirmationDraft && confirmationDraft.canProceed && !blockingMessage,
  );
  const canOpenConfirmation = Boolean(
    currentPreview && confirmationDraft && confirmationDraft.canProceed,
  );
  const cardTitle =
    templateKey === "appointments" ? "Booked proof" : "Lead base";
  const isPrimaryLane = tone === "primary";
  const processSteps = [
    { detail: "Read headers", step: "01" },
    { detail: "Confirm fit", step: "02" },
    { detail: "Make visible", step: "03" },
  ];
  const sessionStage = (() => {
    if (isPending) {
      return { label: "Updating", tone: "accent" as const };
    }

    if (statusState.status === "imported") {
      return { label: "Updated", tone: "success" as const };
    }

    if (statusState.status === "error") {
      return { label: "Needs attention", tone: "danger" as const };
    }

    if (isConfirmationStepVisible) {
      return { label: "Ready to confirm", tone: "accent" as const };
    }

    if (currentPreview && canSubmit) {
      return { label: "Ready", tone: "success" as const };
    }

    if (currentPreview) {
      return { label: "Review pending", tone: "warning" as const };
    }

    if (selectedFileName) {
      return { label: "Reading", tone: "accent" as const };
    }

    return { label: "File pending", tone: "neutral" as const };
  })();
  const hasImportResult = Boolean(statusState.importSummary);
  const hasUploadContext = Boolean(selectedFileName || currentPreview);
  const isFlowActive = Boolean(
    selectedFileName ||
      currentPreview ||
      isConfirmationStepVisible ||
      isPending ||
      hasImportResult,
  );
  const uploadPanelClassName = hasUploadContext
    ? "border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.05),rgba(255,255,255,0.02))]"
    : "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]";
  const shellToneClassName = isPrimaryLane
    ? "border-[rgba(194,9,90,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]"
    : "border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.012))]";
  const primaryActionLabel =
    currentPreview?.exactTemplateMatch ? "Open review" : "Continue review";
  const confirmationActionLabel =
    currentPreview?.exactTemplateMatch
      ? "Confirm and make visible"
      : "Confirm mapping and make visible";
  const latestPassLabel =
    templateKey === "appointments" ? "Latest proof pass" : "Latest support pass";
  const coverageLabel =
    templateKey === "appointments" ? "Proof coverage" : "Lead-base coverage";
  const visibleNowLabel =
    templateKey === "appointments" ? "Proof rows live" : "Rows live";
  const uploadLabel =
    templateKey === "appointments"
      ? "Upload booked appointments file"
      : "Upload lead-base support file";
  const currentUpdateLabel =
    templateKey === "appointments" ? "Current proof pass" : "Current support pass";
  const inProgressLabel =
    templateKey === "appointments"
      ? "Proof update in progress"
      : "Support update in progress";
  const inProgressTitle =
    templateKey === "appointments"
      ? "Validating file and updating booked proof."
      : "Validating file and updating lead-base support.";
  const currentResultTitle =
    templateKey === "appointments"
      ? "Result from the latest proof file."
      : "Result from the latest support file.";
  const templateCtaLabel =
    templateKey === "appointments" ? "Get proof template" : "Get support template";
  const fileReadLabel =
    templateKey === "appointments" ? "Selected proof file" : "Selected support file";
  const currentResultBody =
    templateKey === "appointments"
      ? "This result applies only to the current file."
      : "This result applies only to the current file.";
  const decisionSupportRead = useMemo(
    () =>
      buildImportDecisionSupport({
        confirmationDraft,
        currentPreview,
        lastUpload,
        selectedFileName,
        templateKey,
        uploadState: statusState,
      }),
    [
      confirmationDraft,
      currentPreview,
      lastUpload,
      selectedFileName,
      statusState,
      templateKey,
    ],
  );

  useEffect(() => {
    onActivityChange?.(isFlowActive);
  }, [isFlowActive, onActivityChange]);

  function validateSelectedFile(file: File | null) {
    if (!file) {
      return "Choose a CSV file before continuing.";
    }

    if (!file.name.toLowerCase().endsWith(REVORY_CSV_ALLOWED_EXTENSION)) {
      return "Use a file with the .csv extension.";
    }

    if (file.size > REVORY_CSV_MAX_FILE_SIZE_BYTES) {
      return `The file exceeds the ${formatUploadSizeLimit(REVORY_CSV_MAX_FILE_SIZE_BYTES)} limit.`;
    }

    return null;
  }

  async function buildPreview(file: File) {
    const fileText = await file.text();
    const validationResult = validateCsvStructure(fileText, templateKey);
    const blockingPreviewMessages = validationResult.errors
      .filter(
        (issue) => issue.code === "file_empty" || issue.code === "invalid_structure",
      )
      .map((issue) => issue.message);

    if (blockingPreviewMessages.length > 0) {
      throw new Error(formatPreviewValidationMessage(blockingPreviewMessages));
    }

    const nextPayload = buildAssistedImportPayloadFromCsv(templateKey, fileText);

    setRawFileText(fileText);
    setAssistedPayload(nextPayload);
    setMapping(nextPayload.mapping);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const validationError = validateSelectedFile(file);

    setSelectedFileName(file?.name ?? null);
    setClientError(validationError);
    setIsConfirmationStepVisible(false);
    setShowServerState(false);

    if (!file || validationError) {
      setRawFileText(null);
      setAssistedPayload(null);
      setMapping({});
      return;
    }

    try {
      await buildPreview(file);
      setClientError(null);
    } catch (error) {
      setRawFileText(null);
      setAssistedPayload(null);
      setMapping({});
      setClientError(
        error instanceof Error && error.message
          ? error.message
          : "REVORY could not read this CSV file. Export it again and retry.",
      );
    }
  }

  function handleMappingChange(sourceHeader: string, targetColumnValue: string) {
    setClientError(null);
    setIsConfirmationStepVisible(false);
    setMapping((currentMapping) => ({
      ...currentMapping,
      [sourceHeader]: targetColumnValue ? (targetColumnValue as RevoryCsvColumn) : null,
    }));
  }

  function handleOpenConfirmation() {
    if (blockingMessage) {
      setClientError(blockingMessage);
      return;
    }

    if (!canOpenConfirmation) {
      setClientError("Resolve the mapping blockers before confirming this file.");
      return;
    }

    setClientError(null);
    setIsConfirmationStepVisible(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0] ?? null;
    const validationError = validateSelectedFile(file);

    if (validationError) {
      setClientError(validationError);
      return;
    }

    if (blockingMessage) {
      setClientError(blockingMessage);
      return;
    }

    if (!rawFileText || !file || !currentPreview || !confirmationDraft) {
      setClientError("Select a CSV file so REVORY can prepare the mapping preview.");
      return;
    }

    const formData = new FormData();

    formData.append("templateKey", templateKey);
    formData.append("file", file);
    formData.append("mappingDecisionDraft", JSON.stringify(confirmationDraft));

    setClientError(null);
    setIsConfirmationStepVisible(false);
    setShowServerState(true);

    startTransition(() => {
      void formAction(formData);
    });
  }

  return (
    <section className={`rev-shell-panel relative flex h-full max-w-full min-w-0 flex-col overflow-hidden rounded-[34px] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)] md:p-6 ${shellToneClassName}`}>
      <div
        className={`pointer-events-none absolute top-0 h-40 w-40 rounded-full blur-3xl ${
          templateKey === "appointments"
            ? "-left-10 bg-[rgba(194,9,90,0.14)]"
            : "-right-10 bg-[rgba(224,16,106,0.12)]"
        }`}
      />

      <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rev-kicker">{templateName}</p>
            <span
              className={`rounded-full border px-2.5 py-[0.3rem] text-[9px] font-medium uppercase tracking-[0.15em] ${
                isPrimaryLane
                  ? "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] text-[color:var(--accent-light)]"
                  : "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--text-muted)]"
              }`}
            >
              {laneSummary}
            </span>
          </div>
          <div className="flex min-h-[5.75rem] flex-wrap items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-[16px] border ${
                isPrimaryLane
                  ? "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.1)] text-[color:var(--accent-light)]"
                  : "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--foreground)]"
              }`}
            >
              <TemplateIcon templateKey={templateKey} />
            </div>

            <div className="grid min-h-[5.75rem] content-start space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="rev-display-panel max-w-[16rem]">
                  {cardTitle}
                </h2>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getStatusToneClassName(
                    sessionStage.tone,
                  )}`}
                >
                  {sessionStage.label}
                </span>
              </div>
              <p className="max-w-[30rem] text-sm leading-6 text-[color:var(--text-muted)]">
                {helperText}
              </p>
            </div>
          </div>
        </div>

        <Link
          className="group inline-flex h-11 items-center gap-2 self-start rounded-[16px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.05)]"
          download
          href={templateHref}
        >
          <DownloadButtonIcon />
          <span>{templateCtaLabel}</span>
        </Link>
      </div>

      <div className="relative mt-5 flex flex-1 flex-col space-y-3.5">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {processSteps.map((item, index) => (
              <div key={item.step} className="flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${getFlowStepToneClassName(
                    index === 0
                      ? currentPreview || isConfirmationStepVisible || isPending || hasImportResult
                        ? "complete"
                        : "current"
                      : index === 1
                        ? isConfirmationStepVisible || isPending || hasImportResult
                          ? "complete"
                          : currentPreview
                            ? "current"
                            : "upcoming"
                        : hasImportResult
                          ? "complete"
                          : isConfirmationStepVisible || isPending
                            ? "current"
                            : "upcoming",
                  )}`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {item.step}
                  </span>
                  <span className="text-sm font-medium">{item.detail}</span>
                </div>
                {index < processSteps.length - 1 ? (
                  <span className="text-[color:var(--text-subtle)]">/</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)]">
          <div className="flex min-h-[6rem] flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="rev-label">{latestPassLabel}</p>
              <p className="mt-2 truncate text-lg font-semibold text-[color:var(--foreground)]">
                {lastUpload?.fileName ?? "First file ready"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                {formatImportedAt(lastUpload?.importedAt)}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getStatusToneClassName(
                getHistoricalStatusTone(lastUpload?.status),
              )}`}
            >
              {formatStatus(lastUpload?.status)}
            </span>
          </div>

          <div className="grid min-h-[7.5rem] grid-cols-3 border-t border-[color:var(--border)] bg-[rgba(255,255,255,0.015)]">
            <div className="px-4 py-4 sm:px-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                {coverageLabel}
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                {formatPercent(coveragePercent)}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#c2095a,#e0106a)]"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>

            <div className="border-l border-[color:var(--border)] px-4 py-4 sm:px-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                {visibleNowLabel}
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                {lastUpload?.successRows ?? 0}
              </p>
            </div>

            <div className="border-l border-[color:var(--border)] px-4 py-4 sm:px-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Needs review
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                {lastUpload?.errorRows ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className={`rounded-[28px] border p-4 transition ${uploadPanelClassName}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="rev-label">{uploadLabel}</p>
                <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
                  Upload one file, check the fit, then confirm what becomes
                  visible in Seller.
               </p>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
              {formatUploadSizeLimit(REVORY_CSV_MAX_FILE_SIZE_BYTES)} max
            </span>
          </div>

          <input
            accept={REVORY_CSV_ACCEPT}
            className="sr-only"
            name="file"
            onChange={(event) => {
              void handleFileChange(event);
            }}
            ref={fileInputRef}
            type="file"
          />

          <div className="mt-4 grid min-h-[4.75rem] gap-3 md:grid-cols-[auto_1fr]">
            <button
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border px-5 text-sm font-semibold transition ${
                hasUploadContext
                  ? "border-[rgba(224,16,106,0.28)] bg-[rgba(194,9,90,0.16)] text-white shadow-[0_12px_28px_rgba(194,9,90,0.14)] hover:border-[rgba(224,16,106,0.42)] hover:bg-[rgba(194,9,90,0.24)] hover:shadow-[0_18px_38px_rgba(194,9,90,0.2)]"
                  : "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--foreground)] hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.05)]"
              }`}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              type="button"
            >
              <UploadButtonIcon />
              Select CSV
            </button>

            <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(12,11,15,0.42)] px-4 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                {currentPreview ? "Current file" : fileReadLabel}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-[color:var(--foreground)]">
                {selectedFileName ?? "No file selected"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                {currentPreview
                  ? `${currentPreview.totalHeaderCount} header${
                      currentPreview.totalHeaderCount === 1 ? "" : "s"
                    } detected for review.`
                  : "Nothing goes live until you confirm this file."}
              </p>
            </div>
          </div>
        </div>

        <RevoryDecisionSupportCard read={decisionSupportRead} surface="imports" />

        {assistedPayload && currentPreview && confirmationDraft ? (
          <AssistedImportMappingPreview
            confirmationDraft={confirmationDraft}
            currentPreview={currentPreview}
            initialPreview={assistedPayload.preview}
            onMappingChange={handleMappingChange}
            selectedFileName={selectedFileName}
            targetOptions={targetOptions}
          />
        ) : null}

        {currentPreview && confirmationDraft && isConfirmationStepVisible ? (
          <div className="rev-card rounded-[28px] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="rev-label">Confirm this file</p>
                <h3 className="mt-2 text-[1.35rem] font-semibold leading-[1.15] text-[color:var(--foreground)]">
                  Confirm the mapping and update Seller.
                </h3>
                <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
                  This confirmation applies only to the current file.
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
                This file only
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Pending review
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {confirmationDraft.suggestedPendingConfirmationCount}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(46,204,134,0.22)] bg-[rgba(46,204,134,0.08)] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Confident matches kept
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {confirmationDraft.keptConfidentMatchCount}
                </p>
              </div>
              <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Adjusted manually
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {confirmationDraft.mappedByUserCount}
                </p>
              </div>
              <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Ignored
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {confirmationDraft.unmappedCount}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                className="rev-button-secondary"
                onClick={() => {
                  setIsConfirmationStepVisible(false);
                }}
                type="button"
              >
                Back to mapping
              </button>
              <button
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[rgba(224,16,106,0.42)] bg-[linear-gradient(180deg,#d90f68_0%,#bc0c58_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(194,9,90,0.2)] transition hover:-translate-y-[1px] hover:border-[rgba(255,110,170,0.52)] hover:bg-[linear-gradient(180deg,#eb1775_0%,#c90d5d_100%)] hover:shadow-[0_24px_46px_rgba(194,9,90,0.26)] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-[rgba(255,255,255,0.06)] disabled:text-[color:var(--text-muted)] disabled:shadow-none"
                disabled={!canSubmit || isPending}
                type="submit"
              >
                <span>{isPending ? "Updating..." : confirmationActionLabel}</span>
                <ButtonArrowIcon />
              </button>
            </div>
          </div>
        ) : null}

        {isPending ? (
          <div className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="rev-label">{inProgressLabel}</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                  {inProgressTitle}
                </p>
                <p className="mt-1.5 text-sm leading-[1.5] text-[color:var(--text-muted)]">
                  Keep this page open until the result returns.
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
                Current file
              </span>
            </div>
          </div>
        ) : null}

        {statusState.status === "error" ? (
          <div className="rev-feedback-error">
            <p className="font-medium text-[color:var(--foreground)]">
              Visibility update blocked
            </p>
            <p className="mt-2">{statusState.message}</p>
            {statusState.requiresReauth ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  className="rev-button-secondary"
                  href={buildSignInRedirectPath("/app/imports")}
                >
                  Sign in again
                </Link>
                <button
                  className="rounded-[14px] border border-white/10 px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.04)]"
                  onClick={() => {
                    window.location.reload();
                  }}
                  type="button"
                >
                  Refresh session
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {statusState.failedRows && statusState.failedRows.length > 0 ? (
          <div className="rev-feedback-error">
            <p className="font-medium text-[color:var(--foreground)]">
              Rows needing correction
            </p>
            <ul className="mt-3 space-y-2">
              {statusState.failedRows.map((row) => (
                <li key={row.lineNumber}>
                  Line {row.lineNumber}: {row.reasons.join(" ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {statusState.warnings && statusState.warnings.length > 0 ? (
          <div className="rev-feedback-warning">
            <p className="font-medium text-[color:var(--foreground)]">
              File warnings
            </p>
            <ul className="mt-3 space-y-1">
              {statusState.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {statusState.importSummary ? (
          <div className="rev-card rounded-[28px] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="rev-label">{currentUpdateLabel}</p>
                <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                  {currentResultTitle}
                </h3>
                <p className="mt-2.5 text-sm leading-[1.55] text-[color:var(--text-muted)]">
                  {currentResultBody}
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                {statusState.importedAt ? formatImportedAt(statusState.importedAt) : "Moments ago"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Rows reviewed
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {statusState.importSummary.totalRows}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(46,204,134,0.22)] bg-[rgba(46,204,134,0.08)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Rows visible now
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {statusState.importSummary.successRows}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.08)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Rows to review
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  {statusState.importSummary.errorRows}
                </p>
              </div>
              <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  File
                </p>
                <p className="mt-2 truncate text-base font-semibold text-[color:var(--foreground)]">
                  {statusState.fileName ?? "Current file"}
                </p>
              </div>
            </div>

            {statusState.mappingExecutionSummary ? (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                    Suggested matches kept
                </p>
                <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                  {statusState.mappingExecutionSummary.suggestedPendingConfirmationCount}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(46,204,134,0.22)] bg-[rgba(46,204,134,0.08)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                    Confident matches kept
                </p>
                <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                  {statusState.mappingExecutionSummary.keptConfidentMatchCount}
                </p>
                </div>
                <div className="rounded-[20px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.08)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                    Adjusted manually
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                    {statusState.mappingExecutionSummary.mappedByUserCount}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                    Ignored
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                    {statusState.mappingExecutionSummary.unmappedCount}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {statusState.importSummary ? (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Clients created
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {statusState.importSummary.createdClientCount}
              </p>
            </div>
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Clients updated
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {statusState.importSummary.updatedClientCount}
              </p>
            </div>
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Appointments created
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {statusState.importSummary.createdAppointmentCount}
              </p>
            </div>
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Appointments updated
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {statusState.importSummary.updatedAppointmentCount}
              </p>
            </div>
          </div>
        ) : null}

        {statusState.status === "imported" && !statusState.importSummary ? (
          <div className="rev-feedback-success">
            <p className="font-medium text-[color:var(--foreground)]">
              Update complete
            </p>
            <p className="mt-2">
              {statusState.message}
              {statusState.fileName ? ` File: ${statusState.fileName}.` : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
            {isConfirmationStepVisible
              ? "Final check before Seller updates from this file."
              : currentPreview
              ? canSubmit
                ? "Mapping ready. Confirm this file to continue."
                : "Resolve blockers in the mapping preview to continue."
              : isPrimaryLane
                ? "Use the proof template when possible. Seller should read booked proof before revenue."
                : "Use the support template when needed. Lead base stays secondary to booked proof."}
          </p>
          {!isConfirmationStepVisible && currentPreview ? (
            <button
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[rgba(224,16,106,0.42)] bg-[linear-gradient(180deg,#d90f68_0%,#bc0c58_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(194,9,90,0.2)] transition hover:-translate-y-[1px] hover:border-[rgba(255,110,170,0.52)] hover:bg-[linear-gradient(180deg,#eb1775_0%,#c90d5d_100%)] hover:shadow-[0_24px_46px_rgba(194,9,90,0.26)] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-[rgba(255,255,255,0.06)] disabled:text-[color:var(--text-muted)] disabled:shadow-none"
              disabled={!canOpenConfirmation || isPending}
              onClick={handleOpenConfirmation}
              type="button"
            >
              <span>{primaryActionLabel}</span>
              <ButtonArrowIcon />
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

