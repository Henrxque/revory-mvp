import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthRecoveryBridge } from "@/components/auth/AuthRecoveryBridge";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { normalizeAuthRedirectTarget } from "@/services/auth/redirects";

const signInHighlights = [
  "Protected workspace",
  "Setup resumes in place",
  "Imported dashboard ready",
];

const signInSteps = [
  {
    label: "01",
    title: "Return to the same workspace",
    text: "The account reconnects the user with the existing private context instead of dropping them into a generic admin shell.",
  },
  {
    label: "02",
    title: "Resume the product path",
    text: "Setup, imports, and dashboard state stay tied to the same MedSpa-first flow.",
  },
  {
    label: "03",
    title: "Continue with the imported base",
    text: "The authenticated area already knows whether the workspace should go to setup or dashboard.",
  },
];

type SignInPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { userId } = await auth();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectTarget = normalizeAuthRedirectTarget(
    resolvedSearchParams.redirect_url ?? resolvedSearchParams.redirectUrl,
  );

  if (userId) {
    redirect(redirectTarget);
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14">
      <AuthRecoveryBridge redirectTarget={redirectTarget} />
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_0.85fr] lg:items-stretch">
        <section className="rev-shell-hero flex flex-col rounded-[36px] p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/">
              <RevoryLogo />
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="rev-button-secondary px-4 py-2 text-xs"
                href="/"
              >
                Back to home
              </Link>
              <RevoryStatusBadge tone="accent">Workspace access</RevoryStatusBadge>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {signInHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cfc7db]"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">Protected product flow</p>
            <div className="space-y-3">
              <h1 className="max-w-2xl font-[family:var(--font-display)] text-4xl leading-[0.94] text-[color:var(--foreground)] md:text-5xl">
                Sign in and continue from the{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  same REVORY workspace.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                REVORY keeps onboarding, imports, and dashboard visibility
                inside one protected MedSpa-first flow. Authentication should
                feel like part of the product, not a detached utility screen.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {signInSteps.map((step) => (
              <div
                key={step.label}
                className="rev-card-soft rounded-[24px] px-5 py-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-light)]">
                  {step.label}
                </p>
                <p className="mt-3 text-base font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#b7afc5]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="rev-kicker">Authentication</p>
              <h2 className="font-[family:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)] md:text-4xl">
                Access the REVORY workspace.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[#beb7ca]">
                Use the same account tied to the workspace context so redirects,
                setup state, and imported data remain coherent.
              </p>
            </div>

            <div className="rev-auth-clerk rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
              <SignIn
                fallbackRedirectUrl={redirectTarget}
                forceRedirectUrl={redirectTarget}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
