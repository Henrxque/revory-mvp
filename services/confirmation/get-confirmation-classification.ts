import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  buildConfirmationClassification,
  type ConfirmationAppointmentRecord,
} from "@/services/confirmation/build-confirmation-classification";
import type { RevoryConfirmationClassification } from "@/types/confirmation";

export async function getConfirmationClassification(
  workspaceId: string,
  now = new Date(),
): Promise<RevoryConfirmationClassification> {
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

  const normalizedAppointments: ConfirmationAppointmentRecord[] = appointments.map(
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

  return buildConfirmationClassification(normalizedAppointments, now);
}
