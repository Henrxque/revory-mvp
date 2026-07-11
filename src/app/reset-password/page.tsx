import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { PasswordResetConfirmForm } from "@/components/auth/PasswordResetConfirmForm";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";

export const metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

type ResetPasswordPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function getToken(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const session = await getAuthSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const token = getToken(resolvedSearchParams.token);

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
            <RevoryStatusBadge tone="accent">Secure reset</RevoryStatusBadge>
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">REVORY</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[32rem]">
                Set a new{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  password.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Use a short-lived reset link to restore email/password access to the workspace.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] p-5 text-sm leading-6 text-[#bdb6ca]">
            This only resets email/password access. Google access remains governed by the real Google OAuth setup.
          </div>
        </section>

        <section className="rev-accent-mist-soft rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(37,39,41,0.98),rgba(20,21,22,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="rev-kicker">Account recovery</p>
              <h2 className="rev-display-panel max-w-[22rem]">Choose a new password.</h2>
              <p className="max-w-[22rem] text-sm leading-6 text-[#beb7ca]">
                Minimum 10 characters. No extra account flow is created here.
              </p>
            </div>

            <div className="rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
              {token ? (
                <PasswordResetConfirmForm token={token} />
              ) : (
                <div className="space-y-4 text-sm leading-6 text-[#bdb6ca]">
                  <p>This reset link is missing a token. Request a new reset link to continue.</p>
                  <Link className="rev-action-button-primary inline-flex px-4 py-3" href="/forgot-password">
                    Request reset link
                  </Link>
                </div>
              )}
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
