import type { CanonicalEntityType } from "@/domain/revory/contracts";

export type CanonicalFieldDefinition = {
  required?: boolean;
  relation?: boolean;
  type: "string" | "date" | "integer" | "money" | "boolean";
};

const common = { externalId: { required: true, type: "string" } } as const;

export const canonicalFields: Record<CanonicalEntityType, Record<string, CanonicalFieldDefinition>> = {
  CUSTOMER: { ...common, name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } },
  LEAD: { ...common, customerExternalId: { relation: true, type: "string" }, createdAt: { type: "date" }, status: { type: "string" }, owner: { type: "string" }, source: { type: "string" } },
  ESTIMATE: { ...common, customerExternalId: { relation: true, type: "string" }, leadExternalId: { relation: true, type: "string" }, jobExternalId: { relation: true, type: "string" }, status: { required: true, type: "string" }, amountCents: { type: "money" }, createdAt: { required: true, type: "date" }, sentAt: { type: "date" }, closedAt: { type: "date" }, lostAt: { type: "date" }, lastActivityAt: { type: "date" }, nextFollowUpAt: { type: "date" }, owner: { type: "string" }, nextStep: { type: "string" }, currency: { type: "string" } },
  ACTIVITY: { ...common, customerExternalId: { relation: true, type: "string" }, leadExternalId: { relation: true, type: "string" }, estimateExternalId: { required: true, relation: true, type: "string" }, jobExternalId: { relation: true, type: "string" }, occurredAt: { required: true, type: "date" }, activityType: { required: true, type: "string" }, outcome: { type: "string" }, nextStep: { type: "string" } },
  JOB: { ...common, customerExternalId: { relation: true, type: "string" }, estimateExternalId: { relation: true, type: "string" }, status: { type: "string" }, contractValueCents: { type: "money" }, startedAt: { type: "date" }, completedAt: { type: "date" } },
  INVOICE: { ...common, customerExternalId: { relation: true, type: "string" }, jobExternalId: { relation: true, type: "string" }, estimateExternalId: { relation: true, type: "string" }, status: { type: "string" }, amountCents: { type: "money" }, issuedAt: { type: "date" }, paidAt: { type: "date" }, dueAt: { type: "date" } },
  CHANGE_ORDER: { ...common, jobExternalId: { required: true, relation: true, type: "string" }, estimateExternalId: { relation: true, type: "string" }, invoiceExternalId: { relation: true, type: "string" }, status: { type: "string" }, approvedAmountCents: { type: "money" }, approvedAt: { type: "date" } },
  COST: { ...common, jobExternalId: { required: true, relation: true, type: "string" }, invoiceExternalId: { relation: true, type: "string" }, amountCents: { required: true, type: "money" }, incurredAt: { type: "date" }, category: { type: "string" } },
};

export const quoteRecoveryEligibility = {
  OVERDUE_FOLLOW_UP: ["externalId", "status", "nextFollowUpAt"],
  HIGH_VALUE_STALE_QUOTE: ["externalId", "status", "amountCents", "createdAt"],
  OPEN_ESTIMATE_NO_ACTIVITY: ["externalId", "status", "createdAt"],
  ESTIMATE_AGING_RISK: ["externalId", "status", "createdAt"],
  MISSING_OWNER_OR_NEXT_STEP: ["externalId", "status"],
  RECOVERABLE_LOST_QUOTE: ["externalId", "status", "amountCents", "lostAt"],
} as const;
