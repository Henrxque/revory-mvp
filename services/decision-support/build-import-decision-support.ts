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

function getSupportLabel(templateKey: RevoryCsvTemplateKey) {
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
  const supportLabel = getSupportLabel(templateKey);
  const isAppointments = templateKey === "appointments";
  const latestVisibleRows = lastUpload?.successRows ?? 0;
  const latestHeldRows = lastUpload?.errorRows ?? 0;

  if (uploadState.status === "imported" && uploadState.importSummary) {
    return {
      badgeLabel: "Controlled read",
      detectedObjection:
        uploadState.importSummary.errorRows > 0
          ? "Held rows still need review."
          : "Pass clean and visible.",
      eyebrow: isAppointments ? "Booked proof read" : "Lead-base read",
      fallbackLabel: "If confidence softens",
      fallbackNote:
        isAppointments
          ? "If proof weakens, keep revenue unchanged until the next clean pass."
          : "If support weakens, keep lead base secondary.",
      guardrailLabel: "Seller stays narrow",
      guardrailNote: "Proof first. Lead support second.",
      nextBestAction:
        isAppointments
          ? uploadState.importSummary.errorRows > 0
            ? "Keep this pass and clear held rows on the next upload."
            : "Proof is clean. Open Revenue View."
          : uploadState.importSummary.errorRows > 0
            ? "Keep this pass and clean held rows only when needed."
            : "Support is clean. Keep it secondary to proof.",
      recommendedPath: isAppointments
        ? "Booked proof -> revenue view"
        : "Lead base -> support revenue context",
      signals: [
        {
          label: isAppointments ? "Proof strength" : "Current support",
          note: isAppointments
            ? "Rows now visible in proof."
            : "Rows now visible in support.",
          value: `${uploadState.importSummary.successRows}`,
        },
        {
          label: "What needs review",
          note: "Held rows remain outside the live view.",
          value: `${uploadState.importSummary.errorRows}`,
        },
        {
          label: "Current support",
          note: isAppointments
            ? "Appointments anchor revenue proof."
            : "Lead base stays secondary.",
          value: isAppointments ? "Revenue support" : "Context support",
        },
      ],
      summary:
        isAppointments
          ? "Revenue proof updated."
          : "Lead-base support updated.",
      title: isAppointments
        ? "Booked proof updated."
        : "Lead-base support updated.",
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
      badgeLabel: "Controlled read",
      detectedObjection:
        currentPreview.missingRequiredColumns.length > 0
          ? "Required fields are missing."
          : currentPreview.missingIdentityPath
            ? "Add one client identifier."
            : currentPreview.duplicateTargets.length > 0 || currentPreview.duplicateSourceHeaders.length > 0
              ? "Resolve duplicate header mapping."
              : confirmationDraft.suggestedPendingConfirmationCount > 0
                ? "Review suggested matches."
                : "No blocker left.",
      eyebrow: isAppointments ? "Booked proof read" : "Lead-base read",
      fallbackLabel: "If confidence softens",
      fallbackNote: "Nothing goes live before final confirmation.",
      guardrailLabel: "Seller stays narrow",
      guardrailNote: "Read headers, confirm mapping, then make visible.",
      nextBestAction:
        currentPreview.exactTemplateMatch
          ? "Open final review and confirm."
          : confirmationDraft.suggestedPendingConfirmationCount > 0
            ? `Confirm ${confirmationDraft.suggestedPendingConfirmationCount} suggested field${confirmationDraft.suggestedPendingConfirmationCount === 1 ? "" : "s"}.`
            : "Mapping clean. Open final review.",
      recommendedPath: currentPreview.exactTemplateMatch
        ? "Official mapping -> final review -> make visible"
        : "Guided mapping -> final review -> make visible",
      signals: [
        {
          label: "Proof strength",
          note: "High-confidence matches.",
          value: `${confirmationDraft.keptConfidentMatchCount}`,
        },
        {
          label: "What needs review",
          note: "Suggested fields pending your confirmation.",
          value: `${confirmationDraft.suggestedPendingConfirmationCount}`,
        },
        {
          label: "Current support",
          note: isAppointments
            ? "Proof should go live before revenue read."
            : "Lead base should stay support-only.",
          value: isAppointments ? "Booked proof" : "Lead base",
        },
      ],
      summary: blockingTitle
        ? "One blocker, one next move."
        : "Mapping looks ready.",
      title: blockingTitle
        ? `Blocker found in ${supportLabel}.`
        : currentPreview.exactTemplateMatch
          ? `${supportLabel} fits cleanly.`
          : `${supportLabel} mapped with high confidence.`,
      tone: blockingTitle ? "future" : currentPreview.exactTemplateMatch ? "real" : "accent",
    };
  }

  if (selectedFileName) {
    return {
      badgeLabel: "Controlled read",
      detectedObjection: "File selected. Not live yet.",
      eyebrow: isAppointments ? "Booked proof read" : "Lead-base read",
      fallbackLabel: "If confidence softens",
      fallbackNote: "Live state stays unchanged until final confirmation.",
      guardrailLabel: "Seller stays narrow",
      guardrailNote: "Read stays contained to this file.",
      nextBestAction: "Wait for header read, then confirm mapping.",
      recommendedPath: "Read file -> review mapping -> make visible",
      signals: [
        {
          label: "Current file",
          note: "File under review.",
          value: selectedFileName,
        },
        {
          label: "Current support",
          note: "This read stays narrow.",
          value: isAppointments ? "Booked proof" : "Lead base",
        },
        {
          label: "Current effect",
          note: "Nothing changes in live view yet.",
          value: "Not live yet",
        },
      ],
      summary: "Reading current file.",
      title: `Reading ${supportLabel} file.`,
      tone: "accent",
    };
  }

  return {
    badgeLabel: "Controlled read",
    detectedObjection:
      isAppointments
        ? "Revenue read needs booked proof."
        : "Lead base should not be first move.",
    eyebrow: isAppointments ? "Booked proof read" : "Lead-base read",
    fallbackLabel: "If confidence softens",
    fallbackNote:
      isAppointments
        ? "Without proof, revenue stays pending."
        : "Without support, keep proof as the main read.",
    guardrailLabel: "Seller stays narrow",
    guardrailNote: "Booked proof stays primary. Lead base stays secondary.",
    nextBestAction:
      isAppointments
        ? "Upload appointments first."
        : "Add clients after proof when needed.",
    recommendedPath: isAppointments
      ? "Upload appointments -> booked proof -> revenue view"
      : "Lead base after booked proof",
    signals: [
      {
        label: "Current support",
        note: "Rows visible from latest pass.",
        value: `${latestVisibleRows}`,
      },
      {
        label: "What needs review",
        note: "Rows held from latest pass.",
        value: `${latestHeldRows}`,
      },
      {
        label: "Support role",
        note: isAppointments
          ? "Main proof read."
          : "Secondary support read.",
        value: isAppointments ? "Primary proof" : "Secondary support",
      },
    ],
    summary: "State, next move, and support.",
    title: isAppointments
      ? "Booked proof is the next move."
      : "Lead base comes after proof.",
    tone: isAppointments ? "accent" : "neutral",
  };
}
