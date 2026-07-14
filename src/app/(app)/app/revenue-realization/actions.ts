"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/services/app/get-app-context";
import { getCapabilityAccess } from "@/services/billing/capabilities";
import { captureGrowthIntelligenceSnapshot } from "@/services/growth-intelligence/snapshots";
import { syncRevenueRealizationFindingsForWorkspace } from "@/services/revenue-realization/sync-findings";
import { checkRateLimit } from "@/services/security/rate-limit";

export async function refreshRevenueRealizationFindings() {
  const context = await getAppContext();
  if (!context) return;
  if (!(await getCapabilityAccess(context.workspace.id, "REVENUE_REALIZATION")).allowed) return;
  if ((await checkRateLimit({
    key: `revenue-realization-sync:${context.workspace.id}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  })).limited) return;
  await syncRevenueRealizationFindingsForWorkspace(context.workspace.id);
  await captureGrowthIntelligenceSnapshot(context.workspace.id);
  revalidatePath("/app/revenue-realization");
  revalidatePath("/app/revenue-realization/report");
  revalidatePath("/app/history");
}
