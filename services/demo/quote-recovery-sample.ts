export const quoteRecoverySample = {
  dataQuality: {
    acceptedRows: 148,
    eligibility: "6 of 6 Quote Recovery rules eligible",
    linkedRecords: 141,
    unmatchedRecords: 7,
  },
  generatedAt: "2026-07-12T12:00:00.000Z",
  metrics: {
    activeFindings: 12,
    estimatedRecoverableCents: 12640000,
    operationalFindings: 4,
    reviewedEstimateValueCents: 41800000,
  },
  opportunities: [
    {
      confidence: "HIGH",
      customer: "Cedar Ridge Renovation",
      estimateExternalId: "EST-SAMPLE-1042",
      evidence: [
        ["status", "open", "sample-estimates.csv · row 18"],
        ["amount", "$42,800", "sample-estimates.csv · row 18"],
        ["last activity", "28 days ago", "sample-activities.csv · row 64"],
      ],
      reason: "A high-value open estimate has no recent activity.",
      recommendedAction: "Inspect the latest customer evidence and decide the next review step.",
      type: "High-value stale estimate",
      valueBasis: "Estimated opportunity",
      valueCents: 4280000,
    },
    {
      confidence: "HIGH",
      customer: "Northline Roofing",
      estimateExternalId: "EST-SAMPLE-1088",
      evidence: [
        ["status", "open", "sample-estimates.csv · row 31"],
        ["next follow-up", "9 days overdue", "sample-estimates.csv · row 31"],
        ["amount", "$31,600", "sample-estimates.csv · row 31"],
      ],
      reason: "The explicit follow-up date has passed.",
      recommendedAction: "Review the overdue commitment and record the next action.",
      type: "Overdue follow-up",
      valueBasis: "Estimated opportunity",
      valueCents: 3160000,
    },
    {
      confidence: "MEDIUM",
      customer: "Harbor Pool Works",
      estimateExternalId: "EST-SAMPLE-1121",
      evidence: [
        ["status", "open", "sample-estimates.csv · row 47"],
        ["owner", "Not supplied", "sample-estimates.csv · row 47"],
        ["next step", "Not supplied", "sample-estimates.csv · row 47"],
      ],
      reason: "The estimate has no owner or explicit next step.",
      recommendedAction: "Assign ownership and add a reviewable next step.",
      type: "Missing owner or next step",
      valueBasis: "Operational risk",
      valueCents: null,
    },
  ],
} as const;

export function sampleMoney(valueCents: number | null) {
  if (valueCents === null) return "Operational";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valueCents / 100);
}
