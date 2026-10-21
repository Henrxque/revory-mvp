"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAppContext } from "@/services/app/get-app-context";
import { recordLegalAcceptance } from "@/services/legal/acceptance";
import { normalizeAuthRedirectTarget } from "@/services/auth/redirects";

export async function acceptCurrentLegalDocuments(formData: FormData) {
  const context = await getAppContext();
  if (!context) redirect("/sign-in?redirect_url=%2Fapp%2Fdashboard");
  if (formData.get("legalAccepted") !== "yes") {
    throw new Error("Explicit legal acceptance is required.");
  }
  await recordLegalAcceptance({
    context: { surface: "material-update-gate" },
    event: "MATERIAL_UPDATE_ACCEPTED",
    userId: context.user.id,
    workspaceId: context.workspace.id,
  });
  revalidatePath("/app", "layout");
  revalidatePath("/start");
  const returnTo = formData.get("returnTo");
  redirect(normalizeAuthRedirectTarget(typeof returnTo === "string" ? returnTo : undefined, "/app/dashboard"));
}
