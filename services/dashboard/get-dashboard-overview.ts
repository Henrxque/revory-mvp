import "server-only";

import { AppointmentStatus, DataSourceType } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { csvUploadSourceNames } from "@/services/imports/csv-upload-source-config";

export type DashboardOverview = {
  canceledAppointments: number;
  clientsImported: number;
  estimatedImportedRevenue: number | null;
  futureMetricsReady: {
    confirmationRate: boolean;
    revenueProtected: boolean;
    revenueRecovered: boolean;
  };
  importSources: Array<{
    errorRows: number;
    fileName: string | null;
    importedAt: Date | null;
    status: string;
    successRows: number;
    templateLabel: string;
    totalRows: number;
    type: DataSourceType;
  }>;
  appointmentsMonitored: number;
  upcomingList: Array<{
    clientName: string;
    id: string;
    scheduledAt: Date;
    serviceName: string | null;
    status: AppointmentStatus;
  }>;
  upcomingAppointments: number;
};

function resolveClientName(client: {
  firstName: string | null;
  fullName: string | null;
  lastName: string | null;
}) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const composedName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || "Client pending";
}

export async function getDashboardOverview(
  workspaceId: string,
): Promise<DashboardOverview> {
  const now = new Date();
  const [
    appointmentCount,
    clientCount,
    upcomingAppointments,
    canceledAppointments,
    revenueAggregate,
    dataSources,
    upcomingList,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        workspaceId,
      },
    }),
    prisma.client.count({
      where: {
        workspaceId,
      },
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: now,
        },
        status: AppointmentStatus.SCHEDULED,
        workspaceId,
      },
    }),
    prisma.appointment.count({
      where: {
        status: AppointmentStatus.CANCELED,
        workspaceId,
      },
    }),
    prisma.appointment.aggregate({
      _sum: {
        estimatedRevenue: true,
      },
      where: {
        estimatedRevenue: {
          not: null,
        },
        workspaceId,
      },
    }),
    prisma.dataSource.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        lastImportErrorRowCount: true,
        lastImportFileName: true,
        lastImportRowCount: true,
        lastImportSuccessRowCount: true,
        lastImportedAt: true,
        status: true,
        type: true,
      },
      where: {
        name: {
          in: Object.values(csvUploadSourceNames),
        },
        workspaceId,
      },
    }),
    prisma.appointment.findMany({
      include: {
        client: {
          select: {
            firstName: true,
            fullName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 4,
      where: {
        scheduledAt: {
          gte: now,
        },
        status: AppointmentStatus.SCHEDULED,
        workspaceId,
      },
    }),
  ]);

  return {
    appointmentsMonitored: appointmentCount,
    canceledAppointments,
    clientsImported: clientCount,
    estimatedImportedRevenue:
      revenueAggregate._sum.estimatedRevenue !== null
        ? Number(revenueAggregate._sum.estimatedRevenue)
        : null,
    futureMetricsReady: {
      confirmationRate: false,
      revenueProtected: false,
      revenueRecovered: false,
    },
    importSources: dataSources.map((source) => ({
      errorRows: source.lastImportErrorRowCount,
      fileName: source.lastImportFileName,
      importedAt: source.lastImportedAt,
      status: source.status,
      successRows: source.lastImportSuccessRowCount,
      templateLabel:
        source.type === DataSourceType.APPOINTMENTS_CSV
          ? "Appointments CSV"
          : "Clients CSV",
      totalRows: source.lastImportRowCount,
      type: source.type,
    })),
    upcomingList: upcomingList.map((appointment) => ({
      clientName: resolveClientName(appointment.client),
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      serviceName: appointment.serviceName,
      status: appointment.status,
    })),
    upcomingAppointments,
  };
}
