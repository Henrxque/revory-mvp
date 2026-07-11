import { redirect } from "next/navigation";

export default function DemoPage() {
  // The public demo represents the discontinued MedSpa product and must not be
  // presented as evidence of the new contractor-native REVORY capability.
  redirect("/");
}
