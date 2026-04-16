import "server-only";

import {
  AppointmentStatus,
  CommunicationChannel,
  DataSourceType,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import { evaluateLeadBookingOpportunity } from "@/services/lead-booking/opportunity-readiness";

const intakeEligibleSourceTypes = new Set<DataSourceType>([
  DataSourceType.CLIENTS_CSV,
  DataSourceType.MANUAL_IMPORT,
]);

function resolveIntakeChannel(email: string | null, phone: string | null) {
  if (email) {
    return CommunicationChannel.EMAIL;
  }

  if (phone) {
    return CommunicationChannel.SMS;
  }

  return null;
}

export async function syncLeadBookingOpportunitiesForClients(input: {
  clientIds: string[];
  workspaceId: string;
}) {
  const clientIds = [...new Set(input.clientIds.filter(Boolean))];

  if (clientIds.length === 0) {
    return;
  }

  const [activationSetup, clients, futureBookings] = await Promise.all([
    prisma.activationSetup.findUnique({
      where: {
        workspaceId: input.workspaceId,
      },
    }),
    prisma.client.findMany({
      include: {
        dataSource: true,
      },
      where: {
        id: {
          in: clientIds,
        },
        workspaceId: input.workspaceId,
      },
    }),
    prisma.appointment.findMany({
      distinct: ["clientId"],
      select: {
        clientId: true,
      },
      where: {
        clientId: {
          in: clientIds,
        },
        scheduledAt: {
          gte: new Date(),
        },
        status: AppointmentStatus.SCHEDULED,
        workspaceId: input.workspaceId,
      },
    }),
  ]);

  const futureBookingClientIds = new Set(futureBookings.map((item) => item.clientId));

  const operations = clients.flatMap((client) => {
      const isIntakeEligible =
        client.hasLeadBaseSupport ||
        (client.dataSource?.type
          ? intakeEligibleSourceTypes.has(client.dataSource.type)
          : false);

      if (!isIntakeEligible) {
        return [];
      }

      const intakeChannel = resolveIntakeChannel(client.email, client.phone);
      const opportunityState = evaluateLeadBookingOpportunity({
        bookingPath: activationSetup?.primaryChannel ?? null,
        email: client.email,
        hasFutureBooking: futureBookingClientIds.has(client.id),
        mainOfferKey: activationSetup?.selectedTemplate ?? null,
        phone: client.phone,
      });

      return [prisma.leadBookingOpportunity.upsert({
        create: {
          blockingReason: opportunityState.blockingReason,
          bookingPath: activationSetup?.primaryChannel ?? null,
          client: {
            connect: {
              id: client.id,
            },
          },
          handoffOpenedAt: null,
          intakeChannel,
          intakeDataSource: client.dataSourceId
            ? {
                connect: {
                  id: client.dataSourceId,
                },
              }
            : undefined,
          intakeSourceName: client.dataSource?.name ?? null,
          intakeSourceType: client.dataSource?.type ?? null,
          mainOfferKey: activationSetup?.selectedTemplate ?? null,
          nextAction: opportunityState.nextAction,
          openedAt: new Date(),
          resolvedAt: opportunityState.resolvedAt,
          status: opportunityState.status,
          workspace: {
            connect: {
              id: input.workspaceId,
            },
          },
        },
        update: {
          blockingReason: opportunityState.blockingReason,
          bookingPath: activationSetup?.primaryChannel ?? null,
          intakeChannel,
          intakeDataSourceId: client.dataSourceId,
          intakeSourceName: client.dataSource?.name ?? null,
          intakeSourceType: client.dataSource?.type ?? null,
          mainOfferKey: activationSetup?.selectedTemplate ?? null,
          nextAction: opportunityState.nextAction,
          resolvedAt: opportunityState.resolvedAt,
          status: opportunityState.status,
        },
        where: {
          clientId: client.id,
        },
      })];
    });

  if (operations.length === 0) {
    return;
  }

  await prisma.$transaction(operations);
}
