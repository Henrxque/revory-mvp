import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  buildAtRiskClassification,
  type AtRiskAppointmentRecord,
} from "@/services/at-risk/build-at-risk-classification";
import type { RevoryAtRiskClassification } from "@/types/at-risk";

export async function getAtRiskClassification(
  workspaceId: string,
  now = new Date(),
): Promise<RevoryAtRiskClassification> {
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

  const normalizedAppointments: AtRiskAppointmentRecord[] = appointments.map(
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

  return buildAtRiskClassification(normalizedAppointments, now);
}
