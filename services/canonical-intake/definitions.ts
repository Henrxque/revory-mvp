import type { CanonicalEntityType } from "@/domain/revory/contracts";

export type CanonicalFieldDefinition = {
  required?: boolean;
  relation?: boolean;
  type: "string" | "date" | "integer" | "money" | "boolean" | "percentage";
};

const common = { externalId: { required: true, type: "string" } } as const;

export const canonicalFields: Record<CanonicalEntityType, Record<string, CanonicalFieldDefinition>> = {
  CUSTOMER: { ...common, name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } },
  LEAD: { ...common, customerExternalId: { relation: true, type: "string" }, createdAt: { type: "date" }, status: { type: "string" }, owner: { type: "string" }, source: { type: "string" } },
  ESTIMATE: { ...common, customerExternalId: { relation: true, type: "string" }, leadExternalId: { relation: true, type: "string" }, jobExternalId: { relation: true, type: "string" }, status: { required: true, type: "string" }, amountCents: { type: "money" }, createdAt: { required: true, type: "date" }, sentAt: { type: "date" }, closedAt: { type: "date" }, lostAt: { type: "date" }, lastActivityAt: { type: "date" }, nextFollowUpAt: { type: "date" }, owner: { type: "string" }, nextStep: { type: "string" }, currency: { type: "string" } },
  ACTIVITY: { ...common, customerExternalId: { relation: true, type: "string" }, leadExternalId: { relation: true, type: "string" }, estimateExternalId: { required: true, relation: true, type: "string" }, jobExternalId: { relation: true, type: "string" }, occurredAt: { required: true, type: "date" }, activityType: { required: true, type: "string" }, outcome: { type: "string" }, nextStep: { type: "string" } },
  JOB: { ...common, customerExternalId: { relation: true, type: "string" }, estimateExternalId: { relation: true, type: "string" }, status: { type: "string" }, contractValueCents: { type: "money" }, contractValueIncludesApprovedChanges: { type: "boolean" }, currency: { type: "string" }, targetGrossMarginBps: { type: "percentage" }, scopeChangeFlag: { type: "boolean" }, notes: { type: "string" }, startedAt: { type: "date" }, completedAt: { type: "date" } },
  INVOICE: { ...common, customerExternalId: { relation: true, type: "string" }, jobExternalId: { relation: true, type: "string" }, estimateExternalId: { relation: true, type: "string" }, status: { type: "string" }, amountCents: { type: "money" }, currency: { type: "string" }, issuedAt: { type: "date" }, paidAt: { type: "date" }, dueAt: { type: "date" } },
  CHANGE_ORDER: { ...common, jobExternalId: { required: true, relation: true, type: "string" }, estimateExternalId: { relation: true, type: "string" }, invoiceExternalId: { relation: true, type: "string" }, status: { type: "string" }, billingStatus: { type: "string" }, approvedAmountCents: { type: "money" }, currency: { type: "string" }, approvedAt: { type: "date" }, description: { type: "string" } },
  COST: { ...common, jobExternalId: { required: true, relation: true, type: "string" }, invoiceExternalId: { relation: true, type: "string" }, amountCents: { required: true, type: "money" }, currency: { type: "string" }, incurredAt: { type: "date" }, category: { type: "string" } },
};

export const quoteRecoveryEligibility = {
  OVERDUE_FOLLOW_UP: ["externalId", "status", "nextFollowUpAt"],
  HIGH_VALUE_STALE_QUOTE: ["externalId", "status", "amountCents", "createdAt"],
  OPEN_ESTIMATE_NO_ACTIVITY: ["externalId", "status", "createdAt"],
  ESTIMATE_AGING_RISK: ["externalId", "status", "createdAt"],
  MISSING_OWNER_OR_NEXT_STEP: ["externalId", "status"],
  RECOVERABLE_LOST_QUOTE: ["externalId", "status", "amountCents", "lostAt"],
} as const;

export const revenueRealizationEligibility = {
  JOB_BILLING_RECONCILIATION: {
    INVOICE: ["externalId", "jobExternalId", "status", "amountCents", "currency"],
    JOB: ["externalId", "status", "contractValueCents", "contractValueIncludesApprovedChanges", "currency"],
  },
  APPROVED_CHANGE_ORDER_BASIS: {
    CHANGE_ORDER: ["externalId", "jobExternalId", "status", "approvedAmountCents", "approvedAt", "currency"],
    JOB: ["externalId", "currency"],
  },
  COST_REVENUE_BASIS: {
    COST: ["externalId", "jobExternalId", "amountCents", "currency"],
    INVOICE: ["externalId", "jobExternalId", "amountCents", "currency"],
    JOB: ["externalId", "currency"],
  },
} as const;
