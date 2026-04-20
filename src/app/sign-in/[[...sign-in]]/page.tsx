import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthOptionsPanel } from "@/components/auth/AuthOptionsPanel";
import { AuthStepCard } from "@/components/auth/AuthStepCard";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { isGoogleAuthConfigured } from "@/services/auth/provider-config";
import {
  buildSignUpRedirectPath,
  normalizeAuthRedirectTarget,
} from "@/services/auth/redirects";

const signInSteps = [
  {
    label: "01",
    title: "Return to the same workspace",
    text: "Google brings the user back to the same private workspace.",
  },
  {
    label: "02",
    title: "Resume the Seller path",
    text: "REVORY reopens the same narrow booking workflow.",
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
              <RevoryStatusBadge tone="accent">Secure access</RevoryStatusBadge>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <p className="rev-kicker">REVORY Seller</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[32rem]">
                Return to your{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  REVORY workspace.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Secure Google access brings the clinic back to the same booking workflow.
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
          googleConfigured={googleAuthConfigured}
          mode="sign-in"
          switchHref={signUpPath}
        />
      </div>
    </main>
  );
}
