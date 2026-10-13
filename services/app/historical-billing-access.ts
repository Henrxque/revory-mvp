import "server-only";

import type { User, Workspace } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { belongsToHistoricalBillingCohort } from "@/domain/revory/historical-billing-cohort";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isProductAdminEmail } from "@/services/app/product-admin";

export async function hasHistoricalBillingAccess(user: User, workspace: Workspace) {
  const signals = {
    accountCreatedAt: user.createdAt,
    billingStatus: workspace.billingStatus,
    hasLegacyPlan: Boolean(workspace.planKey),
    hasRecordedEntitlement: false,
    hasStripeCustomer: Boolean(workspace.stripeCustomerId),
    internalPreview: isInternalMigrationPreviewEnabled(),
    productAdmin: isProductAdminEmail(user.email),
  };

  if (belongsToHistoricalBillingCohort(signals)) {
    return true;
  }

  // A lapsed or revoked purchase still marks a historical customer. Do not
  // send that customer to the new-product preview after their plan expires.
  const priorEntitlement = await prisma.workspaceEntitlement.findFirst({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });

  return belongsToHistoricalBillingCohort({
    ...signals,
    hasRecordedEntitlement: Boolean(priorEntitlement),
  });
}
