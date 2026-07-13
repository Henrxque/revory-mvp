import "server-only";

import { prisma } from "@/db/prisma";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";

export type CanonicalVolumePolicy = {
  label: "AUDIT" | "STARTER" | "GROWTH" | "GROWTH_PREVIEW";
  maxFileBytes: number;
  maxFiles: number;
  maxRowsPerFile: number;
};

const basePolicy = { maxFileBytes: 8 * 1024 * 1024, maxFiles: 8, maxRowsPerFile: 25_000 };
const growthPolicy = { maxFileBytes: 12 * 1024 * 1024, maxFiles: 8, maxRowsPerFile: 50_000 };

export async function getGrowthAccess(workspaceId: string) {
  const entitlements = await prisma.workspaceEntitlement.findMany({
    select: { offerKey: true },
    where: {
      workspaceId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
  });
  const offerKeys = new Set(entitlements.map((entitlement) => entitlement.offerKey));
  const preview = isInternalMigrationPreviewEnabled();
  return {
    enabled: offerKeys.has("GROWTH") || preview,
    preview: !offerKeys.has("GROWTH") && preview,
    commerciallyEntitled: offerKeys.has("GROWTH"),
  };
}

export async function getCanonicalVolumePolicy(workspaceId: string): Promise<CanonicalVolumePolicy> {
  const entitlements = await prisma.workspaceEntitlement.findMany({
    select: { offerKey: true },
    where: {
      workspaceId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
  });
  const offerKeys = new Set(entitlements.map((entitlement) => entitlement.offerKey));
  if (offerKeys.has("GROWTH")) return { label: "GROWTH", ...growthPolicy };
  if (isInternalMigrationPreviewEnabled()) return { label: "GROWTH_PREVIEW", ...growthPolicy };
  if (offerKeys.has("STARTER")) return { label: "STARTER", ...basePolicy };
  return { label: "AUDIT", ...basePolicy };
}
