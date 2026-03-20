import "server-only";

import {
  DataSourceStatus,
  type DataSource,
  type DataSourceType,
} from "@prisma/client";

import { prisma } from "@/db/prisma";

const ONBOARDING_DATA_SOURCE_NAME = "primary-source";

export async function getOnboardingDataSource(
  workspaceId: string,
): Promise<DataSource | null> {
  return prisma.dataSource.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: ONBOARDING_DATA_SOURCE_NAME,
      },
    },
  });
}

export async function upsertOnboardingDataSource(
  workspaceId: string,
  type: DataSourceType,
): Promise<DataSource> {
  return prisma.dataSource.upsert({
    where: {
      workspaceId_name: {
        workspaceId,
        name: ONBOARDING_DATA_SOURCE_NAME,
      },
    },
    update: {
      type,
      status: DataSourceStatus.PENDING,
    },
    create: {
      workspaceId,
      name: ONBOARDING_DATA_SOURCE_NAME,
      type,
      status: DataSourceStatus.PENDING,
    },
  });
}
