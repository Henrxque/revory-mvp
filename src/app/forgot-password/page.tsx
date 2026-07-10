import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";

export const metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default async function ForgotPasswordPage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_0.85fr] lg:items-stretch">
        <section className="rev-shell-hero rev-accent-mist flex flex-col rounded-[36px] p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/">
              <RevoryLogo />
            </Link>
            <RevoryStatusBadge tone="accent">Password reset</RevoryStatusBadge>
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">REVORY</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[32rem]">
                Reset access to your{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  workspace.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Enter the email on the workspace. If email delivery is configured, REVORY sends a short-lived reset link.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] p-5 text-sm leading-6 text-[#bdb6ca]">
            Reset links expire in 45 minutes. REVORY does not expose unused social providers or fake login paths.
          </div>
        </section>

        <section className="rev-accent-mist-soft rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="rev-kicker">Account recovery</p>
              <h2 className="rev-display-panel max-w-[22rem]">Request a reset link.</h2>
              <p className="max-w-[22rem] text-sm leading-6 text-[#beb7ca]">
                Keep this narrow: one email, one reset link, no support theater.
              </p>
            </div>

            <div className="rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
              <PasswordResetRequestForm />
            </div>

            <Link className="text-sm font-medium text-[#bdb6ca] transition hover:text-white" href="/sign-in">
              Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
