"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/services/app/get-app-context";
import { getWorkspaceBillingSummary } from "@/services/billing/workspace-billing";
import { syncRevenueLeaksForWorkspace } from "@/services/revenue-leaks/sync-revenue-leaks";
import { checkRateLimit } from "@/services/security/rate-limit";

export type SyncDashboardRevenueLeaksState = {
  message: string;
  ok: boolean | null;
  summary: string | null;
};

export async function syncDashboardRevenueLeaks(): Promise<SyncDashboardRevenueLeaksState> {
  const appContext = await getAppContext();

  if (!appContext) {
    return {
      message: "Your REVORY session expired before the leak read could run.",
      ok: false,
      summary: "Sign in again and retry from the dashboard.",
    };
  }

  const billingSummary = getWorkspaceBillingSummary(appContext.workspace);

  if (!billingSummary.hasActiveAccess) {
    return {
      message: "Your REVORY plan is not active enough to run the leak read.",
      ok: false,
      summary: "Reactivate access before refreshing persisted leak signals.",
    };
  }

  if (!appContext.activationSetup.isCompleted) {
    return {
      message: "Finish activation before running the leak read.",
      ok: false,
      summary: "REVORY needs setup context before syncing revenue leak evidence.",
    };
  }

  const rateLimit = await checkRateLimit({
    key: `leak-sync:${appContext.workspace.id}`,
    limit: 10,
    windowMs: 1000 * 60 * 10,
  });

  if (rateLimit.limited) {
    return {
      message: "Too many leak read refreshes in a short window.",
      ok: false,
      summary: "Wait a few minutes before running the leak read again.",
    };
  }

  try {
    const result = await syncRevenueLeaksForWorkspace({
      workspaceId: appContext.workspace.id,
    });

    revalidatePath("/app/dashboard");

    return {
      message: "Leak read refreshed from current imported data.",
      ok: true,
      summary: `${result.detected} detected / ${result.created} created / ${result.updated} updated / ${result.unchanged} unchanged.`,
    };
  } catch (error) {
    console.warn("[dashboard] leak read sync failed", {
      reason: error instanceof Error ? error.message : String(error),
      workspaceId: appContext.workspace.id,
    });

    return {
      message: "REVORY could not refresh the leak read right now.",
      ok: false,
      summary: "No background job was started. Try again after checking the imported data.",
    };
  }
}
