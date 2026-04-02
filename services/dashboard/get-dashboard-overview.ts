import "server-only";

import { AppointmentStatus, DataSourceType } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { csvUploadSourceNames } from "@/services/imports/csv-upload-source-config";

export type DashboardOverview = {
  bookedAppointments: number;
  bookedProofSource: {
    errorRows: number;
    fileName: string | null;
    importedAt: Date | null;
    status: string;
    successRows: number;
    totalRows: number;
    type: DataSourceType;
  } | null;
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
  leadBaseSource: {
    errorRows: number;
    fileName: string | null;
    importedAt: Date | null;
    status: string;
    successRows: number;
    totalRows: number;
    type: DataSourceType;
  } | null;
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
  averageDealValue: number | null = null,
): Promise<DashboardOverview> {
  const now = new Date();
  const [
    bookedAppointments,
    bookedRevenueRows,
    appointmentCount,
    clientCount,
    upcomingAppointments,
    canceledAppointments,
    dataSources,
    upcomingList,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
        },
        workspaceId,
      },
    }),
    prisma.appointment.findMany({
      select: {
        estimatedRevenue: true,
      },
      where: {
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
        },
        workspaceId,
      },
    }),
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
  let estimatedImportedRevenue: number | null = null;
  let hasRevenueSupport = false;

  for (const row of bookedRevenueRows) {
    if (row.estimatedRevenue !== null) {
      estimatedImportedRevenue =
        (estimatedImportedRevenue ?? 0) + Number(row.estimatedRevenue);
      hasRevenueSupport = true;
      continue;
    }

    if (averageDealValue !== null) {
      estimatedImportedRevenue = (estimatedImportedRevenue ?? 0) + averageDealValue;
      hasRevenueSupport = true;
    }
  }

  if (!hasRevenueSupport) {
    estimatedImportedRevenue = null;
  }

  const importSources = dataSources.map((source) => ({
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
  }));
  const bookedProofSource =
    importSources.find((source) => source.type === DataSourceType.APPOINTMENTS_CSV) ?? null;
  const leadBaseSource =
    importSources.find((source) => source.type === DataSourceType.CLIENTS_CSV) ?? null;

  return {
    bookedAppointments,
    bookedProofSource,
    appointmentsMonitored: appointmentCount,
    canceledAppointments,
    clientsImported: clientCount,
    estimatedImportedRevenue,
    futureMetricsReady: {
      confirmationRate: false,
      revenueProtected: false,
      revenueRecovered: false,
    },
    importSources,
    leadBaseSource,
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
