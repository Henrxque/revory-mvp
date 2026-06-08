"use client";

import { AiCsvTriagePanel } from "@/components/imports/AiCsvTriagePanel";
import { AssistedImportMappingPreview } from "@/components/imports/AssistedImportMappingPreview";
import { DataQualityCheckCard } from "@/components/imports/DataQualityCheckCard";
import type {
  AssistedImportConfirmationDraft,
  AssistedImportPreview,
  AssistedImportTargetOption,
} from "@/lib/imports/assisted-import";
import type {
  RevoryCsvTriageReviewState,
} from "@/types/imports";

type CsvMappingReviewProps = Readonly<{
  confirmationDraft: AssistedImportConfirmationDraft;
  currentPreview: AssistedImportPreview;
  initialPreview: AssistedImportPreview;
  isTriagePending: boolean;
  onMappingChange: (sourceHeader: string, targetColumnValue: string) => void;
  selectedFileName: string | null;
  targetOptions: AssistedImportTargetOption[];
  triage: RevoryCsvTriageReviewState | null;
}>;

export function CsvMappingReview({
  confirmationDraft,
  currentPreview,
  initialPreview,
  isTriagePending,
  onMappingChange,
  selectedFileName,
  targetOptions,
  triage,
}: CsvMappingReviewProps) {
  return (
    <div className="space-y-4">
      <div
        className={
          triage?.status === "ready"
            ? "grid gap-4 xl:grid-cols-[0.78fr_1.22fr]"
            : "grid gap-4"
        }
      >
        <AiCsvTriagePanel isPending={isTriagePending} triage={triage} />
        <DataQualityCheckCard triage={triage} />
      </div>
      <AssistedImportMappingPreview
        confirmationDraft={confirmationDraft}
        currentPreview={currentPreview}
        initialPreview={initialPreview}
        onMappingChange={onMappingChange}
        selectedFileName={selectedFileName}
        targetOptions={targetOptions}
      />
    </div>
  );
}
