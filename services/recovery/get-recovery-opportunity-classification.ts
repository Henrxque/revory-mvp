import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  buildRecoveryOpportunityClassification,
  type RecoveryOpportunityAppointmentRecord,
  type RecoveryScheduledAppointmentRecord,
} from "@/services/recovery/build-recovery-opportunity-classification";
import {
  revoryRecoveryWindowDays,
  type RevoryRecoveryOpportunityClassification,
} from "@/types/recovery";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function getRecoveryOpportunityClassification(
  workspaceId: string,
  now = new Date(),
): Promise<RevoryRecoveryOpportunityClassification> {
  const windowStartsAt = new Date(
    now.getTime() - revoryRecoveryWindowDays * DAY_IN_MS,
  );
  const windowEndsAt = new Date(
    now.getTime() + revoryRecoveryWindowDays * DAY_IN_MS,
  );

  const [disruptedAppointments, scheduledAppointments] = await Promise.all([
    prisma.appointment.findMany({
      include: {
        client: {
          select: {
            email: true,
            firstName: true,
            fullName: true,
            id: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "desc",
      },
      where: {
        scheduledAt: {
          gte: windowStartsAt,
          lte: windowEndsAt,
        },
        status: {
          in: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
        },
        workspaceId,
      },
    }),
    prisma.appointment.findMany({
      select: {
        clientId: true,
        scheduledAt: true,
      },
      where: {
        scheduledAt: {
          gt: windowStartsAt,
        },
        status: AppointmentStatus.SCHEDULED,
        workspaceId,
      },
    }),
  ]);

  const normalizedDisruptedAppointments: RecoveryOpportunityAppointmentRecord[] =
    disruptedAppointments.map((appointment) => ({
      client: appointment.client,
      estimatedRevenue:
        appointment.estimatedRevenue !== null
          ? Number(appointment.estimatedRevenue)
          : null,
      id: appointment.id,
      providerName: appointment.providerName,
      scheduledAt: appointment.scheduledAt,
      serviceName: appointment.serviceName,
      status: appointment.status,
    }));

  const normalizedScheduledAppointments: RecoveryScheduledAppointmentRecord[] =
    scheduledAppointments.map((appointment) => ({
      clientId: appointment.clientId,
      scheduledAt: appointment.scheduledAt,
    }));

  return buildRecoveryOpportunityClassification(
    normalizedDisruptedAppointments,
    normalizedScheduledAppointments,
    now,
  );
}
