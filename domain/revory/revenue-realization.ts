import type {
  CanonicalEntityType,
  ExplicitMatchState,
  FindingConfidence,
  FindingSeverity,
  FindingUrgency,
  RecordProvenance,
  RevenueRealizationEligibility,
  ValueBasis,
} from "@/domain/revory/contracts";

export const revenueRealizationFindingTypes = [
  "UNDERBILLING_GAP",
  "APPROVED_CHANGE_ORDER_NOT_BILLED",
  "MARGIN_AT_RISK",
  "SUSPECTED_MISSING_CHANGE_ORDER",
  "SCOPE_CREEP_REVIEW_CANDIDATE",
] as const;

export type RevenueRealizationFindingType = (typeof revenueRealizationFindingTypes)[number];
export type RevenueRealizationFindingCategory = "FINANCIAL" | "OPERATIONAL" | "DATA_QUALITY";

export type RevenueRealizationEvidence = {
  entityType: CanonicalEntityType;
  externalId: string;
  field: string;
  provenance: RecordProvenance;
  value: string | number | boolean | null;
};

export type RevenueRealizationFindingContract = {
  family: "REVENUE_REALIZATION";
  type: RevenueRealizationFindingType;
  category: RevenueRealizationFindingCategory;
  status: "OPEN";
  priority: number;
  urgency: FindingUrgency;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  valueBasis: ValueBasis;
  valueCents: number | null;
  currency: string;
  jobExternalId: string;
  changeOrderExternalId: string | null;
  fingerprint: string;
  reason: string;
  formula: string | null;
  calculationInputs: Record<string, number>;
  recommendedAction: string;
  evidence: RevenueRealizationEvidence[];
  additiveToExecutiveGap: boolean;
};

export type RevenueRealizationFindingSummary = {
  activeCount: number;
  approvedChangeOrderReviewCents: number | null;
  calculatedUnderbillingCents: number | null;
  currency: string | null;
  financialCount: number;
  hasMixedCurrencies: boolean;
  marginAtRiskCents: number | null;
  operationalCount: number;
};

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
  contractValueIncludesApprovedChanges: boolean | null;
  currency: string | null;
  costIds: string[];
  expectedBillingCents: number | null;
  formula: string | null;
  inputEvidence: ReconciliationInput[];
  invoiceIds: string[];
  invoicedCents: number | null;
  issues: string[];
  jobExternalId: string;
  marginEligible: boolean;
  marginIssues: string[];
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
  integrityFingerprint: string;
  stateFingerprint: string;
  workspaceId: string;
};
