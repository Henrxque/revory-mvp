import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { buildSignUpRedirectPath } from "@/services/auth/redirects";

export default async function StartPage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/app");
  }

  redirect(buildSignUpRedirectPath("/app"));
}
