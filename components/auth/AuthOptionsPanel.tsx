import Link from "next/link";

import { AuthGoogleButton } from "@/components/auth/AuthGoogleButton";

type AuthOptionsPanelProps = Readonly<{
  callbackUrl: string;
  emailConfigured: boolean;
  googleConfigured: boolean;
  metaConfigured: boolean;
  mode: "sign-in" | "sign-up";
  switchHref: string;
}>;

function MetaMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20">
      <path
        d="M5.15 14.9c.62 0 1.18-.6 1.9-1.67l1.31-1.96 1.49 2.04c.93 1.27 1.57 1.9 2.3 1.9.83 0 1.47-.72 1.47-1.69 0-.64-.26-1.47-.78-2.45L11.2 7.58c-.54-.9-1.04-1.33-1.61-1.33-.58 0-1.08.42-1.63 1.31l-2.42 3.95c-.6.98-.9 1.84-.9 2.55 0 .97.65 1.84 1.51 1.84Zm.03-1.37c-.22 0-.36-.2-.36-.5 0-.38.18-.93.55-1.54L7.8 7.6c.35-.57.6-.77.83-.77.23 0 .48.2.83.78l3.67 5.87c.3.49.45.88.45 1.16 0 .22-.1.35-.26.35-.28 0-.73-.42-1.52-1.51l-1.74-2.4c-.22-.29-.36-.4-.52-.4-.17 0-.31.1-.52.42L7.3 13.46c-.67.94-1.05 1.35-1.43 1.35Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AuthField({
  label,
  placeholder,
  type,
}: Readonly<{
  label: string;
  placeholder: string;
  type: "email" | "password";
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[color:var(--foreground)]">{label}</span>
      <input
        className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[#8b849a] focus:border-[rgba(224,16,106,0.34)] focus:bg-[rgba(255,255,255,0.045)]"
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function MetaButton({
  disabled,
}: Readonly<{
  disabled: boolean;
}>) {
  return (
    <button
      className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition ${
        disabled
          ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] opacity-80"
          : "border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] hover:-translate-y-0.5 hover:border-[rgba(224,16,106,0.22)]"
      }`}
      disabled
      type="button"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.08)] text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <MetaMark />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[color:var(--foreground)]">
          Continue with Meta
        </span>
        <span className="mt-1 block text-xs text-[#b9b2c6]">
          {disabled ? "Coming soon" : "Sign in with Meta"}
        </span>
      </span>
      <span className="inline-flex min-h-9 min-w-[4.75rem] items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(12,11,15,0.34)] px-3 text-xs font-semibold text-[color:var(--foreground)]">
        Meta
      </span>
    </button>
  );
}

export function AuthOptionsPanel({
  callbackUrl,
  emailConfigured,
  googleConfigured,
  metaConfigured,
  mode,
  switchHref,
}: AuthOptionsPanelProps) {
  const isSignIn = mode === "sign-in";

  return (
    <section className="rev-accent-mist-soft rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(25,22,32,0.98),rgba(18,16,24,0.98))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.22)] md:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="rev-kicker">{isSignIn ? "Sign in" : "Create account"}</p>
          <h2 className="rev-display-panel max-w-[22rem]">
            {isSignIn ? "Access your REVORY workspace." : "Create your REVORY workspace."}
          </h2>
          <p className="text-sm leading-7 text-[#beb7ca]">
            {isSignIn
              ? "Use your email or continue with a connected account."
              : "Start with email or continue with a connected account."}
          </p>
        </div>

        <div className="rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-5 md:p-6">
          <form className="space-y-4">
            <AuthField label="Email" placeholder="name@clinic.com" type="email" />
            <AuthField label="Password" placeholder="Enter your password" type="password" />

            <div className="flex items-center justify-between gap-3 text-sm">
              <Link
                className="font-medium text-[#bdb6ca] transition hover:text-white"
                href={switchHref}
              >
                {isSignIn ? "Create account" : "Already have an account?"}
              </Link>
              {isSignIn ? (
                <button
                  className="font-medium text-[color:var(--accent-light)] transition hover:text-white"
                  type="button"
                >
                  Forgot password?
                </button>
              ) : (
                <Link
                  className="font-medium text-[color:var(--accent-light)] transition hover:text-white"
                  href={switchHref}
                >
                  Sign in
                </Link>
              )}
            </div>

            <button
              className={`flex h-12 w-full items-center justify-center rounded-[18px] text-sm font-semibold transition ${
                emailConfigured
                  ? "bg-[color:var(--accent)] text-white shadow-[0_18px_40px_rgba(224,16,106,0.24)] hover:brightness-105"
                  : "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#a69fb6]"
              }`}
              disabled={!emailConfigured}
              type="button"
            >
              {isSignIn ? "Sign in" : "Create account"}
            </button>
          </form>

          {!emailConfigured ? (
            <p className="mt-3 text-xs leading-6 text-[#8f8aa4]">
              Email and password will connect here when the email route is enabled in this build.
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
            <span className="text-xs uppercase tracking-[0.14em] text-[#8f8aa4]">or</span>
            <div className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
          </div>

          <div className="space-y-3">
            {googleConfigured ? (
              <AuthGoogleButton callbackUrl={callbackUrl} label="Continue with Google" />
            ) : (
              <button
                className="flex w-full items-center justify-center rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm font-semibold text-[#a69fb6]"
                disabled
                type="button"
              >
                Continue with Google
              </button>
            )}

            <MetaButton disabled={!metaConfigured} />
          </div>
        </div>
      </div>
    </section>
  );
}
