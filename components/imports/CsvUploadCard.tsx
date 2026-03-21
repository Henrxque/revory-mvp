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
    fileName: string | null;
    receivedAt: string | null;
    status: string;
  } | null;
  templateHref: string;
  templateKey: RevoryCsvTemplateKey;
  templateName: string;
}>;

function formatReceivedAt(value: string | null | undefined) {
  if (!value) {
    return "No upload received yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function UploadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full bg-[color:var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
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
    <section className="rounded-[28px] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_18px_50px_rgba(32,26,24,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
            {templateName}
          </p>
          <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">
            Upload the official template
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-black/70">
            {helperText}
          </p>
        </div>

        <Link
          className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-black/75 transition hover:bg-[color:var(--surface)]"
          download
          href={templateHref}
        >
          Download template
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Last received file
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
            {lastUpload?.fileName ?? "No file yet"}
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            {formatReceivedAt(lastUpload?.receivedAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">
            Source status
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
            {lastUpload?.status ?? "PENDING"}
          </p>
          <p className="mt-2 text-sm leading-6 text-black/65">
            Upload metadata is recorded now. Parsing and row processing land in
            the next import step.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <input name="templateKey" type="hidden" value={templateKey} />

        <label className="block rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <span className="block text-sm font-medium text-[color:var(--foreground)]">
            Choose CSV file
          </span>
          <span className="mt-1 block text-sm leading-6 text-black/65">
            CSV only, up to {formatUploadSizeLimit(REVORY_CSV_MAX_FILE_SIZE_BYTES)}.
          </span>
          <input
            accept={REVORY_CSV_ACCEPT}
            className="mt-4 block w-full text-sm text-black/70 file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent-strong)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            name="file"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <span className="mt-3 block text-sm text-black/55">
            {selectedFileName ?? "No file selected yet"}
          </span>
        </label>

        {statusState.status === "success" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
            {statusState.message}
            {statusState.fileName ? ` File: ${statusState.fileName}.` : ""}
          </div>
        ) : null}

        {statusState.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
            {statusState.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-black/60">
            The upload is accepted now and tracked for the next parsing stage.
          </p>
          <UploadSubmitButton />
        </div>
      </form>
    </section>
  );
}
