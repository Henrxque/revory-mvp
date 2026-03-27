import type { AppointmentStatus } from "@prisma/client";

import type {
  RevoryOperationalState,
  RevoryOperationalStateSummary,
} from "@/types/operational-state";

export const revoryReminderChannel = "EMAIL" as const;
// Initial MVP policy only. This is an operational starting window, not a final cadence rule.
export const revoryReminderWindowHours = 24 as const;

export type RevoryReminderState =
  | "ready_for_reminder"
  | "blocked_missing_email"
  // Visibility bucket only. This keeps future appointments visible without making them an active reminder queue yet.
  | "scheduled_later";

export type RevoryReminderReasonCode =
  | "inside_reminder_window"
  | "inside_reminder_window_missing_email"
  | "outside_reminder_window";

export type RevoryReminderCandidate = {
  appointmentId: string;
  clientEmail: string | null;
  clientId: string;
  clientName: string;
  estimatedRevenue: number | null;
  hoursUntilAppointment: number;
  operationalState: RevoryOperationalState;
  providerName: string | null;
  reasonCode: RevoryReminderReasonCode;
  reminderState: RevoryReminderState;
  requiresAttention: boolean;
  scheduledAt: Date;
  serviceName: string | null;
  status: AppointmentStatus;
};

export type RevoryReminderClassification = {
  blockedMissingEmailCount: number;
  channel: typeof revoryReminderChannel;
  generatedAt: Date;
  items: RevoryReminderCandidate[];
  needsAttentionCount: number;
  readyForReminderCount: number;
  scheduledLaterCount: number;
  stateSummary: RevoryOperationalStateSummary;
  totalFutureScheduledAppointments: number;
  windowEndsAt: Date;
  windowHours: number;
};
