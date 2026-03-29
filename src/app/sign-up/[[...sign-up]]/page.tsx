import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthGoogleButton } from "@/components/auth/AuthGoogleButton";
import { AuthStepCard } from "@/components/auth/AuthStepCard";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { isGoogleAuthConfigured } from "@/services/auth/provider-config";
import {
  buildSignInRedirectPath,
  normalizeAuthRedirectTarget,
} from "@/services/auth/redirects";

const signUpHighlights = [
  "MedSpa-first activation",
  "Booked proof path",
  "Revenue view when ready",
];

const signUpSteps = [
  {
    label: "01",
    title: "Create the workspace",
    text: "The account opens a real workspace context instead of a disconnected auth state.",
  },
  {
    label: "02",
    title: "Move through activation",
    text: "The guided path keeps activation narrow, opinionated, and coherent with the MVP.",
  },
  {
    label: "03",
    title: "Reach the revenue view",
    text: "Activation, booked proof, and the revenue view stay tied together from the first session.",
  },
];

type SignUpPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const session = await getAuthSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectTarget = normalizeAuthRedirectTarget(
    resolvedSearchParams.redirect_url ?? resolvedSearchParams.redirectUrl,
  );
  const signInPath = buildSignInRedirectPath(redirectTarget);
  const googleAuthConfigured = isGoogleAuthConfigured();

  if (session?.user?.id) {
    redirect(redirectTarget);
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_0.85fr] lg:items-stretch">
        <section className="rev-shell-hero rev-accent-mist flex flex-col rounded-[36px] p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/">
              <RevoryLogo />
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="rev-button-secondary px-4 py-2 text-xs"
                href="/"
              >
                Back to REVORY
              </Link>
              <RevoryStatusBadge tone="accent">Seller workspace</RevoryStatusBadge>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {signUpHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cfc7db]"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">Guided activation</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[32rem]">
                Start the workspace and move into the{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  REVORY Seller path.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Account creation is the front door to the protected product
                flow. From here, the workspace is created, activation is guided,
                booked proof becomes visible, and the revenue view becomes the destination.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {signUpSteps.map((step, index) => (
              <AuthStepCard
                key={step.label}
                className={index === signUpSteps.length - 1 ? "md:col-span-2 2xl:col-span-1" : ""}
                label={step.label}
                text={step.text}
                title={step.title}
              />
            ))}
          </div>
        </section>

        <section className="rev-accent-mist-soft rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="rev-kicker">Account creation</p>
              <h2 className="rev-display-panel max-w-[22rem]">
                Start a REVORY workspace.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[#beb7ca]">
                Create the account tied to the workspace so activation, booked proof, and
                revenue visibility remain consistent from the first session.
              </p>
            </div>

            <div className="rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
              <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">
                    {googleAuthConfigured
                      ? "Start with Google"
                      : "Google sign-in unavailable in this build"}
                  </p>
                  <RevoryStatusBadge tone={googleAuthConfigured ? "real" : "future"}>
                    {googleAuthConfigured ? "Google auth ready" : "Local build"}
                  </RevoryStatusBadge>
                </div>
                <p className="mt-2 text-sm leading-7 text-[#c6bfd2]">
                  Create the REVORY workspace with the Google account that will
                  stay connected to activation, booked proof, and revenue visibility.
                </p>

                {googleAuthConfigured ? (
                  <div className="mt-6">
                    <AuthGoogleButton
                      callbackUrl={redirectTarget}
                      label="Start with Google"
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                      Google sign-in is unavailable in this local build
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#c6bfd2]">
                      Add <code>AUTH_GOOGLE_CLIENT_ID</code>,{" "}
                      <code>AUTH_GOOGLE_CLIENT_SECRET</code>, and{" "}
                      <code>AUTH_SECRET</code> to enable workspace access.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d5cede]">
                    Workspace creation
                  </span>
                  <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d5cede]">
                    Google OAuth
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4 text-sm text-[#beb7ca]">
                  <span>Already have a workspace?</span>
                  <Link
                    className="font-semibold text-[color:var(--accent-light)] hover:text-white"
                    href={signInPath}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
