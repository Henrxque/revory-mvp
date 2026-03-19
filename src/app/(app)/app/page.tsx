import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { getInitialAppPath } from "@/services/app/get-initial-app-path";

export default async function PrivateAppEntryPage() {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  redirect(getInitialAppPath(appContext));
}
