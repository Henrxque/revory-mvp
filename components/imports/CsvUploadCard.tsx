"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useRef, useState } from "react";

import {
  buildAssistedImportPayloadFromCsv,
  buildAssistedImportPreview,
  createMappedCsvText,
  formatImportColumnLabel,
  getAssistedImportTargetOptions,
  type AssistedImportConfidence,
  type AssistedImportPreview,
} from "@/lib/imports/assisted-import";
import {
  REVORY_CSV_ACCEPT,
  REVORY_CSV_ALLOWED_EXTENSION,
  REVORY_CSV_MAX_FILE_SIZE_BYTES,
  formatUploadSizeLimit,
} from "@/lib/imports/csv-upload";
import {
  uploadCsvFile,
} from "@/src/app/(app)/app/imports/actions";
import {
  initialRevoryCsvUploadActionState,
} from "@/types/imports";
import type {
  RevoryCsvColumn,
  RevoryCsvTemplateKey,
  RevoryCsvUploadActionState,
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
  templateHref: string;
  templateKey: RevoryCsvTemplateKey;
  templateName: string;
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

function formatImportedAt(value: string | null | undefined) {
  if (!value) {
    return "No CSV imported yet";
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

  return value.toLowerCase().replaceAll("_", " ");
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

function getConfidenceLabel(confidence: AssistedImportConfidence) {
  switch (confidence) {
    case "high":
      return "Strong match";
    case "medium":
      return "Likely match";
    case "low":
      return "Review";
    default:
      return "Unmapped";
  }
}

function getConfidenceClassName(confidence: AssistedImportConfidence) {
  switch (confidence) {
    case "high":
      return "border-[rgba(46,204,134,0.25)] bg-[rgba(46,204,134,0.12)] text-[color:var(--success)]";
    case "medium":
      return "border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.12)] text-[color:var(--accent-light)]";
    case "low":
      return "border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.12)] text-[color:var(--warning)]";
    default:
      return "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--text-muted)]";
  }
}

function buildPreviewBlockingMessage(preview: AssistedImportPreview | null) {
  if (!preview) {
    return "Select a CSV file so REVORY can read the headers before importing.";
  }

  if (preview.duplicateSourceHeaders.length > 0) {
    return `Remove duplicate source headers before importing: ${preview.duplicateSourceHeaders.join(
      ", ",
    )}.`;
  }

  if (preview.duplicateTargets.length > 0) {
    return `Choose only one source column for ${preview.duplicateTargets
      .map((target) => formatImportColumnLabel(target))
      .join(", ")}.`;
  }

  if (preview.missingRequiredColumns.length > 0) {
    return `Map the required fields before importing: ${preview.missingRequiredColumns
      .map((column) => formatImportColumnLabel(column))
      .join(", ")}.`;
  }

  if (preview.missingIdentityPath) {
    return `Map at least one client identifier: ${preview.identityColumns
      .map((column) => formatImportColumnLabel(column))
      .join(", ")}.`;
  }

  return null;
}

export function CsvUploadCard({
  helperText,
  lastUpload,
  templateHref,
  templateKey,
  templateName,
}: CsvUploadCardProps) {
  const [serverState, formAction, isPending] = useActionState(
    uploadCsvFile,
    initialRevoryCsvUploadActionState,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [rawFileText, setRawFileText] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, RevoryCsvColumn | null>>({});
  const [mappingPreview, setMappingPreview] = useState<AssistedImportPreview | null>(null);
  const [showServerState, setShowServerState] = useState(false);
  const targetOptions = useMemo(
    () => getAssistedImportTargetOptions(templateKey),
    [templateKey],
  );
  const state = showServerState ? serverState : initialRevoryCsvUploadActionState;
  const statusState = useMemo<RevoryCsvUploadActionState>(() => {
    if (clientError) {
      return {
        message: clientError,
        status: "error",
      };
    }

    return state;
  }, [clientError, state]);
  const coveragePercent = getCoveragePercent(lastUpload);
  const cardTitle =
    templateKey === "appointments" ? "Appointments import" : "Clients import";
  const processSteps = [
    { detail: "Bring the CSV", step: "01" },
    { detail: "Confirm columns", step: "02" },
    { detail: "Run import", step: "03" },
  ];
  const primaryActionLabel =
    mappingPreview?.exactTemplateMatch ? "Import official CSV" : "Confirm mapping and import";

  function validateSelectedFile(file: File | null) {
    if (!file) {
      return "Choose a CSV file before continuing.";
    }

    if (!file.name.toLowerCase().endsWith(REVORY_CSV_ALLOWED_EXTENSION)) {
      return "Upload a file with the .csv extension.";
    }

    if (file.size > REVORY_CSV_MAX_FILE_SIZE_BYTES) {
      return `The file exceeds the ${formatUploadSizeLimit(REVORY_CSV_MAX_FILE_SIZE_BYTES)} limit.`;
    }

    return null;
  }

  async function buildPreview(file: File) {
    const fileText = await file.text();
    const nextPayload = buildAssistedImportPayloadFromCsv(templateKey, fileText);

    setRawFileText(fileText);
    setMapping(nextPayload.mapping);
    setMappingPreview(nextPayload.preview);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const validationError = validateSelectedFile(file);

    setSelectedFileName(file?.name ?? null);
    setClientError(validationError);
    setShowServerState(false);

    if (!file || validationError) {
      setRawFileText(null);
      setMapping({});
      setMappingPreview(null);
      return;
    }

    try {
      await buildPreview(file);
      setClientError(null);
    } catch {
      setRawFileText(null);
      setMapping({});
      setMappingPreview(null);
      setClientError("REVORY could not read this CSV file. Try exporting it again.");
    }
  }

  function handleMappingChange(sourceHeader: string, targetColumnValue: string) {
    const nextMapping = {
      ...mapping,
      [sourceHeader]: targetColumnValue ? (targetColumnValue as RevoryCsvColumn) : null,
    };

    setMapping(nextMapping);

    if (mappingPreview) {
      setMappingPreview(
        buildAssistedImportPreview(templateKey, mappingPreview.detectedHeaders, nextMapping),
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0] ?? null;
    const validationError = validateSelectedFile(file);

    if (validationError) {
      setClientError(validationError);
      return;
    }

    const blockingMessage = buildPreviewBlockingMessage(mappingPreview);

    if (blockingMessage) {
      setClientError(blockingMessage);
      return;
    }

    if (!rawFileText || !file || !mappingPreview) {
      setClientError("Select a CSV file so REVORY can prepare the import.");
      return;
    }

    const mappedCsvText = createMappedCsvText(templateKey, rawFileText, mapping);
    const mappedFile = new File([mappedCsvText], file.name, {
      type: file.type || "text/csv",
    });
    const formData = new FormData();

    formData.append("templateKey", templateKey);
    formData.append("file", mappedFile);

    setClientError(null);
    setShowServerState(true);

    startTransition(() => {
      void formAction(formData);
    });
  }

  return (
    <section className="rev-shell-panel relative overflow-hidden rounded-[34px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] md:p-7">
      <div
        className={`pointer-events-none absolute top-0 h-40 w-40 rounded-full blur-3xl ${
          templateKey === "appointments"
            ? "-left-10 bg-[rgba(194,9,90,0.14)]"
            : "-right-10 bg-[rgba(224,16,106,0.12)]"
        }`}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-4">
          <p className="rev-kicker">{templateName}</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[color:var(--border-accent)] bg-[rgba(194,9,90,0.1)] text-[color:var(--accent-light)]">
              <TemplateIcon templateKey={templateKey} />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-[family:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)]">
                  {cardTitle}
                </h2>
                <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  {formatStatus(lastUpload?.status)}
                </span>
              </div>
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                {helperText}
              </p>
            </div>
          </div>
        </div>

        <Link
          className="group inline-flex h-11 items-center gap-2 rounded-[16px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.05)]"
          download
          href={templateHref}
        >
          <DownloadButtonIcon />
          <span>Download template</span>
        </Link>
      </div>

      <div className="relative mt-6 space-y-4">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {processSteps.map((item, index) => (
              <div key={item.step} className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-light)]">
                    {item.step}
                  </span>
                  <span className="text-sm font-medium text-[color:var(--foreground)]">
                    {item.detail}
                  </span>
                </div>
                {index < processSteps.length - 1 ? (
                  <span className="text-[color:var(--text-subtle)]">/</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.025)]">
          <div className="px-4 py-4 sm:px-5">
            <p className="rev-label">Last import</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
              {lastUpload?.fileName ?? "Awaiting first import"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
              {formatImportedAt(lastUpload?.importedAt)}
            </p>
          </div>

          <div className="grid grid-cols-3 border-t border-[color:var(--border)] bg-[rgba(255,255,255,0.015)]">
            <div className="px-4 py-4 sm:px-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Coverage
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
                Persisted
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

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-[30px] border border-[color:var(--border-accent)] bg-[linear-gradient(180deg,rgba(194,9,90,0.05),rgba(255,255,255,0.02))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="rev-label">Choose CSV file</p>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
                Drop in the exported file or choose it manually. REVORY checks the
                headers before the final import.
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

          <div className="mt-5 grid gap-3 md:grid-cols-[auto_1fr]">
            <button
              className="inline-flex h-14 items-center justify-center gap-2 rounded-[18px] border border-[rgba(224,16,106,0.28)] bg-[rgba(194,9,90,0.18)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(194,9,90,0.14)] transition hover:border-[rgba(224,16,106,0.42)] hover:bg-[rgba(194,9,90,0.28)] hover:shadow-[0_18px_38px_rgba(194,9,90,0.2)]"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              type="button"
            >
              <UploadButtonIcon />
              Choose file
            </button>

            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(12,11,15,0.42)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Selected file
              </p>
              <p className="mt-1 truncate text-sm font-medium text-[color:var(--foreground)]">
                {selectedFileName ?? "No file selected yet"}
              </p>
            </div>
          </div>
        </div>

        {mappingPreview ? (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rev-card rounded-[24px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="rev-label">Header review</p>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                      {mappingPreview.exactTemplateMatch
                        ? "Official structure detected"
                        : "Assisted mapping ready for review"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                      mappingPreview.canImport
                        ? "border-[rgba(46,204,134,0.25)] bg-[rgba(46,204,134,0.12)] text-[color:var(--success)]"
                        : "border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.12)] text-[color:var(--warning)]"
                    }`}
                  >
                    {mappingPreview.canImport ? "Ready to import" : "Needs confirmation"}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  {mappingPreview.exactTemplateMatch
                    ? "This file already matches the REVORY structure. You can import it directly."
                    : "REVORY matched what it could automatically. Review any low-confidence or unmapped fields before continuing."}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                      Headers detected
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                      {mappingPreview.totalHeaderCount}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                      Strong matches
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                      {mappingPreview.matchedWithConfidenceCount}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                      Needs confirmation
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                      {mappingPreview.suggestedCount}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                      Unresolved
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                      {mappingPreview.unresolvedCount}
                    </p>
                  </div>
                </div>

                {mappingPreview.missingRequiredColumns.length > 0 ? (
                  <div className="mt-4 rounded-[20px] border border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.12)] px-4 py-4 text-sm leading-6 text-[color:var(--warning)]">
                    Missing required fields:{" "}
                    {mappingPreview.missingRequiredColumns
                      .map((column) => formatImportColumnLabel(column))
                      .join(", ")}
                    .
                  </div>
                ) : null}

                {mappingPreview.hasDuplicateSourceHeaders ? (
                  <div className="mt-4 rounded-[20px] border border-[rgba(255,114,141,0.35)] bg-[rgba(255,114,141,0.1)] px-4 py-4 text-sm leading-6 text-[color:var(--danger)]">
                    REVORY detected duplicate raw headers in this file:{" "}
                    {mappingPreview.duplicateSourceHeaders.join(", ")}. Assisted
                    mapping can preview them, but import stays blocked until the
                    source file exposes each column name only once.
                  </div>
                ) : null}

                {mappingPreview.missingIdentityPath ? (
                  <div className="mt-4 rounded-[20px] border border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.12)] px-4 py-4 text-sm leading-6 text-[color:var(--warning)]">
                    Map at least one client identifier so REVORY can connect rows correctly:{" "}
                    {mappingPreview.identityColumns
                      .map((column) => formatImportColumnLabel(column))
                      .join(", ")}
                    .
                  </div>
                ) : null}

                {mappingPreview.duplicateTargets.length > 0 ? (
                  <div className="mt-4 rounded-[20px] border border-[rgba(255,114,141,0.35)] bg-[rgba(255,114,141,0.1)] px-4 py-4 text-sm leading-6 text-[color:var(--danger)]">
                    Only one source column can be assigned to each REVORY field. Review:{" "}
                    {mappingPreview.duplicateTargets
                      .map((column) => formatImportColumnLabel(column))
                      .join(", ")}
                    .
                  </div>
                ) : null}
              </div>

              <div className="rev-card rounded-[24px] p-5">
                <p className="rev-label">Mapping guardrails</p>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--text-muted)]">
                  <p>Official template is still the fastest path.</p>
                  <p>Assisted mapping is for header matching, not full ETL.</p>
                  <p>Complex transformations stay outside the MVP.</p>
                </div>
              </div>
            </div>

            <div className="rev-card rounded-[24px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="rev-label">Detected columns</p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                    Confirm each source header before import
                  </p>
                </div>
                <span className="text-xs text-[color:var(--text-muted)]">
                  Ignore anything REVORY does not need right now
                </span>
              </div>

              <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {mappingPreview.mappingOptions.map((option) => (
                  <div
                    key={option.sourceHeader}
                    className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {option.sourceHeader}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                          Source header detected in this CSV
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getConfidenceClassName(
                          option.confidence,
                        )}`}
                      >
                        {getConfidenceLabel(option.confidence)}
                      </span>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                        Map to REVORY field
                      </span>
                      <select
                        className="rev-select-field"
                        onChange={(event) => {
                          handleMappingChange(option.sourceHeader, event.target.value);
                        }}
                        value={option.targetColumn ?? ""}
                      >
                        <option value="">Ignore this column</option>
                        {targetOptions.map((targetOption) => (
                          <option key={targetOption.column} value={targetOption.column}>
                            {targetOption.label}
                            {targetOption.isRequired ? " - Required" : ""}
                            {!targetOption.isRequired && targetOption.isIdentity
                              ? " - Identifier"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {statusState.status === "imported" ? (
          <div className="rev-feedback-success">
            {statusState.message}
            {statusState.fileName ? ` File: ${statusState.fileName}.` : ""}
            {statusState.importSummary ? (
              <span>
                {" "}
                Persisted rows: {statusState.importSummary.successRows} of{" "}
                {statusState.importSummary.totalRows}. Rows needing correction:{" "}
                {statusState.importSummary.errorRows}.
              </span>
            ) : null}
          </div>
        ) : null}

        {statusState.importSummary ? (
          <div className="rev-card rounded-[24px] px-4 py-4 text-sm leading-6 text-[color:var(--text-muted)]">
            Clients created: {statusState.importSummary.createdClientCount}. Clients
            updated: {statusState.importSummary.updatedClientCount}. Appointments created:{" "}
            {statusState.importSummary.createdAppointmentCount}. Appointments updated:{" "}
            {statusState.importSummary.updatedAppointmentCount}.
          </div>
        ) : null}

        {statusState.status === "error" ? (
          <div className="rev-feedback-error">{statusState.message}</div>
        ) : null}

        {statusState.warnings && statusState.warnings.length > 0 ? (
          <div className="rev-feedback-warning">
            <p className="font-medium">Warnings to review in this import:</p>
            <ul className="mt-2 space-y-1">
              {statusState.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {statusState.failedRows && statusState.failedRows.length > 0 ? (
          <div className="rev-feedback-error">
            <p className="font-medium">Rows still needing correction:</p>
            <ul className="mt-2 space-y-2">
              {statusState.failedRows.map((row) => (
                <li key={row.lineNumber}>
                  Line {row.lineNumber}: {row.reasons.join(" ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
            Review the mapping, confirm the structure, and let REVORY handle the import.
          </p>
          <button
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[rgba(224,16,106,0.42)] bg-[linear-gradient(180deg,#d90f68_0%,#bc0c58_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(194,9,90,0.2)] transition hover:-translate-y-[1px] hover:border-[rgba(255,110,170,0.52)] hover:bg-[linear-gradient(180deg,#eb1775_0%,#c90d5d_100%)] hover:shadow-[0_24px_46px_rgba(194,9,90,0.26)] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-[rgba(255,255,255,0.06)] disabled:text-[color:var(--text-muted)] disabled:shadow-none"
            disabled={isPending}
            type="submit"
          >
            <span>{isPending ? "Importing..." : primaryActionLabel}</span>
            <ButtonArrowIcon />
          </button>
        </div>
      </form>
    </section>
  );
}
