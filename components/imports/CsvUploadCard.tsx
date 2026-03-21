"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  REVORY_CSV_ACCEPT,
  REVORY_CSV_ALLOWED_EXTENSION,
  REVORY_CSV_MAX_FILE_SIZE_BYTES,
  formatUploadSizeLimit,
} from "@/lib/imports/csv-upload";
import {
  initialUploadState,
  uploadCsvFile,
} from "@/src/app/(app)/app/imports/actions";
import type {
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

function UploadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="rev-button-primary" disabled={pending} type="submit">
      {pending ? "Uploading..." : "Upload CSV"}
    </button>
  );
}

export function CsvUploadCard({
  helperText,
  lastUpload,
  templateHref,
  templateKey,
  templateName,
}: CsvUploadCardProps) {
  const [state, formAction] = useActionState(uploadCsvFile, initialUploadState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const statusState = useMemo<RevoryCsvUploadActionState>(() => {
    if (clientError) {
      return {
        message: clientError,
        status: "error",
      };
    }

    return state;
  }, [clientError, state]);

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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFileName(file?.name ?? null);
    setClientError(validateSelectedFile(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const file = fileInputRef.current?.files?.[0] ?? null;
    const validationError = validateSelectedFile(file);

    if (validationError) {
      event.preventDefault();
      setClientError(validationError);
      return;
    }

    setClientError(null);
  }

  return (
    <section className="rev-shell-panel rounded-[30px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="rev-kicker">{templateName}</p>
          <h2 className="font-[family:var(--font-display)] text-4xl leading-none text-[color:var(--foreground)]">
            Upload the official template.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
            {helperText}
          </p>
        </div>

        <Link className="rev-button-secondary" download href={templateHref}>
          Download template
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rev-card rounded-[24px] p-4">
          <p className="rev-label">Last imported file</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
            {lastUpload?.fileName ?? "No file yet"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {formatImportedAt(lastUpload?.importedAt)}
          </p>
        </div>

        <div className="rev-card rounded-[24px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rev-label">Source status</p>
            <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
              {formatStatus(lastUpload?.status)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            The latest import source keeps aggregate progress for imported,
            persisted, and rejected rows.
          </p>
          {lastUpload ? (
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              {lastUpload.successRows} persisted of {lastUpload.totalRows} rows.
              {lastUpload.errorRows > 0
                ? ` ${lastUpload.errorRows} row(s) still need correction.`
                : " No rejected rows in the latest pass."}
            </p>
          ) : null}
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <input name="templateKey" type="hidden" value={templateKey} />

        <label className="block rounded-[26px] border border-dashed border-[color:var(--border-accent)] bg-[rgba(255,255,255,0.02)] p-5">
          <span className="rev-label">Choose CSV file</span>
          <span className="mt-2 block text-sm leading-6 text-[color:var(--text-muted)]">
            CSV only, up to {formatUploadSizeLimit(REVORY_CSV_MAX_FILE_SIZE_BYTES)}.
          </span>
          <input
            accept={REVORY_CSV_ACCEPT}
            className="mt-4 block w-full text-sm text-[color:var(--text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            name="file"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <span className="mt-4 block rounded-2xl border border-[color:var(--border)] bg-[color:var(--background-card)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
            {selectedFileName ?? "No file selected yet"}
          </span>
        </label>

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
            updated: {statusState.importSummary.updatedClientCount}. Appointments
            created: {statusState.importSummary.createdAppointmentCount}. Appointments
            updated: {statusState.importSummary.updatedAppointmentCount}.
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
            The import validates the file, persists the supported rows, and
            keeps rejected rows visible for the next correction pass.
          </p>
          <UploadSubmitButton />
        </div>
      </form>
    </section>
  );
}
