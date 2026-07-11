import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";

export default async function StartPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)] px-5 py-10">
      <section className="rev-card-premium w-full max-w-2xl rounded-[32px] p-7 md:p-10">
        <RevoryLogo />
        <p className="rev-kicker mt-10">Hybrid offer unavailable</p>
        <h1 className="rev-display-hero mt-3">Checkout is closed during the domain migration.</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[color:var(--text-muted)]">
          The previous route sold the discontinued MedSpa offer. REVORY will reopen access only after Quote Recovery passes its product, security and billing gates. No charge can be started from this page.
        </p>
        <div className="mt-8">
          <AuthSignOutButton callbackUrl="/" />
        </div>
      </section>
    </main>
  );
}
