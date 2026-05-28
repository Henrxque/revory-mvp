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
  return templateKey === "appointments" ? "appointment evidence" : "client context";
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
      eyebrow: isAppointments ? "Appointment evidence read" : "Client context read",
      fallbackLabel: "If confidence softens",
      fallbackNote:
        isAppointments
          ? "If evidence weakens, keep the revenue risk read conservative until the next clean pass."
          : "If context weakens, keep client data secondary to appointment evidence.",
      guardrailLabel: "REVORY stays narrow",
      guardrailNote: "Appointment evidence first. Client context second.",
      nextBestAction:
        isAppointments
          ? uploadState.importSummary.errorRows > 0
            ? "Keep this pass and clear held rows on the next upload."
            : "Evidence is clean. Open Revenue Read."
          : uploadState.importSummary.errorRows > 0
            ? "Keep this pass and clean held rows only when needed."
            : "Context is clean. Keep it secondary to appointment evidence.",
      recommendedPath: isAppointments
        ? "Appointment evidence -> revenue risk read"
        : "Client context -> support revenue risk read",
      signals: [
        {
          label: isAppointments ? "Evidence strength" : "Current context",
          note: isAppointments
            ? "Rows now visible for leak-risk review."
            : "Rows now visible as client context.",
          value: `${uploadState.importSummary.successRows}`,
        },
        {
          label: "What needs review",
          note: "Held rows remain outside the live view.",
          value: `${uploadState.importSummary.errorRows}`,
        },
        {
          label: "Role in REVORY",
          note: isAppointments
            ? "Appointments anchor the revenue risk read."
            : "Client context stays secondary.",
          value: isAppointments ? "Risk evidence" : "Context support",
        },
      ],
      summary:
        isAppointments
          ? "Appointment evidence updated."
          : "Client context updated.",
      title: isAppointments
        ? "Appointment evidence updated."
        : "Client context updated.",
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
      eyebrow: isAppointments ? "Appointment evidence read" : "Client context read",
      fallbackLabel: "If confidence softens",
      fallbackNote: "Nothing goes live before final confirmation.",
      guardrailLabel: "REVORY stays narrow",
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
          label: "Mapping confidence",
          note: "High-confidence matches.",
          value: `${confirmationDraft.keptConfidentMatchCount}`,
        },
        {
          label: "What needs review",
          note: "Suggested fields pending your confirmation.",
          value: `${confirmationDraft.suggestedPendingConfirmationCount}`,
        },
        {
          label: "Role in REVORY",
          note: isAppointments
            ? "Appointment status should go live before stronger leak reads."
            : "Client context should stay support-only.",
          value: isAppointments ? "Appointment evidence" : "Client context",
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
      eyebrow: isAppointments ? "Appointment evidence read" : "Client context read",
      fallbackLabel: "If confidence softens",
      fallbackNote: "Live state stays unchanged until final confirmation.",
      guardrailLabel: "REVORY stays narrow",
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
          label: "Role in REVORY",
          note: "This read stays narrow.",
          value: isAppointments ? "Appointment evidence" : "Client context",
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
        ? "Revenue risk read needs appointment evidence."
        : "Client context should not be first move.",
    eyebrow: isAppointments ? "Appointment evidence read" : "Client context read",
    fallbackLabel: "If confidence softens",
    fallbackNote:
      isAppointments
        ? "Without appointment evidence, the revenue risk read stays pending."
        : "Without client context, keep appointment evidence as the main read.",
    guardrailLabel: "REVORY stays narrow",
    guardrailNote: "Appointment evidence stays primary. Client context stays secondary.",
    nextBestAction:
      isAppointments
        ? "Upload appointments first."
        : "Add clients after appointment evidence when needed.",
    recommendedPath: isAppointments
      ? "Upload appointments -> evidence read -> revenue risk read"
      : "Client context after appointment evidence",
    signals: [
      {
        label: "Visible now",
        note: "Rows visible from latest pass.",
        value: `${latestVisibleRows}`,
      },
      {
        label: "What needs review",
        note: "Rows held from latest pass.",
        value: `${latestHeldRows}`,
      },
      {
        label: "Role in REVORY",
        note: isAppointments
          ? "Main evidence read."
          : "Secondary context read.",
        value: isAppointments ? "Primary evidence" : "Secondary context",
      },
    ],
    summary: "State, next move, and support.",
    title: isAppointments
      ? "Appointment evidence is the next move."
      : "Client context comes after appointment evidence.",
    tone: isAppointments ? "accent" : "neutral",
  };
}
