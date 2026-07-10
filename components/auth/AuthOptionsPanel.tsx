import Link from "next/link";

import { AuthEmailPasswordForm } from "@/components/auth/AuthEmailPasswordForm";
import { AuthGoogleButton } from "@/components/auth/AuthGoogleButton";

type AuthOptionsPanelProps = Readonly<{
  callbackUrl: string;
  googleConfigured: boolean;
  mode: "sign-in" | "sign-up";
  switchHref: string;
}>;

export function AuthOptionsPanel({
  callbackUrl,
  googleConfigured,
  mode,
  switchHref,
}: AuthOptionsPanelProps) {
  const isSignIn = mode === "sign-in";
  const switchLabel = isSignIn ? "Create workspace" : "Already have a workspace?";

  return (
    <section className="rev-accent-mist-soft rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
      <div className="space-y-5">
        <div className="space-y-2.5">
          <p className="rev-kicker">{isSignIn ? "Workspace access" : "Workspace creation"}</p>
          <h2 className="rev-display-panel max-w-[22rem]">
            {isSignIn ? "Access REVORY securely." : "Create REVORY securely."}
          </h2>
          <p className="max-w-[22rem] text-sm leading-6 text-[#beb7ca]">
            {isSignIn
              ? "Use Google or confirmed email/password to return to the same workspace."
              : "Use Google or confirm your email/password account to start REVORY setup."}
          </p>
        </div>

        <div className="rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
          <div className="space-y-4">
            <AuthEmailPasswordForm callbackUrl={callbackUrl} mode={mode} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f8aa4]">
                Or
              </span>
              <div className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
            </div>

            {googleConfigured ? (
              <AuthGoogleButton
                callbackUrl={callbackUrl}
                label={isSignIn ? "Continue with Google" : "Create workspace with Google"}
              />
            ) : (
              <button
                className="flex w-full items-center justify-center rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm font-semibold text-[#a69fb6]"
                disabled
                type="button"
              >
                Google access unavailable
              </button>
            )}

            <div className="flex items-center justify-between gap-3 text-sm">
              <Link
                className="font-medium text-[#bdb6ca] transition hover:text-white"
                href={switchHref}
              >
                {switchLabel}
              </Link>
              {!googleConfigured ? (
                <span className="text-[11px] text-[#8f8aa4]">
                  Email/password remains available.
                </span>
              ) : null}
            </div>

            {googleConfigured ? null : (
              <p className="text-[11px] leading-[1.55] text-[#8f8aa4]">
                Google needs OAuth credentials before launch. No other social providers are exposed.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
