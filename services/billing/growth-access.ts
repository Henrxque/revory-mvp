import "server-only";

import { prisma } from "@/db/prisma";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";

export type CanonicalVolumePolicy = {
  label: "AUDIT" | "STARTER" | "GROWTH" | "PRO" | "GROWTH_PREVIEW" | "PRO_PREVIEW";
  maxFileBytes: number;
  maxFiles: number;
  maxRowsPerFile: number;
  maxTotalBytes: number;
  maxTotalRows: number;
};

const basePolicy = { maxFileBytes: 8 * 1024 * 1024, maxFiles: 8, maxRowsPerFile: 25_000, maxTotalBytes: 24 * 1024 * 1024, maxTotalRows: 75_000 };
const growthPolicy = { maxFileBytes: 12 * 1024 * 1024, maxFiles: 8, maxRowsPerFile: 50_000, maxTotalBytes: 48 * 1024 * 1024, maxTotalRows: 200_000 };
const proPolicy = { maxFileBytes: 16 * 1024 * 1024, maxFiles: 8, maxRowsPerFile: 100_000, maxTotalBytes: 80 * 1024 * 1024, maxTotalRows: 400_000 };

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
    enabled: offerKeys.has("GROWTH") || offerKeys.has("PRO") || preview,
    preview: !offerKeys.has("GROWTH") && !offerKeys.has("PRO") && preview,
    commerciallyEntitled: offerKeys.has("GROWTH") || offerKeys.has("PRO"),
  };
}

export async function getProAccess(workspaceId: string) {
  const entitlement = await prisma.workspaceEntitlement.findFirst({
    select: { offerKey: true },
    where: {
      workspaceId,
      offerKey: "PRO",
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
  });
  const preview = isInternalMigrationPreviewEnabled();
  return {
    enabled: Boolean(entitlement) || preview,
    preview: !entitlement && preview,
    commerciallyEntitled: Boolean(entitlement),
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
  if (offerKeys.has("PRO")) return { label: "PRO", ...proPolicy };
  if (offerKeys.has("GROWTH")) return { label: "GROWTH", ...growthPolicy };
  if (isInternalMigrationPreviewEnabled()) return { label: "PRO_PREVIEW", ...proPolicy };
  if (offerKeys.has("STARTER")) return { label: "STARTER", ...basePolicy };
  return { label: "AUDIT", ...basePolicy };
}
