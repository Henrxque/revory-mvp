import type { AppointmentStatus } from "@prisma/client";

export const revoryRecoveryChannel = "EMAIL" as const;
// Initial MVP policy only. Recovery stays focused on near-term disruptions, not a full calendar engine.
export const revoryRecoveryWindowDays = 14 as const;

export type RevoryRecoveryOpportunityState =
  | "ready_for_recovery"
  | "blocked_missing_email";

export type RevoryRecoveryOpportunityReasonCode =
  | "canceled_without_rebooking"
  | "no_show_without_rebooking"
  | "blocked_missing_email";

export type RevoryRecoveryOpportunityReason = {
  code: RevoryRecoveryOpportunityReasonCode;
  description: string;
  label: string;
};

export type RevoryRecoveryOpportunity = {
  appointmentId: string;
  clientEmail: string | null;
  clientId: string;
  clientName: string;
  disruptionDate: Date;
  estimatedRevenue: number | null;
  providerName: string | null;
  reasons: RevoryRecoveryOpportunityReason[];
  recoveryState: RevoryRecoveryOpportunityState;
  serviceName: string | null;
  status: AppointmentStatus;
};

export type RevoryRecoveryOpportunityClassification = {
  blockedMissingEmailCount: number;
  canceledOpportunityCount: number;
  channel: typeof revoryRecoveryChannel;
  generatedAt: Date;
  items: RevoryRecoveryOpportunity[];
  noShowOpportunityCount: number;
  opportunityCount: number;
  readyForRecoveryCount: number;
  totalDisruptedAppointmentsInWindow: number;
  windowDays: number;
  windowStartsAt: Date;
  windowEndsAt: Date;
};
