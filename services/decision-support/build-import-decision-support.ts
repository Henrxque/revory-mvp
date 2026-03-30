import type { RevoryDecisionSupportRead } from "@/types/decision-support";
import type {
  RevoryAssistedImportConfirmationDraft,
  RevoryAssistedImportPreview,
  RevoryCsvTemplateKey,
  RevoryCsvUploadActionState,
} from "@/types/imports";

type BuildImportDecisionSupportInput = {
  confirmationDraft: RevoryAssistedImportConfirmationDraft | null;
  currentPreview: RevoryAssistedImportPreview | null;
  lastUpload: {
    errorRows: number;
    fileName: string | null;
    importedAt: string | null;
    status: string;
    successRows: number;
    totalRows: number;
  } | null;
  selectedFileName: string | null;
  templateKey: RevoryCsvTemplateKey;
  uploadState: RevoryCsvUploadActionState;
};

function getLaneLabel(templateKey: RevoryCsvTemplateKey) {
  return templateKey === "appointments" ? "booked proof" : "lead-base support";
}

export function buildImportDecisionSupport({
  confirmationDraft,
  currentPreview,
  lastUpload,
  selectedFileName,
  templateKey,
  uploadState,
}: BuildImportDecisionSupportInput): RevoryDecisionSupportRead {
  const laneLabel = getLaneLabel(templateKey);
  const isAppointments = templateKey === "appointments";
  const latestVisibleRows = lastUpload?.successRows ?? 0;
  const latestHeldRows = lastUpload?.errorRows ?? 0;

  if (uploadState.status === "imported" && uploadState.importSummary) {
    return {
      badgeLabel: "Guided recommendation",
      detectedObjection:
        uploadState.importSummary.errorRows > 0
          ? "Held rows still limit this lane's trust."
          : "This pass is clean, but this lane still needs fresh files over time.",
      eyebrow: "Controlled Read",
      nextBestAction:
        isAppointments
          ? uploadState.importSummary.errorRows > 0
            ? "Use this result as the stronger booked-proof base, then correct the held-back rows on the next pass before you lean harder on revenue."
            : "Booked proof is stronger. If the appointments look right, open Revenue View next."
          : uploadState.importSummary.errorRows > 0
            ? "Keep this lead-base pass and clean held rows only when stronger support is needed."
            : "Lead-base support is cleaner. Keep it secondary to booked proof.",
      recommendedPath: isAppointments
        ? "Booked proof lane -> revenue view"
        : "Lead-base support -> revenue context only if needed",
      signals: [
        {
          label: "Rows visible",
          note: "This is the current file contribution that made it into the lane.",
          value: `${uploadState.importSummary.successRows}`,
        },
        {
          label: "Rows held back",
          note: "Rows held back stay outside the live view until corrected.",
          value: `${uploadState.importSummary.errorRows}`,
        },
        {
          label: "Lane effect",
          note: isAppointments
            ? "Appointments are what make revenue proof believable."
            : "Lead-base support should stay secondary to booked proof.",
          value: isAppointments ? "Revenue support" : "Context support",
        },
      ],
      summary:
        isAppointments
          ? "This read translates the current file into the revenue story without opening a broad console."
          : "This read keeps client files useful, but secondary to booked proof.",
      title: isAppointments
        ? "The current file strengthened booked proof."
        : "The current file strengthened lead-base support.",
      tone: uploadState.importSummary.errorRows > 0 ? "future" : "real",
    };
  }

  if (currentPreview && confirmationDraft) {
    const blockingTitle =
      currentPreview.missingRequiredColumns.length > 0 ||
      currentPreview.missingIdentityPath ||
      currentPreview.duplicateTargets.length > 0 ||
      currentPreview.duplicateSourceHeaders.length > 0;

    return {
      badgeLabel: "Guided recommendation",
      detectedObjection:
        currentPreview.missingRequiredColumns.length > 0
          ? "Required Seller fields are still missing."
          : currentPreview.missingIdentityPath
            ? "Seller still needs one client identifier."
            : currentPreview.duplicateTargets.length > 0 || currentPreview.duplicateSourceHeaders.length > 0
              ? "Header ambiguity still blocks a trustworthy pass."
              : confirmationDraft.suggestedPendingConfirmationCount > 0
                ? "Suggested matches still need one quick confirmation."
                : "No material blocker is left in this file.",
      eyebrow: "Controlled Read",
      nextBestAction:
        currentPreview.exactTemplateMatch
          ? "This file already matches the official REVORY structure. Open final review and keep the pass short."
          : confirmationDraft.suggestedPendingConfirmationCount > 0
            ? `Review the ${confirmationDraft.suggestedPendingConfirmationCount} suggested field${confirmationDraft.suggestedPendingConfirmationCount === 1 ? "" : "s"}, then confirm.`
            : "The mapping looks clean. Open final review to apply this file.",
      recommendedPath: currentPreview.exactTemplateMatch
        ? "Official mapping -> final review -> visibility update"
        : "Guided mapping -> final review -> visibility update",
      signals: [
        {
          label: "Confident matches",
          note: "Fields REVORY already matched with high confidence.",
          value: `${confirmationDraft.keptConfidentMatchCount}`,
        },
        {
          label: "Still to confirm",
          note: "Short manual review keeps this lane honest instead of automatic.",
          value: `${confirmationDraft.suggestedPendingConfirmationCount}`,
        },
        {
          label: "Lane target",
          note: isAppointments
            ? "Appointments should become visible before the revenue read carries the story."
            : "Client records should stay supporting context behind booked proof.",
          value: isAppointments ? "Booked proof" : "Lead base",
        },
      ],
      summary: blockingTitle
        ? "This read isolates the main blocker so the risk stays clear."
        : "This read keeps file-fit review short: confirm risky headers, then move forward.",
      title: blockingTitle
        ? `REVORY found the main blocker in this ${laneLabel} file.`
        : currentPreview.exactTemplateMatch
          ? `This ${laneLabel} file already fits Seller cleanly.`
          : `REVORY found the high-confidence shape of this ${laneLabel} file.`,
      tone: blockingTitle ? "future" : currentPreview.exactTemplateMatch ? "real" : "accent",
    };
  }

  if (selectedFileName) {
    return {
      badgeLabel: "Guided recommendation",
      detectedObjection:
        "File selected, but nothing should look live before header review.",
      eyebrow: "Controlled Read",
      nextBestAction:
        "Wait for file-fit read to finish. Next decision is mapping review.",
      recommendedPath: "File read -> mapping review -> controlled visibility update",
      signals: [
        {
          label: "Current file",
          note: "This is the file currently under review.",
          value: selectedFileName,
        },
        {
          label: "Lane",
          note: "Each lane stays narrow on purpose.",
          value: isAppointments ? "Booked proof" : "Lead base",
        },
        {
          label: "Live effect",
          note: "Nothing becomes visible until the short review is confirmed.",
          value: "Not live yet",
        },
      ],
      summary:
        "This read keeps orientation while REVORY parses the file.",
      title: `REVORY is reading the ${laneLabel} file fit.`,
      tone: "accent",
    };
  }

  return {
    badgeLabel: "Guided recommendation",
    detectedObjection:
      isAppointments
        ? "Without appointments, the revenue read stays weak."
        : "Lead-base support should not be the first move.",
    eyebrow: "Controlled Read",
    nextBestAction:
      isAppointments
        ? "Start with the appointments file first. It is the shortest path to booked proof."
        : "Add client records only after booked proof, when stronger context is needed.",
    recommendedPath: isAppointments
      ? "Appointments upload -> booked proof -> revenue view"
      : "Lead-base support after booked proof",
    signals: [
      {
        label: "Latest visible rows",
        note: "Saved state for this lane, if one exists.",
        value: `${latestVisibleRows}`,
      },
      {
        label: "Latest held rows",
        note: "Rows held back in the last saved pass.",
        value: `${latestHeldRows}`,
      },
      {
        label: "Lane role",
        note: isAppointments
          ? "This lane carries the strongest proof value in the product."
          : "This lane stays supportive, not central.",
        value: isAppointments ? "Primary proof" : "Secondary support",
      },
    ],
    summary:
      "Controlled guidance: one recommendation, one blocker, one next move.",
    title: isAppointments
      ? "Booked proof is still the highest-value next move."
      : "Lead-base support belongs after booked proof.",
    tone: isAppointments ? "accent" : "neutral",
  };
}
