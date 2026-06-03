import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakStatus,
  RevenueLeakType,
} from "@prisma/client";

export type RevenueLeakCategory =
  | "DATA_QUALITY_RISK"
  | "FINANCIAL_LEAK"
  | "OPERATIONAL_RISK";

export type RevenueLeakEvidenceValue =
  | boolean
  | null
  | number
  | string
  | RevenueLeakEvidenceValue[]
  | { [key: string]: RevenueLeakEvidenceValue };

export type RevenueLeakEvidence = {
  confidenceReason?: string;
  sourceRecordIds?: string[];
  signals: string[];
  summary: string;
  value?: RevenueLeakEvidenceValue;
};

export type RevenueLeakCreateInput = {
  workspaceId: string;
  sourceDataSourceId?: string | null;
  relatedClientId?: string | null;
  relatedAppointmentId?: string | null;
  relatedLeadBookingOpportunityId?: string | null;
  leakType: RevenueLeakType;
  severity?: RevenueLeakSeverity;
  status?: RevenueLeakStatus;
  confidence?: RevenueLeakConfidence;
  estimatedValueCents?: number | null;
  currency?: string;
  detectedAt?: Date;
  sourceWindowStart?: Date | null;
  sourceWindowEnd?: Date | null;
  reason: string;
  recommendedAction: string;
  evidenceJson: RevenueLeakEvidence;
  providerName?: string | null;
  serviceName?: string | null;
  sourceName?: string | null;
  fingerprint: string;
  resolvedAt?: Date | null;
};
