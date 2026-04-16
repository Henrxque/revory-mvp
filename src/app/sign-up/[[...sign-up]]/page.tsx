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
  buildSignInRedirectPath,
  normalizeAuthRedirectTarget,
} from "@/services/auth/redirects";

const signUpHighlights = [
  "Workspace creation",
  "Guided activation",
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
    text: "The entry point stays narrow and clear instead of turning account creation into a long setup exercise.",
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
            <p className="rev-kicker">REVORY Seller</p>
            <div className="space-y-3">
              <h1 className="rev-display-hero max-w-[32rem]">
                Start the{" "}
                <span className="italic text-[color:var(--accent-light)]">
                  REVORY Seller path.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#c0b8cc]">
                Create the workspace and move into setup.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-[color:var(--border)]" />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {signUpSteps.map((step) => (
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
          mode="sign-up"
          switchHref={signInPath}
        />
      </div>
    </main>
  );
}
