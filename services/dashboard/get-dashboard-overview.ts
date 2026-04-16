import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { AppointmentStatus, DataSourceType, Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { csvUploadSourceNames } from "@/services/imports/csv-upload-source-config";

export type DashboardOverview = {
  commercialSafeguard: {
    actionHref: string;
    actionLabel: string;
    coreReadLabel: string;
    headline: string;
    status: "stable" | "watch";
    supportLabel: string;
    summary: string;
  };
  supportIntegrity: {
    degradedSections: Array<"attribution" | "momentum" | "upcoming">;
    headline: string;
    summary: string;
  };
  executiveRead: {
    headline: string;
    summary: string;
    tiles: Array<{
      hint: string;
      label: string;
      value: string;
    }>;
  };
  attributionRead: {
    status: "degraded" | "ready";
    bookedAppointmentsWithIdentity: number;
    bookedAppointmentsWithLeadBaseSupport: number | null;
    identityCoveragePercent: number | null;
    leadBaseClients: number | null;
    leadBaseCoveragePercent: number | null;
    revenueWithLeadBaseSupport: number | null;
  };
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
  recentMomentum: {
    status: "degraded" | "ready";
    bookedAppointments: number;
    estimatedRevenue: number | null;
    strongestMonthLabel: string | null;
    strongestMonthRevenue: number | null;
    timeline: Array<{
      bookedAppointments: number;
      estimatedRevenue: number | null;
      label: string;
      monthKey: string;
    }>;
    windowLabel: string;
  };
  retentionRead: {
    status: "degraded" | "ready";
    headline: string;
    summary: string;
    checkpoints: Array<{
      label: string;
      tone: "future" | "neutral" | "real";
      value: string;
    }>;
  };
  renewalRead: {
    status: "degraded" | "ready";
    headline: string;
    summary: string;
    supportPoints: Array<{
      label: string;
      statusLabel: string;
      tone: "future" | "neutral" | "real";
      value: string;
    }>;
  };
  appointmentsMonitored: number;
  upcomingRead: {
    status: "degraded" | "ready";
    appointments: number;
    list: Array<{
      clientName: string;
      id: string;
      scheduledAt: Date;
      serviceName: string | null;
      status: AppointmentStatus;
    }>;
  };
};

function reviveDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function reviveDashboardOverviewDates(overview: DashboardOverview): DashboardOverview {
  return {
    ...overview,
    bookedProofSource: overview.bookedProofSource
      ? {
          ...overview.bookedProofSource,
          importedAt: reviveDate(overview.bookedProofSource.importedAt),
        }
      : null,
    importSources: overview.importSources.map((source) => ({
      ...source,
      importedAt: reviveDate(source.importedAt),
    })),
    leadBaseSource: overview.leadBaseSource
      ? {
          ...overview.leadBaseSource,
          importedAt: reviveDate(overview.leadBaseSource.importedAt),
        }
      : null,
    upcomingRead: {
      ...overview.upcomingRead,
      list: overview.upcomingRead.list.map((appointment) => ({
        ...appointment,
        scheduledAt: reviveDate(appointment.scheduledAt) ?? new Date(0),
      })),
    },
  };
}

function getRecentMonthBuckets(count: number) {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: count }, (_, index) => {
    const bucketDate = new Date(
      startOfCurrentMonth.getFullYear(),
      startOfCurrentMonth.getMonth() - (count - index - 1),
      1,
    );

    return {
      date: bucketDate,
      key: `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
      }).format(bucketDate),
    };
  });
}

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

function formatExecutiveCurrency(value: number | null) {
  if (value === null) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function isAttributionLayerRuntimeError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("hasLeadBaseSupport") ||
    message.includes("column") ||
    message.includes("does not exist")
  );
}

function isDashboardAuxiliaryRuntimeError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return true;
  }

  return error instanceof Error;
}

async function getAttributionSupportSnapshot(
  workspaceId: string,
  averageDealValue: number | null,
) {
  if (process.env.REVORY_FORCE_ATTRIBUTION_DEGRADED === "1") {
    console.warn("[dashboard] attribution layer degraded", {
      reason: "forced_degraded_validation",
      workspaceId,
    });

    return {
      bookedAppointmentsWithLeadBaseSupport: null,
      leadBaseClientCount: null,
      revenueWithLeadBaseSupport: null,
      status: "degraded" as const,
    };
  }

  try {
    const [leadBaseClientCount, supportedBookedRows] = await Promise.all([
      prisma.client.count({
        where: {
          hasLeadBaseSupport: true,
          workspaceId,
        },
      }),
      prisma.appointment.findMany({
        select: {
          estimatedRevenue: true,
        },
        where: {
          client: {
            is: {
              hasLeadBaseSupport: true,
            },
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
          },
          workspaceId,
        },
      }),
    ]);

    let revenueWithLeadBaseSupport: number | null = null;
    let hasSupportedRevenue = false;

    for (const row of supportedBookedRows) {
      if (row.estimatedRevenue !== null) {
        revenueWithLeadBaseSupport =
          (revenueWithLeadBaseSupport ?? 0) + Number(row.estimatedRevenue);
        hasSupportedRevenue = true;
        continue;
      }

      if (averageDealValue !== null) {
        revenueWithLeadBaseSupport =
          (revenueWithLeadBaseSupport ?? 0) + averageDealValue;
        hasSupportedRevenue = true;
      }
    }

    return {
      bookedAppointmentsWithLeadBaseSupport: supportedBookedRows.length,
      leadBaseClientCount,
      revenueWithLeadBaseSupport: hasSupportedRevenue ? revenueWithLeadBaseSupport : null,
      status: "ready" as const,
    };
  } catch (error) {
    if (!isAttributionLayerRuntimeError(error)) {
      throw error;
    }

    console.warn("[dashboard] attribution layer degraded", {
      reason: error instanceof Error ? error.message : String(error),
      workspaceId,
    });

    return {
      bookedAppointmentsWithLeadBaseSupport: null,
      leadBaseClientCount: null,
      revenueWithLeadBaseSupport: null,
      status: "degraded" as const,
    };
  }
}

async function getRecentMomentumSnapshot(
  averageDealValue: number | null,
  recentMonthBuckets: Array<{
    date: Date;
    key: string;
    label: string;
  }>,
  workspaceId: string,
) {
  if (process.env.REVORY_FORCE_MOMENTUM_DEGRADED === "1") {
    console.warn("[dashboard] momentum layer degraded", {
      reason: "forced_degraded_validation",
      workspaceId,
    });

    return {
      status: "degraded" as const,
      timeline: recentMonthBuckets.map((bucket) => ({
        bookedAppointments: 0,
        estimatedRevenue: null,
        label: bucket.label,
        monthKey: bucket.key,
      })),
      windowLabel: `Last ${recentMonthBuckets.length} months`,
    };
  }

  try {
    const recentWindowStart =
      recentMonthBuckets[0]?.date ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const recentBookedRows = await prisma.appointment.findMany({
      select: {
        estimatedRevenue: true,
        scheduledAt: true,
      },
      where: {
        scheduledAt: {
          gte: recentWindowStart,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
        },
        workspaceId,
      },
    });

    const timeline = recentMonthBuckets.map((bucket) => ({
      bookedAppointments: 0,
      estimatedRevenue: 0,
      hasRevenueSupport: false,
      label: bucket.label,
      monthKey: bucket.key,
    }));

    for (const row of recentBookedRows) {
      const monthKey = `${row.scheduledAt.getFullYear()}-${String(
        row.scheduledAt.getMonth() + 1,
      ).padStart(2, "0")}`;
      const monthEntry = timeline.find((entry) => entry.monthKey === monthKey);

      if (!monthEntry) {
        continue;
      }

      monthEntry.bookedAppointments += 1;

      if (row.estimatedRevenue !== null) {
        monthEntry.estimatedRevenue += Number(row.estimatedRevenue);
        monthEntry.hasRevenueSupport = true;
        continue;
      }

      if (averageDealValue !== null) {
        monthEntry.estimatedRevenue += averageDealValue;
        monthEntry.hasRevenueSupport = true;
      }
    }

    return {
      status: "ready" as const,
      timeline: timeline.map((entry) => ({
        bookedAppointments: entry.bookedAppointments,
        estimatedRevenue: entry.hasRevenueSupport ? entry.estimatedRevenue : null,
        label: entry.label,
        monthKey: entry.monthKey,
      })),
      windowLabel: `Last ${recentMonthBuckets.length} months`,
    };
  } catch (error) {
    if (!isDashboardAuxiliaryRuntimeError(error)) {
      throw error;
    }

    console.warn("[dashboard] momentum layer degraded", {
      reason: error instanceof Error ? error.message : String(error),
      workspaceId,
    });

    return {
      status: "degraded" as const,
      timeline: recentMonthBuckets.map((bucket) => ({
        bookedAppointments: 0,
        estimatedRevenue: null,
        label: bucket.label,
        monthKey: bucket.key,
      })),
      windowLabel: `Last ${recentMonthBuckets.length} months`,
    };
  }
}

async function getUpcomingReadSnapshot(workspaceId: string) {
  if (process.env.REVORY_FORCE_UPCOMING_DEGRADED === "1") {
    console.warn("[dashboard] upcoming layer degraded", {
      reason: "forced_degraded_validation",
      workspaceId,
    });

    return {
      appointments: 0,
      list: [],
      status: "degraded" as const,
    };
  }

  try {
    const now = new Date();
    const [appointments, list] = await Promise.all([
      prisma.appointment.count({
        where: {
          scheduledAt: {
            gte: now,
          },
          status: AppointmentStatus.SCHEDULED,
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
      appointments,
      list: list.map((appointment) => ({
        clientName: resolveClientName(appointment.client),
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        serviceName: appointment.serviceName,
        status: appointment.status,
      })),
      status: "ready" as const,
    };
  } catch (error) {
    if (!isDashboardAuxiliaryRuntimeError(error)) {
      throw error;
    }

    console.warn("[dashboard] upcoming layer degraded", {
      reason: error instanceof Error ? error.message : String(error),
      workspaceId,
    });

    return {
      appointments: 0,
      list: [],
      status: "degraded" as const,
    };
  }
}

async function getDashboardOverviewUncached(
  workspaceId: string,
  averageDealValue: number | null = null,
): Promise<DashboardOverview> {
  const recentMonthBuckets = getRecentMonthBuckets(3);
  const [
    bookedAppointments,
    bookedRevenueRows,
    appointmentCount,
    clientCount,
    canceledAppointments,
    dataSources,
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
        client: {
          select: {
            email: true,
            externalId: true,
            phone: true,
          },
        },
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
  ]);
  const [attributionSupport, recentMomentumSnapshot, upcomingRead] = await Promise.all([
    getAttributionSupportSnapshot(workspaceId, averageDealValue),
    getRecentMomentumSnapshot(averageDealValue, recentMonthBuckets, workspaceId),
    getUpcomingReadSnapshot(workspaceId),
  ]);
  let estimatedImportedRevenue: number | null = null;
  let hasRevenueSupport = false;
  let bookedAppointmentsWithIdentity = 0;

  for (const row of bookedRevenueRows) {
    if (row.client.email || row.client.phone || row.client.externalId) {
      bookedAppointmentsWithIdentity += 1;
    }

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

  const identityCoveragePercent =
    bookedAppointments > 0
      ? Math.round((bookedAppointmentsWithIdentity / bookedAppointments) * 100)
      : null;
  const leadBaseCoveragePercent =
    bookedAppointments > 0 &&
    attributionSupport.bookedAppointmentsWithLeadBaseSupport !== null
      ? Math.round(
          (attributionSupport.bookedAppointmentsWithLeadBaseSupport / bookedAppointments) * 100,
        )
      : null;

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
  const momentumTimeline = recentMomentumSnapshot.timeline;
  const totalMomentumBookedAppointments = momentumTimeline.reduce(
    (sum, entry) => sum + entry.bookedAppointments,
    0,
  );
  const totalMomentumRevenue = momentumTimeline.reduce<number | null>((sum, entry) => {
    if (entry.estimatedRevenue === null) {
      return sum;
    }

    return (sum ?? 0) + entry.estimatedRevenue;
  }, null);
  const strongestMonth = [...momentumTimeline].sort((left, right) => {
    if (right.bookedAppointments !== left.bookedAppointments) {
      return right.bookedAppointments - left.bookedAppointments;
    }

    return (right.estimatedRevenue ?? 0) - (left.estimatedRevenue ?? 0);
  })[0];
  const hasBookedProofVisible = bookedAppointments > 0;
  const hasMomentumVisible = totalMomentumBookedAppointments > 0;
  const hasMomentumLayerAvailable = recentMomentumSnapshot.status === "ready";
  const hasAttributionLayerAvailable = attributionSupport.status === "ready";
  const hasLeadSupportVisible =
    attributionSupport.bookedAppointmentsWithLeadBaseSupport !== null &&
    attributionSupport.bookedAppointmentsWithLeadBaseSupport > 0;
  const degradedSections = [
    ...(hasAttributionLayerAvailable ? [] : (["attribution"] as const)),
    ...(hasMomentumLayerAvailable ? [] : (["momentum"] as const)),
    ...(upcomingRead.status === "ready" ? [] : (["upcoming"] as const)),
  ];
  const renewalHeadline = hasBookedProofVisible
    ? hasMomentumVisible
      ? hasMomentumLayerAvailable && hasAttributionLayerAvailable
        ? "Seller is still earning its place"
        : "Seller is still readable even with thinner support"
      : "Seller is live, but continuity is still thin"
    : "Renewal starts after proof is visible";
  const renewalSummary = hasBookedProofVisible
    ? hasMomentumVisible
      ? !hasMomentumLayerAvailable
        ? "Booked proof is still visible, but recent momentum is temporarily unavailable in this read."
        : !hasAttributionLayerAvailable
          ? "Booked proof and recent momentum are visible. Attribution support is temporarily unavailable, but the revenue story stays live."
        : hasLeadSupportVisible
          ? "Booked proof, recent momentum, and lead-backed attribution are all supporting the revenue story."
          : "Booked proof and recent momentum are visible, but attribution support is still thinner than the revenue read."
      : "The revenue snapshot is live, but the longitudinal layer still needs more visible booked proof."
    : "Revenue defense becomes renewable after booked appointments are visible and supported over time.";
  const renewalSupportPoints = [
    {
      label: "Booked proof",
      statusLabel: hasBookedProofVisible ? "Visible" : "Pending",
      tone: hasBookedProofVisible ? ("real" as const) : ("future" as const),
      value: hasBookedProofVisible ? `${bookedAppointments} visible` : "Pending",
    },
    {
      label: "Recent momentum",
      statusLabel: hasMomentumVisible ? "Visible" : "Thin",
      tone: hasMomentumVisible ? ("real" as const) : ("neutral" as const),
      value: hasMomentumVisible
        ? `${totalMomentumBookedAppointments} in ${recentMonthBuckets.length} months`
        : hasMomentumLayerAvailable
          ? "Still building"
          : "Unavailable",
    },
    {
      label: "Attribution support",
      statusLabel: !hasAttributionLayerAvailable
        ? "Limited"
        : hasLeadSupportVisible
          ? "Visible"
          : "Thin",
      tone: !hasAttributionLayerAvailable
        ? ("neutral" as const)
        : hasLeadSupportVisible
          ? ("real" as const)
          : ("neutral" as const),
      value: !hasAttributionLayerAvailable
        ? "Unavailable"
        : hasLeadSupportVisible
          ? `${attributionSupport.bookedAppointmentsWithLeadBaseSupport} backed`
          : bookedAppointmentsWithIdentity > 0
          ? "Identity first"
          : "Pending",
    },
  ];
  const supportedRevenueSharePercent =
    estimatedImportedRevenue !== null &&
    estimatedImportedRevenue > 0 &&
    attributionSupport.revenueWithLeadBaseSupport !== null
      ? Math.round((attributionSupport.revenueWithLeadBaseSupport / estimatedImportedRevenue) * 100)
      : null;
  const activeMonthsCount = momentumTimeline.filter((entry) => entry.bookedAppointments > 0).length;
  const revenueMonthsCount = momentumTimeline.filter(
    (entry) => entry.estimatedRevenue !== null && entry.estimatedRevenue > 0,
  ).length;
  const strongestMonthRevenueSharePercent =
    totalMomentumRevenue !== null &&
    totalMomentumRevenue > 0 &&
    strongestMonth?.estimatedRevenue !== null
      ? Math.round((strongestMonth.estimatedRevenue / totalMomentumRevenue) * 100)
      : null;
  const executiveHeadline = hasBookedProofVisible
    ? hasMomentumVisible
      ? hasMomentumLayerAvailable && hasAttributionLayerAvailable
        ? "Economic value is readable quickly"
        : "Economic value stays readable"
      : "Economic value is visible, but still thin"
    : "Economic read opens after booked proof";
  const executiveSummary = hasBookedProofVisible
    ? hasMomentumVisible
      ? !hasMomentumLayerAvailable
        ? "Booked revenue is still visible. Recent momentum is temporarily unavailable, but the core revenue read remains intact."
        : !hasAttributionLayerAvailable
          ? "Booked revenue and recent momentum are visible. Attribution support is temporarily limited, but the core revenue read remains intact."
        : supportedRevenueSharePercent !== null
          ? `${supportedRevenueSharePercent}% of visible booked revenue already carries lead-supported context.`
          : "Booked revenue is visible and recent momentum is now readable in one short executive pass."
      : "Booked revenue is visible, but recent value still needs more proof depth."
    : "Booked proof is the first requirement before Seller can defend economic value clearly.";
  const executiveTiles = [
    {
      hint: "Visible booked revenue now",
      label: "Revenue now",
      value: formatExecutiveCurrency(estimatedImportedRevenue),
    },
    {
      hint: recentMonthBuckets.length > 1 ? recentMonthBuckets.length + "-month read" : "Recent read",
      label: "Recent revenue",
      value: formatExecutiveCurrency(totalMomentumRevenue),
    },
    {
      hint: "Revenue already backed by lead support",
      label: "Supported revenue",
      value: !hasAttributionLayerAvailable
        ? "Unavailable"
        : attributionSupport.revenueWithLeadBaseSupport !== null
          ? formatExecutiveCurrency(attributionSupport.revenueWithLeadBaseSupport)
          : supportedRevenueSharePercent !== null
            ? `${supportedRevenueSharePercent}%`
            : "Pending",
    },
  ];
  const retentionHeadline = hasBookedProofVisible
    ? !hasMomentumLayerAvailable
      ? "Retention signal is temporarily limited"
      : activeMonthsCount >= 2
      ? "Value is repeating, not isolated"
      : activeMonthsCount === 1
        ? "Value is visible, but still concentrated"
        : "Retention signal is still thin"
    : "Retention signal opens after proof";
  const retentionSummary = hasBookedProofVisible
    ? !hasMomentumLayerAvailable
      ? "Booked proof is still visible, but the recent continuity window is temporarily unavailable."
      : activeMonthsCount >= 2
        ? `${activeMonthsCount} of the last ${recentMonthBuckets.length} months already show booked proof in the dashboard.`
        : activeMonthsCount === 1
          ? "Only one recent month is currently carrying visible booked proof, so continuity is still thin."
          : "Booked proof is live, but the short continuity window is still empty."
    : "Seller needs visible booked proof before it can defend continuity over time.";
  const retentionCheckpoints = [
    {
      label: "Active months",
      tone:
        activeMonthsCount >= 2
          ? ("real" as const)
          : activeMonthsCount === 1
            ? ("neutral" as const)
          : !hasMomentumLayerAvailable
            ? ("neutral" as const)
            : ("future" as const),
      value: hasMomentumLayerAvailable
        ? `${activeMonthsCount}/${recentMonthBuckets.length}`
        : "Unavailable",
    },
    {
      label: "Revenue months",
      tone:
        revenueMonthsCount >= 2
          ? ("real" as const)
          : revenueMonthsCount === 1
            ? ("neutral" as const)
          : !hasMomentumLayerAvailable
            ? ("neutral" as const)
            : ("future" as const),
      value: hasMomentumLayerAvailable
        ? `${revenueMonthsCount}/${recentMonthBuckets.length}`
        : "Unavailable",
    },
    {
      label: "Strongest month share",
      tone:
        strongestMonthRevenueSharePercent !== null
          ? strongestMonthRevenueSharePercent <= 60
            ? ("real" as const)
            : ("neutral" as const)
          : ("future" as const),
      value:
        hasMomentumLayerAvailable && strongestMonthRevenueSharePercent !== null
          ? `${strongestMonthRevenueSharePercent}%`
          : hasMomentumLayerAvailable
            ? "Pending"
            : "Unavailable",
    },
  ];
  const supportIntegrity = {
    degradedSections,
    headline:
      degradedSections.length > 0
        ? "Revenue stays live while support reads recover"
        : "All value reads are fully available",
    summary:
      degradedSections.length > 0
        ? `Booked proof and revenue remain readable. ${degradedSections.length} support read${degradedSections.length === 1 ? " is" : "s are"} temporarily limited.`
        : "Revenue, momentum, attribution, and upcoming reads are all available in this workspace.",
  };
  const commercialSafeguard = degradedSections.length > 0
    ? {
        actionHref: "/app/imports",
        actionLabel: "Refresh booked proof",
        coreReadLabel: hasBookedProofVisible ? "Revenue and proof live" : "Proof still pending",
        headline: hasBookedProofVisible
          ? "The commercial read is still safe to show"
          : "The commercial read is not fully ready yet",
        status: "watch" as const,
        supportLabel: `${degradedSections.length} support layer${degradedSections.length === 1 ? "" : "s"} limited`,
        summary: hasBookedProofVisible
          ? "Seller keeps the revenue and booked-proof read visible while support layers recover in the background."
          : "Seller keeps the read honest: proof is still pending and support layers are currently thinner than the core setup.",
      }
    : {
        actionHref: "/app/imports",
        actionLabel: hasBookedProofVisible ? "Keep proof fresh" : "Open booked proof",
        coreReadLabel: hasBookedProofVisible ? "Revenue and proof aligned" : "Setup still advancing",
        headline: hasBookedProofVisible
          ? "The commercial read is fully supported"
          : "The commercial read is still building",
        status: "stable" as const,
        supportLabel: "All support layers available",
        summary: hasBookedProofVisible
          ? "Revenue, proof, momentum, and attribution are all available in one short read."
          : "Seller is still moving toward a fully visible commercial read.",
      };

  return {
    commercialSafeguard,
    supportIntegrity,
    executiveRead: {
      headline: executiveHeadline,
      summary: executiveSummary,
      tiles: executiveTiles,
    },
    attributionRead: {
      status: attributionSupport.status,
      bookedAppointmentsWithIdentity,
      bookedAppointmentsWithLeadBaseSupport:
        attributionSupport.bookedAppointmentsWithLeadBaseSupport,
      identityCoveragePercent,
      leadBaseClients: attributionSupport.leadBaseClientCount,
      leadBaseCoveragePercent,
      revenueWithLeadBaseSupport: attributionSupport.revenueWithLeadBaseSupport,
    },
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
    recentMomentum: {
      status: recentMomentumSnapshot.status,
      bookedAppointments: totalMomentumBookedAppointments,
      estimatedRevenue: totalMomentumRevenue,
      strongestMonthLabel:
        strongestMonth && strongestMonth.bookedAppointments > 0 ? strongestMonth.label : null,
      strongestMonthRevenue:
        strongestMonth && strongestMonth.bookedAppointments > 0
          ? strongestMonth.estimatedRevenue
          : null,
      timeline: momentumTimeline,
      windowLabel: recentMomentumSnapshot.windowLabel,
    },
    retentionRead: {
      status: recentMomentumSnapshot.status,
      headline: retentionHeadline,
      summary: retentionSummary,
      checkpoints: retentionCheckpoints,
    },
    renewalRead: {
      status: hasMomentumLayerAvailable ? attributionSupport.status : "degraded",
      headline: renewalHeadline,
      summary: renewalSummary,
      supportPoints: renewalSupportPoints,
    },
    upcomingRead,
  };
}

const getDashboardOverviewCached = unstable_cache(
  async (workspaceId: string, averageDealValue: number | null = null) =>
    getDashboardOverviewUncached(workspaceId, averageDealValue),
  ["dashboard-overview"],
  {
    revalidate: 10,
  },
);

export const getDashboardOverview = cache(async (
  workspaceId: string,
  averageDealValue: number | null = null,
): Promise<DashboardOverview> =>
  reviveDashboardOverviewDates(
    await getDashboardOverviewCached(workspaceId, averageDealValue),
  ));
