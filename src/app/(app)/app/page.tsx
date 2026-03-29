import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getInitialAppPath } from "@/services/app/get-initial-app-path";

export default async function PrivateAppEntryPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect(buildSignInRedirectPath("/app"));
  }

  redirect(await getInitialAppPath(appContext));
}
