import { redirect } from "next/navigation";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";

import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getInitialAppPath } from "@/services/app/get-initial-app-path";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";

export default async function PrivateAppEntryPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  if (isAiIntegrityExperienceEnabled()) redirect("/app/ai-integrity/dashboard");
  if (isInternalMigrationPreviewEnabled()) {
    redirect("/app/dashboard");
  }

  redirect(await getInitialAppPath(appContext));
}
