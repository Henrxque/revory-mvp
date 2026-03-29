import { AppointmentStatus } from "@prisma/client";

import {
  revoryConfirmationWindowHours,
} from "@/types/confirmation";
import {
  revoryReminderWindowHours,
} from "@/types/reminder";
import {
  revoryAtRiskImmediateWindowHours,
  type RevoryAtRiskAppointment,
  type RevoryAtRiskAttentionLevel,
  type RevoryAtRiskClassification,
  type RevoryAtRiskReason,
} from "@/types/at-risk";
import {
  buildOperationalStateSummary,
  buildPreparedOperationalState,
  buildReadyOperationalState,
} from "@/services/operations/build-operational-state";
import { getUsableEmail } from "@/services/operations/get-usable-email";

const HOUR_IN_MS = 60 * 60 * 1000;

export type AtRiskAppointmentRecord = {
  client: {
    email: string | null;
    firstName: string | null;
    fullName: string | null;
    id: string;
    lastName: string | null;
  };
  estimatedRevenue: number | null;
  id: string;
  providerName: string | null;
  scheduledAt: Date;
  serviceName: string | null;
  status: AppointmentStatus;
};

function resolveClientName(client: AtRiskAppointmentRecord["client"]) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const composedName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || "Client pending";
}

function buildAtRiskReasons(
  clientEmail: string | null,
  millisecondsUntilAppointment: number,
): RevoryAtRiskReason[] {
  const reasons: RevoryAtRiskReason[] = [];

  if (
    !clientEmail &&
    millisecondsUntilAppointment <= revoryReminderWindowHours * HOUR_IN_MS
  ) {
    reasons.push({
      attentionLevel: "attention_now",
      code: "reminder_blocked_missing_email",
      description:
        "The appointment is already inside the reminder window, but REVORY has no usable email for the client.",
      label: "Reminder blocked by missing email",
    });
  } else if (
    !clientEmail &&
    millisecondsUntilAppointment <= revoryConfirmationWindowHours * HOUR_IN_MS
  ) {
    reasons.push({
      attentionLevel: "watchlist",
      code: "confirmation_blocked_missing_email",
      description:
        "The appointment is inside the confirmation window, but REVORY has no usable email for the client.",
      label: "Confirmation blocked by missing email",
    });
  }

  if (millisecondsUntilAppointment <= revoryAtRiskImmediateWindowHours * HOUR_IN_MS) {
    reasons.push({
      attentionLevel: "attention_now",
      code: "same_day_tight_window",
      description:
        "The appointment is approaching with very little time buffer, so it deserves immediate booking attention.",
      label: "Same-day tight window",
    });
  }

  return reasons;
}

function resolveAttentionLevel(
  reasons: RevoryAtRiskReason[],
): RevoryAtRiskAttentionLevel {
  return reasons.some((reason) => reason.attentionLevel === "attention_now")
    ? "attention_now"
    : "watchlist";
}

function buildAtRiskCandidate(
  appointment: AtRiskAppointmentRecord,
  now: Date,
): RevoryAtRiskAppointment | null {
  if (appointment.status !== AppointmentStatus.SCHEDULED) {
    return null;
  }

  const millisecondsUntilAppointment =
    appointment.scheduledAt.getTime() - now.getTime();

  if (millisecondsUntilAppointment <= 0) {
    return null;
  }

  const clientEmail = getUsableEmail(appointment.client.email);
  const reasons = buildAtRiskReasons(clientEmail, millisecondsUntilAppointment);

  if (reasons.length === 0) {
    return null;
  }

  const attentionLevel = resolveAttentionLevel(reasons);

  return {
    appointmentId: appointment.id,
    attentionLevel,
    clientEmail,
    clientId: appointment.client.id,
    clientName: resolveClientName(appointment.client),
    estimatedRevenue: appointment.estimatedRevenue,
    hoursUntilAppointment: Math.round(millisecondsUntilAppointment / HOUR_IN_MS),
    operationalState:
      attentionLevel === "attention_now"
        ? buildReadyOperationalState()
        : buildPreparedOperationalState(),
    primaryReasonCode: reasons[0].code,
    providerName: appointment.providerName,
    reasons,
    scheduledAt: appointment.scheduledAt,
    serviceName: appointment.serviceName,
    status: appointment.status,
  };
}

export function buildAtRiskClassification(
  appointments: AtRiskAppointmentRecord[],
  now = new Date(),
): RevoryAtRiskClassification {
  const items = appointments
    .map((appointment) => buildAtRiskCandidate(appointment, now))
    .filter((item): item is RevoryAtRiskAppointment => item !== null)
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

  return {
    atRiskCount: items.length,
    attentionNowCount: items.filter(
      (item) => item.attentionLevel === "attention_now",
    ).length,
    blockedContactCount: items.filter((item) =>
      item.reasons.some(
        (reason) =>
          reason.code === "reminder_blocked_missing_email" ||
          reason.code === "confirmation_blocked_missing_email",
      ),
    ).length,
    generatedAt: now,
    items,
    policy: {
      confirmationWindowHours: revoryConfirmationWindowHours,
      immediateWindowHours: revoryAtRiskImmediateWindowHours,
      reminderWindowHours: revoryReminderWindowHours,
    },
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: items.length,
      states: items.map((item) => item.operationalState),
      totalBaselineCount: appointments.filter(
        (appointment) =>
          appointment.status === AppointmentStatus.SCHEDULED &&
          appointment.scheduledAt.getTime() > now.getTime(),
      ).length,
    }),
    tightWindowCount: items.filter((item) =>
      item.reasons.some((reason) => reason.code === "same_day_tight_window"),
    ).length,
    totalFutureScheduledAppointments: appointments.filter(
      (appointment) =>
        appointment.status === AppointmentStatus.SCHEDULED &&
        appointment.scheduledAt.getTime() > now.getTime(),
    ).length,
    watchlistCount: items.filter((item) => item.attentionLevel === "watchlist")
      .length,
  };
}
