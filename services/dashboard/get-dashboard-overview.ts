import "server-only";

import { AppointmentStatus, DataSourceType } from "@prisma/client";

import { prisma } from "@/db/prisma";

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
  upcomingAppointments: number;
};

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
        type: {
          in: [DataSourceType.APPOINTMENTS_CSV, DataSourceType.CLIENTS_CSV],
        },
        workspaceId,
      },
    }),
  ]);

  return {
    appointmentsMonitored: appointmentCount,
    canceledAppointments,
    clientsImported: clientCount,
    estimatedImportedRevenue: revenueAggregate._sum.estimatedRevenue
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
    upcomingAppointments,
  };
}
