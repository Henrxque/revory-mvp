import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  buildReminderClassification,
  type ReminderAppointmentRecord,
} from "@/services/reminder/build-reminder-classification";
import type { RevoryReminderClassification } from "@/types/reminder";

export async function getReminderClassification(
  workspaceId: string,
  now = new Date(),
): Promise<RevoryReminderClassification> {
  const appointments = await prisma.appointment.findMany({
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
      scheduledAt: "asc",
    },
    where: {
      scheduledAt: {
        gt: now,
      },
      status: AppointmentStatus.SCHEDULED,
      workspaceId,
    },
  });

  const normalizedAppointments: ReminderAppointmentRecord[] = appointments.map(
    (appointment) => ({
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
    }),
  );

  return buildReminderClassification(normalizedAppointments, now);
}
