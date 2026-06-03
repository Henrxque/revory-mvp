import type { RevenueLeakConfidence } from "@prisma/client";

import type { RevenueLeakEvidenceSummary } from "@/services/revenue-leaks/revenue-leak-evidence-summary";

export type RevenueLeakConfidenceCopy = {
  explanation: string;
  label: string;
};

export function buildRevenueLeakConfidenceCopy(input: {
  confidence: RevenueLeakConfidence;
  evidenceSummary: RevenueLeakEvidenceSummary;
}): RevenueLeakConfidenceCopy {
  const suppliedReason = input.evidenceSummary.confidenceReason;

  switch (input.confidence) {
    case "HIGH":
      return {
        explanation:
          suppliedReason ??
          "High confidence means the signal is supported by specific structured evidence. It is still an estimate, not a confirmed accounting loss.",
        label: "High confidence",
      };
    case "MEDIUM":
      return {
        explanation:
          suppliedReason ??
          "Medium confidence means the signal is usable, but value, contact or recovery evidence may be incomplete.",
        label: "Medium confidence",
      };
    case "LOW":
      return {
        explanation:
          suppliedReason ??
          "Low confidence means the signal should be reviewed before using it for revenue-risk decisions.",
        label: "Low confidence",
      };
  }
}
