import "server-only";

import { unstable_cache } from "next/cache";
import {
  DataSourceStatus,
  type DataSource,
  type DataSourceType,
} from "@prisma/client";

import { prisma } from "@/db/prisma";

const ONBOARDING_DATA_SOURCE_NAME = "primary-source";

const getOnboardingDataSourceCached = unstable_cache(
  async (workspaceId: string): Promise<DataSource | null> =>
    prisma.dataSource.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: ONBOARDING_DATA_SOURCE_NAME,
        },
      },
    }),
  ["onboarding-data-source"],
  {
    revalidate: 10,
  },
);

export async function getOnboardingDataSource(
  workspaceId: string,
): Promise<DataSource | null> {
  return getOnboardingDataSourceCached(workspaceId);
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
