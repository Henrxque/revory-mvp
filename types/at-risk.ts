import type { AppointmentStatus } from "@prisma/client";

import { revoryConfirmationWindowHours } from "@/types/confirmation";
import { revoryReminderWindowHours } from "@/types/reminder";
import type {
  RevoryOperationalState,
  RevoryOperationalStateSummary,
} from "@/types/operational-state";

// Initial MVP policy only. This is a short operational attention window, not a predictive risk model.
export const revoryAtRiskImmediateWindowHours = 6 as const;

export type RevoryAtRiskAttentionLevel = "attention_now" | "watchlist";

export type RevoryAtRiskReasonCode =
  | "reminder_blocked_missing_email"
  | "confirmation_blocked_missing_email"
  | "same_day_tight_window";

export type RevoryAtRiskReason = {
  attentionLevel: RevoryAtRiskAttentionLevel;
  code: RevoryAtRiskReasonCode;
  description: string;
  label: string;
};

export type RevoryAtRiskAppointment = {
  appointmentId: string;
  attentionLevel: RevoryAtRiskAttentionLevel;
  clientEmail: string | null;
  clientId: string;
  clientName: string;
  estimatedRevenue: number | null;
  hoursUntilAppointment: number;
  operationalState: RevoryOperationalState;
  primaryReasonCode: RevoryAtRiskReasonCode;
  providerName: string | null;
  reasons: RevoryAtRiskReason[];
  scheduledAt: Date;
  serviceName: string | null;
  status: AppointmentStatus;
};

export type RevoryAtRiskClassification = {
  atRiskCount: number;
  attentionNowCount: number;
  blockedContactCount: number;
  generatedAt: Date;
  items: RevoryAtRiskAppointment[];
  policy: {
    confirmationWindowHours: typeof revoryConfirmationWindowHours;
    immediateWindowHours: typeof revoryAtRiskImmediateWindowHours;
    reminderWindowHours: typeof revoryReminderWindowHours;
  };
  stateSummary: RevoryOperationalStateSummary;
  tightWindowCount: number;
  totalFutureScheduledAppointments: number;
  watchlistCount: number;
};
