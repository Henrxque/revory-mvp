"use client";

import { useRef, useState, useTransition } from "react";

import type { CanonicalEntityType } from "@/domain/revory/contracts";
import { canonicalFields } from "@/services/canonical-intake/definitions";
import {
  importCanonicalFiles,
  reviewCanonicalFiles,
  type CanonicalImportActionState,
  type CanonicalReviewActionState,
} from "@/src/app/(app)/app/imports/canonical-actions";

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

const initialCanonicalImportActionState: CanonicalImportActionState = {
  message: "",
  status: "idle",
};

export function CanonicalImportPanel() {
  const [sourceSystem, setSourceSystem] = useState("manual-export");
  const selectedFiles = useRef<Partial<Record<CanonicalEntityType, File>>>({});
  const [review, setReview] = useState<CanonicalReviewActionState | null>(null);
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [importState, setImportState] = useState<CanonicalImportActionState>(
    initialCanonicalImportActionState,
  );
  const [pending, startTransition] = useTransition();

  function submitReview(formData: FormData) {
    startTransition(async () => {
      setImportState(initialCanonicalImportActionState);
      setReview(await reviewCanonicalFiles(formData));
    });
  }

  function submitImport() {
    if (!mappingConfirmed) {
      setImportState({
        message: "Check the explicit mapping confirmation before import.",
        status: "error",
      });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sourceSystem", sourceSystem);
      formData.set("mappingConfirmed", "yes");
      for (const [entityType, file] of Object.entries(selectedFiles.current)) {
        if (file) formData.set(`file_${entityType}`, file);
      }
      for (const file of review?.files ?? []) {
        formData.set(`mapping_${file.entityType}`, JSON.stringify(file.mapping));
      }
      setImportState(await importCanonicalFiles(initialCanonicalImportActionState, formData));
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

  return (
    <section className="rev-shell-panel rounded-[28px] p-6 md:p-7">
      <div className="max-w-3xl space-y-3">
        <p className="rev-kicker">Canonical secure intake · Sprints 7–8 local preview</p>
        <h2 className="rev-display-section">Profile, review, then commit the evidence.</h2>
        <p className="text-sm leading-6 text-[color:var(--text-muted)]">
          REVORY profiles structure and headers deterministically. Optional AI may suggest
          uncertain header mappings from sanitized metadata only; Data Quality and your
          explicit confirmation remain mandatory before one atomic commit.
        </p>
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

      <form action={submitReview} className="mt-5 space-y-5" id="canonical-intake-form">
        <label className="block max-w-md text-sm font-semibold">
          Source system
          <input
            className="rev-input-field mt-2 w-full"
            maxLength={80}
            name="sourceSystem"
            onChange={(event) => {
              setSourceSystem(event.target.value);
              setReview(null);
            }}
            value={sourceSystem}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {activeDatasets.map(([key, label, description, layer]) => (
            <label
              className="rev-card-hover rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm font-bold"
              key={key}
            >
            <span className="flex items-center justify-between gap-2">
              {label}
              {layer === "REVENUE_REALIZATION" ? (
                <span className="rounded-full border border-[color:var(--border-accent)] px-2 py-1 text-[8px] uppercase tracking-wider text-[color:var(--accent-light)]">
                  Reconciliation
                </span>
              ) : null}
            </span>
            <span className="mt-1 block min-h-10 text-xs font-normal leading-5 text-[color:var(--text-muted)]">
              {description}
            </span>
            <input
              aria-label={`${label} file`}
              accept=".csv,.xlsx"
              className="mt-3 block w-full text-xs font-normal text-[color:var(--text-muted)]"
              name={`file_${key}`}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) selectedFiles.current[key] = file;
                else delete selectedFiles.current[key];
                setReview(null);
                setMappingConfirmed(false);
                setImportState(initialCanonicalImportActionState);
              }}
              type="file"
            />
            </label>
          ))}
        </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rev-button-primary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Profiling…" : "Profile files and review mapping"}
        </button>
        <p className="max-w-xl text-xs leading-5 text-[color:var(--text-subtle)]">
          Jobs, invoices, change orders and costs now support local ingestion and
          deterministic reconciliation review. They do not create premium findings or
          unlock Revenue Realization pricing before Sprint 9.
        </p>
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
          <button
            className="rev-button-primary"
            disabled={pending || review.status !== "ready"}
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
