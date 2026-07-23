"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import Link from "next/link";

import { createEmailPasswordAccount } from "@/src/app/auth/password-actions";

type AuthEmailPasswordFormProps = Readonly<{
  callbackUrl: string;
  mode: "sign-in" | "sign-up";
}>;

export function AuthEmailPasswordForm({
  callbackUrl,
  mode,
}: AuthEmailPasswordFormProps) {
  const isSignIn = mode === "sign-in";
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [successKind, setSuccessKind] = useState<
    "ACCOUNT_CREATED" | "VERIFICATION_RESENT" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  if (!isSignIn && successKind) {
    const accountCreated = successKind === "ACCOUNT_CREATED";

    return (
      <div
        aria-live="polite"
        className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(67,179,155,.08)] p-5"
        data-testid="signup-success"
        role="status"
      >
        <p className="rev-kicker">Email confirmation</p>
        <h3 className="mt-2 text-xl font-bold text-[color:var(--foreground)]">
          {accountCreated ? "Account created" : "Check your inbox"}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
          {accountCreated
            ? `We sent a confirmation link to ${email}. Open it to activate email/password access.`
            : `We sent a new confirmation link to ${email}. Open it before signing in.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="rev-action-button-primary inline-flex px-4 py-3 text-sm" href="/sign-in">
            Sign in
          </Link>
          <button
            className="rev-button-secondary px-4 py-3 text-sm"
            onClick={() => {
              setEmail("");
              setFullName("");
              setMessage(null);
              setSuccessKind(null);
            }}
            type="button"
          >
            Use another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        if (!isSignIn && password !== passwordConfirmation) {
          setMessage("Passwords do not match.");
          return;
        }

        startTransition(async () => {
          if (!isSignIn) {
            const result = await createEmailPasswordAccount({
              email,
              fullName,
              password,
              passwordConfirmation,
              legalAccepted: true,
            });

            setMessage(result.message);

            if (!result.ok) {
              return;
            }

            setPassword("");
            setPasswordConfirmation("");
            setSuccessKind(result.successKind);
            return;
          }

          const result = await signIn("credentials", {
            callbackUrl,
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setMessage(
              "Email or password did not match an active REVORY account. If you just signed up, confirm your email first.",
            );
            return;
          }

          window.location.assign(result?.url ?? callbackUrl);
        });
      }}
    >
      {!isSignIn ? (
        <label className="block">
          <span className="rev-label">Name</span>
          <input
            className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Company owner or operator"
            value={fullName}
          />
        </label>
      ) : null}

      <label className="block">
        <span className="rev-label">Work email</span>
        <input
          autoComplete="email"
          className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="block">
        <span className="rev-label">Password</span>
        <input
          autoComplete={isSignIn ? "current-password" : "new-password"}
          className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
          minLength={10}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 10 characters"
          required
          type="password"
          value={password}
        />
      </label>

      {!isSignIn ? (
        <label className="block">
          <span className="rev-label">Confirm password</span>
          <input
            autoComplete="new-password"
            className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
            minLength={10}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            placeholder="Enter the same password again"
            required
            type="password"
            value={passwordConfirmation}
          />
        </label>
      ) : null}

      {message ? (
        <p
          aria-live="assertive"
          className="text-[11px] leading-[1.45] text-[color:var(--warning)]"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button
        className="rev-action-button-primary min-h-11 w-full justify-center px-4 py-3 text-sm"
        disabled={isPending}
        type="submit"
      >
        {isPending
          ? "Working..."
          : isSignIn
            ? "Continue with email"
            : "Create account with email"}
      </button>

      {isSignIn ? (
        <Link
          className="inline-flex text-[11px] font-semibold uppercase tracking-[0.13em] text-[#bdb6ca] transition hover:text-white"
          href="/forgot-password"
        >
          Forgot password
        </Link>
      ) : (
        <p className="text-[10px] leading-[1.45] text-[color:var(--text-subtle)]">
          Email/password requires a confirmation link. No Meta login, no extra provider sprawl.
        </p>
      )}
    </form>
  );
}
