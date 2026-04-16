import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthOptionsPanel } from "@/components/auth/AuthOptionsPanel";
import { AuthStepCard } from "@/components/auth/AuthStepCard";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import {
  isEmailAuthConfigured,
  isGoogleAuthConfigured,
  isMetaAuthConfigured,
} from "@/services/auth/provider-config";
import {
  buildSignUpRedirectPath,
  normalizeAuthRedirectTarget,
} from "@/services/auth/redirects";

const signInHighlights = [
  "Protected workspace",
  "Fast return",
];

const signInSteps = [
  {
    label: "01",
    title: "Return to the same workspace",
    text: "The account reconnects the user with the existing private context instead of dropping them into a generic admin shell.",
  },
  {
    label: "02",
    title: "Resume the right flow",
    text: "The workspace reopens the same narrow Seller path instead of sending the clinic through a generic admin detour.",
  },
];

type SignInPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getAuthSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectTarget = normalizeAuthRedirectTarget(
    resolvedSearchParams.redirect_url ?? resolvedSearchParams.redirectUrl,
  );
  const signUpPath = buildSignUpRedirectPath(redirectTarget);
  const googleAuthConfigured = isGoogleAuthConfigured();
  const metaAuthConfigured = isMetaAuthConfigured();
  const emailAuthConfigured = isEmailAuthConfigured();

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
            <p className="rev-kicker">REVORY Seller</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[32rem]">
                Access the{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  same REVORY workspace.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Sign in and get back to the booking workflow.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {signInSteps.map((step) => (
              <AuthStepCard
                key={step.label}
                label={step.label}
                text={step.text}
                title={step.title}
              />
            ))}
          </div>
        </section>

        <AuthOptionsPanel
          callbackUrl={redirectTarget}
          emailConfigured={emailAuthConfigured}
          googleConfigured={googleAuthConfigured}
          metaConfigured={metaAuthConfigured}
          mode="sign-in"
          switchHref={signUpPath}
        />
      </div>
    </main>
  );
}
