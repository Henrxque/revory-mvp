import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getInitialAppPath } from "@/services/app/get-initial-app-path";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";

export default async function PrivateAppEntryPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  if (isInternalMigrationPreviewEnabled()) {
    redirect("/app/dashboard");
  }

  redirect(await getInitialAppPath(appContext));
}
