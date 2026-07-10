import Link from "next/link";

import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { verifyEmailWithToken } from "@/services/auth/email-verification";

export const metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

type VerifyEmailPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function readToken(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const token = readToken(resolvedSearchParams.token);
  const result = token
    ? await verifyEmailWithToken(token)
    : {
        message: "This verification link is missing a token.",
        ok: false as const,
      };
  const primaryHref = result.ok ? "/sign-in" : "/sign-up";

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_0.85fr] lg:items-stretch">
        <section className="rev-shell-hero rev-accent-mist flex flex-col rounded-[36px] p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/">
              <RevoryLogo />
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link className="rev-button-secondary px-4 py-2 text-xs" href="/">
                Back to REVORY
              </Link>
              <RevoryStatusBadge tone={result.ok ? "real" : "future"}>
                {result.ok ? "Email confirmed" : "Verification needed"}
              </RevoryStatusBadge>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">REVORY account</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[34rem]">
                {result.ok ? "Email confirmed. You can sign in now." : "This link could not be confirmed."}
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                {result.ok
                  ? "Your email/password account is active. Continue to REVORY with the password you created."
                  : result.message}
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="rev-action-button-primary px-5 py-3 text-sm" href={primaryHref}>
              {result.ok ? "Continue to sign in" : "Request a new link"}
            </Link>
            <Link className="rev-button-secondary px-5 py-3 text-sm" href="/">
              Back to REVORY
            </Link>
          </div>
        </section>

        <aside className="rev-card flex flex-col justify-between rounded-[32px] p-7 md:p-8">
          <div className="space-y-4">
            <RevoryStatusBadge tone="accent">Secure email access</RevoryStatusBadge>
            <h2 className="rev-display-panel max-w-[22rem]">
              {result.ok ? "What changed?" : "Need a fresh link?"}
            </h2>
            <p className="text-sm leading-6 text-[color:var(--text-muted)]">
              {result.ok
                ? "REVORY marked this email as verified and unlocked email/password sign-in for the account."
                : "Go back to sign up and submit the same email again. If the account is still pending, REVORY sends a new verification link."}
            </p>
            <div className="grid gap-3 pt-2">
              {[
                result.ok ? "Email verified" : "Token was not accepted",
                result.ok ? "Email/password access active" : "No account access was changed",
                "Google sign-in remains separate",
              ].map((item) => (
                <div
                  className="rounded-2xl border border-[color:var(--border)] bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#cfc8da]"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-[11px] leading-5 text-[color:var(--text-subtle)]">
            This confirmation applies only to REVORY email/password accounts.
          </p>
        </aside>
      </div>
    </main>
  );
}
