import "server-only";

import type { RevoryOfferKey } from "@prisma/client";

import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isWorkspaceProductAdmin } from "@/services/app/product-admin";
import { getWorkspaceEntitlements } from "@/services/billing/entitlements";

export type RevoryCapability = "APP" | "QUOTE_RECOVERY" | "REVENUE_REALIZATION" | "GROWTH_INTELLIGENCE" | "PRO_VOLUME";

const capabilityOffers: Record<RevoryCapability, readonly RevoryOfferKey[]> = {
  APP: ["QUOTE_RECOVERY_AUDIT", "STARTER", "GROWTH", "PRO"],
  QUOTE_RECOVERY: ["QUOTE_RECOVERY_AUDIT", "STARTER", "GROWTH", "PRO"],
  REVENUE_REALIZATION: ["PRO"],
  GROWTH_INTELLIGENCE: ["GROWTH", "PRO"],
  PRO_VOLUME: ["PRO"],
};

export async function getCapabilityAccess(workspaceId: string, capability: RevoryCapability) {
  const [entitlements, productAdmin] = await Promise.all([
    getWorkspaceEntitlements(workspaceId),
    isWorkspaceProductAdmin(workspaceId),
  ]);
  const accepted = new Set(capabilityOffers[capability]);
  const entitlement = entitlements.find((candidate) => accepted.has(candidate.offerKey)) ?? null;
  const preview = isInternalMigrationPreviewEnabled();
  return {
    allowed: Boolean(entitlement) || preview || productAdmin,
    admin: productAdmin,
    entitlement,
    preview: !entitlement && !productAdmin && preview,
  };
}
