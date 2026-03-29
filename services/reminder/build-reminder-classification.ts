import { AppointmentStatus } from "@prisma/client";

import {
  revoryReminderChannel,
  revoryReminderWindowHours,
  type RevoryReminderCandidate,
  type RevoryReminderClassification,
} from "@/types/reminder";
import {
  buildBlockedOperationalState,
  buildOperationalStateSummary,
  buildPreparedOperationalState,
  buildReadyOperationalState,
} from "@/services/operations/build-operational-state";
import { getUsableEmail } from "@/services/operations/get-usable-email";

const HOUR_IN_MS = 60 * 60 * 1000;

export type ReminderAppointmentRecord = {
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

function resolveClientName(client: ReminderAppointmentRecord["client"]) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const composedName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || "Client pending";
}

function buildReminderCandidate(
  appointment: ReminderAppointmentRecord,
  now: Date,
): RevoryReminderCandidate | null {
  if (appointment.status !== AppointmentStatus.SCHEDULED) {
    return null;
  }

  const millisecondsUntilAppointment =
    appointment.scheduledAt.getTime() - now.getTime();

  if (millisecondsUntilAppointment <= 0) {
    return null;
  }

  const clientEmail = getUsableEmail(appointment.client.email);
  const hoursUntilAppointment = Math.round(
    millisecondsUntilAppointment / HOUR_IN_MS,
  );
  const insideReminderWindow =
    millisecondsUntilAppointment <= revoryReminderWindowHours * HOUR_IN_MS;

  if (insideReminderWindow) {
    return {
      appointmentId: appointment.id,
      clientEmail,
      clientId: appointment.client.id,
      clientName: resolveClientName(appointment.client),
      estimatedRevenue: appointment.estimatedRevenue,
      hoursUntilAppointment,
      operationalState: clientEmail
        ? buildReadyOperationalState()
        : buildBlockedOperationalState(["missing_patient_email"]),
      providerName: appointment.providerName,
      reasonCode: clientEmail
        ? "inside_reminder_window"
        : "inside_reminder_window_missing_email",
      reminderState: clientEmail
        ? "ready_for_reminder"
        : "blocked_missing_email",
      requiresAttention: true,
      scheduledAt: appointment.scheduledAt,
      serviceName: appointment.serviceName,
      status: appointment.status,
    };
  }

  return {
    appointmentId: appointment.id,
    clientEmail,
    clientId: appointment.client.id,
    clientName: resolveClientName(appointment.client),
    estimatedRevenue: appointment.estimatedRevenue,
    hoursUntilAppointment,
    operationalState: buildPreparedOperationalState(),
    providerName: appointment.providerName,
    reasonCode: "outside_reminder_window",
    // This is an auxiliary visibility bucket, not a primary booking guidance bucket.
    reminderState: "scheduled_later",
    requiresAttention: false,
    scheduledAt: appointment.scheduledAt,
    serviceName: appointment.serviceName,
    status: appointment.status,
  };
}

export function buildReminderClassification(
  appointments: ReminderAppointmentRecord[],
  now = new Date(),
): RevoryReminderClassification {
  const items = appointments
    .map((appointment) => buildReminderCandidate(appointment, now))
    .filter((item): item is RevoryReminderCandidate => item !== null)
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

  const windowEndsAt = new Date(
    now.getTime() + revoryReminderWindowHours * HOUR_IN_MS,
  );

  return {
    blockedMissingEmailCount: items.filter(
      (item) => item.reminderState === "blocked_missing_email",
    ).length,
    channel: revoryReminderChannel,
    generatedAt: now,
    items,
    needsAttentionCount: items.filter((item) => item.requiresAttention).length,
    readyForReminderCount: items.filter(
      (item) => item.reminderState === "ready_for_reminder",
    ).length,
    scheduledLaterCount: items.filter(
      (item) => item.reminderState === "scheduled_later",
    ).length,
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: items.length,
      states: items.map((item) => item.operationalState),
      totalBaselineCount: items.length,
    }),
    totalFutureScheduledAppointments: items.length,
    windowEndsAt,
    windowHours: revoryReminderWindowHours,
  };
}
