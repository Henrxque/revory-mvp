import Link from "next/link";

import { RevoryLogo } from "@/components/brand/RevoryLogo";

export const metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)] px-5 py-10">
      <section className="rev-card-premium w-full max-w-2xl rounded-[32px] p-7 md:p-10">
        <RevoryLogo />
        <p className="rev-kicker mt-10">New access paused</p>
        <h1 className="rev-display-hero mt-3">REVORY is not onboarding new workspaces during migration.</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[color:var(--text-muted)]">
          Contractor-native Quote Recovery is not enabled yet, and the discontinued MedSpa flow is not available to new customers. Existing account holders can still sign in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rev-button-primary" href="/sign-in">
            Existing account
          </Link>
          <Link className="rev-button-secondary" href="/">
            Back to REVORY
          </Link>
        </div>
      </section>
    </main>
  );
}
