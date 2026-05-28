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
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          if (!isSignIn) {
            const result = await createEmailPasswordAccount({
              email,
              fullName,
              password,
            });

            if (!result.ok) {
              setMessage(result.message);
              return;
            }
          }

          const result = await signIn("credentials", {
            callbackUrl,
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setMessage("Email or password did not match an active REVORY account.");
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
            placeholder="Clinic owner or operator"
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
          placeholder="you@clinic.com"
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
          type="password"
          value={password}
        />
      </label>

      {message ? (
        <p className="text-[11px] leading-[1.45] text-[color:var(--warning)]">
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
            : "Create workspace with email"}
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
          Email/password is intentionally simple: no Meta login, no extra provider sprawl.
        </p>
      )}
    </form>
  );
}
