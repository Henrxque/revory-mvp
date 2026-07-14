"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";

import type { CanonicalEntityType } from "@/domain/revory/contracts";
import { canonicalFields } from "@/services/canonical-intake/definitions";
import type { CanonicalImportActionState, CanonicalReviewActionState } from "@/src/app/(app)/app/imports/canonical-actions";

const activeDatasets = [
  ["CUSTOMER", "Customers", "Customer identity and contact context", "QUOTE_RECOVERY"],
  ["LEAD", "Leads", "Optional source, owner and lead-stage context", "QUOTE_RECOVERY"],
  ["ESTIMATE", "Estimates", "Required for the current Quote Recovery read", "QUOTE_RECOVERY"],
  ["ACTIVITY", "Activities", "Follow-up and recent-action evidence", "QUOTE_RECOVERY"],
  ["JOB", "Jobs", "Contract status, value and explicit estimate links", "REVENUE_REALIZATION"],
  ["INVOICE", "Invoices", "Observed billing tied explicitly to jobs", "REVENUE_REALIZATION"],
  ["CHANGE_ORDER", "Change orders", "Observed approval evidence and job links", "REVENUE_REALIZATION"],
  ["COST", "Costs", "Observed job costs; never inferred margin", "REVENUE_REALIZATION"],
] as const satisfies ReadonlyArray<readonly [CanonicalEntityType, string, string, "QUOTE_RECOVERY" | "REVENUE_REALIZATION"]>;

const templateNames: Record<(typeof activeDatasets)[number][0], string> = {
  ACTIVITY: "activities",
  CHANGE_ORDER: "change-orders",
  COST: "costs",
  CUSTOMER: "customers",
  ESTIMATE: "estimates",
  INVOICE: "invoices",
  JOB: "jobs",
  LEAD: "leads",
};

const sourceSystemOptions = [
  ["manual-export", "Spreadsheet / manual export"],
  ["buildertrend", "Buildertrend"],
  ["jobber", "Jobber"],
  ["servicetitan", "ServiceTitan"],
  ["housecall-pro", "Housecall Pro"],
  ["jobtread", "JobTread"],
  ["acculynx", "AccuLynx"],
  ["procore", "Procore"],
  ["quickbooks", "QuickBooks"],
  ["other-system-export", "Other system export"],
] as const;

type SelectedFileMeta = {
  name: string;
  size: number;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="m20.5 11.5-8.7 8.7a5.25 5.25 0 0 1-7.4-7.4l9.2-9.2a3.75 3.75 0 1 1 5.3 5.3l-9.2 9.2a2.25 2.25 0 0 1-3.2-3.2l8.7-8.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

const initialCanonicalImportActionState: CanonicalImportActionState = {
  message: "",
  status: "idle",
};

export function CanonicalImportPanel() {
  const [sourceSystem, setSourceSystem] = useState("manual-export");
  const selectedFiles = useRef<Partial<Record<CanonicalEntityType, File>>>({});
  const [selectedFileMeta, setSelectedFileMeta] = useState<Partial<Record<CanonicalEntityType, SelectedFileMeta>>>({});
  const [review, setReview] = useState<CanonicalReviewActionState | null>(null);
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [snapshotConfirmed, setSnapshotConfirmed] = useState(false);
  const [importState, setImportState] = useState<CanonicalImportActionState>(
    initialCanonicalImportActionState,
  );
  const [pending, startTransition] = useTransition();

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const reviewFormData = new FormData();
    reviewFormData.set("sourceSystem", sourceSystem);

    for (const [entityType] of activeDatasets) {
      const selected = selectedFiles.current[entityType];
      if (selected?.size) {
        reviewFormData.set(`file_${entityType}`, selected, selected.name);
      }
    }

    startTransition(async () => {
      setImportState(initialCanonicalImportActionState);
      try {
        const response = await fetch("/api/canonical-intake/review", {
          body: reviewFormData,
          method: "POST",
        });
        setMappingConfirmed(false);
        setSnapshotConfirmed(false);
        setReview(await response.json() as CanonicalReviewActionState);
      } catch {
        setReview({
          files: [],
          message: "The mapping review could not be reached. Check the connection and retry.",
          status: "error",
        });
      }
    });
  }

  function submitImport() {
    if (!mappingConfirmed || !snapshotConfirmed) {
      setImportState({
        message: "Confirm both the reviewed mapping and the full replacement snapshot boundary before import.",
        status: "error",
      });
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("sourceSystem", sourceSystem);
        formData.set("mappingConfirmed", "yes");
        formData.set("snapshotMode", "FULL_REPLACEMENT");
        for (const [entityType, file] of Object.entries(selectedFiles.current)) {
          if (file) formData.set(`file_${entityType}`, file);
        }
        for (const file of review?.files ?? []) {
          formData.set(`mapping_${file.entityType}`, JSON.stringify(file.mapping));
        }
        const response = await fetch("/api/canonical-intake/import", { body: formData, method: "POST" });
        setImportState(await response.json() as CanonicalImportActionState);
      } catch {
        setImportState({
          message: "The import could not be reached. No snapshot was committed; check the connection and retry.",
          status: "error",
        });
      }
    });
  }

  function updateMapping(entityType: CanonicalEntityType, sourceHeader: string, target: string) {
    setReview((current) => {
      if (!current) return current;
      return {
        ...current,
        files: current.files.map((file) =>
          file.entityType === entityType
            ? {
                ...file,
                mapping: {
                  ...file.mapping,
                  [sourceHeader]: target,
                },
              }
            : file,
        ),
      };
    });
    setImportState(initialCanonicalImportActionState);
  }

  const selectedFileCount = Object.keys(selectedFileMeta).length;

  return (
    <section className="rev-shell-panel rounded-[28px] p-6 md:p-7">
      <div className="max-w-3xl space-y-3">
        <p className="rev-kicker">Canonical secure intake</p>
        <h2 className="rev-display-section">Profile, review, then commit the evidence.</h2>
        <p className="text-sm leading-6 text-[color:var(--text-muted)]">
          REVORY matches known export headers without AI. When a column is unclear,
          optional AI can suggest a field from sanitized header metadata only. You always
          review the mapping before Data Quality can commit anything.
        </p>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-3">
        {[
          ["01", "Deterministic first", "Known headers are matched locally."],
          ["02", "AI only when needed", "Only sanitized column metadata is shared."],
          ["03", "You approve", "No suggestion imports data by itself."],
        ].map(([step, title, description]) => (
          <div
            className="rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.018)] px-4 py-3"
            key={step}
          >
            <span className="text-[10px] font-bold tracking-[0.18em] text-[color:var(--accent-light)]">
              {step}
            </span>
            <p className="mt-1 text-xs font-bold text-[color:var(--text-primary)]">{title}</p>
            <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-subtle)]">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {activeDatasets.map(([key, label]) => (
          <a
            className="rev-button-secondary !min-h-0 !px-3 !py-2"
            download
            href={`/templates/revory-${templateNames[key]}.csv`}
            key={key}
          >
            {label} template
          </a>
        ))}
      </div>

      <form className="mt-5 space-y-5" id="canonical-intake-form" onSubmit={submitReview}>
        <label className="block max-w-md text-sm font-semibold">
          Where did these exports come from?
          <select
            className="rev-select-field mt-2 w-full"
            name="sourceSystem"
            onChange={(event) => {
              setSourceSystem(event.target.value);
              setReview(null);
              setMappingConfirmed(false);
              setSnapshotConfirmed(false);
              setImportState(initialCanonicalImportActionState);
            }}
            value={sourceSystem}
          >
            {sourceSystemOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs font-normal leading-5 text-[color:var(--text-subtle)]">
            Select the system that produced the files. Keep the same source on future
            refreshes so REVORY can replace the correct snapshot safely.
          </span>
        </label>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {activeDatasets.map(([key, label, description, layer]) => {
            const selected = selectedFileMeta[key];

            return (
              <article
                className={`rev-card-hover rounded-2xl border p-4 text-sm font-bold transition ${
                  selected
                    ? "border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.06)]"
                    : "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]"
                }`}
                key={key}
              >
                <span className="flex items-start justify-between gap-2">
                  {label}
                  <span className="flex flex-wrap justify-end gap-1">
                    {selected ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-accent)] px-2 py-1 text-[8px] uppercase tracking-wider text-[color:var(--accent-light)]">
                        <CheckIcon /> Attached
                      </span>
                    ) : null}
                    {layer === "REVENUE_REALIZATION" ? (
                      <span className="rounded-full border border-[color:var(--border-accent)] px-2 py-1 text-[8px] uppercase tracking-wider text-[color:var(--accent-light)]">
                        Reconciliation
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="mt-1 block min-h-10 text-xs font-normal leading-5 text-[color:var(--text-muted)]">
                  {description}
                </span>
                <input
                  accept=".csv,.xlsx"
                  aria-label={`${label} file`}
                  className="sr-only"
                  id={`canonical-file-${key}`}
                  name={`file_${key}`}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) {
                      selectedFiles.current[key] = file;
                      setSelectedFileMeta((current) => ({
                        ...current,
                        [key]: { name: file.name, size: file.size },
                      }));
                    } else {
                      delete selectedFiles.current[key];
                      setSelectedFileMeta((current) => {
                        const next = { ...current };
                        delete next[key];
                        return next;
                      });
                    }
                    setReview(null);
                    setMappingConfirmed(false);
                    setSnapshotConfirmed(false);
                    setImportState(initialCanonicalImportActionState);
                  }}
                  type="file"
                />
                <label
                  className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-[rgba(20,21,22,0.5)] px-3 py-2 text-xs font-bold text-[color:var(--text-primary)] transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(67,179,155,0.06)]"
                  htmlFor={`canonical-file-${key}`}
                >
                  <AttachmentIcon />
                  {selected ? "Replace file" : "Attach CSV or XLSX"}
                </label>
                {selected ? (
                  <div
                    aria-live="polite"
                    className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.08)] px-3 py-2"
                    role="status"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[#141516]">
                      <CheckIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold" title={selected.name}>
                        {selected.name}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-normal text-[color:var(--text-muted)]">
                        {formatFileSize(selected.size)} · ready to profile
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] font-normal text-[color:var(--text-subtle)]">
                    No file attached yet.
                  </p>
                )}
              </article>
            );
          })}
        </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`rev-button-primary ${
            selectedFileCount > 0 && !pending && !review ? "rev-button-attention" : ""
          }`}
          disabled={pending || selectedFileCount === 0}
          type="submit"
        >
          {pending ? "Profiling…" : "Profile files and review mapping"}
        </button>
        <div className="max-w-xl text-xs leading-5 text-[color:var(--text-subtle)]">
          <p className={selectedFileCount > 0 ? "font-bold text-[color:var(--accent-light)]" : ""}>
            {selectedFileCount > 0
              ? `${selectedFileCount} ${selectedFileCount === 1 ? "file" : "files"} attached and ready to profile.`
              : "Attach at least one CSV or XLSX file to continue."}
          </p>
          <p className="mt-1">
            Jobs, invoices, change orders and costs support deterministic Tier 2 findings
            after explicit matching. Imports do not unlock Revenue Realization pricing or
            certify accounting loss.
          </p>
        </div>
      </div>
      </form>

      {review ? (
        <div className="mt-6 space-y-4">
          <div
            className={`rounded-2xl border p-4 text-sm ${
              review.status === "ready"
                ? "border-[color:var(--border-accent)]"
                : "border-[rgba(255,114,141,.3)]"
            }`}
          >
            <p className="font-bold">{review.message}</p>
          </div>

          {review.files.map((file) => (
            <article className="rounded-[24px] border border-[color:var(--border)] p-5" key={file.entityType}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="rev-label">{file.entityType.replaceAll("_", " ")}</p>
                  <h3 className="mt-2 font-bold">{file.fileName}</h3>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {file.rowCount} rows · {file.delimiter === "\t" ? "tab" : file.delimiter} delimiter · {Math.round(file.confidence * 100)}% mapping confidence
                  </p>
                </div>
                <span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent-light)]">
                  {file.aiProviderUsed ? "AI suggestion reviewed" : "Deterministic profile"}
                </span>
              </div>

              {file.issues.length || file.aiWarnings.length ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-5 text-[color:var(--text-muted)]">
                  {[...file.issues, ...file.aiWarnings].map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-[color:var(--text-subtle)]">
                    <tr>
                      <th className="px-3 py-2">Source header</th>
                      <th className="px-3 py-2">Profile</th>
                      <th className="px-3 py-2">REVORY field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {file.columnProfiles.map((column) => (
                      <tr className="border-t border-[color:var(--border)]" key={column.header}>
                        <td className="px-3 py-3 font-bold">{column.header}</td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {column.inferredType} · {column.fillRate}% filled
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className="rev-select-field !py-2 text-xs"
                            onChange={(event) =>
                              updateMapping(file.entityType, column.header, event.target.value)
                            }
                            value={file.mapping[column.header] ?? ""}
                          >
                            <option value="">Do not import</option>
                            {Object.keys(canonicalFields[file.entityType]).map((field) => (
                              <option key={field} value={field}>
                                {field}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}

          <label className="flex items-start gap-3 text-sm text-[color:var(--text-muted)]">
            <input
              checked={mappingConfirmed}
              className="mt-1"
              id="mapping-confirmation"
              onChange={(event) => setMappingConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              I reviewed each mapping and confirm that these values are source-system
              evidence. REVORY must still reject missing required fields, duplicate targets
              and incompatible datasets.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-[color:var(--text-muted)]">
            <input
              checked={snapshotConfirmed}
              className="mt-1"
              id="snapshot-confirmation"
              onChange={(event) => setSnapshotConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              I confirm that every selected file is the complete current snapshot for that entity and source system. Omitted records will leave the active read but remain preserved as inactive history.
            </span>
          </label>
          <button
            className="rev-button-primary"
            disabled={pending || review.status !== "ready" || !mappingConfirmed || !snapshotConfirmed}
            onClick={submitImport}
            type="button"
          >
            {pending ? "Validating and committing…" : "Confirm mapping and import atomically"}
          </button>
        </div>
      ) : null}

      {importState.status !== "idle" ? (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm ${
            importState.status === "error"
              ? "border-[rgba(255,114,141,.3)]"
              : "border-[color:var(--border-accent)]"
          }`}
        >
          <p className="font-bold">{importState.message}</p>
          {importState.acceptedCount !== undefined ? (
            <p className="mt-2 text-[color:var(--text-muted)]">
              {importState.acceptedCount} records · {importState.unmatchedCount} unmatched
              links · {importState.eligibleRules?.length ?? 0} eligible rules ·{" "}
              {importState.findingCount ?? 0} active Quote Recovery findings
            </p>
          ) : null}
          {importState.issues?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--text-muted)]">
              {importState.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
