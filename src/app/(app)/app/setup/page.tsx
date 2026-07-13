import { redirect } from "next/navigation";

export default function DeprecatedSetupPage() {
  // The historical activation wizard remains preserved as migration substrate in
  // services/onboarding, but it is not part of the contractor Quote Recovery UX.
  redirect("/app/imports");
}
