import type { AppointmentStatus } from "@prisma/client";

import type {
  RevoryOperationalState,
  RevoryOperationalStateSummary,
} from "@/types/operational-state";

export const revoryConfirmationChannel = "EMAIL" as const;
// Initial MVP policy only. This is the first confirmation window, not a final cadence strategy.
export const revoryConfirmationWindowHours = 48 as const;

export type RevoryConfirmationState =
  | "ready_for_confirmation"
  | "blocked_missing_email"
  // Visibility bucket only. This keeps later appointments visible without turning them into an active operational priority yet.
  | "scheduled_later";

export type RevoryConfirmationReasonCode =
  | "inside_confirmation_window"
  | "inside_confirmation_window_missing_email"
  | "outside_confirmation_window";

export type RevoryConfirmationCandidate = {
  appointmentId: string;
  clientEmail: string | null;
  clientId: string;
  clientName: string;
  confirmationState: RevoryConfirmationState;
  estimatedRevenue: number | null;
  hoursUntilAppointment: number;
  operationalState: RevoryOperationalState;
  providerName: string | null;
  reasonCode: RevoryConfirmationReasonCode;
  requiresAttention: boolean;
  scheduledAt: Date;
  serviceName: string | null;
  status: AppointmentStatus;
};

export type RevoryConfirmationClassification = {
  blockedMissingEmailCount: number;
  channel: typeof revoryConfirmationChannel;
  generatedAt: Date;
  items: RevoryConfirmationCandidate[];
  needsAttentionCount: number;
  readyForConfirmationCount: number;
  scheduledLaterCount: number;
  stateSummary: RevoryOperationalStateSummary;
  totalFutureScheduledAppointments: number;
  windowEndsAt: Date;
  windowHours: number;
};
