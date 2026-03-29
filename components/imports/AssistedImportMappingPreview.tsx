"use client";

import {
  formatImportColumnLabel,
  type AssistedImportConfirmationDraft,
  type AssistedImportDecision,
  type AssistedImportDecisionState,
  type AssistedImportPreview,
  type AssistedImportTargetOption,
} from "@/lib/imports/assisted-import";
import type { RevoryCsvColumn } from "@/types/imports";

type AssistedImportMappingPreviewProps = Readonly<{
  confirmationDraft: AssistedImportConfirmationDraft;
  currentPreview: AssistedImportPreview;
  initialPreview: AssistedImportPreview;
  onMappingChange: (sourceHeader: string, targetColumnValue: string) => void;
  selectedFileName: string | null;
  targetOptions: AssistedImportTargetOption[];
}>;

type SummaryTone = "neutral" | "success" | "warning" | "danger";

function getToneClassName(tone: SummaryTone) {
  switch (tone) {
    case "success":
      return "border-[rgba(46,204,134,0.22)] bg-[rgba(46,204,134,0.12)] text-[color:var(--success)]";
    case "warning":
      return "border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.12)] text-[color:var(--warning)]";
    case "danger":
      return "border-[rgba(255,114,141,0.35)] bg-[rgba(255,114,141,0.1)] text-[color:var(--danger)]";
    default:
      return "border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] text-[color:var(--text-muted)]";
  }
}

function getSuggestionTone(
  option: AssistedImportPreview["mappingOptions"][number],
): SummaryTone {
  switch (option.matchStatus) {
    case "matched_with_confidence":
      return "success";
    case "suggested_needs_confirmation":
      return "warning";
    default:
      return "danger";
  }
}

function getDecisionTone(decisionState: AssistedImportDecisionState): SummaryTone {
  switch (decisionState) {
    case "kept_confident_match":
      return "success";
    case "mapped_by_user":
      return "neutral";
    case "suggested_pending_confirmation":
      return "warning";
    default:
      return "danger";
  }
}

function getSuggestionBadgeLabel(
  option: AssistedImportPreview["mappingOptions"][number],
) {
  switch (option.matchStatus) {
    case "matched_with_confidence":
      return "Confident match";
    case "suggested_needs_confirmation":
      return "Needs confirmation";
    default:
      return "Unresolved";
  }
}

function getDecisionBadgeLabel(decisionState: AssistedImportDecisionState) {
  switch (decisionState) {
    case "kept_confident_match":
      return "Kept";
    case "mapped_by_user":
      return "Adjusted";
    case "suggested_pending_confirmation":
      return "Review";
    default:
      return "Pending";
  }
}

function getDecisionCopy(decision: AssistedImportDecision) {
  switch (decision.decisionState) {
    case "kept_confident_match":
      return "REVORY matched this field with confidence and the current mapping keeps that confident match.";
    case "mapped_by_user":
      return "The current mapping differs from the original suggestion and now reflects the user's choice.";
    case "suggested_pending_confirmation":
      return "REVORY suggested this field, but it still deserves a final review before import confirmation.";
    default:
      return "No final REVORY field is selected yet for this source column.";
  }
}

function getDecisionSurfaceClassName(tone: SummaryTone) {
  switch (tone) {
    case "success":
      return "border-[rgba(46,204,134,0.18)] bg-[linear-gradient(180deg,rgba(46,204,134,0.06),rgba(255,255,255,0.02))]";
    case "warning":
      return "border-[rgba(245,166,35,0.18)] bg-[linear-gradient(180deg,rgba(245,166,35,0.06),rgba(255,255,255,0.02))]";
    case "danger":
      return "border-[rgba(255,114,141,0.22)] bg-[linear-gradient(180deg,rgba(255,114,141,0.06),rgba(255,255,255,0.02))]";
    default:
      return "border-[color:var(--border)] bg-[rgba(255,255,255,0.02)]";
  }
}

function getBlockingItems(
  currentPreview: AssistedImportPreview,
  confirmationDraft: AssistedImportConfirmationDraft,
) {
  const items: Array<{
    body: string;
    title: string;
    tone: SummaryTone;
  }> = [];

  if (currentPreview.duplicateSourceHeaders.length > 0) {
    items.push({
      body: `The source file repeats these headers: ${currentPreview.duplicateSourceHeaders.join(
        ", ",
      )}. Each source column must appear only once before import can continue.`,
      title: "Duplicate source headers",
      tone: "danger",
    });
  }

  if (currentPreview.missingRequiredColumns.length > 0) {
    items.push({
      body: `Map the required REVORY fields before importing: ${currentPreview.missingRequiredColumns
        .map((column) => formatImportColumnLabel(column))
        .join(", ")}.`,
      title: "Required fields still missing",
      tone: "warning",
    });
  }

  if (currentPreview.missingIdentityPath) {
    items.push({
      body: `Choose at least one client identifier so REVORY can connect rows reliably: ${currentPreview.identityColumns
        .map((column) => formatImportColumnLabel(column))
        .join(", ")}.`,
      title: "Client identity path required",
      tone: "warning",
    });
  }

  if (currentPreview.duplicateTargets.length > 0) {
    items.push({
      body: `Only one source column can feed each REVORY field. Review: ${currentPreview.duplicateTargets
        .map((column) => formatImportColumnLabel(column))
        .join(", ")}.`,
      title: "Conflicting final mapping",
      tone: "danger",
    });
  }

  if (items.length === 0 && confirmationDraft.suggestedPendingConfirmationCount > 0) {
    items.push({
      body: `${confirmationDraft.suggestedPendingConfirmationCount} column${
        confirmationDraft.suggestedPendingConfirmationCount === 1 ? "" : "s"
      } still sit in REVORY's suggested state. Import can continue, but these are the fields worth checking twice.`,
      title: "Review still recommended",
      tone: "neutral",
    });
  }

  if (items.length === 0) {
    items.push({
      body: "Required fields are ready, the identity path is covered, and the current mapping can proceed to the final import step.",
      title: "Mapping ready to move forward",
      tone: "success",
    });
  }

  return items;
}

function getTargetMetaLabel(
  targetOptionsMap: Map<RevoryCsvColumn, AssistedImportTargetOption>,
  targetColumn: RevoryCsvColumn | null,
) {
  if (!targetColumn) {
    return "Ignored for now";
  }

  const option = targetOptionsMap.get(targetColumn);

  if (!option) {
    return "REVORY field";
  }

  if (option.isRequired) {
    return "Required REVORY field";
  }

  if (option.isIdentity) {
    return "Client identifier path";
  }

  return "Optional REVORY field";
}

export function AssistedImportMappingPreview({
  confirmationDraft,
  currentPreview,
  initialPreview,
  onMappingChange,
  selectedFileName,
  targetOptions,
}: AssistedImportMappingPreviewProps) {
  const targetOptionsMap = new Map(
    targetOptions.map((targetOption) => [targetOption.column, targetOption]),
  );
  const initialOptionsBySourceHeader = new Map(
    initialPreview.mappingOptions.map((option) => [option.sourceHeader, option]),
  );
  const blockingItems = getBlockingItems(currentPreview, confirmationDraft);
  const progressStatus = !confirmationDraft.canProceed
    ? { label: "Needs attention", tone: "warning" as const }
    : confirmationDraft.suggestedPendingConfirmationCount > 0
      ? { label: "Review recommended", tone: "neutral" as const }
      : { label: "Ready", tone: "success" as const };

  return (
    <div className="grid min-w-0 gap-4 2xl:grid-cols-[0.82fr_1.18fr]">
      <div className="min-w-0 space-y-4 2xl:sticky 2xl:top-5 2xl:self-start">
        <div className="rev-card rounded-[24px] p-5">
          <p className="rev-label">Mapping review</p>
          <h3 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            Review the proposed mapping before import.
          </h3>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            REVORY shows its first suggested mapping. You keep it, adjust it, or leave
            a field out before the file can move to final confirmation.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                File received
              </p>
              <p className="mt-2 truncate text-base font-semibold text-[color:var(--foreground)]">
                {selectedFileName ?? "Awaiting source file"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                {currentPreview.totalHeaderCount} header
                {currentPreview.totalHeaderCount === 1 ? "" : "s"} detected.
              </p>
              {currentPreview.duplicateSourceHeaders.length > 0 ? (
                <p className="mt-2 text-sm leading-6 text-[color:var(--danger)]">
                  Duplicate header names found: {currentPreview.duplicateSourceHeaders.join(", ")}.
                </p>
              ) : null}
            </div>

            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                REVORY suggestion
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {initialPreview.matchedWithConfidenceCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Confident matches
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {initialPreview.suggestedCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Need confirmation
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {initialPreview.unresolvedCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">Unresolved</p>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Current decision
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {confirmationDraft.requiredMatchedCount}/{confirmationDraft.requiredTotalCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Required fields ready
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {confirmationDraft.mappedByUserCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Adjusted manually
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {confirmationDraft.keptConfidentMatchCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Confident matches kept
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {confirmationDraft.unmappedCount}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">Still ignored</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rev-card rounded-[24px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="rev-label">Progress blockers</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                {confirmationDraft.canProceed
                  ? "Mapping can move forward"
                  : "Resolve the blockers below"}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getToneClassName(
                progressStatus.tone,
              )}`}
            >
              {progressStatus.label}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {blockingItems.map((item) => (
              <div
                key={item.title}
                className={`rounded-[18px] border px-4 py-4 ${getToneClassName(item.tone)}`}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rev-card min-w-0 rounded-[24px] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className="rev-label">Column mapping preview</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
              Keep the suggestion or make the final decision.
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
              The right column is the only field that controls what goes into the
              import. Everything else is context for that choice.
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Guided mapping only
          </span>
        </div>

        <div className="mt-5 hidden rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)] 2xl:grid 2xl:grid-cols-[0.72fr_0.88fr_1.12fr] 2xl:gap-4">
          <span>File received</span>
          <span>REVORY suggestion</span>
          <span>Current mapping decision</span>
        </div>

        <div className="mt-4 max-h-[760px] min-w-0 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
          {confirmationDraft.decisions.map((decision, index) => {
            const initialOption = initialOptionsBySourceHeader.get(decision.sourceHeader);
            const currentTargetColumn = decision.finalTargetColumn ?? "";
            const currentTone = getDecisionTone(decision.decisionState);
            const systemTone = initialOption ? getSuggestionTone(initialOption) : "danger";

            return (
              <div
                key={`${decision.sourceHeader}-${index}`}
                className={`min-w-0 rounded-[22px] border p-4 ${getDecisionSurfaceClassName(
                  currentTone,
                )}`}
              >
                <div className="grid min-w-0 gap-4 2xl:grid-cols-[0.72fr_0.88fr_1.12fr]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                        Source
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[color:var(--foreground)]">
                        {decision.sourceHeader}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                        Uploaded header detected in this file.
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                        REVORY suggestion
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getToneClassName(systemTone)}`}
                      >
                        {initialOption ? getSuggestionBadgeLabel(initialOption) : "Unresolved"}
                      </span>
                    </div>

                    {decision.systemSuggestedColumn ? (
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {formatImportColumnLabel(decision.systemSuggestedColumn)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                          {decision.systemReason}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          No safe suggestion yet
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                          REVORY could not match this header with enough confidence,
                          so the final choice remains open.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                        Final decision
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getToneClassName(currentTone)}`}
                      >
                        {getDecisionBadgeLabel(decision.decisionState)}
                      </span>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                        Map to REVORY field
                      </span>
                      <select
                        className={`rev-select-field ${
                          decision.finalTargetColumn
                            ? decision.decisionState === "kept_confident_match"
                              ? "!border-[rgba(46,204,134,0.26)]"
                              : decision.decisionState === "mapped_by_user"
                                ? "!border-[color:var(--border-accent)]"
                                : "!border-[rgba(245,166,35,0.26)]"
                            : "!border-[rgba(255,114,141,0.24)]"
                        }`}
                        onChange={(event) => {
                          onMappingChange(decision.sourceHeader, event.target.value);
                        }}
                        value={currentTargetColumn}
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

                    <div
                      className={`rounded-[18px] border px-4 py-4 ${getToneClassName(
                        currentTone,
                      )}`}
                    >
                      <p className="text-sm font-semibold">
                        {decision.finalTargetColumn
                          ? formatImportColumnLabel(decision.finalTargetColumn)
                          : "Ignored for now"}
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {getDecisionCopy(decision)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-80">
                        {getTargetMetaLabel(targetOptionsMap, decision.finalTargetColumn)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
