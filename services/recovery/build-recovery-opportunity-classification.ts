import { AppointmentStatus } from "@prisma/client";

import {
  revoryRecoveryChannel,
  revoryRecoveryWindowDays,
  type RevoryRecoveryOpportunity,
  type RevoryRecoveryOpportunityClassification,
  type RevoryRecoveryOpportunityReason,
} from "@/types/recovery";
import { getUsableEmail } from "@/services/operations/get-usable-email";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type RecoveryOpportunityAppointmentRecord = {
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

export type RecoveryScheduledAppointmentRecord = {
  clientId: string;
  scheduledAt: Date;
};

function resolveClientName(client: RecoveryOpportunityAppointmentRecord["client"]) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const composedName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || "Client pending";
}

function buildPrimaryOpportunityReason(
  status: AppointmentStatus,
): RevoryRecoveryOpportunityReason {
  if (status === AppointmentStatus.NO_SHOW) {
    return {
      code: "no_show_without_rebooking",
      description:
        "The client missed the appointment and there is no later scheduled visit in the current workspace.",
      label: "No-show without rebooking",
    };
  }

  return {
    code: "canceled_without_rebooking",
    description:
      "The appointment was canceled and there is no later scheduled visit in the current workspace.",
    label: "Canceled without rebooking",
  };
}

function hasLaterScheduledAppointment(
  scheduledAppointmentsByClient: Map<string, Date[]>,
  clientId: string,
  disruptionDate: Date,
) {
  const appointments = scheduledAppointmentsByClient.get(clientId) ?? [];

  return appointments.some(
    (scheduledAt) => scheduledAt.getTime() > disruptionDate.getTime(),
  );
}

function buildRecoveryOpportunity(
  appointment: RecoveryOpportunityAppointmentRecord,
  scheduledAppointmentsByClient: Map<string, Date[]>,
): RevoryRecoveryOpportunity | null {
  if (
    appointment.status !== AppointmentStatus.CANCELED &&
    appointment.status !== AppointmentStatus.NO_SHOW
  ) {
    return null;
  }

  if (
    hasLaterScheduledAppointment(
      scheduledAppointmentsByClient,
      appointment.client.id,
      appointment.scheduledAt,
    )
  ) {
    return null;
  }

  const clientEmail = getUsableEmail(appointment.client.email);
  const reasons = [buildPrimaryOpportunityReason(appointment.status)];

  if (!clientEmail) {
    reasons.push({
      code: "blocked_missing_email",
      description:
        "REVORY found the recovery opportunity, but there is no usable email path for the client in the current MVP.",
      label: "Recovery blocked by missing email",
    });
  }

  return {
    appointmentId: appointment.id,
    clientEmail,
    clientId: appointment.client.id,
    clientName: resolveClientName(appointment.client),
    disruptionDate: appointment.scheduledAt,
    estimatedRevenue: appointment.estimatedRevenue,
    providerName: appointment.providerName,
    reasons,
    recoveryState: clientEmail
      ? "ready_for_recovery"
      : "blocked_missing_email",
    serviceName: appointment.serviceName,
    status: appointment.status,
  };
}

export function buildRecoveryOpportunityClassification(
  disruptedAppointments: RecoveryOpportunityAppointmentRecord[],
  scheduledAppointments: RecoveryScheduledAppointmentRecord[],
  now = new Date(),
): RevoryRecoveryOpportunityClassification {
  const scheduledAppointmentsByClient = scheduledAppointments.reduce(
    (accumulator, appointment) => {
      const current = accumulator.get(appointment.clientId) ?? [];
      current.push(appointment.scheduledAt);
      accumulator.set(appointment.clientId, current);
      return accumulator;
    },
    new Map<string, Date[]>(),
  );

  const items = disruptedAppointments
    .map((appointment) =>
      buildRecoveryOpportunity(appointment, scheduledAppointmentsByClient),
    )
    .filter((item): item is RevoryRecoveryOpportunity => item !== null)
    .sort(
      (left, right) =>
        right.disruptionDate.getTime() - left.disruptionDate.getTime(),
    );

  const windowStartsAt = new Date(now.getTime() - revoryRecoveryWindowDays * DAY_IN_MS);
  const windowEndsAt = new Date(now.getTime() + revoryRecoveryWindowDays * DAY_IN_MS);

  return {
    blockedMissingEmailCount: items.filter(
      (item) => item.recoveryState === "blocked_missing_email",
    ).length,
    canceledOpportunityCount: items.filter(
      (item) => item.status === AppointmentStatus.CANCELED,
    ).length,
    channel: revoryRecoveryChannel,
    generatedAt: now,
    items,
    noShowOpportunityCount: items.filter(
      (item) => item.status === AppointmentStatus.NO_SHOW,
    ).length,
    opportunityCount: items.length,
    readyForRecoveryCount: items.filter(
      (item) => item.recoveryState === "ready_for_recovery",
    ).length,
    totalDisruptedAppointmentsInWindow: disruptedAppointments.length,
    windowDays: revoryRecoveryWindowDays,
    windowEndsAt,
    windowStartsAt,
  };
}
