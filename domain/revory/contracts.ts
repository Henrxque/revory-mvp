export const canonicalEntityTypes = [
  "CUSTOMER", "LEAD", "ESTIMATE", "ACTIVITY", "JOB", "INVOICE", "CHANGE_ORDER", "COST",
] as const;

export type CanonicalEntityType = (typeof canonicalEntityTypes)[number];
export type ValueBasis = "OBSERVED" | "CALCULATED" | "ESTIMATED" | "OPERATIONAL" | "DATA_QUALITY";
export type FindingConfidence = "LOW" | "MEDIUM" | "HIGH";
export type FindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FindingUrgency = "LOW" | "MEDIUM" | "HIGH";

export type RecordProvenance = {
  fileName: string;
  rowNumber: number;
  sourceHeaders: string[];
  importedAt: string;
};

export type CanonicalRecordContract = {
  workspaceId: string;
  entityType: CanonicalEntityType;
  sourceSystem: string;
  externalId: string;
  relationExternalIds: Record<string, string>;
  provenance: RecordProvenance;
  payload: Record<string, string | number | boolean | null>;
  occurredAt: string | null;
};

export type QuoteRecoveryFindingContract = {
  family: "QUOTE_RECOVERY";
  type:
    | "OVERDUE_FOLLOW_UP"
    | "HIGH_VALUE_STALE_QUOTE"
    | "OPEN_ESTIMATE_NO_ACTIVITY"
    | "ESTIMATE_AGING_RISK"
    | "MISSING_OWNER_OR_NEXT_STEP"
    | "RECOVERABLE_LOST_QUOTE";
  category: "FINANCIAL" | "OPERATIONAL";
  confidence: FindingConfidence;
  severity: FindingSeverity;
  valueBasis: ValueBasis;
  valueCents: number | null;
  currency: string;
  estimateExternalId: string;
  fingerprint: string;
  reason: string;
  recommendedAction: string;
  evidence: Array<{ field: string; value: string | number | null; provenance: RecordProvenance }>;
};

export type RevenueRealizationRuleKey =
  | "JOB_BILLING_RECONCILIATION"
  | "APPROVED_CHANGE_ORDER_BASIS"
  | "COST_REVENUE_BASIS";

export type ExplicitMatchState = "MATCHED" | "UNMATCHED" | "CONFLICT";

export type RevenueRealizationEligibility = Record<
  RevenueRealizationRuleKey,
  { eligible: boolean; missingFields: string[] }
>;

export const entityRelationships: Record<CanonicalEntityType, readonly string[]> = {
  CUSTOMER: [],
  LEAD: ["customerExternalId"],
  ESTIMATE: ["customerExternalId", "leadExternalId", "jobExternalId"],
  ACTIVITY: ["customerExternalId", "leadExternalId", "estimateExternalId", "jobExternalId"],
  JOB: ["customerExternalId", "estimateExternalId"],
  INVOICE: ["customerExternalId", "jobExternalId", "estimateExternalId"],
  CHANGE_ORDER: ["jobExternalId", "estimateExternalId", "invoiceExternalId"],
  COST: ["jobExternalId", "invoiceExternalId"],
};

export function assertWorkspaceScopedRecord(record: CanonicalRecordContract) {
  if (!record.workspaceId.trim() || !record.externalId.trim() || !record.sourceSystem.trim()) {
    throw new Error("Canonical records require workspaceId, sourceSystem and externalId.");
  }
}
