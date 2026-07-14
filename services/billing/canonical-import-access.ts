import "server-only";

import { prisma } from "@/db/prisma";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isWorkspaceProductAdmin } from "@/services/app/product-admin";

export type CanonicalImportAccessNotice = {
  analysisRunsUsed: number;
  blocked: boolean;
  label: string;
  maxAnalysisRuns: number | null;
  mode: "ADMIN" | "AUDIT" | "PREVIEW" | "SUBSCRIPTION" | "UNENTITLED";
  requiresConsumptionConfirmation: boolean;
};

export async function getCanonicalImportAccessNotice(
  workspaceId: string,
): Promise<CanonicalImportAccessNotice> {
  if (await isWorkspaceProductAdmin(workspaceId)) {
    return {
      analysisRunsUsed: 0,
      blocked: false,
      label: "Admin testing access",
      maxAnalysisRuns: null,
      mode: "ADMIN",
      requiresConsumptionConfirmation: false,
    };
  }

  const entitlements = await prisma.workspaceEntitlement.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
  });
  const subscription = entitlements.find((item) =>
    ["STARTER", "GROWTH", "PRO"].includes(item.offerKey),
  );
  if (subscription) {
    return {
      analysisRunsUsed: subscription.analysisRunsUsed,
      blocked: false,
      label: `${subscription.offerKey} recurring access`,
      maxAnalysisRuns: null,
      mode: "SUBSCRIPTION",
      requiresConsumptionConfirmation: false,
    };
  }

  const audit = entitlements.find((item) => item.offerKey === "QUOTE_RECOVERY_AUDIT");
  if (audit) {
    const maximum = audit.maxAnalysisRuns ?? 1;
    const blocked = audit.analysisRunsUsed >= maximum;
    return {
      analysisRunsUsed: audit.analysisRunsUsed,
      blocked,
      label: "Quote Recovery Audit - one-time",
      maxAnalysisRuns: maximum,
      mode: "AUDIT",
      requiresConsumptionConfirmation: !blocked,
    };
  }

  if (isInternalMigrationPreviewEnabled()) {
    return {
      analysisRunsUsed: 0,
      blocked: false,
      label: "Internal preview",
      maxAnalysisRuns: null,
      mode: "PREVIEW",
      requiresConsumptionConfirmation: false,
    };
  }

  return {
    analysisRunsUsed: 0,
    blocked: true,
    label: "No active access",
    maxAnalysisRuns: null,
    mode: "UNENTITLED",
    requiresConsumptionConfirmation: false,
  };
}
