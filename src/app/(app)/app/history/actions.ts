"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/services/app/get-app-context";
import { getCapabilityAccess } from "@/services/billing/capabilities";
import { recordEvidenceEvent } from "@/services/evidence/launch-evidence";

export async function recordWeeklyDecisionFeedback(formData: FormData) {
  const context = await getAppContext();
  if (!context || !(await getCapabilityAccess(context.workspace.id, "GROWTH_INTELLIGENCE")).allowed) return;
  const stateFingerprint = String(formData.get("stateFingerprint") ?? "").trim();
  const useful = formData.get("useful") === "yes" ? true : formData.get("useful") === "no" ? false : null;
  if (!/^[a-f0-9]{64}$/.test(stateFingerprint) || useful === null) return;
  await recordEvidenceEvent({
    workspaceId: context.workspace.id,
    metric: "WEEKLY_DECISION_USEFUL",
    source: "CUSTOMER",
    offerKey: "GROWTH",
    booleanValue: useful,
    idempotencyKey: `weekly-decision:${stateFingerprint}`,
    relatedEntityId: stateFingerprint,
  });
  revalidatePath("/app/history");
}
