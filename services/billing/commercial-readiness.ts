import "server-only";

import { prisma } from "@/db/prisma";

export async function hasCompletedQuoteRecoveryBaseline(workspaceId: string) {
  const [auditEntitlementCount, completedReadCount] = await Promise.all([
    prisma.workspaceEntitlement.count({
      where: {
        offerKey: "QUOTE_RECOVERY_AUDIT",
        workspaceId,
      },
    }),
    prisma.quoteRecoveryAnalysisRun.count({
      where: {
        status: "COMPLETED",
        workspaceId,
      },
    }),
  ]);

  return auditEntitlementCount > 0 && completedReadCount > 0;
}
