import "server-only";

import { prisma } from "@/db/prisma";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isWorkspaceProductAdmin } from "@/services/app/product-admin";

export type CanonicalVolumePolicy = {
  label: "ADMIN" | "AUDIT" | "STARTER" | "GROWTH" | "PRO" | "GROWTH_PREVIEW" | "PRO_PREVIEW";
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
  const [entitlements, productAdmin] = await Promise.all([
    prisma.workspaceEntitlement.findMany({
      select: { offerKey: true },
      where: {
        workspaceId,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
    }),
    isWorkspaceProductAdmin(workspaceId),
  ]);
  const offerKeys = new Set(entitlements.map((entitlement) => entitlement.offerKey));
  const preview = isInternalMigrationPreviewEnabled();
  return {
    admin: productAdmin,
    enabled: offerKeys.has("GROWTH") || offerKeys.has("PRO") || preview || productAdmin,
    preview: !offerKeys.has("GROWTH") && !offerKeys.has("PRO") && !productAdmin && preview,
    commerciallyEntitled: offerKeys.has("GROWTH") || offerKeys.has("PRO"),
  };
}

export async function getProAccess(workspaceId: string) {
  const [entitlement, productAdmin] = await Promise.all([
    prisma.workspaceEntitlement.findFirst({
      select: { offerKey: true },
      where: {
        workspaceId,
        offerKey: "PRO",
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
    }),
    isWorkspaceProductAdmin(workspaceId),
  ]);
  const preview = isInternalMigrationPreviewEnabled();
  return {
    admin: productAdmin,
    enabled: Boolean(entitlement) || preview || productAdmin,
    preview: !entitlement && !productAdmin && preview,
    commerciallyEntitled: Boolean(entitlement),
  };
}

export async function getCanonicalVolumePolicy(workspaceId: string): Promise<CanonicalVolumePolicy> {
  const [entitlements, productAdmin] = await Promise.all([
    prisma.workspaceEntitlement.findMany({
      select: { offerKey: true },
      where: {
        workspaceId,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
    }),
    isWorkspaceProductAdmin(workspaceId),
  ]);
  const offerKeys = new Set(entitlements.map((entitlement) => entitlement.offerKey));
  if (productAdmin) return { label: "ADMIN", ...proPolicy };
  if (offerKeys.has("PRO")) return { label: "PRO", ...proPolicy };
  if (offerKeys.has("GROWTH")) return { label: "GROWTH", ...growthPolicy };
  if (isInternalMigrationPreviewEnabled()) return { label: "PRO_PREVIEW", ...proPolicy };
  if (offerKeys.has("STARTER")) return { label: "STARTER", ...basePolicy };
  return { label: "AUDIT", ...basePolicy };
}
