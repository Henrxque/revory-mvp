"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { requestPasswordResetAction } from "@/src/app/auth/password-actions";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (completed) {
    return (
      <div
        aria-live="polite"
        className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(67,179,155,.08)] p-5"
        data-testid="password-reset-request-success"
        role="status"
      >
        <p className="rev-kicker">Secure reset</p>
        <h3 className="mt-2 text-xl font-bold text-[color:var(--foreground)]">Check your inbox</h3>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
          If an email/password REVORY account matches this address, we sent a reset link. It expires in 45 minutes.
        </p>
        <Link className="rev-action-button-primary mt-5 inline-flex px-4 py-3 text-sm" href="/sign-in">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const result = await requestPasswordResetAction({ email });
          setMessage(result.message);
          setCompleted(result.ok);
        });
      }}
    >
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
        {isPending ? "Checking..." : "Send reset link"}
      </button>
    </form>
  );
}
