import { AppointmentStatus } from "@prisma/client";

import {
  revoryConfirmationChannel,
  revoryConfirmationWindowHours,
  type RevoryConfirmationCandidate,
  type RevoryConfirmationClassification,
} from "@/types/confirmation";
import {
  buildBlockedOperationalState,
  buildOperationalStateSummary,
  buildPreparedOperationalState,
  buildReadyOperationalState,
} from "@/services/operations/build-operational-state";
import { getUsableEmail } from "@/services/operations/get-usable-email";

const HOUR_IN_MS = 60 * 60 * 1000;

export type ConfirmationAppointmentRecord = {
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

function resolveClientName(client: ConfirmationAppointmentRecord["client"]) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const composedName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || "Client pending";
}

function buildConfirmationCandidate(
  appointment: ConfirmationAppointmentRecord,
  now: Date,
): RevoryConfirmationCandidate | null {
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
  const insideConfirmationWindow =
    millisecondsUntilAppointment <= revoryConfirmationWindowHours * HOUR_IN_MS;

  if (insideConfirmationWindow) {
    return {
      appointmentId: appointment.id,
      clientEmail,
      clientId: appointment.client.id,
      clientName: resolveClientName(appointment.client),
      confirmationState: clientEmail
        ? "ready_for_confirmation"
        : "blocked_missing_email",
      estimatedRevenue: appointment.estimatedRevenue,
      hoursUntilAppointment,
      operationalState: clientEmail
        ? buildReadyOperationalState()
        : buildBlockedOperationalState(["missing_patient_email"]),
      providerName: appointment.providerName,
      reasonCode: clientEmail
        ? "inside_confirmation_window"
        : "inside_confirmation_window_missing_email",
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
    confirmationState: "scheduled_later",
    estimatedRevenue: appointment.estimatedRevenue,
    hoursUntilAppointment,
    operationalState: buildPreparedOperationalState(),
    providerName: appointment.providerName,
    reasonCode: "outside_confirmation_window",
    requiresAttention: false,
    scheduledAt: appointment.scheduledAt,
    serviceName: appointment.serviceName,
    status: appointment.status,
  };
}

export function buildConfirmationClassification(
  appointments: ConfirmationAppointmentRecord[],
  now = new Date(),
): RevoryConfirmationClassification {
  const items = appointments
    .map((appointment) => buildConfirmationCandidate(appointment, now))
    .filter((item): item is RevoryConfirmationCandidate => item !== null)
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

  const windowEndsAt = new Date(
    now.getTime() + revoryConfirmationWindowHours * HOUR_IN_MS,
  );

  return {
    blockedMissingEmailCount: items.filter(
      (item) => item.confirmationState === "blocked_missing_email",
    ).length,
    channel: revoryConfirmationChannel,
    generatedAt: now,
    items,
    needsAttentionCount: items.filter((item) => item.requiresAttention).length,
    readyForConfirmationCount: items.filter(
      (item) => item.confirmationState === "ready_for_confirmation",
    ).length,
    scheduledLaterCount: items.filter(
      (item) => item.confirmationState === "scheduled_later",
    ).length,
    stateSummary: buildOperationalStateSummary({
      classifiedItemsCount: items.length,
      states: items.map((item) => item.operationalState),
      totalBaselineCount: items.length,
    }),
    totalFutureScheduledAppointments: items.length,
    windowEndsAt,
    windowHours: revoryConfirmationWindowHours,
  };
}
