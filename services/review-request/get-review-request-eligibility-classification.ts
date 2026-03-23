import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { buildReviewRequestEligibilityClassification } from "@/services/review-request/build-review-request-eligibility-classification";
import type {
  RevoryReviewRequestEligibilityClassification,
} from "@/types/review-request";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function getReviewRequestEligibilityClassification(
  workspaceId: string,
  now = new Date(),
): Promise<RevoryReviewRequestEligibilityClassification> {
  const windowStartsAt = new Date(now.getTime() - 7 * DAY_IN_MS);
  const [activationSetup, appointments] = await Promise.all([
    prisma.activationSetup.findUnique({
      select: {
        googleReviewsUrl: true,
      },
      where: {
        workspaceId,
      },
    }),
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
        OR: [
          {
            completedAt: {
              gte: windowStartsAt,
              lte: now,
            },
          },
          {
            completedAt: null,
            scheduledAt: {
              gte: windowStartsAt,
              lte: now,
            },
            status: AppointmentStatus.COMPLETED,
          },
        ],
        status: AppointmentStatus.COMPLETED,
        workspaceId,
      },
    }),
  ]);

  return buildReviewRequestEligibilityClassification(
    appointments.map((appointment) => ({
      client: appointment.client,
      completedAt: appointment.completedAt,
      estimatedRevenue:
        appointment.estimatedRevenue !== null
          ? Number(appointment.estimatedRevenue)
          : null,
      id: appointment.id,
      providerName: appointment.providerName,
      scheduledAt: appointment.scheduledAt,
      serviceName: appointment.serviceName,
      status: appointment.status,
    })),
    activationSetup?.googleReviewsUrl ?? null,
    now,
  );
}
