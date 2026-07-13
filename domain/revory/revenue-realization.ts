import type {
  CanonicalEntityType,
  ExplicitMatchState,
  RecordProvenance,
  RevenueRealizationEligibility,
} from "@/domain/revory/contracts";

export type ExplicitRecordMatch = {
  candidateRecordKeys: string[];
  reason: string;
  relationField: string;
  sourceEntityType: CanonicalEntityType;
  sourceExternalId: string;
  sourceRecordKey: string;
  state: ExplicitMatchState;
  targetEntityType: CanonicalEntityType;
  targetExternalId: string;
};

export type ReconciliationInput = {
  externalId: string;
  field: string;
  provenance: RecordProvenance;
  valueCents: number;
};

export type JobBillingReconciliation = {
  approvedChangeOrderCents: number | null;
  approvedChangeOrderIds: string[];
  billedLessObservedCostCents: number | null;
  calculatedGapCents: number | null;
  currency: string | null;
  expectedBillingCents: number | null;
  formula: string | null;
  inputEvidence: ReconciliationInput[];
  invoiceIds: string[];
  invoicedCents: number | null;
  issues: string[];
  jobExternalId: string;
  observedCostCents: number | null;
  state: "ELIGIBLE" | "SUPPRESSED";
  valueBasis: "CALCULATED" | "DATA_QUALITY";
};

export type RevenueRealizationRead = {
  eligibility: RevenueRealizationEligibility;
  matches: ExplicitRecordMatch[];
  reconciliations: JobBillingReconciliation[];
  summary: {
    conflictLinks: number;
    eligibleJobs: number;
    matchedLinks: number;
    recordCounts: Record<CanonicalEntityType, number>;
    suppressedJobs: number;
    unmatchedLinks: number;
  };
  workspaceId: string;
};
